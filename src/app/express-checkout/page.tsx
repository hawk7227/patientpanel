"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import {
  Zap, Calendar, ChevronDown, X, Clock, Lock, Search,
  Phone, Video, Pill, Camera, AlertTriangle, Shield, Check,
} from "lucide-react";
import symptomSuggestions from "@/data/symptom-suggestions.json";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import PharmacySelector from "@/components/PharmacySelector";
import { getPrice, isControlledSubstance, type VisitType } from "@/lib/pricing";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
interface PatientInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  id: string | null;
  source: string;
  pharmacy?: string;
  drchronoPatientId?: number;
}

interface MedicationItem {
  name: string;
  dosage?: string;
  source: string;
  is_active: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Visit Type Config
// ═══════════════════════════════════════════════════════════════
const VISIT_TYPES = [
  { key: "instant" as VisitType, label: "Instant", icon: Zap, desc: "Private & discreet", badge: "Fastest", needsCalendar: false },
  { key: "refill" as VisitType, label: "Rx Refill", icon: Pill, desc: "No questions asked", badge: null, needsCalendar: false },
  { key: "video" as VisitType, label: "Video", icon: Video, desc: "Secure 1-on-1", badge: null, needsCalendar: true },
  { key: "phone" as VisitType, label: "Phone", icon: Phone, desc: "Private line", badge: null, needsCalendar: true },
];

// ═══════════════════════════════════════════════════════════════
// Inner Payment Form (needs Stripe context)
// ═══════════════════════════════════════════════════════════════
function ExpressPaymentForm({
  patient, reason, chiefComplaint, visitType, appointmentDate, appointmentTime,
  currentPrice, pharmacy, pharmacyAddress, selectedMedications, symptomsText, onSuccess,
}: {
  patient: PatientInfo; reason: string; chiefComplaint: string; visitType: string;
  appointmentDate: string; appointmentTime: string; currentPrice: { amount: number; display: string };
  pharmacy: string; pharmacyAddress: string; selectedMedications: string[];
  symptomsText: string; onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isTestMode =
    process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true" ||
    (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true");

  const convertDateToISO = (dateStr: string): string => {
    if (!dateStr) return "";
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) return dateStr;
    const parts = dateStr.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    return dateStr;
  };

  const handlePay = async () => {
    if (!stripe || !elements) return;
    if (!acceptedTerms) { setError("Please accept the terms to continue."); return; }

    setIsProcessing(true);
    setError(null);
    setProgress(5);
    setStatusText("Starting payment process...");

    try {
      setProgress(15);
      setStatusText("Checking patient record...");

      let patientId = patient.id;
      if (!patientId) {
        setProgress(25);
        setStatusText("Creating patient record...");
        const createRes = await fetch("/api/check-create-patient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: patient.email, firstName: patient.firstName, lastName: patient.lastName,
            phone: patient.phone, dateOfBirth: convertDateToISO(patient.dateOfBirth),
            address: patient.address, pharmacy: pharmacy || patient.pharmacy || "",
            pharmacyAddress: pharmacyAddress || "",
          }),
        });
        const createResult = await createRes.json();
        if (!createRes.ok) throw new Error(createResult.error || "Failed to create patient");
        patientId = createResult.patientId;
      }

      setProgress(45);
      setStatusText("Processing payment...");

      let paymentIntent: any = null;
      let paymentError: any = null;

      if (isTestMode) {
        paymentIntent = {
          id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          status: "succeeded",
        };
        await new Promise((r) => setTimeout(r, 500));
      } else {
        setProgress(55);
        setStatusText("Confirming payment...");
        const result = await stripe.confirmPayment({
          elements, redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/success`,
            payment_method_data: {
              billing_details: {
                name: `${patient.firstName} ${patient.lastName}`,
                email: patient.email, phone: patient.phone,
              },
            },
          },
        });
        paymentError = result.error;
        paymentIntent = result.paymentIntent;
      }

      if (paymentError) { setError(paymentError.message || "Payment failed."); setIsProcessing(false); return; }

      if (paymentIntent?.status === "succeeded") {
        setProgress(75);
        setStatusText("Creating appointment...");

        const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isAsync = visitType === "instant" || visitType === "refill";

        // Build chief complaint with context
        let fullChiefComplaint = chiefComplaint || reason;
        if (selectedMedications.length > 0) {
          fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
        }
        if (symptomsText) {
          fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;
        }

        const appointmentPayload = {
          payment_intent_id: paymentIntent.id,
          appointmentData: {
            email: patient.email, firstName: patient.firstName, lastName: patient.lastName,
            phone: patient.phone, dateOfBirth: convertDateToISO(patient.dateOfBirth),
            streetAddress: patient.address,
            symptoms: reason,
            chief_complaint: fullChiefComplaint,
            visitType: visitType,
            appointmentDate: isAsync ? new Date().toISOString().split("T")[0] : appointmentDate,
            appointmentTime: isAsync ? new Date().toTimeString().slice(0, 5) : appointmentTime,
            patientId: patientId,
            patientTimezone: patientTZ,
            skipIntake: true,
            isReturningPatient: true,
            pharmacy: pharmacy || patient.pharmacy || "",
            pharmacyAddress: pharmacyAddress || "",
          },
        };

        const appointmentRes = await fetch("/api/create-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentPayload),
        });
        const appointmentResult = await appointmentRes.json();
        if (!appointmentRes.ok) throw new Error(appointmentResult.error || "Failed to create appointment");

        setProgress(100);
        setStatusText("Appointment booked!");

        sessionStorage.setItem("appointmentData", JSON.stringify({
          ...appointmentPayload.appointmentData,
          appointmentId: appointmentResult.appointmentId,
          accessToken: appointmentResult.accessToken,
          payment_intent_id: paymentIntent.id,
        }));

        await new Promise((r) => setTimeout(r, 800));
        onSuccess();
      }
    } catch (err: any) {
      console.error("Express checkout error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {isTestMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg text-xs">
          🧪 <strong>TEST MODE:</strong> Payment will be skipped.
        </div>
      )}

      {!isTestMode && (
        <div className="bg-[#11161c] border border-white/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4 text-white">
            <div className="w-8 h-8 rounded-full bg-primary-teal/10 flex items-center justify-center text-primary-teal">
              <Lock size={14} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Secure Payment</h3>
              <p className="text-[10px] text-gray-400">Encrypted and secure</p>
            </div>
          </div>
          <PaymentElement
            options={{
              layout: "tabs", paymentMethodOrder: ["card"],
              wallets: { applePay: "never", googlePay: "never", link: "never" },
              fields: { billingDetails: { name: "never", email: "never", phone: "never" } },
            }}
          />
        </div>
      )}

      {isTestMode && (
        <div className="bg-[#11161c] border border-white/20 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm">Test Mode: Payment Skipped</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">{error}</div>
      )}

      <div className="flex items-start gap-2">
        <input type="checkbox" id="expressTerms" checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-primary-teal/50 bg-[#0d1218] text-primary-teal focus:ring-primary-teal"
        />
        <label htmlFor="expressTerms" className="text-[10px] text-gray-400 leading-relaxed">
          By confirming, I agree to the <span className="text-primary-teal">Terms of Service</span>,{" "}
          <span className="text-primary-teal">Privacy Policy</span>, and{" "}
          <span className="text-primary-teal">Cancellation Policy</span>. I authorize a one-time charge of{" "}
          <strong className="text-white">{currentPrice.display}</strong> (flat, non-refundable) for this visit.
        </label>
      </div>

      {!isProcessing && (
        <button onClick={handlePay}
          disabled={!stripe || !elements || !acceptedTerms}
          className="w-full bg-primary-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg"
        >
          Pay {currentPrice.display} & Book <Lock size={16} />
        </button>
      )}

      {isProcessing && (
        <div className="space-y-2 py-2">
          <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-primary-teal rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-sm text-gray-300 text-center">{statusText}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Express Checkout Page
// ═══════════════════════════════════════════════════════════════
export default function ExpressCheckoutPage() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientInfo | null>(null);

  // Booking fields
  const [reason, setReason] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("instant");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  // Async-specific fields (Instant/Refill)
  const [symptomsText, setSymptomsText] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [asyncAcknowledged, setAsyncAcknowledged] = useState(false);

  // Refill-specific
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [hasControlledSelected, setHasControlledSelected] = useState(false);

  // Dialogs
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonQuery, setReasonQuery] = useState("");
  const [chiefComplaintDialogOpen, setChiefComplaintDialogOpen] = useState(false);
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");

  // Payment
  const [clientSecret, setClientSecret] = useState("");

  // Pricing
  const currentPrice = useMemo(() => getPrice(visitType), [visitType]);

  // Derived state
  const needsCalendar = VISIT_TYPES.find(v => v.key === visitType)?.needsCalendar ?? false;
  const isAsync = visitType === "instant" || visitType === "refill";

  // ── Load patient ───────────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("expressPatient");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setPatient(p);
        if (p.pharmacy) setPharmacy(p.pharmacy);
        // Warm the local cache for this patient (background, non-blocking)
      if (p.id) {
        import('@/lib/hybrid-data').then(({ warmPatientCache }) => warmPatientCache(p.id!)).catch(() => {});
      }
    } catch { router.push("/"); }
    } else {
      router.push("/");
    }
  }, [router]);

  // ── Fetch medications for Refill (LIVE → EXPORT FALLBACK) ──
  useEffect(() => {
    if (visitType === "refill" && patient?.id) {
      setMedsLoading(true);
      console.log('[Express] Fetching meds for patient:', patient.id);

      // Try live API first
      fetch(`/api/medications?patientId=${patient.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.medications && data.medications.length > 0) {
            console.log('[Express] Live medications:', data.count);
            setMedications(data.medications);
            setMedsLoading(false);
          } else {
            // Live returned 0 — try export fallback
            console.log('[Express] Live returned 0, trying export fallback...');
            const email = patient.email || '';
            return fetch(`/api/medications-from-export?patientId=${patient.id}&email=${encodeURIComponent(email)}`)
              .then(r2 => r2.json())
              .then(fallback => {
                console.log('[Express] Export fallback:', fallback.count, 'source:', fallback.source);
                setMedications(fallback.medications || []);
                setMedsLoading(false);
              });
          }
        })
        .catch(err => {
          console.error('[Express] Live API failed, trying export fallback...', err);
          // Live failed entirely — try export fallback
          const email = patient.email || '';
          fetch(`/api/medications-from-export?patientId=${patient.id}&email=${encodeURIComponent(email)}`)
            .then(r => r.json())
            .then(fallback => {
              console.log('[Express] Export fallback (after error):', fallback.count);
              setMedications(fallback.medications || []);
              setMedsLoading(false);
            })
            .catch(() => setMedsLoading(false));
        });
    }
  }, [visitType, patient?.id, patient?.email]);

  // ── Check for controlled substances ────────────────────────
  useEffect(() => {
    setHasControlledSelected(selectedMeds.some(m => isControlledSubstance(m)));
  }, [selectedMeds]);

  // ── allFieldsReady logic ───────────────────────────────────
  const allFieldsReady = useMemo(() => {
    if (!reason) return false;

    if (needsCalendar) {
      return !!(appointmentDate && appointmentTime);
    }

    // Async visits (instant/refill)
    if (visitType === "refill") {
      return !!(selectedMeds.length > 0 && !hasControlledSelected && asyncAcknowledged);
    }

    // Instant
    return !!asyncAcknowledged;
  }, [reason, needsCalendar, appointmentDate, appointmentTime, visitType, selectedMeds, hasControlledSelected, asyncAcknowledged]);

  // ── Create payment intent ──────────────────────────────────
  useEffect(() => {
    if (allFieldsReady && !clientSecret) {
      fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: currentPrice.amount }),
      })
        .then(res => res.json())
        .then(data => { if (data.clientSecret) setClientSecret(data.clientSecret); })
        .catch(err => console.error("Payment intent error:", err));
    }
  }, [allFieldsReady, clientSecret, currentPrice.amount]);

  // ── Reset clientSecret on visit type change ────────────────
  const handleVisitTypeChange = (type: VisitType) => {
    setVisitType(type);
    setClientSecret("");
    setAsyncAcknowledged(false);
    setSelectedMeds([]);
    setHasControlledSelected(false);
  };

  // ── Photo handling ─────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // ── Medication toggle ──────────────────────────────────────
  const toggleMed = (name: string) => {
    setSelectedMeds(prev => prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]);
    setClientSecret(""); // Reset payment on med change
  };

  // ── Stripe options ─────────────────────────────────────────
  const stripeOptions = useMemo(() =>
    clientSecret ? {
      clientSecret,
      appearance: {
        theme: "night" as const,
        variables: { colorPrimary: "#00CBA9", colorBackground: "#11161c", colorText: "#ffffff", borderRadius: "8px" },
      },
    } : undefined
  , [clientSecret]);

  // ── Symptom search ─────────────────────────────────────────
  const filteredReasons = useMemo(() => {
    if (!reasonQuery.trim()) return symptomSuggestions;
    const q = reasonQuery.toLowerCase();
    return symptomSuggestions.filter(
      (s: { name: string; smart_search?: string[] }) =>
        s.name.toLowerCase().includes(q) || s.smart_search?.some((kw: string) => kw.toLowerCase().includes(q)),
    );
  }, [reasonQuery]);

  // ── Format date/time ───────────────────────────────────────
  const formatDisplayDateTime = useCallback(() => {
    if (!appointmentDate || !appointmentTime) return null;
    const [year, month, day] = appointmentDate.split("-").map(Number);
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const h = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const ampm = hours >= 12 ? "pm" : "am";
    return `${dayNames[date.getDay()]}, ${monthNames[month - 1]} ${day}, ${year} — ${h}:${String(minutes).padStart(2, "0")}${ampm}`;
  }, [appointmentDate, appointmentTime]);

  const handleSuccess = () => {
    const stored = sessionStorage.getItem("appointmentData");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.accessToken) { router.push(`/appointment/${data.accessToken}`); return; }
      } catch {}
    }
    router.push("/success");
  };

  // ── Not-ready prompt ───────────────────────────────────────
  const notReadyMessage = useMemo(() => {
    if (!reason) return "Select a reason for visit to continue";
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return "Select date & time to continue";
    if (visitType === "refill" && selectedMeds.length === 0) return "Select medications to refill";
    if (visitType === "refill" && hasControlledSelected) return "Controlled substances require a video visit";
    if (isAsync && !asyncAcknowledged) return "Acknowledge the async visit terms to continue";
    return "Complete all fields to continue";
  }, [reason, needsCalendar, appointmentDate, appointmentTime, visitType, selectedMeds, hasControlledSelected, isAsync, asyncAcknowledged]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary-teal border-t-transparent rounded-full" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="text-white">Medazon Health</span>{" "}
            <span className="text-primary-teal">Express Booking</span>
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Zap size={16} className="text-primary-orange" />
            <span className="text-primary-orange font-semibold text-sm">
              Welcome back, {patient.firstName}!
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">{patient.email} · Returning Patient</p>
        </div>

        {/* Booking Form */}
        <div className="space-y-3">
          {/* Reason for Visit */}
          <button
            onClick={() => setReasonDialogOpen(true)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
              reason ? "border-primary-teal bg-primary-teal/5" : "border-white/10 bg-[#11161c] hover:border-white/20"
            }`}
          >
            <span className={reason ? "text-white text-sm font-medium" : "text-gray-500 text-sm"}>
              {reason || "Reason for Visit"}
            </span>
            <ChevronDown size={16} className="text-gray-500" />
          </button>

          {/* ── 4 Visit Type Buttons ──────────────────────────── */}
          <div className="grid grid-cols-4 gap-2">
            {VISIT_TYPES.map((vt) => {
              const Icon = vt.icon;
              const isSelected = visitType === vt.key;
              return (
                <button key={vt.key} onClick={() => handleVisitTypeChange(vt.key)}
                  className={`relative flex flex-col items-center py-3 px-1 rounded-xl text-center border transition-all ${
                    isSelected
                      ? "border-primary-teal bg-primary-teal/10 text-primary-teal"
                      : "border-white/10 bg-[#11161c] text-gray-400 hover:border-white/20"
                  }`}
                >
                  {vt.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] bg-primary-orange text-white px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                      {vt.badge}
                    </span>
                  )}
                  <Icon size={18} className={isSelected ? "text-primary-teal" : "text-gray-500"} />
                  <span className="text-[11px] font-semibold mt-1">{vt.label}</span>
                  <span className="text-[8px] text-gray-500 mt-0.5 leading-tight">{vt.desc}</span>
                </button>
              );
            })}
          </div>

          {/* ── Conditional: Calendar (Video/Phone) ───────────── */}
          {needsCalendar && (
            <button
              onClick={() => { setDateTimeDialogOpen(true); setDateTimeMode("date"); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                appointmentDate && appointmentTime
                  ? "border-primary-teal bg-primary-teal/5"
                  : "border-white/10 bg-[#11161c] hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className={appointmentDate ? "text-primary-teal" : "text-gray-500"} />
                <span className={appointmentDate && appointmentTime ? "text-white text-sm font-medium" : "text-gray-500 text-sm"}>
                  {formatDisplayDateTime() || "Select Date & Time"}
                </span>
              </div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
          )}

          {/* ── Conditional: Async Fields (Instant/Refill) ────── */}
          {isAsync && (
            <div className="space-y-3">
              {/* Symptoms Text (Instant only) */}
              {visitType === "instant" && (
                <textarea
                  value={symptomsText}
                  onChange={(e) => setSymptomsText(e.target.value)}
                  placeholder="Describe your symptoms in detail..."
                  rows={3}
                  className="w-full bg-[#11161c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-teal resize-none placeholder:text-gray-500"
                />
              )}

              {/* Medication Selector (Refill only) */}
              {visitType === "refill" && (
                <div className="bg-[#11161c] border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Select Medications to Refill</span>
                    {medsLoading && <div className="animate-spin w-3 h-3 border border-primary-teal border-t-transparent rounded-full" />}
                  </div>
                  {medications.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {medications.map((med) => {
                        const isControlled = isControlledSubstance(med.name);
                        const isChecked = selectedMeds.includes(med.name);
                        return (
                          <label key={med.name}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${
                              isChecked ? "bg-primary-teal/10 border border-primary-teal/30" : "hover:bg-white/5"
                            } ${isControlled ? "border border-red-500/30" : ""}`}
                          >
                            <input type="checkbox" checked={isChecked} onChange={() => toggleMed(med.name)}
                              className="w-3.5 h-3.5 rounded border-white/20 bg-[#0d1218] text-primary-teal focus:ring-primary-teal"
                            />
                            <span className={`flex-1 ${isControlled ? "text-red-400" : "text-white"}`}>
                              {med.name} {med.dosage ? `(${med.dosage})` : ""}
                            </span>
                            {isControlled && (
                              <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">CONTROLLED</span>
                            )}
                            <span className="text-[8px] text-gray-600">{med.source}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : !medsLoading ? (
                    <p className="text-gray-500 text-xs py-2">No medications found. Please describe what you need below.</p>
                  ) : null}

                  {/* Controlled substance warning */}
                  {hasControlledSelected && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 text-xs font-semibold">Controlled substance selected</p>
                        <p className="text-red-400/70 text-[10px] mt-0.5">This medication requires a live visit for safety.</p>
                        <button
                          onClick={() => handleVisitTypeChange("video")}
                          className="mt-1.5 text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded font-semibold hover:bg-red-500/30 transition-all"
                        >
                          Switch to Video Visit →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual medication entry */}
                  <textarea
                    value={symptomsText}
                    onChange={(e) => setSymptomsText(e.target.value)}
                    placeholder="Additional medications or notes for the provider..."
                    rows={2}
                    className="w-full bg-[#0d1218] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-teal resize-none placeholder:text-gray-600"
                  />
                </div>
              )}

              {/* Pharmacy Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 pl-1">Preferred Pharmacy</label>
                <PharmacySelector
                  value={pharmacy}
                  onChange={(val: string) => setPharmacy(val)}
                  placeholder="Search pharmacies near you..."
                  className="w-full bg-[#11161c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-teal placeholder:text-gray-500"
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 pl-1">Photo (optional) — Rx label, symptoms, etc.</label>
                <label className="flex items-center gap-3 px-4 py-3 bg-[#11161c] border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                  <Camera size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-400 flex-1">
                    {photoFile ? photoFile.name : "Upload photo"}
                  </span>
                  <input type="file" accept="image/*,.pdf" capture="environment" onChange={handlePhotoChange}
                    className="hidden" />
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="w-8 h-8 rounded object-cover" />
                  )}
                </label>
              </div>

              {/* Async Acknowledgment */}
              {!hasControlledSelected && (
                <div className="flex items-start gap-2 bg-[#11161c] border border-white/10 rounded-xl p-3">
                  <input type="checkbox" id="asyncAck" checked={asyncAcknowledged}
                    onChange={(e) => { setAsyncAcknowledged(e.target.checked); setClientSecret(""); }}
                    className="mt-0.5 w-4 h-4 rounded border-primary-teal/50 bg-[#0d1218] text-primary-teal focus:ring-primary-teal"
                  />
                  <label htmlFor="asyncAck" className="text-[10px] text-gray-400 leading-relaxed">
                    <span className="text-white font-semibold">I understand this is an asynchronous visit.</span>{" "}
                    A provider will review my information and respond within 1–2 hours during business hours.
                    If my condition requires a live evaluation, I may be asked to schedule a Video or Phone visit.
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ── Provider Profile + Price + Privacy ─────────────── */}
          <div className="bg-[#11161c] border border-white/10 rounded-xl p-4 space-y-3">
            {/* Provider */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border-2 border-primary-teal overflow-hidden flex-shrink-0">
                <img src="/assets/provider-lamonica.png" alt="Provider" className="w-full h-full object-cover object-top" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">LaMonica A. Hodges</div>
                <div className="text-gray-400 text-[10px]">MSN, APRN, FNP-C</div>
                <div className="text-primary-teal text-[10px] font-medium">Board-Certified · 10+ Years Experience</div>
              </div>
            </div>

            {/* Privacy Banner — Large */}
            <div className="bg-primary-teal/8 border border-primary-teal/20 rounded-lg py-2.5 px-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Shield size={16} className="text-primary-teal" />
                <span className="text-primary-teal font-bold text-sm tracking-wide">YOUR PRIVACY MATTERS</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                No insurance needed · No records shared · 100% confidential
              </p>
            </div>

            {/* Price */}
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{currentPrice.display}</div>
              {currentPrice.isAfterHours ? (
                <div className="mt-1 space-y-0.5">
                  <div className="text-[11px] text-orange-400 font-semibold">
                    {currentPrice.isHoliday ? "🏛 Holiday" : currentPrice.isWeekend ? "📅 Weekend" : "🌙 After-hours"} rate
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Regular price: {(visitType === "instant" || visitType === "refill") ? "$189" : "$199"} · Mon–Fri, 9am–5pm your time
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 mt-1">
                  {VISIT_TYPES.find(v => v.key === visitType)?.label} Visit · {currentPrice.label}
                </div>
              )}
            </div>
          </div>

          {/* ── Payment ───────────────────────────────────────── */}
          {allFieldsReady && clientSecret && stripeOptions && (
            <Elements options={stripeOptions} stripe={stripePromise}>
              <ExpressPaymentForm
                patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType}
                appointmentDate={appointmentDate} appointmentTime={appointmentTime}
                currentPrice={currentPrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress}
                selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess}
              />
            </Elements>
          )}

          {allFieldsReady && !clientSecret && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-primary-teal border-t-transparent rounded-full" />
              <span className="ml-2 text-gray-400 text-xs">Loading payment...</span>
            </div>
          )}

          {!allFieldsReady && (
            <div className="text-center py-4">
              <p className="text-gray-600 text-xs">{notReadyMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ REASON DIALOG ══════════ */}
      {reasonDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
          <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 w-full max-w-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-base">Reason For Visit</span>
              <button onClick={() => { setReasonDialogOpen(false); setReasonQuery(""); }} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={reasonQuery} onChange={(e) => setReasonQuery(e.target.value)} placeholder="Search symptoms..."
                autoFocus className="w-full bg-[#11161c] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-primary-teal" />
            </div>
            <div className="max-h-72 overflow-y-auto border border-white/5 rounded-lg">
              <div className="px-3 py-2 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-xs border-b border-white/5 font-semibold"
                onClick={() => { setReason("Something Else"); setReasonDialogOpen(false); setReasonQuery(""); setChiefComplaintDialogOpen(true); }}>
                Something else
              </div>
              {filteredReasons.map((item: { name: string }) => (
                <div key={item.name}
                  className="px-3 py-2 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-xs border-b border-white/5 last:border-0"
                  onClick={() => { setReason(item.name); setReasonDialogOpen(false); setReasonQuery(""); setChiefComplaintDialogOpen(true); }}>
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ CHIEF COMPLAINT DIALOG ══════════ */}
      {chiefComplaintDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
          <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 w-full max-w-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-base">Describe Your Symptoms</span>
              <button onClick={() => setChiefComplaintDialogOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-400 text-xs">
              Briefly describe what&apos;s going on so the provider can prepare for your visit.
            </p>
            <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g., Burning during urination for 3 days, lower abdominal discomfort..." rows={4} autoFocus
              className="w-full bg-[#11161c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-teal resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setChiefComplaintDialogOpen(false)}
                className="flex-1 bg-white/5 text-gray-400 py-2 rounded-lg text-sm hover:bg-white/10">Skip</button>
              <button onClick={() => setChiefComplaintDialogOpen(false)}
                className="flex-1 bg-primary-teal text-black py-2 rounded-lg text-sm font-bold hover:bg-teal-400">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DATE/TIME DIALOG ══════════ */}
      {dateTimeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
          <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 w-full max-w-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-base">{dateTimeMode === "date" ? "Select Date" : "Select Time"}</span>
              <button onClick={() => setDateTimeDialogOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <AppointmentCalendar
              selectedDate={appointmentDate || null} selectedTime={appointmentTime || null}
              onDateSelect={(date) => { setAppointmentDate(date); setDateTimeMode("time"); }}
              onTimeSelect={(time) => { setAppointmentTime(time); setDateTimeDialogOpen(false); }}
              mode={dateTimeMode === "date" ? "date" : "time"}
            />
            {dateTimeMode === "time" && (
              <button onClick={() => setDateTimeMode("date")}
                className="w-full text-center text-xs text-primary-teal hover:underline">← Change date</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
