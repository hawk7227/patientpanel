"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import {
  Zap, Calendar, ChevronDown, X, Clock, Lock, Search,
  Phone, Video, Pill, Camera, AlertTriangle, Shield, Check, Star, Upload,
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
  firstName: string; lastName: string; email: string; phone: string;
  dateOfBirth: string; address: string; id: string | null; source: string;
  pharmacy?: string; drchronoPatientId?: number;
}

interface MedicationItem {
  name: string; dosage?: string; source: string; is_active: boolean;
}

interface PharmacyInfo {
  name: string; address: string; photo?: string; rating?: number;
  reviewCount?: number; isOpen?: boolean;
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
// LocalStorage helpers for answer persistence
// ═══════════════════════════════════════════════════════════════
const STORAGE_KEY = "medazon_express_answers";

function saveAnswers(answers: Record<string, any>) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...answers }));
  } catch {}
}

function loadAnswers(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function clearAnswers() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

const convertDateToISO = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) return dateStr;
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  return dateStr;
};

// ═══════════════════════════════════════════════════════════════
// Step 2 Payment Form — single viewport, no scroll
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
  const [showCardSlide, setShowCardSlide] = useState(false);

  // ⚠️ BYPASS MODE — FORCED ON FOR TESTING. Remove after verifying appointments reach doctor side.
  const isTestMode = true;
  // const isTestMode =
  //   process.env.NEXT_PUBLIC_SKIP_PAYMENT === "true" ||
  //   (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true");

  const handlePay = async () => {
    if (!acceptedTerms) { setError("Please accept the terms to continue."); return; }
    setIsProcessing(true); setError(null); setProgress(5); setStatusText("Starting payment process...");

    try {
      setProgress(15); setStatusText("Checking patient record...");
      let patientId = patient.id;

      if (isTestMode) {
        // BYPASS MODE — skip patient creation, skip payment
        if (!patientId) {
          patientId = `test_patient_${Date.now()}`;
          setProgress(25); setStatusText("Test mode — skipping patient creation...");
        }
        setProgress(45); setStatusText("Test mode — skipping payment...");
        const paymentIntent = { id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, status: "succeeded" };
        await new Promise((r) => setTimeout(r, 500));

        setProgress(75); setStatusText("Creating appointment...");
        const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isAsyncVisit = visitType === "instant" || visitType === "refill";
        let fullChiefComplaint = chiefComplaint || reason || "Test visit";
        if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
        if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

        const appointmentPayload = {
          payment_intent_id: paymentIntent.id,
          appointmentData: {
            email: patient.email || "test@medazon.com", firstName: patient.firstName || "Test", lastName: patient.lastName || "Patient",
            phone: patient.phone || "0000000000", dateOfBirth: convertDateToISO(patient.dateOfBirth) || "1990-01-01",
            streetAddress: patient.address || "Test Address", symptoms: reason || "Test", chief_complaint: fullChiefComplaint,
            visitType, appointmentDate: isAsyncVisit ? new Date().toISOString().split("T")[0] : appointmentDate,
            appointmentTime: isAsyncVisit ? new Date().toTimeString().slice(0, 5) : appointmentTime,
            patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: !!patient.id,
            pharmacy: pharmacy || patient.pharmacy || "", pharmacyAddress: pharmacyAddress || "",
            browserInfo: (() => { try { return sessionStorage.getItem("browserInfo") || ""; } catch { return ""; } })(),
          },
        };

        const appointmentRes = await fetch("/api/create-appointment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentPayload),
        });
        const appointmentResult = await appointmentRes.json();
        if (!appointmentRes.ok) throw new Error(appointmentResult.error || "Failed to create appointment");

        setProgress(100); setStatusText("Appointment booked!");
        sessionStorage.setItem("appointmentData", JSON.stringify({
          ...appointmentPayload.appointmentData,
          appointmentId: appointmentResult.appointmentId,
          accessToken: appointmentResult.accessToken,
          payment_intent_id: paymentIntent.id,
        }));
        clearAnswers();
        await new Promise((r) => setTimeout(r, 800));
        onSuccess();
        return;
      }

      // NORMAL MODE — real patient creation + real payment
      if (!patientId) {
        setProgress(25); setStatusText("Creating patient record...");
        const createRes = await fetch("/api/check-create-patient", {
          method: "POST", headers: { "Content-Type": "application/json" },
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

      setProgress(45); setStatusText("Processing payment...");
      let paymentIntent: any = null; let paymentError: any = null;

      if (isTestMode) {
        paymentIntent = { id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, status: "succeeded" };
        await new Promise((r) => setTimeout(r, 500));
      } else {
        if (!stripe || !elements) { setError("Payment not ready. Please try again."); setIsProcessing(false); return; }
        setProgress(55); setStatusText("Confirming payment...");
        const result = await stripe.confirmPayment({
          elements, redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/success`,
            payment_method_data: { billing_details: { name: `${patient.firstName} ${patient.lastName}`, email: patient.email, phone: patient.phone } },
          },
        });
        paymentError = result.error; paymentIntent = result.paymentIntent;
      }

      if (paymentError) { setError(paymentError.message || "Payment failed."); setIsProcessing(false); return; }

      if (paymentIntent?.status === "succeeded") {
        setProgress(75); setStatusText("Creating appointment...");
        const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isAsync = visitType === "instant" || visitType === "refill";
        let fullChiefComplaint = chiefComplaint || reason;
        if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
        if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

        const appointmentPayload = {
          payment_intent_id: paymentIntent.id,
          appointmentData: {
            email: patient.email, firstName: patient.firstName, lastName: patient.lastName,
            phone: patient.phone, dateOfBirth: convertDateToISO(patient.dateOfBirth),
            streetAddress: patient.address, symptoms: reason, chief_complaint: fullChiefComplaint,
            visitType, appointmentDate: isAsync ? new Date().toISOString().split("T")[0] : appointmentDate,
            appointmentTime: isAsync ? new Date().toTimeString().slice(0, 5) : appointmentTime,
            patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: true,
            pharmacy: pharmacy || patient.pharmacy || "", pharmacyAddress: pharmacyAddress || "",
            browserInfo: (() => { try { return sessionStorage.getItem("browserInfo") || ""; } catch { return ""; } })(),
          },
        };

        const appointmentRes = await fetch("/api/create-appointment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentPayload),
        });
        const appointmentResult = await appointmentRes.json();
        if (!appointmentRes.ok) throw new Error(appointmentResult.error || "Failed to create appointment");

        setProgress(100); setStatusText("Appointment booked!");
        sessionStorage.setItem("appointmentData", JSON.stringify({
          ...appointmentPayload.appointmentData,
          appointmentId: appointmentResult.appointmentId,
          accessToken: appointmentResult.accessToken,
          payment_intent_id: paymentIntent.id,
        }));
        clearAnswers();
        await new Promise((r) => setTimeout(r, 800));
        onSuccess();
      }
    } catch (err: any) {
      console.error("Express checkout error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="w-full space-y-2 py-1">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-[#2dd4a0] rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="text-[12px] text-gray-300 text-center">{statusText}</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-1.5">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1.5 rounded-lg text-[10px]">{error}</div>}
        {!isTestMode ? (
          <div className="rounded-xl overflow-hidden" style={{ maxHeight: '48px' }}>
            <PaymentElement options={{ layout: { type: "accordion", defaultCollapsed: true, radios: false, spacedAccordionItems: false }, paymentMethodOrder: ["google_pay", "apple_pay"], wallets: { applePay: "auto", googlePay: "auto" }, fields: { billingDetails: { name: "never", email: "never", phone: "never" } } }} />
          </div>
        ) : (
          <button onClick={handlePay} disabled={!acceptedTerms} className="w-full bg-white rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            <span className="text-black font-semibold text-sm">Test Pay {currentPrice.display}</span>
          </button>
        )}
        <button onClick={() => setShowCardSlide(true)} className="w-full text-center py-0.5">
          <span className="text-[#2dd4a0] text-[11px] font-extrabold tracking-wider uppercase">OR PAY WITH CARD</span>
        </button>
        <div className="flex items-start gap-1.5">
          <input type="checkbox" id="step2Terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="flex-shrink-0 mt-[1px]" style={{ width: '12px', height: '12px', borderRadius: '2px', accentColor: '#2dd4a0' }} />
          <label htmlFor="step2Terms" className="leading-[1.4]" style={{ fontSize: '7px', color: '#888' }}>
            By confirming, I agree to the <span className="text-[#2dd4a0] underline">Terms of Service</span>, <span className="text-[#2dd4a0] underline">Privacy Policy</span>, and <span className="text-[#2dd4a0] underline">Cancellation Policy</span>. By requesting a provider appointment, I acknowledge that my card will not be charged until a provider accepts my appointment request. Once accepted, I authorize a one-time charge of <strong className="text-white">{currentPrice.display}.00</strong> (flat, non-refundable) for this visit.
          </label>
        </div>
      </div>
      {showCardSlide && (
        <div className="fixed inset-0 z-[150] flex items-end" onClick={() => setShowCardSlide(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full bg-[#0d1218] border-t border-[#2dd4a0]/30 rounded-t-2xl p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Lock size={14} className="text-[#2dd4a0]" /><span className="text-white font-bold text-sm">Pay with Card</span></div>
              <button onClick={() => setShowCardSlide(false)} className="text-gray-400 hover:text-white p-1"><X size={18} /></button>
            </div>
            <div className="rounded-xl overflow-hidden">
              <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { applePay: "never", googlePay: "never", link: "never" }, fields: { billingDetails: { name: "never", email: "never", phone: "never" } } }} />
            </div>
            <button onClick={handlePay} disabled={!stripe || !elements || !acceptedTerms} className="w-full text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-[15px]" style={{ background: '#2dd4a0' }}>Pay {currentPrice.display} & Book</button>
            {!acceptedTerms && <p className="text-center text-[10px] text-amber-400">↑ Please accept the terms above first</p>}
          </div>
        </div>
      )}
      <style jsx>{`@keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } }`}</style>
    </>
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

  // Async-specific fields
  const [symptomsText, setSymptomsText] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [pharmacyInfo, setPharmacyInfo] = useState<PharmacyInfo | null>(null);
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
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");

  // Guided Sequence State
  const [visitTypePopup, setVisitTypePopup] = useState<VisitType | null>(null);
  const [wantToTalk, setWantToTalk] = useState(false);
  const [additionalMedsAnswer, setAdditionalMedsAnswer] = useState<"yes" | "no" | null>(null);
  const [chiefComplaintDone, setChiefComplaintDone] = useState(false);
  const [visitTypeConfirmed, setVisitTypeConfirmed] = useState(false);
  // Step flow: 1 = booking form, 2 = review & pay
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [clientSecret, setClientSecret] = useState("");
  const currentPrice = useMemo(() => getPrice(visitType), [visitType]);
  const needsCalendar = VISIT_TYPES.find(v => v.key === visitType)?.needsCalendar ?? false;
  const isAsync = visitType === "instant" || visitType === "refill";

  // ── Browser back button: Step 2 → Step 1 (not landing page) ──
  useEffect(() => {
    if (currentStep === 2) {
      window.history.pushState({ step: 2 }, "");
    }
  }, [currentStep]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (currentStep === 2) {
        e.preventDefault();
        setCurrentStep(1);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentStep]);

  // ── Load patient ───────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("expressPatient");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setPatient(p);
        if (p.id) { import('@/lib/hybrid-data').then(({ warmPatientCache }) => warmPatientCache(p.id!)).catch(() => {}); }
      } catch { router.push("/"); }
    } else { router.push("/"); }
    // Capture browser info if not already stored (fallback for direct navigation)
    if (!sessionStorage.getItem("browserInfo")) {
      try {
        const ua = navigator.userAgent;
        const bi = { userAgent: ua, screen: `${window.screen.width}x${window.screen.height}`, language: navigator.language, platform: navigator.platform || "unknown", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0, connectionType: (navigator as any).connection?.effectiveType || "unknown", timestamp: new Date().toISOString() };
        sessionStorage.setItem("browserInfo", JSON.stringify(bi));
      } catch {}
    }
  }, [router]);

  // ── Restore saved answers from localStorage ──────────────
  useEffect(() => {
    const s = loadAnswers();
    if (s.reason) setReason(s.reason);
    if (s.chiefComplaint) { setChiefComplaint(s.chiefComplaint); setChiefComplaintDone(true); }
    if (s.chiefComplaintDone) setChiefComplaintDone(true);
    if (s.pharmacy) setPharmacy(s.pharmacy);
    if (s.pharmacyAddress) setPharmacyAddress(s.pharmacyAddress);
    if (s.pharmacyInfo) setPharmacyInfo(s.pharmacyInfo);
    if (s.visitType) setVisitType(s.visitType);
    if (s.visitTypeConfirmed) setVisitTypeConfirmed(true);
    if (s.symptomsText) setSymptomsText(s.symptomsText);
    if (s.selectedMeds) setSelectedMeds(s.selectedMeds);
    if (s.wantToTalk !== undefined) setWantToTalk(s.wantToTalk);
    if (s.additionalMedsAnswer) setAdditionalMedsAnswer(s.additionalMedsAnswer);
    if (s.asyncAcknowledged) setAsyncAcknowledged(s.asyncAcknowledged);
    if (s.controlledAcknowledged) setControlledAcknowledged(s.controlledAcknowledged);
    if (s.appointmentDate) setAppointmentDate(s.appointmentDate);
    if (s.appointmentTime) setAppointmentTime(s.appointmentTime);
  }, []);

  // ── Fetch medications for Refill (3-TIER FALLBACK) ────────
  // Works with BOTH id-based patients (from Supabase) and email-only patients (from local JSON)
  useEffect(() => {
    if ((visitType === "refill" || visitTypePopup === "refill") && patient?.email) {
      setMedsLoading(true);
      const email = patient.email || '';
      const patientId = patient.id;
      const tryStaticFile = () => {
        fetch('/data/patient-medications.json').then(r => r.json()).then(fileData => {
          const pts = fileData.patients || [];
          const match = pts.find((p: any) => (p.email || '').toLowerCase() === email.toLowerCase());
          if (match?.medications?.length > 0) {
            const seen = new Set<string>();
            const meds = match.medications
              .filter((m: any) => { const k = (m.name||'').toLowerCase().trim(); if (!k||k.length<2||seen.has(k)) return false; seen.add(k); return true; })
              .map((m: any) => ({ name: m.name, dosage: m.dosage||'', source: 'Offline', is_active: m.status!=='inactive'&&!m.date_stopped }));
            setMedications(meds);
          }
          setMedsLoading(false);
        }).catch(() => setMedsLoading(false));
      };
      // If we have a patient ID, try the API first, then fall back to static file
      if (patientId) {
        const tryExportApi = () => {
          fetch(`/api/medications-from-export?patientId=${patientId}&email=${encodeURIComponent(email)}`)
            .then(r => r.json()).then(fb => {
              if (fb.medications?.length > 0) { setMedications(fb.medications); setMedsLoading(false); }
              else tryStaticFile();
            }).catch(() => tryStaticFile());
        };
        fetch(`/api/medications?patientId=${patientId}`).then(r => r.json()).then(data => {
          if (data.medications?.length > 0) { setMedications(data.medications); setMedsLoading(false); }
          else tryExportApi();
        }).catch(() => tryExportApi());
      } else {
        // No patient ID (local JSON patient) — go straight to static file
        tryStaticFile();
      }
    }
  }, [visitType, visitTypePopup, patient?.id, patient?.email]);

  useEffect(() => { setHasControlledSelected(selectedMeds.some(m => isControlledSubstance(m))); }, [selectedMeds]);

  // ── allFieldsReady ─────────────────────────────────────
  const allFieldsReady = useMemo(() => {
    if (!reason) return false;
    if (needsCalendar) return !!(appointmentDate && appointmentTime);
    if (visitType === "refill") {
      const hasMedsOrNotes = selectedMeds.length > 0 || symptomsText.trim().length > 0 || !!photoFile;
      if (!hasMedsOrNotes) return false;
      if (hasControlledSelected) return !!controlledAcknowledged;
      return true;
    }
    return !!asyncAcknowledged;
  }, [reason, needsCalendar, appointmentDate, appointmentTime, visitType, selectedMeds, symptomsText, photoFile, hasControlledSelected, asyncAcknowledged, controlledAcknowledged]);

  // ── Create payment intent ──────────────────────────────
  useEffect(() => {
    if (allFieldsReady && !clientSecret) {
      fetch("/api/create-payment-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: currentPrice.amount }) })
        .then(res => res.json()).then(data => { if (data.clientSecret) setClientSecret(data.clientSecret); })
        .catch(err => console.error("Payment intent error:", err));
    }
  }, [allFieldsReady, clientSecret, currentPrice.amount]);

  const handleVisitTypeChange = (type: VisitType) => {
    setVisitType(type); setClientSecret(""); setAsyncAcknowledged(false);
    // Only clear meds when switching AWAY from refill, not when selecting refill (meds already chosen in popup)
    if (type !== "refill") {
      setSelectedMeds([]); setHasControlledSelected(false); setControlledAcknowledged(false);
      saveAnswers({ visitType: type, asyncAcknowledged: false, selectedMeds: [], controlledAcknowledged: false });
    } else {
      saveAnswers({ visitType: type, asyncAcknowledged: false });
    }
  };

  const toggleMed = (name: string) => {
    const newMeds = selectedMeds.includes(name) ? selectedMeds.filter(m => m !== name) : [...selectedMeds, name];
    setSelectedMeds(newMeds); setClientSecret(""); saveAnswers({ selectedMeds: newMeds });
  };

  const stripeOptions = useMemo(() => clientSecret ? {
    clientSecret, appearance: { theme: "night" as const, variables: { colorPrimary: "#00CBA9", colorBackground: "#11161c", colorText: "#ffffff", borderRadius: "8px" } },
  } : undefined, [clientSecret]);

  const filteredReasons = useMemo(() => {
    if (!reasonQuery.trim()) return symptomSuggestions;
    const q = reasonQuery.toLowerCase();
    return symptomSuggestions.filter((s: { name: string; smart_search?: string[] }) =>
      s.name.toLowerCase().includes(q) || s.smart_search?.some((kw: string) => kw.toLowerCase().includes(q)));
  }, [reasonQuery]);

  const formatDisplayDateTime = useCallback(() => {
    if (!appointmentDate || !appointmentTime) return null;
    const [year, month, day] = appointmentDate.split("-").map(Number);
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const h = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const ampm = hours >= 12 ? "pm" : "am";
    return `${dayNames[date.getDay()]}, ${monthNames[month-1]} ${day}, ${year} — ${h}:${String(minutes).padStart(2,"0")}${ampm}`;
  }, [appointmentDate, appointmentTime]);

  const handleSuccess = () => {
    if (hasControlledSelected) { setShowControlledScheduler(true); return; }
    const stored = sessionStorage.getItem("appointmentData");
    if (stored) { try { const data = JSON.parse(stored); if (data.accessToken) { router.push(`/appointment/${data.accessToken}`); return; } } catch {} }
    router.push("/success");
  };

  const handleControlledSchedule = async () => {
    if (!controlledScheduleDate || !controlledScheduleTime) { setScheduleError("Please select a date and time for your live visit."); return; }
    setSchedulingAppointment(true); setScheduleError(null);
    try {
      const stored = sessionStorage.getItem("appointmentData");
      const existingData = stored ? JSON.parse(stored) : {};
      const updatePayload = { appointmentId: existingData.appointmentId, visitType: controlledVisitType, appointmentDate: controlledScheduleDate, appointmentTime: controlledScheduleTime, notes: `[AUTO-UPGRADED] Controlled substance refill requires live ${controlledVisitType} visit. Medications: ${selectedMeds.join(", ")}` };
      const res = await fetch("/api/update-appointment-type", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatePayload) });
      if (!res.ok) {
        const createRes = await fetch("/api/create-appointment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentData: { ...existingData, visitType: controlledVisitType, appointmentDate: controlledScheduleDate, appointmentTime: controlledScheduleTime, chief_complaint: `[CONTROLLED SUBSTANCE - LIVE VISIT REQUIRED] Rx Refill: ${selectedMeds.join(", ")}. ${existingData.chief_complaint || ""}` } }) });
        if (!createRes.ok) throw new Error("Failed to schedule live visit");
      }
      sessionStorage.setItem("appointmentData", JSON.stringify({ ...existingData, visitType: controlledVisitType, appointmentDate: controlledScheduleDate, appointmentTime: controlledScheduleTime }));
      clearAnswers();
      if (existingData.accessToken) { router.push(`/appointment/${existingData.accessToken}`); } else { router.push("/success"); }
    } catch (err: any) { setScheduleError(err.message || "Failed to schedule. Please try again."); setSchedulingAppointment(false); }
  };

  const notReadyMessage = useMemo(() => {
    if (!reason) return "Select a reason for visit to continue";
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return "Select date & time to continue";
    if (visitType === "refill" && selectedMeds.length === 0) return "Select medications to refill";
    if (visitType === "refill" && hasControlledSelected && !controlledAcknowledged) return "Acknowledge controlled substance terms to continue";
    if (isAsync && !hasControlledSelected && !asyncAcknowledged) return "Acknowledge the async visit terms to continue";
    return "Complete all fields to continue";
  }, [reason, needsCalendar, appointmentDate, appointmentTime, visitType, selectedMeds, hasControlledSelected, isAsync, asyncAcknowledged, controlledAcknowledged]);

  // ═══ GUIDED STEP LOGIC ═══
  // 1=Reason, 2=Symptoms, 3=Pharmacy, 4=VisitType, 5=Details, 6=AdditionalMeds, 7=Ack, 8=Ready
  const activeGuideStep = useMemo((): number => {
    if (!reason) return 1;
    if (!chiefComplaintDone) return 2;
    if (!pharmacy) return 3;
    if (!visitTypeConfirmed) return 4;
    // Step 5: visit-type-specific
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return 5;
    if (visitType === "instant" && wantToTalk && (!appointmentDate || !appointmentTime)) return 5;
    if (visitType === "refill" && selectedMeds.length === 0 && !symptomsText.trim() && !photoFile) return 5;
    // Step 7: acknowledgment — non-refill async only
    if (visitType !== "refill" && isAsync && !hasControlledSelected && !asyncAcknowledged) return 7;
    if (hasControlledSelected && !controlledAcknowledged) return 7;
    return 8;
  }, [reason, chiefComplaintDone, pharmacy, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, visitType, wantToTalk, selectedMeds, symptomsText, photoFile, additionalMedsAnswer, isAsync, hasControlledSelected, asyncAcknowledged, controlledAcknowledged]);

  const totalSteps = 8;

  // Auto-show first visit type popup when Step 4 finishes rolling in
  const [step4PopupFired, setStep4PopupFired] = useState(false);
  useEffect(() => {
    if (activeGuideStep === 4 && !visitTypeConfirmed && !step4PopupFired && !visitTypePopup) {
      // Fire popup when the step-enter animation is about halfway (0.7s * 0.5 ≈ 350ms)
      const timer = setTimeout(() => {
        setVisitTypePopup("instant");
        setStep4PopupFired(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [activeGuideStep, visitTypeConfirmed, step4PopupFired, visitTypePopup]);

  // ── iOS keyboard handler: scroll focused input into view ──
  useEffect(() => {
    const handleResize = () => {
      const active = document.activeElement as HTMLElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        setTimeout(() => {
          active.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    };
    if (typeof window !== "undefined" && window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => window.visualViewport?.removeEventListener("resize", handleResize);
    }
  }, []);

  if (!patient) {
    return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-primary-teal border-t-transparent rounded-full" /></div>);
  }

  // ═══ STEP 3 — POST-PAYMENT: Controlled Substance Scheduler ═══
  if (showControlledScheduler) {
    const getAvailableDates = () => {
      const dates: { label: string; value: string; dayLabel: string; monthDay: string }[] = [];
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now); d.setDate(d.getDate() + i);
        const value = d.toISOString().split("T")[0];
        const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        dates.push({ label: `${monthNames[d.getMonth()]} ${d.getDate()}`, value, dayLabel: i === 0 ? "Today" : i === 1 ? "Tmrw" : dayNames[d.getDay()], monthDay: `${d.getDate()}` });
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
          slots.push({ label: `${hr}:${String(m).padStart(2,"0")} ${ampm}`, value: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` });
        }
      }
      return slots;
    };
    const controlledMeds = selectedMeds.filter(m => isControlledSubstance(m));

    return (
      <div className="text-white font-sans overflow-hidden" style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)", height: "100dvh", minHeight: "0" }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } } @keyframes successPulse { 0%,100% { box-shadow: 0 0 12px rgba(34,197,94,0.2); } 50% { box-shadow: 0 0 24px rgba(34,197,94,0.4); } }`}</style>
        <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 4px)", paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px" }}>
          <div className="text-center pt-1 pb-1">
            <span className="text-white font-black text-[15px] tracking-tight">MEDAZON </span>
            <span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">EXPRESS </span>
            <span className="text-white font-black text-[15px] tracking-tight">BOOKING</span>
            <span className="text-[9px] text-green-400 font-bold ml-2">✓ PAID</span>
          </div>
          <div className="rounded-xl p-3 mb-2 border border-green-500/25" style={{ background: "rgba(34,197,94,0.06)", animation: "successPulse 3s ease-in-out infinite" }}>
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0"><Check size={16} className="text-green-400" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-green-400 font-bold text-[12px] mb-0.5">🎉 Great News!</p>
                <p className="text-[10px] text-gray-300 leading-relaxed">The DEA has extended telemedicine flexibilities through <span className="text-green-300 font-semibold">2026</span> — controlled substances like <span className="text-white font-semibold">{controlledMeds.join(", ") || "your medication"}</span> can be prescribed via telehealth <span className="text-green-300 font-semibold">without an in-person visit</span>.</p>
                <p className="text-[9px] text-gray-500 leading-relaxed mt-1">All that&apos;s needed is a brief live consultation. Select a date and time below — your visit has been upgraded at <span className="text-white font-semibold">no additional cost</span>.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pb-1" style={{ scrollbarWidth: "none" }}>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setControlledVisitType("video")} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-[12px] transition-all ${controlledVisitType === "video" ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-white/10 bg-[#11161c] text-gray-500"}`}><Video size={14} />Video Call</button>
              <button onClick={() => setControlledVisitType("phone")} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-[12px] transition-all ${controlledVisitType === "phone" ? "border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7]" : "border-white/10 bg-[#11161c] text-gray-500"}`}><Phone size={14} />Phone Call</button>
            </div>
            <div>
              <span className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider pl-1">Select a date</span>
              <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {getAvailableDates().map(d => (<button key={d.value} onClick={() => { setControlledScheduleDate(d.value); setControlledScheduleTime(""); }} className={`flex-shrink-0 flex flex-col items-center w-[52px] py-2 rounded-xl border-2 transition-all ${controlledScheduleDate === d.value ? "border-[#2dd4a0] bg-[#2dd4a0]/10 text-white" : "border-white/10 bg-[#11161c]/80 text-gray-500 hover:border-white/20"}`}><span className="text-[8px] font-bold uppercase">{d.dayLabel}</span><span className="text-[16px] font-black">{d.monthDay}</span><span className="text-[8px]">{d.label.split(" ")[0]}</span></button>))}
              </div>
            </div>
            {controlledScheduleDate && (<div><span className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider pl-1">Select a time</span><div className="grid grid-cols-4 gap-1.5 mt-1 max-h-[140px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>{getTimeSlots().map(t => (<button key={t.value} onClick={() => setControlledScheduleTime(t.value)} className={`py-2 rounded-lg border text-[11px] font-semibold transition-all ${controlledScheduleTime === t.value ? "bg-[#2dd4a0]/15 border-[#2dd4a0]/40 text-[#2dd4a0]" : "bg-[#11161c]/80 border-white/10 text-gray-500 hover:border-white/15"}`}>{t.label}</button>))}</div></div>)}
            {controlledScheduleDate && controlledScheduleTime && (<div className="bg-[#2dd4a0]/5 border border-[#2dd4a0]/20 rounded-xl px-3 py-2 text-center"><p className="text-[11px] text-gray-300"><span className="text-[#2dd4a0] font-bold">{controlledVisitType === "video" ? "📹 Video" : "📞 Phone"} Visit</span>{" · "}<span className="text-white font-semibold">{new Date(controlledScheduleDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {(() => { const [h, m] = controlledScheduleTime.split(":").map(Number); const hr = h > 12 ? h - 12 : h === 0 ? 12 : h; return `${hr}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; })()}</span></p></div>)}
          </div>
          {scheduleError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-[10px] mb-1">{scheduleError}</div>}
          <div className="flex-shrink-0 pb-2 pt-1">
            <button onClick={handleControlledSchedule} disabled={!controlledScheduleDate || !controlledScheduleTime || schedulingAppointment} className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "#2dd4a0", color: "#000" }}>
              {schedulingAppointment ? (<><div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />Scheduling...</>) : (<><Check size={16} />Confirm {controlledVisitType === "video" ? "Video" : "Phone"} Visit</>)}
            </button>
            <p className="text-center text-gray-700 text-[8px] mt-1"><Lock size={8} className="inline mr-0.5" />No additional charge · HIPAA Compliant</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STEP 2 — REVIEW & PAY ═══
  if (currentStep === 2) {
    const vtConfig: Record<string, { label: string; color: string; icon: string }> = {
      instant: { label: "Instant Care", color: "#2dd4a0", icon: "⚡" }, refill: { label: "Rx Refill", color: "#f59e0b", icon: "💊" },
      video: { label: "Video Visit", color: "#3b82f6", icon: "📹" }, phone: { label: "Phone / SMS", color: "#a855f7", icon: "📞" },
    };
    const vt = vtConfig[visitType] || vtConfig.instant;
    const isAsyncType = visitType === "instant" || visitType === "refill";

    return (
      <div className="text-white font-sans overflow-hidden" style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)", height: "100dvh", minHeight: "0" }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } }`}</style>
        <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 4px)", paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px" }}>
          <div className="flex items-center justify-between pt-1 pb-1">
            <div className="flex-1 text-center">
              <span className="text-white font-black text-[15px] tracking-tight">MEDAZON </span><span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">EXPRESS </span><span className="text-white font-black text-[15px] tracking-tight">BOOKING</span>
            </div>
            <button onClick={() => setCurrentStep(1)} className="text-gray-500 text-[10px] font-semibold flex items-center gap-1 hover:text-white">← Edit</button>
          </div>
          <div className="text-center py-1"><span className="font-black italic text-[#2dd4a0]" style={{ fontSize: "17px" }}>CONFIRM </span><span className="font-black italic text-[#f59e0b]" style={{ fontSize: "17px" }}>YOUR </span><span className="font-black italic text-[#2dd4a0]" style={{ fontSize: "17px" }}>BOOKING</span></div>
          <div className="rounded-xl border border-white/10 overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5">
              <div className="w-9 h-9 rounded-full border-2 border-[#2dd4a0] overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 10px rgba(45,212,160,0.2)" }}><img src="/assets/provider-lamonica.png" alt="Provider" className="w-full h-full object-cover object-top" /></div>
              <div className="flex-1 min-w-0"><p className="text-white font-bold text-[12px]">LaMonica A. Hodges</p><p className="text-gray-500 text-[9px]">MSN, APRN, FNP-C · Board-Certified</p></div>
              <Shield size={14} className="text-[#2dd4a0] flex-shrink-0" />
            </div>
            <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Reason for Visit</p><p className="text-white text-[12px] font-semibold">{reason || "—"}</p></div>
            <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Visit Type</p><p className="text-[12px] font-bold flex items-center justify-center gap-1" style={{ color: vt.color }}><span>{vt.icon}</span>{vt.label}</p></div>
            {pharmacy && <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Pharmacy</p><p className="text-white text-[11px] font-medium">{pharmacy}</p></div>}
            {!isAsyncType && appointmentDate && appointmentTime ? (
              <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Date & Time</p><p className="text-white text-[12px] font-semibold">{formatDisplayDateTime()}</p></div>
            ) : isAsyncType ? (
              <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Delivery</p><p className="text-[#2dd4a0] text-[11px] font-bold">Provider responds in 1–2 hrs</p></div>
            ) : null}
            {selectedMeds.length > 0 && <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Medications</p><p className="text-white text-[11px] font-medium">{selectedMeds.join(", ")}</p></div>}
            {wantToTalk && visitType === "instant" && appointmentDate && <div className="px-3 py-2 text-center border-b border-white/5"><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider mb-0.5">Live Add-on</p><p className="text-white text-[12px] font-semibold">{formatDisplayDateTime()}</p></div>}
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: "rgba(45,212,160,0.04)" }}><span className="text-gray-400 text-[11px] font-semibold">Total</span><span className="text-[#2dd4a0] font-black text-[16px]">{currentPrice.display}</span></div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-0">
            {clientSecret && stripeOptions ? (
              <Elements options={stripeOptions} stripe={stripePromise}><Step2PaymentForm patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType} appointmentDate={appointmentDate} appointmentTime={appointmentTime} currentPrice={currentPrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress} selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess} /></Elements>
            ) : (<div className="flex items-center justify-center py-3"><div className="animate-spin w-5 h-5 border-2 border-[#2dd4a0] border-t-transparent rounded-full" /><span className="ml-2 text-gray-400 text-xs">Loading payment...</span></div>)}
          </div>
          <div className="flex-shrink-0 pt-1 pb-1"><p className="text-center text-gray-700 text-[8px]"><Lock size={8} className="inline mr-0.5" />HIPAA Compliant · 256-bit Encryption · Secure Checkout</p></div>
        </div>
        {showDeaInfoPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowDeaInfoPopup(false)}>
            <div className="bg-[#11161c] border border-amber-500/30 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-start gap-3"><div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0"><Shield size={18} className="text-amber-400" /></div><div><h3 className="text-amber-400 font-bold text-sm">DEA/Ryan Haight Act</h3><p className="text-[10px] text-gray-500 mt-0.5">Federal Controlled Substance Requirements</p></div></div>
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3"><p className="text-xs text-gray-300 leading-relaxed">Under federal law, the <span className="text-white font-semibold">Ryan Haight Act</span> requires controlled substances be prescribed only after a valid practitioner-patient relationship with at least one <span className="text-white font-semibold">live medical evaluation</span>.</p><p className="text-xs text-gray-400 leading-relaxed mt-2">DEA telemedicine flexibilities extended through <span className="text-amber-300 font-semibold">December 31, 2026</span>.</p></div>
              <button onClick={() => setShowDeaInfoPopup(false)} className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-sm rounded-xl border border-amber-500/30">I Understand</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1 — MOBILE APP GUIDED BOOKING FLOW
  // ═══════════════════════════════════════════════════════════
  const activeOrangeBorder = "border-[3px] border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.5)]";

  const CompletedPill = ({ text, onReset, subText }: { text: string; onReset: () => void; subText?: string }) => (
    <button onClick={onReset} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-[#2dd4a0]/20 hover:bg-white/[0.05] transition-all opacity-80 hover:opacity-100" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <div className="w-7 h-7 rounded-full bg-[#2dd4a0] flex items-center justify-center flex-shrink-0"><Check size={16} className="text-black" strokeWidth={3} /></div>
      <span className="text-gray-300 text-[12px] font-semibold truncate flex-1 text-left">{text}</span>
      <span className="text-gray-500 text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
    </button>
  );

  const PharmacyCompletedView = () => (
    <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null }); }}
      className="w-full rounded-xl bg-white/[0.03] border border-[#2dd4a0]/20 hover:bg-white/[0.05] transition-all overflow-hidden opacity-80 hover:opacity-100" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <div className="px-3 py-1 border-b border-[#2dd4a0]/20 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-[#2dd4a0] flex items-center justify-center flex-shrink-0"><Check size={12} className="text-black" strokeWidth={3} /></div>
        <span className="text-[#2dd4a0] text-[10px] font-bold uppercase tracking-wider">Preferred Pharmacy</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5">
        {pharmacyInfo?.photo ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10"><img src={pharmacyInfo.photo} alt={pharmacy} className="w-full h-full object-cover" /></div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[#11161c] border border-white/10 flex items-center justify-center flex-shrink-0"><Pill size={18} className="text-gray-600" /></div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[12px] truncate">{pharmacy}</p>
          {pharmacyInfo?.address && <p className="text-gray-500 text-[9px] truncate">{pharmacyInfo.address}</p>}
          {pharmacyInfo?.rating && (
            <div className="flex items-center gap-1 mt-0.5">
              <Star size={9} className="text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-400 text-[9px] font-bold">{pharmacyInfo.rating}</span>
              {pharmacyInfo.reviewCount && <span className="text-gray-600 text-[8px]">({pharmacyInfo.reviewCount})</span>}
              {pharmacyInfo.isOpen !== undefined && <span className={`text-[8px] font-semibold ml-1 ${pharmacyInfo.isOpen ? "text-green-400" : "text-red-400"}`}>{pharmacyInfo.isOpen ? "Open" : "Closed"}</span>}
            </div>
          )}
        </div>
        <span className="text-gray-500 text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
      </div>
    </button>
  );

  return (
    <div className="text-white font-sans overflow-hidden" style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)", height: "100svh", minHeight: "0" }}>
      <style>{`
        @supports (height: 100svh) { .ec-root { height: 100svh !important; } }
        @keyframes guidePulse { 0%,100% { box-shadow: 0 0 8px rgba(249,115,22,0.3); } 50% { box-shadow: 0 0 18px rgba(249,115,22,0.55); } }
        @keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } }
        @keyframes ackPulse { 0%,100% { box-shadow: 0 0 0px rgba(249,115,22,0); } 50% { box-shadow: 0 0 16px rgba(249,115,22,0.5); } }
        @keyframes fadeInBtn { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInStep { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInPill { from { opacity:0; transform:translateY(12px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
      <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 4px)", paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px" }}>

        {/* ═══ CENTERED HEADER ═══ */}
        <div className="text-center pt-1 pb-0.5 flex-shrink-0">
          <div className="flex items-center justify-center gap-1">
            <span className="text-white font-black text-[15px] tracking-tight">MEDAZON</span>
            <span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">EXPRESS</span>
            <span className="text-white font-black text-[15px] tracking-tight">BOOKING</span>
          </div>
          {/* Version marker — remove after confirming deploy */}
          <span className="text-gray-700 text-[7px]">v2.1</span>
        </div>

        {/* ═══ WELCOME + PRIORITY BADGE + DOCTOR CARD ═══ */}
        <div className="flex items-start justify-between pb-1.5 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1"><Zap size={12} className="text-[#f97316]" /><span className="text-[#f97316] font-semibold text-[11px]">{patient.firstName ? `Welcome back, ${patient.firstName}!` : 'Welcome!'}</span></div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-[#f97316] bg-[#f97316]/15" style={{ boxShadow: "0 0 10px rgba(249,115,22,0.3)" }}>
              <span className="text-[#f97316] text-[12px]">★</span>
              <span className="text-[#f97316] font-black text-[11px] uppercase tracking-wider">Priority Patient</span>
            </div>
            {/* Progress bar — larger, under badge */}
            <div className="w-full mt-2">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#f97316] rounded-full transition-all duration-500" style={{ width: `${Math.min((activeGuideStep / totalSteps) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center flex-shrink-0 ml-2">
            <div className="w-[60px] h-[60px] rounded-full border-[3px] border-[#2dd4a0] overflow-hidden" style={{ boxShadow: "0 0 12px rgba(45,212,160,0.3)" }}>
              <img src="/assets/provider-lamonica.png" alt="LaMonica A. Hodges" className="w-full h-full object-cover object-top" />
            </div>
            <div className="mt-1 flex flex-col items-center">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5"><span className="text-[8px] font-black text-white">M</span><span className="text-[8px] font-black text-[#2dd4a0]">H</span></div>
                <div className="flex items-center">{[1,2,3,4].map(i => (<Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />))}<Star size={10} className="text-yellow-400 fill-yellow-400" style={{ clipPath: "inset(0 10% 0 0)" }} /></div>
              </div>
              <span className="text-yellow-400 text-[9px] font-bold">4.9 / 12,398 reviews</span>
              <button className="mt-0.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" style={{ background: "#2563eb", color: "#fff" }}>Read / Write Review</button>
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE GUIDED FORM ═══ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-1 space-y-2 min-h-0" style={{ scrollbarWidth: "none" }}>

          {/* STEP 1+2: Reason + Symptoms (merged pill when complete) */}
          {reason && chiefComplaintDone ? (
            <button onClick={() => { setChiefComplaintDone(false); saveAnswers({ chiefComplaintDone: false }); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-[#2dd4a0]/20 hover:bg-white/[0.05] transition-all opacity-80 hover:opacity-100" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="w-7 h-7 rounded-full bg-[#2dd4a0] flex items-center justify-center flex-shrink-0"><Check size={16} className="text-black" strokeWidth={3} /></div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-gray-300 text-[12px] font-semibold truncate block">{reason}</span>
                {chiefComplaint && <span className="text-gray-500 text-[10px] truncate block">{chiefComplaint}</span>}
              </div>
              <span className="text-gray-500 text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
            </button>
          ) : !reason ? (
            <button onClick={() => setReasonDialogOpen(true)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#11161c] text-left transition-all ${activeOrangeBorder}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center gap-3"><span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">1</span><span className="text-white text-sm font-semibold">Reason for Visit</span></div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
          ) : null}

          {/* STEP 2: Describe Your Symptoms (inline) */}
          {reason && !chiefComplaintDone && (
            <div className={`rounded-xl bg-[#11161c] p-4 space-y-3 transition-all ${activeOrangeBorder}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center gap-3"><span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">2</span><span className="text-white text-[10px] font-semibold uppercase tracking-wider">Describe Your Symptoms</span></div>
              <p className="text-white text-[11px]">Briefly describe what&apos;s going on so your provider can prepare.</p>
              <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g., Burning during urination for 3 days..." rows={3} autoFocus className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316] resize-none placeholder:text-gray-600" />
              <button onClick={() => { setChiefComplaintDone(true); saveAnswers({ chiefComplaint, chiefComplaintDone: true }); }} disabled={!chiefComplaint.trim()} className="w-full bg-[#f97316] text-black py-2.5 rounded-xl text-sm font-bold hover:bg-[#fb923c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Done</button>
            </div>
          )}

          {/* STEP 3: Preferred Pharmacy — always visible, locked if steps 1+2 not done */}
          {(() => {
            const step3Locked = !reason || !chiefComplaintDone;
            if (pharmacy && !step3Locked) return <PharmacyCompletedView />;
            return (
              <div className={`rounded-xl bg-[#11161c] p-4 space-y-2 transition-all ${step3Locked ? "opacity-40 border border-white/5" : activeGuideStep === 3 ? activeOrangeBorder : "border border-white/10"}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                <div className="flex items-center gap-3"><span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">3</span><span className={`text-[10px] font-semibold uppercase tracking-wider ${!step3Locked && activeGuideStep === 3 ? "text-white" : "text-gray-500"}`}>Preferred Pharmacy</span></div>
                {step3Locked ? (
                  <p className="text-gray-600 text-[10px]">Complete steps above first</p>
                ) : (
                  <PharmacySelector value={pharmacy} onChange={(val: string, info?: any) => {
                    setPharmacy(val);
                    if (info) {
                      const pInfo: PharmacyInfo = { name: info.name || val, address: info.address || info.formatted_address || "", photo: info.photo || info.photoUrl || "", rating: info.rating || undefined, reviewCount: info.reviewCount || info.user_ratings_total || undefined, isOpen: info.isOpen ?? info.opening_hours?.open_now ?? undefined };
                      setPharmacyInfo(pInfo); setPharmacyAddress(info.address || info.formatted_address || "");
                      saveAnswers({ pharmacy: val, pharmacyInfo: pInfo, pharmacyAddress: pInfo.address });
                    } else { saveAnswers({ pharmacy: val }); }
                  }} placeholder="Search pharmacy..." className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316] placeholder:text-gray-600" />
                )}
              </div>
            );
          })()}

          {/* STEP 4: Select Visit Type — always visible, locked if steps 1-3 not done */}
          {(() => {
            const step4Locked = !reason || !chiefComplaintDone || !pharmacy;
            if (visitTypeConfirmed && !step4Locked) {
              if (visitType === "refill") {
                return (
                  <button onClick={() => { setVisitTypeConfirmed(false); setVisitTypePopup("refill"); saveAnswers({ visitTypeConfirmed: false }); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-[#2dd4a0]/20 hover:bg-white/[0.05] transition-all opacity-80 hover:opacity-100" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                    <div className="w-7 h-7 rounded-full bg-[#2dd4a0] flex items-center justify-center flex-shrink-0"><Check size={16} className="text-black" strokeWidth={3} /></div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-gray-300 text-[12px] font-semibold block">Rx Refill</span>
                      {selectedMeds.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{selectedMeds.map(m => (<span key={m} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isControlledSubstance(m) ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"}`}>{m} {isControlledSubstance(m) ? "⚠️" : "✓"}</span>))}</div>}
                    </div>
                    <span className="text-gray-500 text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
                  </button>
                );
              }
              return <CompletedPill text={visitType === "instant" ? "Instant Care" : visitType === "video" ? "Video Visit" : "Phone / SMS"} subText="Visit Type" onReset={() => { setVisitTypeConfirmed(false); saveAnswers({ visitTypeConfirmed: false }); }} />;
            }
            return (
              <div className={`rounded-xl bg-[#11161c] p-4 space-y-3 transition-all ${step4Locked ? "opacity-40 border border-white/5" : activeGuideStep === 4 ? activeOrangeBorder : "border border-white/10"}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                <div className="flex items-center gap-3"><span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">4</span><span className={`text-[10px] font-semibold uppercase tracking-wider ${!step4Locked && activeGuideStep === 4 ? "text-white" : "text-gray-500"}`}>Select Visit Type</span></div>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { key: "instant" as VisitType, label: "Treat Me\nNow", icon: Zap, color: "#2dd4a0", badge: "✨ NEW" },
                    { key: "refill" as VisitType, label: "Rx\nRefill", icon: Pill, color: "#f59e0b", badge: "⚡ FAST" },
                    { key: "video" as VisitType, label: "Video\nVisit", icon: Video, color: "#3b82f6", badge: null },
                    { key: "phone" as VisitType, label: "Phone\n/ SMS", icon: Phone, color: "#a855f7", badge: null },
                  ] as const).map((vt) => {
                    const Icon = vt.icon;
                    const isActive = visitTypePopup === vt.key;
                    const borderClass = step4Locked
                      ? "border-2 border-white/5"
                      : isActive
                        ? "border-[3px] border-[#2dd4a0] shadow-[0_0_16px_rgba(45,212,160,0.4)]"
                        : "border-2 border-white/10 hover:border-white/20";
                    return (<button key={vt.key} onClick={() => { if (!step4Locked) setVisitTypePopup(vt.key); }} disabled={step4Locked} className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl bg-[#11161c]/80 transition-all ${borderClass}`} style={{ minHeight: "72px" }}>
                      {vt.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: step4Locked ? "#333" : vt.color, color: "#000" }}>{vt.badge}</span>}
                      <Icon size={18} style={{ color: step4Locked ? "#333" : isActive ? vt.color : "#6b7280" }} /><span className={`text-[9px] font-bold mt-1 text-center leading-tight whitespace-pre-line ${step4Locked ? "text-gray-700" : isActive ? "text-white" : "text-gray-400"}`}>{vt.label}</span>
                    </button>);
                  })}
                </div>
              </div>
            );
          })()}

          {/* ═══ VISIT TYPE INFO — inline in scroll flow ═══ */}
          {visitTypePopup && !visitTypeConfirmed && (
            <div className="rounded-xl overflow-hidden" style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="p-4 space-y-3 relative bg-[#11161c] border border-white/10 rounded-xl">
                <button onClick={() => setVisitTypePopup(null)} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors z-10"><X size={18} /></button>
                {visitTypePopup === "instant" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#2dd4a0]/15 flex items-center justify-center"><Zap size={20} className="text-[#2dd4a0]" /></div><div><h3 className="text-white font-black text-base">Get Seen Without Being Seen</h3><p className="text-[#2dd4a0] text-[10px] font-bold uppercase tracking-wider">Instant Care · No Appointment</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">No video. No phone call. No waiting room. Your provider reviews your case privately and sends treatment + prescription to your pharmacy.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#2dd4a0]" /><span className="text-white text-[11px] font-medium">100% private — no face-to-face</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#2dd4a0]" /><span className="text-white text-[11px] font-medium">Treatment in 1–2 hours</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#2dd4a0]" /><span className="text-white text-[11px] font-medium">Rx sent straight to your pharmacy</span></div></div><p className="text-gray-500 text-[9px] italic">Perfect for: UTIs, cold & flu, skin issues, allergies</p></>)}
                {visitTypePopup === "refill" && (<>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f59e0b]/15 flex items-center justify-center"><Pill size={20} className="text-[#f59e0b]" /></div>
                    <div><h3 className="text-white font-black text-base">Your Meds. Refilled. No Appointment.</h3>
                      <div className="flex items-center gap-2 flex-wrap"><p className="text-[#f59e0b] text-[10px] font-bold uppercase tracking-wider">Rx Refill · Skip the Wait</p><span className="text-gray-400 text-[10px]">Same-day pharmacy pickup</span></div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-[12px] leading-relaxed">Running low? Select your medications, provider reviews and approves, refill sent to your pharmacy.</p>
                  {/* Inline medication list */}
                  <div className={`rounded-xl bg-[#0d1218] border border-white/10 p-3 space-y-2`}>
                    <p className="text-white text-[11px] font-semibold">Select Medications to Refill</p>
                    {medsLoading ? (
                      <div className="flex items-center justify-center py-3"><div className="animate-spin w-4 h-4 border-2 border-[#f59e0b] border-t-transparent rounded-full" /><span className="ml-2 text-gray-400 text-xs">Loading medications...</span></div>
                    ) : medications.length > 0 ? (
                      <div className="space-y-1 max-h-44 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {medications.map((med) => {
                          const ic = isControlledSubstance(med.name);
                          const ck = selectedMeds.includes(med.name);
                          return (
                            <label key={med.name} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-all ${ck ? "bg-[#f59e0b]/10 border border-[#f59e0b]/30" : "hover:bg-white/5 border border-transparent"} ${ic ? "border-red-500/30" : ""}`}>
                              <input type="checkbox" checked={ck} onChange={() => toggleMed(med.name)} className="w-4 h-4 rounded border-white/20 bg-[#0d1218] text-[#f59e0b] focus:ring-[#f59e0b] flex-shrink-0" />
                              <span className={`flex-1 ${ic ? "text-red-400" : "text-white"}`}>{med.name} {med.dosage ? `(${med.dosage})` : ""}</span>
                              {ic && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">CTRL</span>}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs py-1">No medications found on file.</p>
                    )}
                    <textarea value={symptomsText} onChange={(e) => { setSymptomsText(e.target.value); saveAnswers({ symptomsText: e.target.value }); }} placeholder="Additional medications or notes..." rows={2} className="w-full bg-[#11161c] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f59e0b] resize-none placeholder:text-gray-600" />
                  </div>
                </>)}
                {visitTypePopup === "video" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#3b82f6]/15 flex items-center justify-center"><Video size={20} className="text-[#3b82f6]" /></div><div><h3 className="text-white font-black text-base">Face-to-Face, From Anywhere</h3><p className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-wider">Video Visit · Live Consultation</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">See your provider live on video — just like an in-office visit, but from your couch.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" /><span className="text-white text-[11px] font-medium">Real-time conversation</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" /><span className="text-white text-[11px] font-medium">Private & encrypted — HIPAA</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" /><span className="text-white text-[11px] font-medium">Pick a time that works</span></div></div><p className="text-gray-500 text-[9px] italic">Best for: ADHD evaluations, anxiety, complex conditions</p></>)}
                {visitTypePopup === "phone" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#a855f7]/15 flex items-center justify-center"><Phone size={20} className="text-[#a855f7]" /></div><div><h3 className="text-white font-black text-base">Talk, Text, or Both</h3><p className="text-[#a855f7] text-[10px] font-bold uppercase tracking-wider">Phone / SMS · No Camera</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">Connect by phone call or secure text — same quality care with zero screen time.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#a855f7]" /><span className="text-white text-[11px] font-medium">No video, no downloads</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#a855f7]" /><span className="text-white text-[11px] font-medium">Flexible scheduling</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#a855f7]" /><span className="text-white text-[11px] font-medium">Great for follow-ups</span></div></div><p className="text-gray-500 text-[9px] italic">Perfect for: medication adjustments, follow-ups, quick questions</p></>)}
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 mt-1"><Lock size={12} className="text-gray-500" /><span className="text-gray-500 text-[9px]">Full anonymity · Your identity stays private</span></div>
              </div>
            </div>
          )}

          {/* STEP 5: Visit-type-specific details (not refill — refill meds are in combined pill) */}
          {visitTypeConfirmed && visitType !== "refill" && activeGuideStep >= 5 && (
            <div className={`rounded-xl ${activeGuideStep === 5 ? activeOrangeBorder : ""}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              {visitType === "instant" && (
                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-3 bg-[#11161c]/60 border border-white/5 rounded-xl px-3 py-2.5">
                    <button onClick={() => { const v = !wantToTalk; setWantToTalk(v); saveAnswers({ wantToTalk: v }); }} className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${wantToTalk ? "bg-[#2dd4a0]" : "bg-white/10"}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${wantToTalk ? "left-[22px]" : "left-0.5"}`} /></button>
                    <div><p className="text-white text-[11px] font-semibold">Want to talk to your provider?</p><p className="text-gray-500 text-[9px]">Add an optional live video or phone call</p></div>
                  </div>
                  {wantToTalk && (<button onClick={() => { setDateTimeDialogOpen(true); setDateTimeMode("date"); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left ${appointmentDate && appointmentTime ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : "border-white/10 bg-[#11161c]"}`}><div className="flex items-center gap-2"><Calendar size={14} className={appointmentDate ? "text-[#2dd4a0]" : "text-gray-500"} /><span className={`text-sm ${appointmentDate ? "text-white font-medium" : "text-gray-500"}`}>{formatDisplayDateTime() || "Select Date & Time"}</span></div><ChevronDown size={14} className="text-gray-500" /></button>)}
                </div>
              )}
              {(visitType === "video" || visitType === "phone") && (
                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-3 mb-1"><span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">5</span><span className={`text-[10px] font-semibold uppercase tracking-wider ${activeGuideStep === 5 ? "text-white" : "text-gray-500"}`}>Pick Date & Time</span></div>
                  <button onClick={() => { setDateTimeDialogOpen(true); setDateTimeMode("date"); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left ${appointmentDate && appointmentTime ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : "border-white/10 bg-[#11161c]"}`}><div className="flex items-center gap-2"><Calendar size={14} className={appointmentDate ? "text-[#2dd4a0]" : "text-gray-500"} /><span className={`text-sm ${appointmentDate ? "text-white font-medium" : "text-gray-500"}`}>{formatDisplayDateTime() || "Select Date & Time"}</span></div><ChevronDown size={14} className="text-gray-500" /></button>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Acknowledgment — non-refill async */}
          {visitTypeConfirmed && activeGuideStep >= 7 && !hasControlledSelected && (
            <button onClick={() => { const v = !asyncAcknowledged; setAsyncAcknowledged(v); setClientSecret(""); saveAnswers({ asyncAcknowledged: v }); }}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${asyncAcknowledged ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : activeGuideStep === 7 ? activeOrangeBorder : "border-white/10 bg-[#11161c]"}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${asyncAcknowledged ? "border-[#2dd4a0] bg-[#2dd4a0]" : "border-[#f97316]/50"}`}>{asyncAcknowledged && <Check size={12} className="text-black" />}</div>
              <div><p className="text-white text-[11px] font-semibold">I understand and agree</p><p className="text-gray-500 text-[9px] mt-0.5 leading-relaxed">A provider will review my information and respond within 1–2 hours. If a live evaluation is needed, I may be asked to schedule one.</p></div>
            </button>
          )}

        </div>

        {/* ═══ BOTTOM BUTTON ═══ */}
        <div className="flex-shrink-0 pb-1 pt-1 space-y-2">
          {/* Controlled substance acknowledgment — blinking checkbox */}
          {hasControlledSelected && visitType === "refill" && visitTypeConfirmed && (
            <div className="flex items-start gap-2.5 px-1">
              <input type="checkbox" id="ctrlAckBottom" checked={controlledAcknowledged} onChange={(e) => { setControlledAcknowledged(e.target.checked); setClientSecret(""); saveAnswers({ controlledAcknowledged: e.target.checked }); }} className="mt-0.5 w-5 h-5 rounded border-2 border-[#f97316] bg-[#0d1218] text-[#f97316] focus:ring-[#f97316] flex-shrink-0 cursor-pointer" style={!controlledAcknowledged ? { animation: "ackPulse 1.5s ease-in-out infinite" } : {}} />
              <label htmlFor="ctrlAckBottom" className="text-[11px] text-gray-400 leading-relaxed cursor-pointer"><span className="text-white font-semibold">I understand and accept</span> controlled substance request. <button type="button" onClick={() => setShowDeaInfoPopup(true)} className="text-amber-400 underline font-semibold">DEA/Ryan Haight Act</button>. A live visit may be required.</label>
            </div>
          )}
          {/* CTA — dynamic text: popup confirm OR final step */}
          {visitTypePopup && !visitTypeConfirmed ? (
            <button onClick={() => { handleVisitTypeChange(visitTypePopup); setVisitTypeConfirmed(true); saveAnswers({ visitType: visitTypePopup, visitTypeConfirmed: true }); setVisitTypePopup(null); }} className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all" style={{ background: visitTypePopup === "instant" ? "#2dd4a0" : visitTypePopup === "refill" ? "#f59e0b" : visitTypePopup === "video" ? "#3b82f6" : "#a855f7", color: "#000" }}>Choose {visitTypePopup === "instant" ? "Instant Care" : visitTypePopup === "refill" ? "Rx Refill" : visitTypePopup === "video" ? "Video Visit" : "Phone/SMS"} →</button>
          ) : (
            <button onClick={() => { if (allFieldsReady) setCurrentStep(2); }} disabled={!allFieldsReady} className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all ${allFieldsReady ? "bg-[#f97316] text-white" : "bg-white/10 text-gray-500 cursor-not-allowed"}`} style={allFieldsReady ? { animation: "fadeInBtn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both" } : {}}>Continue to Final Step<ChevronDown size={16} className="rotate-[-90deg]" /></button>
          )}
          <p className="text-center text-gray-700 text-[8px] mt-1"><Lock size={8} className="inline mr-0.5" />HIPAA Compliant · Encrypted · {currentPrice.display}</p>
        </div>
      </div>

      {/* Visit type popup moved inline into scroll flow */}

      {/* ═══ REASON DIALOG — fullscreen overlay, keyboard-safe ═══ */}
      {reasonDialogOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0d1218" }}>
          {/* Header */}
          <div className="flex justify-between items-center px-4 pt-4 pb-3 flex-shrink-0">
            <span className="text-white font-bold text-lg">Reason For Visit</span>
            <button onClick={() => { setReasonDialogOpen(false); setReasonQuery(""); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          {/* Search */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={reasonQuery} onChange={(e) => setReasonQuery(e.target.value)} placeholder="Search symptoms..." autoFocus className="w-full bg-[#11161c] border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-[#2dd4a0]" />
            </div>
          </div>
          {/* Scrollable list — takes remaining space, keyboard pushes it up naturally */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <div className="px-4 py-3 text-white bg-white/[0.03] hover:bg-[#2dd4a0] hover:text-black cursor-pointer text-sm border-b border-white/5 font-semibold active:bg-[#2dd4a0] active:text-black" onClick={() => { setReason("Something Else"); setReasonDialogOpen(false); setReasonQuery(""); saveAnswers({ reason: "Something Else" }); }}>Something else</div>
              {filteredReasons.map((item: { name: string }) => (
                <div key={item.name} className="px-4 py-3 text-white hover:bg-[#2dd4a0] hover:text-black cursor-pointer text-sm border-b border-white/5 last:border-0 active:bg-[#2dd4a0] active:text-black" onClick={() => { setReason(item.name); setReasonDialogOpen(false); setReasonQuery(""); saveAnswers({ reason: item.name }); }}>{item.name}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DATE/TIME DIALOG ═══ */}
      {dateTimeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setDateTimeDialogOpen(false)}>
          <div className="w-full max-w-[430px] rounded-t-2xl p-4 space-y-3" style={{ background: "#0d1218", animation: "slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-white font-bold text-base">{dateTimeMode === "date" ? "Select Date" : "Select Time"}</span><button onClick={() => setDateTimeDialogOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
            <AppointmentCalendar selectedDate={appointmentDate || null} selectedTime={appointmentTime || null} onDateSelect={(date) => { setAppointmentDate(date); setDateTimeMode("time"); saveAnswers({ appointmentDate: date }); }} onTimeSelect={(time) => { setAppointmentTime(time); setDateTimeDialogOpen(false); saveAnswers({ appointmentTime: time }); }} mode={dateTimeMode === "date" ? "date" : "time"} />
            {dateTimeMode === "time" && (<button onClick={() => setDateTimeMode("date")} className="w-full text-center text-xs text-[#2dd4a0] hover:underline">← Change date</button>)}
          </div>
        </div>
      )}

      {/* ═══ DEA INFO POPUP ═══ */}
      {showDeaInfoPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowDeaInfoPopup(false)}>
          <div className="bg-[#11161c] border border-amber-500/30 rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3"><div className="w-9 h-9 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0"><Shield size={18} className="text-amber-400" /></div><div><h3 className="text-amber-400 font-bold text-sm">DEA/Ryan Haight Act</h3><p className="text-[10px] text-gray-500 mt-0.5">Federal Controlled Substance Requirements</p></div></div>
            <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3"><p className="text-xs text-gray-300 leading-relaxed">Under federal law, the <span className="text-white font-semibold">Ryan Haight Act</span> requires controlled substances be prescribed only after a valid practitioner-patient relationship with at least one <span className="text-white font-semibold">live medical evaluation</span>.</p><p className="text-xs text-gray-400 leading-relaxed mt-2">DEA telemedicine flexibilities extended through <span className="text-amber-300 font-semibold">December 31, 2026</span>.</p></div>
            <button onClick={() => setShowDeaInfoPopup(false)} className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-sm rounded-xl border border-amber-500/30">I Understand</button>
          </div>
        </div>
      )}
    </div>
  );
}




// force rebuild Mon Feb 23 17:54:49 UTC 2026
