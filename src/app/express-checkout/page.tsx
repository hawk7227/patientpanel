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
// Step 2 Payment Form — fits iPhone 15 Pro viewport
// Google Pay → OR PAY WITH CARD → Terms → Processing bar
// ═══════════════════════════════════════════════════════════════
function Step2PaymentForm({
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
  const [showCardForm, setShowCardForm] = useState(false);

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

  // Processing state — full overlay
  if (isProcessing) {
    return (
      <div className="w-full space-y-3 py-2">
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-[#2dd4a0] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="text-[13px] text-gray-300 text-center">{statusText}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-[11px]">{error}</div>
      )}

      {/* Test mode indicator */}
      {isTestMode && (
        <div className="text-center py-1">
          <span className="text-yellow-400 text-[10px] font-bold">🧪 TEST MODE</span>
        </div>
      )}

      {/* ELEMENT 9 — Google Pay / Card Form */}
      {!showCardForm ? (
        <>
          {/* Google Pay Button — white rectangle */}
          {!isTestMode ? (
            <div className="rounded-xl overflow-hidden">
              <PaymentElement
                options={{
                  layout: "tabs",
                  paymentMethodOrder: ["google_pay", "apple_pay", "card"],
                  wallets: { applePay: "auto", googlePay: "auto" },
                  fields: { billingDetails: { name: "never", email: "never", phone: "never" } },
                }}
              />
            </div>
          ) : (
            <button onClick={handlePay} disabled={!acceptedTerms}
              className="w-full bg-white rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
              <span className="text-black font-semibold text-base">Test Pay {currentPrice.display}</span>
            </button>
          )}

          {/* ELEMENT 10 — OR PAY WITH CARD */}
          {!isTestMode && (
            <button onClick={() => setShowCardForm(true)}
              className="w-full text-center py-1">
              <span className="text-[#2dd4a0] text-[12px] font-extrabold tracking-wider uppercase">
                OR PAY WITH CARD
              </span>
            </button>
          )}
        </>
      ) : (
        <>
          {/* Expanded card form */}
          <div className="rounded-xl overflow-hidden">
            <PaymentElement
              options={{
                layout: "tabs",
                paymentMethodOrder: ["card"],
                wallets: { applePay: "never", googlePay: "never", link: "never" },
                fields: { billingDetails: { name: "never", email: "never", phone: "never" } },
              }}
            />
          </div>
          <button onClick={handlePay} disabled={!stripe || !elements || !acceptedTerms}
            className="w-full bg-[#2dd4a0] hover:bg-[#25b88d] text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-[14px]">
            Pay {currentPrice.display}
          </button>
          <button onClick={() => setShowCardForm(false)}
            className="w-full text-center py-0.5">
            <span className="text-gray-500 text-[11px]">← Back to other options</span>
          </button>
        </>
      )}

      {/* ELEMENT 11 — Terms Checkbox */}
      <div className="flex items-start gap-1.5 px-0.5">
        <input type="checkbox" id="step2Terms" checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="flex-shrink-0 mt-[1px]"
          style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid #555', background: 'transparent', accentColor: '#2dd4a0' }}
        />
        <label htmlFor="step2Terms" className="text-[8px] text-[#888] leading-[1.5]">
          By confirming, I agree to the{" "}
          <span className="text-[#2dd4a0] underline underline-offset-1">Terms of Service</span>,{" "}
          <span className="text-[#2dd4a0] underline underline-offset-1">Privacy Policy</span>, and{" "}
          <span className="text-[#2dd4a0] underline underline-offset-1">Cancellation Policy</span>.{" "}
          By requesting a provider appointment, I acknowledge that my card will not be charged until a 
          provider accepts my appointment request. Once accepted, I authorize a one-time charge of{" "}
          <strong className="text-white">{currentPrice.display}.00</strong> (flat, non-refundable) for this visit.
        </label>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Inner Payment Form (needs Stripe context) — Step 1 version
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
  const [controlledAcknowledged, setControlledAcknowledged] = useState(false);
  const [medsListOpen, setMedsListOpen] = useState(true);

  // Post-payment controlled substance scheduling
  const [showControlledScheduler, setShowControlledScheduler] = useState(false);
  const [controlledScheduleDate, setControlledScheduleDate] = useState("");
  const [controlledScheduleTime, setControlledScheduleTime] = useState("");
  const [controlledVisitType, setControlledVisitType] = useState<"video" | "phone">("video");
  const [schedulingAppointment, setSchedulingAppointment] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [showDeaInfoPopup, setShowDeaInfoPopup] = useState(false);

  // Dialogs
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonQuery, setReasonQuery] = useState("");
  const [chiefComplaintDialogOpen, setChiefComplaintDialogOpen] = useState(false);
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");

  // Step flow: 1 = booking form, 2 = review & pay
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

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

  // ── Fetch medications for Refill (3-TIER FALLBACK) ──────────
  // 1. Live API (DrChrono)  2. Export API (Supabase)  3. Static JSON (fully offline)
  useEffect(() => {
    if (visitType === "refill" && patient?.id) {
      setMedsLoading(true);
      const email = patient.email || '';
      console.log('[Express] Fetching meds for patient:', patient.id);

      const tryStaticFile = () => {
        console.log('[Express] Tier 3: Static JSON file (offline)...');
        fetch('/data/patient-medications.json')
          .then(r => r.json())
          .then(fileData => {
            const pts = fileData.patients || [];
            const match = pts.find((p: any) => (p.email || '').toLowerCase() === email.toLowerCase());
            if (match?.medications?.length > 0) {
              const seen = new Set<string>();
              const meds = match.medications
                .filter((m: any) => { const k = (m.name||'').toLowerCase().trim(); if (!k||k.length<2||seen.has(k)) return false; seen.add(k); return true; })
                .map((m: any) => ({ name: m.name, dosage: m.dosage||'', source: 'Offline', is_active: m.status!=='inactive'&&!m.date_stopped }));
              console.log('[Express] Static file:', meds.length, 'meds');
              setMedications(meds);
            }
            setMedsLoading(false);
          })
          .catch(() => { console.log('[Express] All 3 tiers failed'); setMedsLoading(false); });
      };

      const tryExportApi = () => {
        console.log('[Express] Tier 2: Export API...');
        fetch(`/api/medications-from-export?patientId=${patient.id}&email=${encodeURIComponent(email)}`)
          .then(r => r.json())
          .then(fb => {
            if (fb.medications?.length > 0) { console.log('[Express] Export:', fb.count, fb.source); setMedications(fb.medications); setMedsLoading(false); }
            else tryStaticFile();
          })
          .catch(() => tryStaticFile());
      };

      fetch(`/api/medications?patientId=${patient.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.medications?.length > 0) { console.log('[Express] Live:', data.count); setMedications(data.medications); setMedsLoading(false); }
          else tryExportApi();
        })
        .catch(() => tryExportApi());
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
      // Controlled substances: need controlled ack + async ack
      if (hasControlledSelected) {
        return !!(selectedMeds.length > 0 && controlledAcknowledged && asyncAcknowledged);
      }
      return !!(selectedMeds.length > 0 && asyncAcknowledged);
    }

    // Instant
    return !!asyncAcknowledged;
  }, [reason, needsCalendar, appointmentDate, appointmentTime, visitType, selectedMeds, hasControlledSelected, asyncAcknowledged, controlledAcknowledged]);

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
    setControlledAcknowledged(false);
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
    // If controlled substance was selected, show the scheduling screen instead of redirecting
    if (hasControlledSelected) {
      setShowControlledScheduler(true);
      return;
    }
    // Normal flow
    const stored = sessionStorage.getItem("appointmentData");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.accessToken) { router.push(`/appointment/${data.accessToken}`); return; }
      } catch {}
    }
    router.push("/success");
  };

  // ── Schedule controlled substance live visit ────────────────
  const handleControlledSchedule = async () => {
    if (!controlledScheduleDate || !controlledScheduleTime) {
      setScheduleError("Please select a date and time for your live visit.");
      return;
    }
    setSchedulingAppointment(true);
    setScheduleError(null);

    try {
      // Update the existing appointment to video/phone with scheduled time
      const stored = sessionStorage.getItem("appointmentData");
      const existingData = stored ? JSON.parse(stored) : {};

      const updatePayload = {
        appointmentId: existingData.appointmentId,
        visitType: controlledVisitType,
        appointmentDate: controlledScheduleDate,
        appointmentTime: controlledScheduleTime,
        notes: `[AUTO-UPGRADED] Controlled substance refill requires live ${controlledVisitType} visit. Original: Rx Refill. Medications: ${selectedMeds.join(", ")}`,
      };

      const res = await fetch("/api/update-appointment-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        // If update API doesn't exist, create a new appointment
        const createRes = await fetch("/api/create-appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentData: {
              ...existingData,
              visitType: controlledVisitType,
              appointmentDate: controlledScheduleDate,
              appointmentTime: controlledScheduleTime,
              chief_complaint: `[CONTROLLED SUBSTANCE - LIVE VISIT REQUIRED] Rx Refill: ${selectedMeds.join(", ")}. ${existingData.chief_complaint || ""}`,
            },
          }),
        });
        if (!createRes.ok) throw new Error("Failed to schedule live visit");
      }

      // Update session storage with new visit type and time
      sessionStorage.setItem("appointmentData", JSON.stringify({
        ...existingData,
        visitType: controlledVisitType,
        appointmentDate: controlledScheduleDate,
        appointmentTime: controlledScheduleTime,
      }));

      // Redirect to success
      if (existingData.accessToken) {
        router.push(`/appointment/${existingData.accessToken}`);
      } else {
        router.push("/success");
      }
    } catch (err: any) {
      setScheduleError(err.message || "Failed to schedule. Please try again.");
      setSchedulingAppointment(false);
    }
  };

  // ── Not-ready prompt ───────────────────────────────────────
  const notReadyMessage = useMemo(() => {
    if (!reason) return "Select a reason for visit to continue";
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return "Select date & time to continue";
    if (visitType === "refill" && selectedMeds.length === 0) return "Select medications to refill";
    if (visitType === "refill" && hasControlledSelected && !controlledAcknowledged) return "Acknowledge controlled substance terms to continue";
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
  // POST-PAYMENT: Controlled Substance Live Visit Scheduler
  // ═══════════════════════════════════════════════════════════
  if (showControlledScheduler) {
    // Generate next 7 days of available time slots
    const getAvailableDates = () => {
      const dates: { label: string; value: string; dayLabel: string }[] = [];
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const value = d.toISOString().split("T")[0];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dates.push({
          label: `${monthNames[d.getMonth()]} ${d.getDate()}`,
          value,
          dayLabel: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[d.getDay()],
        });
      }
      return dates;
    };

    const getTimeSlots = () => {
      const slots: { label: string; value: string }[] = [];
      const isToday = controlledScheduleDate === new Date().toISOString().split("T")[0];
      const currentHour = new Date().getHours();
      for (let h = 9; h <= 21; h++) {
        if (isToday && h <= currentHour) continue;
        for (const m of [0, 30]) {
          const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const ampm = h >= 12 ? "PM" : "AM";
          slots.push({
            label: `${hr}:${String(m).padStart(2, "0")} ${ampm}`,
            value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
          });
        }
      }
      return slots;
    };

    const controlledMeds = selectedMeds.filter(m => isControlledSubstance(m));

    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Success Banner */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center mb-6">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={28} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Payment Successful!</h2>
            <p className="text-sm text-gray-400">One more step to complete your booking</p>
          </div>

          {/* Controlled Substance Notice — GOOD NEWS */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-green-400 font-bold text-sm mb-1">🎉 Great News!</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  The DEA has extended telemedicine flexibilities through <span className="text-green-300 font-semibold">2026</span> — controlled 
                  substances like <span className="text-white font-semibold">{controlledMeds.join(", ")}</span> can be prescribed via 
                  telehealth (video or phone) <span className="text-green-300 font-semibold">without an in-person visit</span>.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed mt-1.5">
                  All that&apos;s needed is a brief live consultation with your provider. Select a date and 
                  time below — your visit has been upgraded at <span className="text-white font-semibold">no additional cost</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Visit Type Toggle */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Select visit type</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "video" as const, icon: Video, label: "Video Call", desc: "Face-to-face via camera" },
                { key: "phone" as const, icon: Phone, label: "Phone Call", desc: "Private phone line" },
              ]).map(opt => (
                <button key={opt.key} onClick={() => setControlledVisitType(opt.key)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    controlledVisitType === opt.key
                      ? "bg-primary-teal/10 border-primary-teal/40 text-white"
                      : "bg-[#11161c] border-white/10 text-gray-400 hover:border-white/20"
                  }`}>
                  <opt.icon size={20} className={controlledVisitType === opt.key ? "text-primary-teal" : "text-gray-500"} />
                  <div className="text-left">
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-[10px] opacity-60">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Select a date</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {getAvailableDates().map(d => (
                <button key={d.value} onClick={() => { setControlledScheduleDate(d.value); setControlledScheduleTime(""); }}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all ${
                    controlledScheduleDate === d.value
                      ? "bg-primary-teal/10 border-primary-teal/40 text-white"
                      : "bg-[#11161c] border-white/10 text-gray-400 hover:border-white/20"
                  }`}>
                  <span className="text-[10px] font-bold">{d.dayLabel}</span>
                  <span className="text-sm font-semibold">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {controlledScheduleDate && (
            <div className="mb-6">
              <label className="text-xs text-gray-500 mb-2 block">Select a time</label>
              <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                {getTimeSlots().map(t => (
                  <button key={t.value} onClick={() => setControlledScheduleTime(t.value)}
                    className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
                      controlledScheduleTime === t.value
                        ? "bg-primary-teal/20 border-primary-teal/40 text-primary-teal"
                        : "bg-[#11161c] border-white/10 text-gray-400 hover:border-white/20"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {scheduleError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs mb-4">{scheduleError}</div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleControlledSchedule}
            disabled={!controlledScheduleDate || !controlledScheduleTime || schedulingAppointment}
            className="w-full bg-primary-teal hover:bg-teal-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg"
          >
            {schedulingAppointment ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Scheduling...
              </>
            ) : (
              <>
                <Check size={18} />
                Confirm {controlledVisitType === "video" ? "Video" : "Phone"} Visit
              </>
            )}
          </button>

          {/* Selected summary */}
          {controlledScheduleDate && controlledScheduleTime && (
            <div className="mt-3 bg-[#11161c] border border-white/10 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">
                Your <span className="text-primary-teal font-semibold">{controlledVisitType === "video" ? "Video" : "Phone"} Visit</span>{" "}
                is set for{" "}
                <span className="text-white font-semibold">
                  {new Date(controlledScheduleDate + "T" + controlledScheduleTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {" at "}
                  {(() => {
                    const [h, m] = controlledScheduleTime.split(":").map(Number);
                    const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
                    return `${hr}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
                  })()}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2 — REVIEW & PAY (matches design image exactly)
  // ═══════════════════════════════════════════════════════════
  if (currentStep === 2) {
    return (
      <div className="min-h-screen text-white font-sans" style={{ background: 'linear-gradient(to bottom, #0a1a15 0%, #080c10 18%, #080c10 100%)' }}>
        <div className="max-w-[393px] mx-auto px-4 pb-10">

          {/* ═══ ELEMENT 1 — Privacy Hero Banner ═══ */}
          <div className="text-center pt-8 pb-2">
            <div className="text-[11px] font-bold text-[#f97316] tracking-wide">
              &quot;I AM WHEN
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Shield size={18} className="text-[#2dd4a0]" />
              <span className="text-white font-black tracking-wide" style={{ fontSize: '21px' }}>
                YOUR PRIVACY MATTERS
              </span>
              <span className="text-[#f97316]" style={{ fontSize: '18px' }}>&quot;</span>
            </div>
            <div className="text-[#2dd4a0] font-semibold text-[12px] mt-1 italic">
              Medazon Health
            </div>
          </div>

          {/* ═══ ELEMENT 2 — Provider Photo ═══ */}
          <div className="flex justify-center -mt-1 mb-3">
            <div className="overflow-hidden" style={{
              width: '130px', height: '130px', borderRadius: '50%',
              border: '3px solid #2dd4a0',
              boxShadow: '0 0 25px rgba(45,212,160,0.35)',
            }}>
              <img src="/assets/provider-lamonica.png" alt="LaMonica A. Hodges"
                className="w-full h-full object-cover object-top" />
            </div>
          </div>

          {/* ═══ ELEMENT 3 — Provider Name & Credentials ═══ */}
          <div className="text-center mb-1">
            <h2 className="font-black text-white" style={{ fontSize: '28px', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
              LaMonica A. Hodges
            </h2>
            <p className="font-medium mt-0.5" style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)' }}>
              MSN, APRN, FNP-C
            </p>
            <p className="font-semibold text-[#2dd4a0] mt-0.5" style={{ fontSize: '14px' }}>
              Board-Certified · 10+ Years Experience
            </p>
          </div>

          {/* ═══ ELEMENT 4 — COMFIRM APPROVED BOOKING ═══ */}
          <div className="text-center mt-2 mb-4">
            <span className="font-black italic text-[#2dd4a0]" style={{ fontSize: '24px' }}>COMFIRM </span>
            <span className="font-black italic text-[#f59e0b]" style={{ fontSize: '24px' }}>APPROVED </span>
            <span className="font-black italic text-[#2dd4a0]" style={{ fontSize: '24px' }}>BOOKING</span>
          </div>

          {/* ═══ ELEMENT 5 — Service Dropdown ═══ */}
          <button onClick={() => { setCurrentStep(1); }}
            className="w-full flex items-center justify-between mb-3"
            style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px' }}>
            <span className="text-white font-medium" style={{ fontSize: '14px' }}>{reason || "Select Service"}</span>
            <span style={{ color: '#666', fontSize: '12px' }}>▾</span>
          </button>

          {/* ═══ ELEMENT 6 — Visit Type Toggle ═══ */}
          <div className="flex mb-3" style={{ gap: '10px' }}>
            <button
              onClick={() => { if (needsCalendar) handleVisitTypeChange("video"); }}
              className="font-bold"
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                ...((needsCalendar ? visitType === "video" : true)
                  ? { background: '#2dd4a0', color: '#000' }
                  : { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#888' }),
              }}>
              Video Visit
            </button>
            <button
              onClick={() => { if (needsCalendar) handleVisitTypeChange("phone"); }}
              className="font-bold"
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                ...((needsCalendar && visitType === "phone")
                  ? { background: '#2dd4a0', color: '#000' }
                  : { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#888' }),
              }}>
              Phone Visit
            </button>
          </div>

          {/* ═══ ELEMENT 7 — Date/Time Selector ═══ */}
          {needsCalendar ? (
            <button onClick={() => { setDateTimeDialogOpen(true); setDateTimeMode("date"); }}
              className="w-full flex items-center justify-between mb-3"
              style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(45,212,160,0.08)', border: '1px solid rgba(45,212,160,0.2)' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '16px' }}>📅</span>
                <span className="text-white font-semibold" style={{ fontSize: '14px' }}>
                  {formatDisplayDateTime() || "Select Date & Time"}
                </span>
              </div>
              <span style={{ color: '#666', fontSize: '12px' }}>▾</span>
            </button>
          ) : isAsync && selectedMeds.length > 0 ? (
            <div className="w-full mb-3" style={{
              padding: '12px 16px', borderRadius: '12px',
              background: 'rgba(45,212,160,0.08)', border: '1px solid rgba(45,212,160,0.2)'
            }}>
              <span className="text-[#2dd4a0] font-bold" style={{ fontSize: '12px' }}>
                ✓ {selectedMeds.length} medication{selectedMeds.length > 1 ? "s" : ""} selected for refill
              </span>
            </div>
          ) : null}

          {/* ═══ ELEMENT 8 — Price ═══ */}
          <div className="text-center mb-3">
            <span className="text-[#2dd4a0] font-extrabold" style={{ fontSize: '18px' }}>
              {currentPrice.display} per visit
            </span>
          </div>

          {/* ═══ ELEMENTS 9-11 — Payment ═══ */}
          {clientSecret && stripeOptions ? (
            <Elements options={stripeOptions} stripe={stripePromise}>
              <Step2PaymentForm
                patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType}
                appointmentDate={appointmentDate} appointmentTime={appointmentTime}
                currentPrice={currentPrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress}
                selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin w-5 h-5 border-2 border-[#2dd4a0] border-t-transparent rounded-full" />
              <span className="ml-2 text-gray-400 text-xs">Loading payment...</span>
            </div>
          )}

        </div>

        {/* Date/Time dialog overlay */}
        {dateTimeDialogOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70" onClick={() => setDateTimeDialogOpen(false)}>
            <div className="bg-[#0d1218] border-t border-white/10 rounded-t-2xl w-full max-w-lg p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm">
                  {dateTimeMode === "date" ? "Select Date" : "Select Time"}
                </span>
                <button onClick={() => setDateTimeDialogOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
              </div>
              <AppointmentCalendar
                mode={dateTimeMode}
                selectedDate={appointmentDate}
                selectedTime={appointmentTime}
                onDateSelect={(d: string) => { setAppointmentDate(d); setDateTimeMode("time"); }}
                onTimeSelect={(t: string) => { setAppointmentTime(t); setDateTimeDialogOpen(false); setClientSecret(""); }}
              />
            </div>
          </div>
        )}

        {/* DEA Info Popup */}
        {showDeaInfoPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowDeaInfoPopup(false)}>
            <div className="bg-[#11161c] border border-amber-500/30 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-amber-400 font-bold text-sm">DEA/Ryan Haight Act</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Federal Controlled Substance Requirements</p>
                </div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Under federal law, the <span className="text-white font-semibold">Ryan Haight Online Pharmacy Consumer Protection Act</span> requires
                  that controlled substances (Schedule II–V) be prescribed only after a valid practitioner-patient
                  relationship has been established via a <span className="text-white font-semibold">live medical evaluation</span>.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed mt-2">
                  The DEA has extended telemedicine flexibilities through <span className="text-amber-300 font-semibold">December 31, 2026</span>.
                </p>
              </div>
              <button onClick={() => setShowDeaInfoPopup(false)}
                className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-sm rounded-xl transition-colors border border-amber-500/30">
                I Understand
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1 — BOOKING FORM (original render)
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

          {/* Preferred Pharmacy — 2nd field */}
          <div className="space-y-1">
            <PharmacySelector
              value={pharmacy}
              onChange={(val: string) => setPharmacy(val)}
              placeholder="Preferred Pharmacy"
              className="w-full bg-[#11161c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-teal placeholder:text-gray-500"
            />
          </div>

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

              {/* Medication Selector (Refill only) — collapsible */}
              {visitType === "refill" && (
                <div className="bg-[#11161c] border border-white/10 rounded-xl p-3 space-y-2">
                  <button type="button"
                    onClick={() => setMedsListOpen(!medsListOpen)}
                    className="w-full flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {selectedMeds.length > 0
                        ? `${selectedMeds.length} Medication${selectedMeds.length > 1 ? "s" : ""} Selected`
                        : "Select Medications to Refill"}
                    </span>
                    <div className="flex items-center gap-2">
                      {medsLoading && <div className="animate-spin w-3 h-3 border border-primary-teal border-t-transparent rounded-full" />}
                      <ChevronDown size={14} className={`text-gray-500 transition-transform ${medsListOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Selected meds summary (shown when collapsed) */}
                  {!medsListOpen && selectedMeds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedMeds.map(m => (
                        <span key={m} className="text-[9px] bg-primary-teal/10 text-primary-teal border border-primary-teal/20 px-1.5 py-0.5 rounded-full font-medium">
                          {m} {isControlledSubstance(m) ? "⚠️" : "✓"}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded medication list */}
                  {medsListOpen && (
                    <>
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

                      {/* Done / Close button */}
                      {selectedMeds.length > 0 && (
                        <button type="button" onClick={() => setMedsListOpen(false)}
                          className="w-full py-2 rounded-lg bg-primary-teal/10 border border-primary-teal/20 text-primary-teal text-xs font-bold transition-colors hover:bg-primary-teal/20">
                          Done — {selectedMeds.length} selected ✓
                        </button>
                      )}
                    </>
                  )}

                  {/* Controlled substance acknowledgment */}
                  {hasControlledSelected && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-start gap-2 pl-1">
                        <input type="checkbox" id="controlledAck" checked={controlledAcknowledged}
                          onChange={(e) => { setControlledAcknowledged(e.target.checked); setClientSecret(""); }}
                          className="mt-0.5 w-4 h-4 rounded border-amber-500/50 bg-[#0d1218] text-amber-500 focus:ring-amber-500"
                        />
                        <label htmlFor="controlledAck" className="text-[10px] text-gray-400 leading-relaxed">
                          <span className="text-white font-semibold">I understand and accept</span>{" "}
                          that this is a controlled substance request. I have read and understand the{" "}
                          <button type="button" onClick={() => setShowDeaInfoPopup(true)}
                            className="text-amber-400 underline underline-offset-2 decoration-amber-400/50 font-semibold hover:text-amber-300 transition-colors">
                            DEA/Ryan Haight Act requirements
                          </button>. I acknowledge that my selected controlled medication(s) may require a live video or phone 
                          visit with a licensed provider.
                        </label>
                      </div>
                    </div>
                  )}

                  {/* DEA Info Popup */}
                  {showDeaInfoPopup && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowDeaInfoPopup(false)}>
                      <div className="bg-[#11161c] border border-amber-500/30 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Shield size={18} className="text-amber-400" />
                          </div>
                          <div>
                            <h3 className="text-amber-400 font-bold text-sm">DEA/Ryan Haight Act</h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">Federal Controlled Substance Requirements</p>
                          </div>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                          <p className="text-xs text-gray-300 leading-relaxed">
                            Under federal law, the <span className="text-white font-semibold">Ryan Haight Online Pharmacy Consumer Protection Act</span> requires 
                            that controlled substances (Schedule II–V) be prescribed only after a valid practitioner-patient 
                            relationship has been established. This generally requires at least one <span className="text-white font-semibold">live medical evaluation</span> via 
                            video or phone consultation before a controlled medication can be prescribed.
                          </p>
                          <p className="text-xs text-gray-400 leading-relaxed mt-2">
                            The DEA has extended telemedicine flexibilities through <span className="text-amber-300 font-semibold">December 31, 2026</span>, allowing 
                            practitioners to prescribe controlled substances via audio-video telemedicine visits without 
                            a prior in-person examination. Your provider will conduct a brief live consultation to ensure 
                            your safety and the appropriateness of the prescribed medication.
                          </p>
                        </div>
                        <button onClick={() => setShowDeaInfoPopup(false)}
                          className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-sm rounded-xl transition-colors border border-amber-500/30">
                          I Understand
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

              {/* Photo Upload + Camera Capture */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 pl-1">Photo (optional) — Rx label, symptoms, ID, etc.</label>
                <div className="flex gap-2">
                  {/* Camera Capture Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.setAttribute('capture', 'environment');
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
                        setPhotoFile(file);
                        setPhotoPreview(URL.createObjectURL(file));
                      };
                      input.click();
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-[#11161c] border border-white/10 rounded-xl hover:border-primary-teal/30 transition-all flex-1"
                  >
                    <Camera size={16} className="text-primary-teal" />
                    <span className="text-sm text-gray-300">Take Photo</span>
                  </button>
                  {/* File Upload Button */}
                  <label className="flex items-center gap-2 px-4 py-3 bg-[#11161c] border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all flex-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-sm text-gray-400">Upload File</span>
                    <input type="file" accept="image/*,.pdf" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>
                {/* Preview */}
                {photoPreview && (
                  <div className="relative inline-block mt-2">
                    <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-white/10" />
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X size={10} className="text-white" />
                    </button>
                    <span className="text-[9px] text-gray-500 block mt-1">{photoFile?.name}</span>
                  </div>
                )}
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

          {/* ── Continue to Step 2 (Review & Pay) ─────────────── */}
          {allFieldsReady && (
            <button onClick={() => setCurrentStep(2)}
              className="w-full bg-primary-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-lg">
              Continue to Payment <ChevronDown size={16} className="rotate-[-90deg]" />
            </button>
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
