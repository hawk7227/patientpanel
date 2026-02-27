"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { getPrice, getBookingFee, isControlledSubstance, type VisitType } from "@/lib/pricing";

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
// Progress pill (step-aware, progress-aware; no numbers shown)
// ═══════════════════════════════════════════════════════════════
function getProgressPillMessage(opts: { uiStep: number; progressPct: number; isPreparingBooking: boolean }) {
  const { uiStep, progressPct, isPreparingBooking } = opts;

  if (isPreparingBooking) return "Preparing your booking…";

  // Step-based tone
  if (uiStep <= 1) return "Let’s get you taken care of.";
  if (uiStep === 2) return "Nice — that was quick.";
  if (uiStep === 3) return "Great. Almost there.";
  if (uiStep === 4) return "You’re moving fast.";
  if (uiStep === 4.5) return "Review your choices.";
  if (uiStep === 5) return "Almost there.";
  if (uiStep >= 6) return "You’re all set. Let’s finish up.";

  // Fallback by progress
  if (progressPct < 35) return "Good start.";
  if (progressPct < 70) return "You’re doing great.";
  if (progressPct < 90) return "Almost there.";
  return "Final step.";
}

// ═══════════════════════════════════════════════════════════════
// Step 2 Payment Form — single viewport, no scroll
// ═══════════════════════════════════════════════════════════════
function Step2PaymentForm({
  patient, reason, chiefComplaint, visitType, appointmentDate, appointmentTime,
  currentPrice, pharmacy, pharmacyAddress, selectedMedications, symptomsText, onSuccess, visitIntentId,
}: {
  patient: PatientInfo; reason: string; chiefComplaint: string; visitType: string;
  appointmentDate: string; appointmentTime: string; currentPrice: { amount: number; display: string };
  pharmacy: string; pharmacyAddress: string; selectedMedications: string[];
  symptomsText: string; onSuccess: () => void; visitIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [payInFlight, setPayInFlight] = useState(false);
  

  // Production mode — real Stripe payments
  const isTestMode = false;

  const handlePay = async () => {
    if (!acceptedTerms) { setError("Please accept the terms to continue."); return; }
    setError(null);
    setPayInFlight(true);

    try {
      let patientId = patient.id;

      if (isTestMode) {
        // BYPASS MODE — skip patient creation, skip payment
        setIsProcessing(true); setProgress(5); setStatusText("Starting...");
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
          payment_intent_id: paymentIntent.id, visit_intent_id: visitIntentId,
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
          payment_intent_id: paymentIntent.id, visit_intent_id: visitIntentId,
        }));
        clearAnswers();
        await new Promise((r) => setTimeout(r, 800));
        onSuccess();
        return;
      }

      // NORMAL MODE — real patient creation + real payment
      if (!patientId) {
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

      let paymentIntent: any = null; let paymentError: any = null;

      if (isTestMode) {
        setIsProcessing(true); setProgress(45); setStatusText("Test mode...");
        paymentIntent = { id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, status: "succeeded" };
        await new Promise((r) => setTimeout(r, 500));
      } else {
        if (!stripe || !elements) { setError("Payment not ready. Please try again."); setPayInFlight(false); return; }

        // Submit elements first — validates form and triggers wallet sheets (Google Pay, Apple Pay)
        const submitResult = await elements.submit();
        if (submitResult.error) {
          setError(submitResult.error.message || "Please complete the payment form.");
          setPayInFlight(false);
          return;
        }

        // NOW confirm — PaymentElement is still mounted because isProcessing is false
        const result = await stripe.confirmPayment({
          elements, redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/success`,
            payment_method_data: { billing_details: { name: `${patient.firstName} ${patient.lastName}`, email: patient.email, phone: patient.phone } },
          },
        });
        paymentError = result.error; paymentIntent = result.paymentIntent;
      }

      if (paymentError) { setError(paymentError.message || "Payment failed."); setPayInFlight(false); return; }

      // Payment succeeded — NOW safe to show progress spinner (PaymentElement no longer needed)
      setIsProcessing(true); setProgress(75); setStatusText("Creating appointment...");

      if (paymentIntent?.status === "succeeded") {
        const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isAsync = visitType === "instant" || visitType === "refill";
        let fullChiefComplaint = chiefComplaint || reason;
        if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
        if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

        const appointmentPayload = {
          payment_intent_id: paymentIntent.id, visit_intent_id: visitIntentId,
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
          payment_intent_id: paymentIntent.id, visit_intent_id: visitIntentId,
        }));
        clearAnswers();
        await new Promise((r) => setTimeout(r, 800));
        onSuccess();
      }
    } catch (err: any) {
      console.error("Express checkout error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setIsProcessing(false);
      setPayInFlight(false);
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
      <div className="w-full space-y-2">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1.5 rounded-lg text-[10px]">{error}<button onClick={() => setError(null)} className="ml-2 underline text-[9px]">Dismiss</button></div>}

        {isTestMode ? (
          /* Test mode — simple button */
          <button onClick={handlePay} disabled={!acceptedTerms} className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 font-bold text-white text-[14px] border border-[#2dd4a0]" style={{ background: "rgba(110,231,183,0.08)" }}>
            🧪 Test Pay — {currentPrice.display}
          </button>
        ) : (
          /* Real payment — wallets + card */
          <div className="space-y-2">
            {/* PaymentElement with wallets auto-detected (Google Pay, Apple Pay, Link shown first) */}
            <div className="rounded-xl bg-[#0d1218] border border-white/10 p-1">
              <PaymentElement onReady={() => setElementReady(true)} options={{
                layout: "tabs",
                paymentMethodOrder: ["apple_pay", "google_pay", "card"],
                wallets: { applePay: "auto", googlePay: "auto" },
                fields: { billingDetails: { name: "never", email: "never", phone: "never" } },
              }} />
            </div>
            {/* Pay button */}
            <button onClick={handlePay} disabled={!stripe || !elements || !acceptedTerms || !elementReady || payInFlight} className="w-full text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-[14px] flex items-center justify-center gap-2 border border-[#2dd4a0]" style={{ background: "rgba(110,231,183,0.08)" }}>
              <Lock size={14} /> {payInFlight ? "Processing..." : `Pay ${currentPrice.display} & Reserve`}
            </button>
          </div>
        )}

        {/* Terms checkbox */}
        <div className="flex items-start gap-1.5">
          <input type="checkbox" id="step2Terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="flex-shrink-0 mt-[1px]" style={{ width: '12px', height: '12px', borderRadius: '2px', accentColor: '#2dd4a0' }} />
          <label htmlFor="step2Terms" className="leading-[1.4]" style={{ fontSize: '7px', color: '#888' }}>
            By confirming, I agree to the <span className="text-[#2dd4a0] underline">Terms of Service</span>, <span className="text-[#2dd4a0] underline">Privacy Policy</span>, and <span className="text-[#2dd4a0] underline">Cancellation Policy</span>. This <strong className="text-white">{currentPrice.display}</strong> booking fee reserves your provider&apos;s time. Visit fees are collected separately after provider review.
          </label>
        </div>
      </div>
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
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Guided Sequence State
  const [visitTypePopup, setVisitTypePopup] = useState<VisitType | null>(null);
  const [wantToTalk, setWantToTalk] = useState(false);
  const [additionalMedsAnswer, setAdditionalMedsAnswer] = useState<"yes" | "no" | null>(null);
  // chiefComplaintDone replaced by symptomsDone — user must tap Continue after 10+ chars
  const [symptomsDone, setSymptomsDone] = useState(false);
  const [visitTypeConfirmed, setVisitTypeConfirmed] = useState(false);
  const [visitTypeChosen, setVisitTypeChosen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [isTightViewport, setIsTightViewport] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactDob, setContactDob] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);

  // Post-payment intake form
  const [intakePhase, setIntakePhase] = useState(false);
  const [intakeStep, setIntakeStep] = useState(0);
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, { val: boolean; detail: string }>>({});
  const [intakeDetailId, setIntakeDetailId] = useState<string | null>(null);
  const [intakeDetailText, setIntakeDetailText] = useState("");

  // Payment intent loading is derived — no override needed
  const paymentLoading = visitTypeConfirmed && !clientSecret;

  const currentPrice = useMemo(() => getBookingFee(), []);
  const visitFeePrice = useMemo(() => getPrice(visitType), [visitType]);
  const [visitIntentId, setVisitIntentId] = useState("");
  const needsCalendar = VISIT_TYPES.find(v => v.key === visitType)?.needsCalendar ?? false;
  const isAsync = visitType === "instant" || visitType === "refill";

  // ── Load patient ───────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("expressPatient");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setPatient(p);
        // Pre-fill contact fields from patient data
        if (p.firstName) setContactFirstName(p.firstName);
        if (p.lastName) setContactLastName(p.lastName);
        if (p.email) setContactEmail(p.email);
        if (p.phone) setContactPhone(p.phone.replace(/\D/g, "").slice(0, 10));
        if (p.address) setContactAddress(p.address);
        if (p.dateOfBirth) {
          // Convert ISO to MM/DD/YYYY for display
          const dob = p.dateOfBirth;
          if (dob.includes("-") && dob.split("-")[0].length === 4) {
            const [y, m, d] = dob.split("-");
            setContactDob(`${m}/${d}/${y}`);
          } else { setContactDob(dob); }
        }
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
    if (s.chiefComplaint) setChiefComplaint(s.chiefComplaint);
    if (s.symptomsDone) setSymptomsDone(true);
    if (s.pharmacy) setPharmacy(s.pharmacy);
    if (s.pharmacyAddress) setPharmacyAddress(s.pharmacyAddress);
    if (s.pharmacyInfo) setPharmacyInfo(s.pharmacyInfo);
    if (s.visitType) setVisitType(s.visitType);
    if (s.visitTypeConfirmed) setVisitTypeConfirmed(true);
    if (s.visitTypeChosen) setVisitTypeChosen(true);
    if (s.symptomsText) setSymptomsText(s.symptomsText);
    if (s.selectedMeds) setSelectedMeds(s.selectedMeds);
    if (s.wantToTalk !== undefined) setWantToTalk(s.wantToTalk);
    if (s.additionalMedsAnswer) setAdditionalMedsAnswer(s.additionalMedsAnswer);
    if (s.asyncAcknowledged) setAsyncAcknowledged(s.asyncAcknowledged);
    if (s.controlledAcknowledged) setControlledAcknowledged(s.controlledAcknowledged);
    if (s.contactPhone) setContactPhone(s.contactPhone);
    if (s.contactFirstName) setContactFirstName(s.contactFirstName);
    if (s.contactLastName) setContactLastName(s.contactLastName);
    if (s.contactAddress) setContactAddress(s.contactAddress);
    if (s.contactDob) setContactDob(s.contactDob);
    if (s.contactEmail) setContactEmail(s.contactEmail);
    if (s.phoneConfirmed) setPhoneConfirmed(true);
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
    if (!reason || !symptomsDone) return false;
    if (!pharmacy) return false;
    if (!visitTypeConfirmed) return false;
    if (needsCalendar) return !!(appointmentDate && appointmentTime);
    if (visitType === "instant" && wantToTalk && (!appointmentDate || !appointmentTime)) return false;
    if (visitType === "refill") {
      const hasMedsOrNotes = selectedMeds.length > 0 || symptomsText.trim().length > 0 || !!photoFile;
      if (!hasMedsOrNotes) return false;
      if (hasControlledSelected) return !!controlledAcknowledged;
      return true;
    }
    return !!asyncAcknowledged;
  }, [reason, chiefComplaint, pharmacy, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, visitType, wantToTalk, selectedMeds, symptomsText, photoFile, hasControlledSelected, asyncAcknowledged, controlledAcknowledged]);

  // Track payment intent fetch errors for retry
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);
  const paymentFetchController = useRef<AbortController | null>(null);

  // ── Pre-fetch payment intent — fires when user taps Confirm on step 4.5 ──
  // Phone step (step 5) gives Stripe ~3-5s to return clientSecret before payment renders.
  const shouldPrefetch = visitTypeConfirmed && !clientSecret;

  useEffect(() => {
    if (!shouldPrefetch) {
      console.log("[PaymentPrefetch] skip — visitTypeConfirmed:", visitTypeConfirmed, "clientSecret:", clientSecret ? "SET" : "EMPTY");
      return;
    }

    console.log("[PaymentPrefetch] FIRING — amount:", currentPrice.amount);

    // Abort any previous in-flight request
    paymentFetchController.current?.abort();
    const controller = new AbortController();
    paymentFetchController.current = controller;

    setPaymentIntentError(null);

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: currentPrice.amount, visit_amount: visitFeePrice.amount }),
      signal: controller.signal,
    })
      .then((res) => {
        console.log("[PaymentPrefetch] API responded:", res.status);
        if (!res.ok) throw new Error(`Payment API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) { console.log("[PaymentPrefetch] aborted, ignoring"); return; }
        console.log("[PaymentPrefetch] clientSecret:", data.clientSecret ? "received" : "MISSING", "visitIntentId:", data.visitIntentId || "none");
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else throw new Error("No clientSecret in response");
        if (data.visitIntentId) setVisitIntentId(data.visitIntentId);
      })
      .catch((err) => {
        if (err.name === "AbortError") { console.log("[PaymentPrefetch] aborted (expected)"); return; }
        console.error("[PaymentPrefetch] ERROR:", err);
        if (!controller.signal.aborted) {
          setPaymentIntentError(err.message || "Failed to prepare payment. Tap to retry.");
        }
      });

    return () => { controller.abort(); };
  }, [shouldPrefetch, currentPrice.amount, visitFeePrice.amount]);

  // Retry handler for payment intent failures
  const retryPaymentIntent = useCallback(() => {
    setClientSecret("");
    setPaymentIntentError(null);
    // useEffect above will re-fire because clientSecret is now ""
  }, []);

  // ── Fallback for step 5 payment — moved below uiStep declaration ──

  const handleVisitTypeChange = (type: VisitType) => {
    // Abort any in-flight payment intent fetch before changing type
    paymentFetchController.current?.abort();
    setVisitType(type); setClientSecret(""); setVisitIntentId(""); setAsyncAcknowledged(false);
    setPaymentIntentError(null);
    setVisitTypeChosen(false);
    setVisitTypeConfirmed(false);
    setPhoneConfirmed(false);
    setContactPhone("");
    // Only clear meds when switching AWAY from refill, not when selecting refill (meds already chosen in popup)
    if (type !== "refill") {
      setSelectedMeds([]); setHasControlledSelected(false); setControlledAcknowledged(false);
      saveAnswers({ visitType: type, asyncAcknowledged: false, selectedMeds: [], controlledAcknowledged: false, phoneConfirmed: false, contactPhone: "" });
    } else {
      saveAnswers({ visitType: type, asyncAcknowledged: false, phoneConfirmed: false, contactPhone: "" });
    }
  };

  const toggleMed = (name: string) => {
    const newMeds = selectedMeds.includes(name) ? selectedMeds.filter(m => m !== name) : [...selectedMeds, name];
    setSelectedMeds(newMeds); setClientSecret(""); saveAnswers({ selectedMeds: newMeds });
  };

  const stripeOptions = useMemo(() => clientSecret ? {
    clientSecret,
    appearance: { theme: "night" as const, variables: { colorPrimary: "#00CBA9", colorBackground: "#11161c", colorText: "#ffffff", borderRadius: "8px" } },
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
    // Show post-payment intake form instead of routing immediately
    setIntakePhase(true);
  };

  // After intake is submitted, route to success/appointment
  const handleIntakeSubmit = async () => {
    setIntakeSubmitting(true);
    try {
      const email = patient?.email || contactEmail || "";
      // Update patient record with intake answers
      await fetch("/api/update-intake-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          has_drug_allergies: intakeAnswers.allergies?.val ?? false,
          drug_allergies_details: intakeAnswers.allergies?.detail || "",
          has_recent_surgeries: intakeAnswers.surgeries?.val ?? false,
          recent_surgeries_details: intakeAnswers.surgeries?.detail || "",
          has_ongoing_medical_issues: intakeAnswers.medical?.val ?? false,
          ongoing_medical_issues_details: intakeAnswers.medical?.detail || "",
          has_current_medications: intakeAnswers.medications?.val ?? false,
          current_medications_details: intakeAnswers.medications?.detail || "",
        }),
      });
    } catch (err) {
      console.error("[Intake] Failed to submit:", err);
      // Continue to success even if intake save fails — payment already processed
    }
    // Route to success/appointment
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
  // 1=Reason, 2=Symptoms, 3=Pharmacy, 4=VisitType browse, 4.5=Confirm, 5=Phone, 6=Pay
  const activeGuideStep = useMemo((): number => {
    if (!reason) return 1;
    if (!symptomsDone) return 2;
    if (!pharmacy) return 3;
    if (!visitTypeChosen) return 4;
    if (!visitTypeConfirmed) return 4.5;
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return 4.5;
    if (!phoneConfirmed) return 5;
    return 6;
  }, [reason, symptomsDone, pharmacy, visitTypeChosen, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, phoneConfirmed]);

  const totalSteps = 6;

  const uiStep = activeGuideStep;
  const headerIsStep5 = uiStep >= 6;
  const headerUltraCompact = headerIsStep5 && isTightViewport;
  const progressPct = paymentLoading ? 90 : Math.min((uiStep / totalSteps) * 100, 100);

  // Speaking progress pill text (re-animates on change)
  const [pillText, setPillText] = useState("");
  useEffect(() => {
    const next = getProgressPillMessage({ uiStep, progressPct, isPreparingBooking: paymentLoading });
    setPillText(next);
  }, [uiStep, progressPct, paymentLoading]);

  // ── Fallback: if we reach step 5 without a clientSecret, force-fetch ──
  useEffect(() => {
    if (uiStep === 6 && !clientSecret && !paymentIntentError && !paymentFetchController.current) {
      console.log("[Fallback] Step 6 reached with no clientSecret — force-fetching");
      const controller = new AbortController();
      paymentFetchController.current = controller;
      fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: currentPrice.amount, visit_amount: visitFeePrice.amount }),
        signal: controller.signal,
      })
        .then((res) => { if (!res.ok) throw new Error(`Payment API returned ${res.status}`); return res.json(); })
        .then((data) => {
          if (controller.signal.aborted) return;
          if (data.clientSecret) { setClientSecret(data.clientSecret); console.log("[Fallback] clientSecret received"); }
          else throw new Error("No clientSecret in response");
          if (data.visitIntentId) setVisitIntentId(data.visitIntentId);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          console.error("[Fallback] ERROR:", err);
          if (!controller.signal.aborted) setPaymentIntentError(err.message || "Failed to prepare payment.");
        });
    }
  }, [uiStep, clientSecret, paymentIntentError, currentPrice.amount, visitFeePrice.amount]);

  // One-question-at-a-time wizard navigation (Back clears downstream answers so only one step shows)
  const goBack = useCallback(() => {
    const step = activeGuideStep;
    if (step <= 1) return;
    if (step === 2) {
      setReason("");
      setChiefComplaint("");
      setSymptomsDone(false);
      saveAnswers({ reason: "", chiefComplaint: "", symptomsDone: false });
      return;
    }
    if (step === 3) {
      setSymptomsDone(false);
      saveAnswers({ symptomsDone: false });
      return;
    }
    if (step === 4) {
      setPharmacy("");
      setPharmacyAddress("");
      setPharmacyInfo(null);
      setVisitTypeChosen(false);
      setVisitTypeConfirmed(false);
      setPhoneConfirmed(false);
      setContactPhone("");
      setVisitTypePopup(null);
      setAppointmentDate("");
      setAppointmentTime("");
      setStep4PopupFired(false);
      paymentFetchController.current?.abort();
      setClientSecret("");
      setPaymentIntentError(null);
      saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null, visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "", visitTypePopup: null, appointmentDate: "", appointmentTime: "" });
      return;
    }
    if (step === 4.5) {
      // Return to visit type browse
      setVisitTypeChosen(false);
      setVisitTypeConfirmed(false);
      setPhoneConfirmed(false);
      setContactPhone("");
      setStep4PopupFired(false);
      saveAnswers({ visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" });
      return;
    }
    if (step === 5) {
      // Return to confirm card — abort payment intent
      setVisitTypeConfirmed(false);
      setPhoneConfirmed(false);
      setContactPhone("");
      paymentFetchController.current?.abort();
      setClientSecret("");
      setPaymentIntentError(null);
      saveAnswers({ visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" });
      return;
    }
    if (step === 6) {
      // Return to phone step — keep payment intent alive
      setPhoneConfirmed(false);
      saveAnswers({ phoneConfirmed: false });
      return;
    }
  }, [
    activeGuideStep,
    setReason, setChiefComplaint, setSymptomsDone,
    setVisitTypeConfirmed, setVisitTypePopup,
    setAppointmentDate, setAppointmentTime,
    setAsyncAcknowledged, setControlledAcknowledged,
  ]);

  // Auto-show first visit type popup when Step 4 finishes rolling in
  const visitTypeRef = useRef<HTMLDivElement>(null);
  const [step4PopupFired, setStep4PopupFired] = useState(false);

  // Auto-scroll to visit type step when pharmacy is selected
  useEffect(() => {
    if (pharmacy && symptomsDone && !visitTypeConfirmed && visitTypeRef.current) {
      setTimeout(() => {
        visitTypeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [pharmacy, symptomsDone, visitTypeConfirmed]);
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

  // ── Tight viewport detector (keeps Step 5 content from being cut off on small iOS Safari viewports) ──
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;

    const compute = () => {
      const h = vv?.height ?? window.innerHeight;
      // ~740px is a practical cutoff where Step 5 content can get clipped by a tall header
      setIsTightViewport(h < 740);
    };

    compute();
    vv?.addEventListener("resize", compute);
    window.addEventListener("resize", compute);

    return () => {
      vv?.removeEventListener("resize", compute);
      window.removeEventListener("resize", compute);
    };
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
      <div className="text-white font-sans overflow-hidden" style={{ background: "radial-gradient(900px 420px at 18% 12%, rgba(255,179,71,0.18), transparent 55%), radial-gradient(800px 380px at 76% 22%, rgba(110,231,183,0.16), transparent 55%), linear-gradient(180deg, #0b0f0c 0%, #070a08 100%)", height: "100dvh", minHeight: "0" }}>
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
            <button onClick={handleControlledSchedule} disabled={!controlledScheduleDate || !controlledScheduleTime || schedulingAppointment} className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#2dd4a0]" style={{ background: "rgba(110,231,183,0.08)", color: "#fff" }}>
              {schedulingAppointment ? (<><div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />Scheduling...</>) : (<><Check size={16} />Confirm {controlledVisitType === "video" ? "Video" : "Phone"} Visit</>)}
            </button>
            <p className="text-center text-gray-700 text-[8px] mt-1"><Lock size={8} className="inline mr-0.5" />No additional charge · HIPAA Compliant</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══ STEP 2 REVIEW PAGE REMOVED — payment is now inline in Step 5 ═══

  // ═══ POST-PAYMENT: Secure Intake Form ═══
  const INTAKE_QUESTIONS = [
    { id: "allergies", q: "Any Drug Allergies?", ph: "List any known drug allergies..." },
    { id: "surgeries", q: "Any Recent Surgeries?", ph: "Describe recent surgeries..." },
    { id: "medical", q: "Ongoing Medical Issues?", ph: "Describe ongoing issues..." },
    { id: "medications", q: "Taking Any Medications?", ph: "List current medications..." },
  ];

  if (intakePhase) {
    const allIntakeDone = INTAKE_QUESTIONS.every(q => !!intakeAnswers[q.id]);
    const intakePct = Math.round((Object.keys(intakeAnswers).length / INTAKE_QUESTIONS.length) * 100);

    const formatDob = (dob: string) => {
      if (!dob) return "—";
      if (dob.includes("/")) return dob;
      const d = new Date(dob + "T12:00:00");
      if (isNaN(d.getTime())) return dob;
      return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
    };

    const formatPhoneDisplay = (phone: string) => {
      const d = phone.replace(/\D/g, "").slice(0, 10);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    };

    return (
      <div className="ec-root fixed inset-0 bg-[#070a08] overflow-hidden" style={{ height: "100dvh" }}>
        <style>{`
          @supports not (height: 100dvh) { .ec-root { height: 100svh !important; } }
          @supports (height: 100svh) { .ec-root { height: 100svh !important; } }
          @keyframes fadeInStep { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        `}</style>
        <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 8px)", paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px", background: "radial-gradient(600px 300px at 15% 10%, rgba(255,179,71,0.15), transparent 55%), radial-gradient(500px 250px at 80% 18%, rgba(110,231,183,0.12), transparent 55%), linear-gradient(180deg, #0b0f0c 0%, #070a08 100%)" }}>

          {/* Header — compact */}
          <div className="flex-shrink-0 text-center pt-1 pb-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-5 h-5 bg-[#2dd4a0]/20 rounded-md flex items-center justify-center"><Shield size={11} className="text-[#2dd4a0]" /></div>
              <span className="text-white font-bold text-[13px] tracking-tight">Medazon <span className="text-[#2dd4a0]">Health</span></span>
            </div>
            <p className="text-[#2dd4a0] text-[8px] font-bold uppercase tracking-[0.2em]">Private · Discreet</p>
            <h1 className="text-white font-black text-[18px] leading-tight mt-0.5">{allIntakeDone ? "Ready to submit." : "Secure intake unlocked."}</h1>
          </div>

          {/* Progress bar */}
          <div className="flex-shrink-0 pb-1">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#f97316] rounded-full transition-all duration-500" style={{ width: `${intakePct}%` }} />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
            <div style={{ animation: "fadeInStep 0.5s cubic-bezier(0.22, 1, 0.36, 1) both", display: "flex", flexDirection: "column", gap: "5px", paddingTop: "2px", paddingBottom: "8px" }}>

              {/* Auto-filled demographics */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-white/35 text-[8px] font-extrabold uppercase tracking-widest">Your Information</span>
                <span className="text-[#f97316] text-[7px] font-black uppercase tracking-wide bg-[#f97316]/10 border border-[#f97316]/25 rounded px-1 py-px">PRIORITY</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="grid grid-cols-4 gap-0.5">
                  <div className="bg-transparent border border-white/8 rounded-md px-1.5 py-1"><p className="text-white/25 text-[6px] font-bold uppercase">First</p><p className="text-white text-[10px] font-semibold truncate">{contactFirstName || patient.firstName}</p></div>
                  <div className="bg-transparent border border-white/8 rounded-md px-1.5 py-1"><p className="text-white/25 text-[6px] font-bold uppercase">Last</p><p className="text-white text-[10px] font-semibold truncate">{contactLastName || patient.lastName}</p></div>
                  <div className="bg-transparent border border-white/8 rounded-md px-1.5 py-1"><p className="text-white/25 text-[6px] font-bold uppercase">DOB</p><p className="text-white text-[10px] font-semibold">{contactDob || formatDob(patient.dateOfBirth)}</p></div>
                  <div className="bg-transparent border border-white/8 rounded-md px-1.5 py-1"><p className="text-white/25 text-[6px] font-bold uppercase">Phone</p><p className="text-white text-[8px] font-semibold">{formatPhoneDisplay(contactPhone || patient.phone)}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="bg-transparent border border-white/8 rounded-md px-1.5 py-1"><p className="text-white/25 text-[6px] font-bold uppercase">Email</p><p className="text-white text-[9px] font-semibold truncate">{contactEmail || patient.email}</p></div>
                  <div className="bg-transparent border border-white/8 rounded-md px-1.5 py-1"><p className="text-white/25 text-[6px] font-bold uppercase">Address</p><p className="text-white text-[9px] font-semibold truncate">{contactAddress || patient.address || "—"}</p></div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 my-0.5" />

              {/* Medical History label */}
              <div className="flex items-center gap-1.5">
                <span className="text-white/35 text-[8px] font-extrabold uppercase tracking-widest">Medical History</span>
                <span className="text-white/20 text-[7px] font-semibold">({INTAKE_QUESTIONS.length} questions)</span>
              </div>

              {/* Questions */}
              {INTAKE_QUESTIONS.map((q, i) => {
                const a = intakeAnswers[q.id];
                const isActive = i === intakeStep && !a;
                const isDone = !!a;
                const isFuture = i > intakeStep && !a;

                if (isFuture) {
                  return (
                    <div key={q.id} className="border border-white/8 rounded-lg opacity-20">
                      <div className="flex items-center justify-between px-2.5 py-1.5">
                        <span className="text-white/30 text-[11px] font-extrabold">{q.q}</span>
                        <span className="text-[#f97316] text-[8px] font-bold bg-[#f97316]/10 rounded px-1.5 py-0.5">Pending</span>
                      </div>
                    </div>
                  );
                }

                if (isDone) {
                  const ansText = a.val ? `Yes: ${a.detail || "—"}` : "No";
                  return (
                    <div key={q.id} className="border border-[#2dd4a0]/15 rounded-lg cursor-pointer" onClick={() => { const next = { ...intakeAnswers }; delete next[q.id]; setIntakeAnswers(next); setIntakeStep(i); }}>
                      <div className="flex items-center justify-between px-2.5 py-1.5">
                        <span className="text-white text-[11px] font-extrabold">{q.q}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#2dd4a0] text-[9px] font-semibold max-w-[120px] truncate">{ansText}</span>
                          <span className="text-[#2dd4a0] text-[8px] font-bold bg-[#2dd4a0]/10 rounded px-1 py-0.5">✓</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isActive) {
                  const showDetail = intakeDetailId === q.id;
                  return (
                    <div key={q.id} className="border border-[#f97316]/30 rounded-lg shadow-[0_0_8px_rgba(249,115,22,0.1)]">
                      <div className="flex items-center justify-between px-2.5 py-1.5">
                        <span className="text-white text-[11px] font-extrabold">{q.q}</span>
                        <span className="text-[#f97316] text-[8px] font-bold bg-[#f97316]/10 rounded px-1.5 py-0.5">Answer</span>
                      </div>
                      <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setIntakeDetailId(q.id); setIntakeDetailText(""); }} className={`flex-1 py-2 rounded-lg border-2 font-extrabold text-[12px] transition-all active:scale-95 ${showDetail ? "border-[#2dd4a0] bg-[#2dd4a0] text-black" : "border-white/8 bg-transparent text-white"}`}>Yes</button>
                          <button onClick={() => {
                            setIntakeDetailId(null); setIntakeDetailText("");
                            setIntakeAnswers(prev => ({ ...prev, [q.id]: { val: false, detail: "" } }));
                            setIntakeStep(Math.max(intakeStep, i + 1));
                          }} className="flex-1 py-2 rounded-lg border-2 border-white/8 bg-transparent text-white font-extrabold text-[12px] transition-all active:scale-95">No</button>
                        </div>
                        {showDetail && (
                          <div className="flex flex-col gap-1.5">
                            <input value={intakeDetailText} onChange={(e) => setIntakeDetailText(e.target.value)} placeholder={q.ph} autoFocus className="w-full bg-transparent border border-white/10 rounded-lg px-2.5 py-2 text-[11px] text-white caret-white focus:outline-none focus:border-[#2dd4a0] placeholder:text-gray-600" onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }} />
                            <button disabled={!intakeDetailText.trim()} onClick={() => {
                              setIntakeAnswers(prev => ({ ...prev, [q.id]: { val: true, detail: intakeDetailText.trim() } }));
                              setIntakeStep(Math.max(intakeStep, i + 1));
                              setIntakeDetailId(null); setIntakeDetailText("");
                            }} className="w-full py-1.5 rounded-md bg-white/5 text-white font-bold text-[11px] transition-all active:scale-97 disabled:opacity-25">Next →</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Submit button — shown when all done */}
              {allIntakeDone && (
                <div style={{ animation: "fadeInStep 0.4s ease both" }} className="flex flex-col gap-1.5 mt-0.5">
                  <p className="text-[#2dd4a0] text-[10px] font-extrabold text-center">✓ All Questions Answered</p>
                  <button onClick={handleIntakeSubmit} disabled={intakeSubmitting} className="w-full py-3 rounded-xl border-2 border-[#2dd4a0]/30 text-white font-extrabold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40" style={{ background: "#f97316" }}>
                    {intakeSubmitting ? (<><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Submitting...</>) : "Submit Intake →"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 py-0.5">
            <p className="text-center text-gray-700 text-[7px]"><Lock size={7} className="inline mr-0.5" />HIPAA Compliant · Encrypted · Your data is never shared</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1 — MOBILE APP GUIDED BOOKING FLOW
  // ═══════════════════════════════════════════════════════════
  const activeOrangeBorder = "border-[3px] border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.5)]";

  const CompletedPill = ({ text, onReset, subText }: { text: string; onReset: () => void; subText?: string }) => (
    <button onClick={onReset} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"><Check size={14} className="text-gray-500" strokeWidth={3} /></div>
      <span className="text-gray-500 text-[11px] font-semibold truncate flex-1 text-left">{text}</span>
      <span className="text-white text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
    </button>
  );

  const PharmacyCompletedView = () => (
    <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null }); }}
      className="w-full rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all overflow-hidden" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <div className="px-3 py-1 border-b border-white/5 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"><Check size={12} className="text-gray-500" strokeWidth={3} /></div>
        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Preferred Pharmacy</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        {pharmacyInfo?.photo ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/5 opacity-50"><img src={pharmacyInfo.photo} alt={pharmacy} className="w-full h-full object-cover" /></div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#11161c] border border-white/5 flex items-center justify-center flex-shrink-0"><Pill size={14} className="text-gray-700" /></div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 font-semibold text-[11px] truncate">{pharmacy}</p>
          {pharmacyInfo?.address && <p className="text-gray-600 text-[8px] truncate">{pharmacyInfo.address}</p>}
        </div>
        <span className="text-white text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
      </div>
    </button>
  );

  return (
    <div className="ec-root text-white font-sans overflow-hidden" style={{ background: "radial-gradient(900px 420px at 18% 12%, rgba(255,179,71,0.18), transparent 55%), radial-gradient(800px 380px at 76% 22%, rgba(110,231,183,0.16), transparent 55%), linear-gradient(180deg, #0b0f0c 0%, #070a08 100%)", height: "100dvh", minHeight: "100vh" }}>
      <style>{`
        @supports (height: 100dvh) { .ec-root { height: 100dvh !important; } }
        @supports (height: 100svh) { .ec-root { height: 100svh !important; } }
        @keyframes guidePulse { 0%,100% { box-shadow: 0 0 8px rgba(249,115,22,0.3); } 50% { box-shadow: 0 0 18px rgba(249,115,22,0.55); } }
        @keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } }
        @keyframes ackPulse { 0%,100% { box-shadow: 0 0 0px rgba(249,115,22,0); } 50% { box-shadow: 0 0 16px rgba(249,115,22,0.5); } }
        @keyframes fadeInBtn { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInStep { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInPill { from { opacity:0; transform:translateY(12px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pillIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes charPulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.25); opacity: 1; } }
      `}</style>
      <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 4px)", paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px" }}>

        {/* ═══ CENTERED HEADER — auto-shrinks to fit ═══ */}
        <div className={`flex-shrink-0 ${headerUltraCompact ? "pt-1 pb-0.5" : headerIsStep5 ? "pt-1.5 pb-0.5" : "pt-2 pb-1"}`}>
          {/* Logo + Brand — compact row */}
          <div className={`flex items-center justify-center gap-1.5 ${headerUltraCompact ? "mb-0" : "mb-0.5"}`}>
            <div className="w-6 h-6 bg-[#2dd4a0]/20 rounded-md flex items-center justify-center">
              <Shield size={13} className="text-[#2dd4a0]" />
            </div>
            <span className="text-white font-bold text-[15px] tracking-tight">Medazon <span className="text-[#2dd4a0]">Health</span></span>
          </div>
          {/* Subtitle — auto-shrink */}
          {!headerIsStep5 && (
            <p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-[0.2em] mb-1 text-center">Private · Discreet</p>
          )}
          {headerIsStep5 && headerUltraCompact && <p className="text-gray-500 text-[9px] font-semibold mt-0.5 text-center">Review and pay to reserve your provider.</p>}

          {/* Main heading — dynamic pill text */}
          <h1 key={pillText} className={`text-white font-black leading-tight text-center ${headerIsStep5 ? "mb-0.5" : "mb-1"}`} style={{ fontSize: headerIsStep5 ? "clamp(20px, 5.5vw, 26px)" : "clamp(22px, 6.5vw, 28px)" }}>
            {pillText}
          </h1>        </div>

        
        {/* ═══ WELCOME + PROGRESS ═══ */}
        <div className={`flex-shrink-0 ${headerIsStep5 ? "pb-0.5" : "pb-1"}`}>
          {patient.source !== "new" && patient.firstName && (
            <div className="flex items-center gap-2 mb-1">
              <Zap size={12} className="text-[#f97316]" />
              <span className="text-[#f97316] font-semibold text-[11px]">Welcome back, {patient.firstName}!</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full mt-1">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#f97316] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE GUIDED FORM ═══ */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-1 space-y-2 min-h-0 overscroll-contain" style={{ scrollbarWidth: "none" }}>

          {/* STEP 1: Reason for Visit — ONLY visible when it's the active step */}
          {uiStep === 1 && (
            <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center justify-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" /><span className="text-white text-[15px] font-black uppercase tracking-wide">What Brings You In?</span></div>
              <div className={`rounded-xl bg-transparent p-4 transition-all ${activeOrangeBorder}`}>
                <button onClick={() => setReasonDialogOpen(true)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-[#2dd4a0]/40 bg-[#0d1218] hover:border-[#2dd4a0]/60 text-left transition-all">
                  <span className="text-gray-300 text-[15px]">{reason || "Select a reason..."}</span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Describe Symptoms — ONLY visible when it's the active step */}
          {uiStep === 2 && (
            <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
<div className="flex items-center justify-center gap-2 mt-3 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="text-white text-[15px] font-black uppercase tracking-wide">Briefly Describe Your Symptoms</span>
              </div>
              <div className={`rounded-xl bg-transparent p-3 space-y-2 transition-all ${activeOrangeBorder} flex flex-col min-h-0`}>
                <textarea value={chiefComplaint} onChange={(e) => { setChiefComplaint(e.target.value); saveAnswers({ chiefComplaint: e.target.value }); }} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); }} placeholder="e.g., Burning during urination for 3 days..." rows={3} autoFocus className={`w-full bg-[#0d1218] border-2 rounded-xl px-4 py-3 text-[15px] text-white focus:outline-none resize-none placeholder:text-gray-400 caret-white ${chiefComplaint.length >= 10 ? "border-[#2dd4a0]/30" : "border-[#f97316] focus:border-[#f97316]"}`} />
                {chiefComplaint.length < 10 ? (
                  <p className="text-gray-300 text-[12px]">Type at least <span className="text-[#f97316] font-black text-[16px] inline-block" style={{ animation: "charPulse 1.2s ease-in-out infinite" }}>{10 - chiefComplaint.length}</span> more characters</p>
                ) : (
                  <p className="text-[#2dd4a0] text-[12px] font-semibold">✓ Ready to continue</p>
                )}
                <div className="flex gap-2">
                  <button onClick={goBack} className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.12)" }}><span style={{ fontSize: "14px", lineHeight: 1 }}>←</span> Back</button>
                  <button onClick={() => { setSymptomsDone(true); saveAnswers({ chiefComplaint, symptomsDone: true }); }} disabled={chiefComplaint.length < 10} className={`flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1 border-2 disabled:cursor-not-allowed ${chiefComplaint.length >= 10 ? "border-[#2dd4a0]/30" : "border-[#f97316]"}`} style={{ background: "#f97316" }}>Continue →</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preferred Pharmacy — ONLY visible when it's the active step */}
          {uiStep === 3 && (
            <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center justify-center gap-2 mt-3 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="text-white text-[15px] font-black uppercase tracking-wide">Preferred Pharmacy</span>
              </div>
              <div className={`rounded-xl bg-transparent p-4 space-y-2 transition-all ${activeOrangeBorder}`}>
                <PharmacySelector value={pharmacy} onChange={(val: string, info?: any) => {
                  setPharmacy(val);
                  if (info) {
                    const pInfo: PharmacyInfo = { name: info.name || val, address: info.address || info.formatted_address || "", photo: info.photo || info.photoUrl || "", rating: info.rating || undefined, reviewCount: info.reviewCount || info.user_ratings_total || undefined, isOpen: info.isOpen ?? info.opening_hours?.open_now ?? undefined };
                    setPharmacyInfo(pInfo); setPharmacyAddress(info.address || info.formatted_address || "");
                    saveAnswers({ pharmacy: val, pharmacyInfo: pInfo, pharmacyAddress: pInfo.address });
                  } else { saveAnswers({ pharmacy: val }); }
                }} placeholder="Search pharmacy..." className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316] placeholder:text-gray-600" />
              </div>
            </div>
          )}

          {/* STEP 4: Select Visit Type — ONLY visible when it's the active step */}
          <div ref={visitTypeRef}>
          {uiStep === 4 && (
              <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center justify-center gap-2 mt-3 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span className="text-white text-[15px] font-black uppercase tracking-wide">Select Visit Type</span>
                </div>
                <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all ${activeOrangeBorder}`}>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { key: "instant" as VisitType, label: "Treat Me\nNow", icon: Zap, color: "#2dd4a0", badge: "✨ NEW" },
                      { key: "refill" as VisitType, label: "Rx\nRefill", icon: Pill, color: "#f59e0b", badge: "⚡ FAST" },
                      { key: "video" as VisitType, label: "Video\nVisit", icon: Video, color: "#3b82f6", badge: null },
                      { key: "phone" as VisitType, label: "Phone\n/ SMS", icon: Phone, color: "#a855f7", badge: null },
                    ] as const).map((vt) => {
                      const Icon = vt.icon;
                      const isActive = visitTypePopup === vt.key;
                      const hasPopupOpen = !!visitTypePopup;
                      return (<button key={vt.key} onClick={() => setVisitTypePopup(vt.key)} className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all ${isActive ? `border-[3px] border-[#2dd4a0]/30 shadow-[0_0_12px_rgba(45,212,160,0.15)]` : hasPopupOpen ? "border-2 border-white/10" : "border-2 border-white/10 hover:border-white/20"}`} style={{ minHeight: "72px" }}>
                        {vt.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: vt.color, color: "#000" }}>{vt.badge}</span>}
                        <Icon size={18} style={{ color: isActive ? vt.color : "#6b7280" }} /><span className={`text-[9px] font-bold mt-1 text-center leading-tight whitespace-pre-line ${isActive ? "text-white" : "text-gray-400"}`}>{vt.label}</span>
                        {hasPopupOpen && !isActive && <span className="text-[7px] text-gray-500 mt-0.5">tap to select</span>}
                      </button>);
                    })}
                  </div>
                </div>
              </div>
          )}

          {/* ═══ VISIT TYPE INFO — compact popup with confirm button inside ═══ */}
          {visitTypePopup && !visitTypeConfirmed && (
            <div className="rounded-xl overflow-hidden" style={{ animation: "fadeInStep 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="p-3 space-y-2.5 relative bg-transparent border border-white/10 rounded-xl" style={{ minHeight: "180px" }}>
                <button onClick={() => setVisitTypePopup(null)} className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors z-10"><X size={16} /></button>
                {visitTypePopup === "instant" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#2dd4a0]/15 flex items-center justify-center flex-shrink-0"><Zap size={16} className="text-[#2dd4a0]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Get Seen Without Being Seen</h3><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider">Instant Care · No Appointment</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">Provider reviews your case privately, sends treatment + Rx to your pharmacy.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#2dd4a0]" /><span className="text-white text-[10px]">100% private</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#2dd4a0]" /><span className="text-white text-[10px]">1–2 hours</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#2dd4a0]" /><span className="text-white text-[10px]">Rx to pharmacy</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("instant"); setVisitTypeChosen(true); saveAnswers({ visitType: "instant", visitTypeChosen: true }); setVisitTypePopup(null); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "refill" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#f59e0b]/15 flex items-center justify-center flex-shrink-0"><Pill size={16} className="text-[#f59e0b]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Rx Refill — No Appointment</h3><p className="text-[#f59e0b] text-[9px] font-bold uppercase tracking-wider">Same-day pharmacy pickup</p></div></div>
                  <div className="rounded-xl bg-[#0d1218] border border-white/10 p-2.5 space-y-1.5">
                    <p className="text-white text-[10px] font-semibold">Select Medications to Refill</p>
                    {medsLoading ? (
                      <div className="flex items-center justify-center py-2"><div className="animate-spin w-3 h-3 border-2 border-[#f59e0b] border-t-transparent rounded-full" /><span className="ml-2 text-gray-400 text-[10px]">Loading...</span></div>
                    ) : medications.length > 0 ? (
                      <div className="space-y-0.5 max-h-36 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                        {medications.map((med) => {
                          const ic = isControlledSubstance(med.name);
                          const ck = selectedMeds.includes(med.name);
                          return (
                            <label key={med.name} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] transition-all ${ck ? "bg-[#f59e0b]/10 border border-[#f59e0b]/30" : "hover:bg-white/5 border border-transparent"} ${ic ? "border-red-500/30" : ""}`}>
                              <input type="checkbox" checked={ck} onChange={() => toggleMed(med.name)} className="w-3.5 h-3.5 rounded border-white/20 bg-[#0d1218] text-[#f59e0b] focus:ring-[#f59e0b] flex-shrink-0" />
                              <span className={`flex-1 ${ic ? "text-red-400" : "text-white"}`}>{med.name} {med.dosage ? `(${med.dosage})` : ""}</span>
                              {ic && <span className="text-[7px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded font-bold flex-shrink-0">CTRL</span>}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-[10px] py-1">No medications found on file.</p>
                    )}
                    <textarea value={symptomsText} onChange={(e) => { setSymptomsText(e.target.value); saveAnswers({ symptomsText: e.target.value }); }} placeholder="Additional medications or notes..." rows={1} className="w-full bg-[#11161c] border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#f59e0b] resize-none placeholder:text-gray-600" />
                  </div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("refill"); setVisitTypeChosen(true); saveAnswers({ visitType: "refill", visitTypeChosen: true }); setVisitTypePopup(null); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "video" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#3b82f6]/15 flex items-center justify-center flex-shrink-0"><Video size={16} className="text-[#3b82f6]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Face-to-Face, From Anywhere</h3><p className="text-[#3b82f6] text-[9px] font-bold uppercase tracking-wider">Video Visit · Live</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">See your provider live on video — just like an in-office visit.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">Real-time</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">HIPAA encrypted</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">Pick a time</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("video"); setVisitTypeChosen(true); saveAnswers({ visitType: "video", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setDateTimeMode("date"); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "phone" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#a855f7]/15 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-[#a855f7]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Talk, Text, or Both</h3><p className="text-[#a855f7] text-[9px] font-bold uppercase tracking-wider">Phone / SMS · No Camera</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">Connect by phone or text — same quality care, no video.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">No downloads</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">Flexible</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">Follow-ups</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("phone"); setVisitTypeChosen(true); saveAnswers({ visitType: "phone", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setDateTimeMode("date"); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                <div className="flex items-center gap-1.5 opacity-50"><Lock size={9} className="text-gray-500" /><span className="text-gray-500 text-[8px]">Full anonymity · Identity stays private</span></div>
              </div>
            </div>
          )}
          </div>
          {/* END Step 4 wrapper */}

          {/* STEP 4.5: Confirm — summary with blurred reason, no ack */}
          {uiStep === 4.5 && (
            <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center justify-center gap-2.5 mt-3 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="text-white text-[16px] font-black uppercase tracking-wide">Confirm</span>
              </div>
              <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all ${activeOrangeBorder}`}>
                {/* Summary card */}
                <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-white/5">
                    <div className="w-9 h-9 rounded-full border-2 border-[#2dd4a0] overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 8px rgba(45,212,160,0.2)" }}><img src="/assets/provider-lamonica.png" alt="Provider" className="w-full h-full object-cover object-top" /></div>
                    <div className="flex-1 min-w-0"><p className="text-white font-bold text-[13px]">LaMonica A. Hodges, MSN, APRN, FNP-C</p></div>
                    <Shield size={14} className="text-[#2dd4a0] flex-shrink-0" />
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Reason</span>
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex items-center"><span className="text-white text-[13px] font-semibold" style={{ filter: "blur(6px)", userSelect: "none" }}>{reason}</span><span className="absolute inset-0 flex items-center justify-center"><span className="bg-[#2dd4a0]/15 border border-[#2dd4a0]/30 text-[#2dd4a0] text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded">PRIVATE</span></span></span>
                      <button onClick={() => { setReason(""); setChiefComplaint(""); setSymptomsDone(false); setVisitTypeChosen(false); setVisitTypeConfirmed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ reason: "", chiefComplaint: "", symptomsDone: false, visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">Tap to change</button>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Visit Type</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[13px] font-semibold">
                        {visitType === "instant" ? "⚡ Instant Care" : visitType === "refill" ? "💊 Rx Refill" : visitType === "video" ? "📹 Video Visit" : "📞 Phone / SMS"}
                      </span>
                      <button onClick={() => { setVisitTypeChosen(false); setVisitTypeConfirmed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">Tap to change</button>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Pharmacy</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[13px] font-semibold truncate">{pharmacy}</span>
                      <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); setVisitTypeChosen(false); setVisitTypeConfirmed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null, visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">Tap to change</button>
                    </div>
                  </div>
                  {selectedMeds.length > 0 && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                      <span className="text-gray-500 text-[12px] font-semibold">Medications</span>
                      <span className="text-white text-[12px] font-medium truncate ml-4">{selectedMeds.join(", ")}</span>
                    </div>
                  )}
                  {appointmentDate && appointmentTime && (
                    <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                      <span className="text-gray-500 text-[12px] font-semibold">Date &amp; Time</span>
                      <span className="text-white text-[13px] font-semibold">{formatDisplayDateTime()}</span>
                    </div>
                  )}
                  <div className="px-3.5 py-2.5 flex items-center justify-between" style={{ background: "rgba(45,212,160,0.04)" }}>
                    <span className="text-gray-400 text-[13px] font-bold">Booking Fee</span>
                    <span className="text-[#2dd4a0] font-black text-[18px]">{currentPrice.display}</span>
                  </div>
                </div>

                {/* Back + Continue */}
                <div className="flex gap-2">
                  <button onClick={goBack} className="flex-1 py-3 rounded-xl text-white font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.12)" }}><span style={{ fontSize: "15px", lineHeight: 1 }}>←</span> Back</button>
                  <button onClick={() => { setVisitTypeConfirmed(true); saveAnswers({ visitType, visitTypeChosen: true, visitTypeConfirmed: true }); }} className="flex-1 py-3 rounded-xl text-white font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center gap-1 border-2 border-[#2dd4a0]/30" style={{ background: "#f97316" }}>Continue →</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Secure Contact — demographics + phone */}
          {uiStep === 5 && (
            <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center justify-center gap-2.5 mt-3 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="text-white text-[16px] font-black uppercase tracking-wide">Secure Contact</span>
              </div>
              <div className={`rounded-xl bg-transparent p-4 space-y-2.5 transition-all ${activeOrangeBorder}`}>
                <p className="text-gray-400 text-[11px] leading-relaxed">Your provider needs this info for pharmacy compliance and safe care.</p>

                {/* First + Last name — side by side */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <label className="text-gray-500 text-[8px] font-bold uppercase tracking-wide absolute top-1.5 left-3">First Name</label>
                    <input type="text" autoComplete="given-name" value={contactFirstName} onChange={(e) => { setContactFirstName(e.target.value); saveAnswers({ contactFirstName: e.target.value }); }} className="w-full bg-[#0d1218] border-2 border-[#2dd4a0]/30 rounded-xl px-3 pt-5 pb-2 text-[14px] text-white focus:outline-none focus:border-[#2dd4a0] caret-white placeholder:text-gray-600" placeholder="First" />
                  </div>
                  <div className="flex-1 relative">
                    <label className="text-gray-500 text-[8px] font-bold uppercase tracking-wide absolute top-1.5 left-3">Last Name</label>
                    <input type="text" autoComplete="family-name" value={contactLastName} onChange={(e) => { setContactLastName(e.target.value); saveAnswers({ contactLastName: e.target.value }); }} className="w-full bg-[#0d1218] border-2 border-[#2dd4a0]/30 rounded-xl px-3 pt-5 pb-2 text-[14px] text-white focus:outline-none focus:border-[#2dd4a0] caret-white placeholder:text-gray-600" placeholder="Last" />
                  </div>
                </div>

                {/* Address — single line */}
                <div className="relative">
                  <label className="text-gray-500 text-[8px] font-bold uppercase tracking-wide absolute top-1.5 left-3">Address</label>
                  <input type="text" autoComplete="street-address" value={contactAddress} onChange={(e) => { setContactAddress(e.target.value); saveAnswers({ contactAddress: e.target.value }); }} className="w-full bg-[#0d1218] border-2 border-[#2dd4a0]/30 rounded-xl px-3 pt-5 pb-2 text-[14px] text-white focus:outline-none focus:border-[#2dd4a0] caret-white placeholder:text-gray-600" placeholder="123 Main St, Miami, FL 33101" />
                </div>

                {/* DOB + Phone — side by side */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <label className="text-gray-500 text-[8px] font-bold uppercase tracking-wide absolute top-1.5 left-3">Date of Birth</label>
                    <input type="text" inputMode="numeric" autoComplete="bday" value={contactDob} onChange={(e) => {
                      let v = e.target.value.replace(/[^\d/]/g, "");
                      const digits = v.replace(/\D/g, "");
                      if (digits.length >= 5) v = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,8)}`;
                      else if (digits.length >= 3) v = `${digits.slice(0,2)}/${digits.slice(2)}`;
                      setContactDob(v); saveAnswers({ contactDob: v });
                    }} className="w-full bg-[#0d1218] border-2 border-[#2dd4a0]/30 rounded-xl px-3 pt-5 pb-2 text-[14px] text-white focus:outline-none focus:border-[#2dd4a0] caret-white placeholder:text-gray-600" placeholder="MM/DD/YYYY" />
                  </div>
                  <div className="flex-1 relative">
                    <label className="text-gray-500 text-[8px] font-bold uppercase tracking-wide absolute top-1.5 left-3">Phone</label>
                    <input type="tel" inputMode="tel" autoComplete="tel" value={(() => { const d = contactPhone.replace(/\D/g, ""); if (d.length <= 3) return d; if (d.length <= 6) return `(${d.slice(0,3)}) ${d.slice(3)}`; return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`; })()} onChange={(e) => { const raw = e.target.value.replace(/\D/g, "").slice(0, 10); setContactPhone(raw); saveAnswers({ contactPhone: raw }); }} className="w-full bg-[#0d1218] border-2 border-[#2dd4a0]/30 rounded-xl px-3 pt-5 pb-2 text-[14px] text-white focus:outline-none focus:border-[#2dd4a0] caret-white placeholder:text-gray-600" placeholder="(000) 000-0000" />
                  </div>
                </div>

                {/* Email — full width */}
                <div className="relative">
                  <label className="text-gray-500 text-[8px] font-bold uppercase tracking-wide absolute top-1.5 left-3">Email</label>
                  <input type="email" inputMode="email" autoComplete="email" value={contactEmail} onChange={(e) => { setContactEmail(e.target.value); saveAnswers({ contactEmail: e.target.value }); }} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); }} className="w-full bg-[#0d1218] border-2 border-[#2dd4a0]/30 rounded-xl px-3 pt-5 pb-2 text-[14px] text-white focus:outline-none focus:border-[#2dd4a0] caret-white placeholder:text-gray-600" placeholder="you@email.com" />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-0.5">
                  <button onClick={goBack} className="flex-1 py-3 rounded-xl text-white font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.12)" }}><span style={{ fontSize: "15px", lineHeight: 1 }}>←</span> Back</button>
                  <button onClick={() => { setPhoneConfirmed(true); saveAnswers({ contactPhone, contactFirstName, contactLastName, contactAddress, contactDob, contactEmail, phoneConfirmed: true }); }} disabled={!contactFirstName.trim() || !contactLastName.trim() || !contactAddress.trim() || contactDob.replace(/\D/g, "").length < 8 || contactPhone.replace(/\D/g, "").length < 10 || !contactEmail.includes("@")} className={`flex-1 py-3 rounded-xl text-white font-bold text-[15px] transition-all active:scale-95 flex items-center justify-center gap-1 border-2 disabled:cursor-not-allowed ${contactFirstName.trim() && contactLastName.trim() && contactAddress.trim() && contactDob.replace(/\D/g, "").length >= 8 && contactPhone.replace(/\D/g, "").length >= 10 && contactEmail.includes("@") ? "border-[#2dd4a0]/30" : "border-[#f97316]"}`} style={{ background: "#f97316" }}>Continue →</button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Payment — inline, same page feel */}
          {uiStep === 6 && (() => { console.log("[Step6 Render] clientSecret:", clientSecret ? "SET" : "EMPTY", "stripeOptions:", stripeOptions ? "SET" : "UNDEF", "error:", paymentIntentError); return true; })() && (
            <div style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="flex items-center justify-center gap-2.5 mt-3 mb-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                <span className="text-white text-[16px] font-black uppercase tracking-wide">Complete Payment</span>
              </div>
              <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all ${activeOrangeBorder}`}>
                {/* Stripe Payment — wallets (Apple Pay, Google Pay) load automatically */}
                {clientSecret && stripeOptions ? (
                  <Elements options={stripeOptions} stripe={stripePromise}>
                    <Step2PaymentForm patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType} appointmentDate={appointmentDate} appointmentTime={appointmentTime} currentPrice={currentPrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress} selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess} visitIntentId={visitIntentId} />
                  </Elements>
                ) : paymentIntentError ? (
                  <div className="space-y-2 py-2">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-center">
                      <p className="text-red-400 text-[11px] font-semibold mb-1">Payment setup failed</p>
                      <p className="text-gray-400 text-[9px]">{paymentIntentError}</p>
                    </div>
                    <button onClick={retryPaymentIntent} className="w-full py-2.5 rounded-xl text-white font-bold text-[12px] border border-[#f97316] hover:bg-[#f97316]/10 transition-all" style={{ background: "rgba(249,115,22,0.05)" }}>
                      Retry Payment Setup
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-[#2dd4a0] border-t-transparent rounded-full" />
                    <p className="text-gray-400 text-[11px]">Loading payment methods…</p>
                  </div>
                )}
                {/* Back button */}
                <button onClick={goBack} className="w-full py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.12)" }}><span style={{ fontSize: "14px", lineHeight: 1 }}>←</span> Back</button>
              </div>
            </div>
          )}

        </div>

        {/* ═══ BOTTOM FOOTER ═══ */}
        <div className="flex-shrink-0 pb-1 pt-1">
          <p className="text-center text-gray-700 text-[8px]"><Lock size={8} className="inline mr-0.5" />HIPAA Compliant · Encrypted · Booking fee reserves your provider</p>
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
              <div className="px-4 py-3 text-white bg-white/[0.03] hover:bg-[#2dd4a0]/10 hover:text-[#2dd4a0] cursor-pointer text-sm border-b border-white/5 font-semibold active:bg-[#2dd4a0]/15 active:text-[#2dd4a0]" onClick={() => { setReason("Something Else"); setReasonDialogOpen(false); setReasonQuery(""); saveAnswers({ reason: "Something Else" }); }}>Something else</div>
              {filteredReasons.map((item: { name: string }) => (
                <div key={item.name} className="px-4 py-3 text-white hover:bg-[#2dd4a0]/10 hover:text-[#2dd4a0] cursor-pointer text-sm border-b border-white/5 last:border-0 active:bg-[#2dd4a0]/15 active:text-[#2dd4a0]" onClick={() => { setReason(item.name); setReasonDialogOpen(false); setReasonQuery(""); saveAnswers({ reason: item.name }); }}>{item.name}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DATE/TIME DIALOG — FULLSCREEN MOBILE CALENDAR ═══ */}
      {dateTimeDialogOpen && (() => {
        const today = new Date();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

        const isDatePast = (day: number) => {
          const d = new Date(viewYear, viewMonth, day);
          const t = new Date(); t.setHours(0,0,0,0);
          return d < t;
        };

        const formatDateStr = (day: number) => `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

        const timeSlots = ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"];

        const convertTo24 = (t: string) => {
          const [time, period] = t.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (period === "PM" && h !== 12) h += 12;
          if (period === "AM" && h === 12) h = 0;
          return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
        };

        const prevMonth = () => { if (viewMonth === 0) { setViewYear(viewYear-1); setViewMonth(11); } else setViewMonth(viewMonth-1); };
        const nextMonth = () => { if (viewMonth === 11) { setViewYear(viewYear+1); setViewMonth(0); } else setViewMonth(viewMonth+1); };

        return (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0a0e14" }}>
            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-4 pb-2 flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-xl">{dateTimeMode === "date" ? "Pick a Date" : "Pick a Time"}</h2>
                <p className="text-gray-400 text-sm">For your {visitType === "video" ? "video" : "phone"} visit</p>
              </div>
              <button onClick={() => setDateTimeDialogOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><X size={22} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: "none" }}>
              {dateTimeMode === "date" ? (
                <div className="space-y-4">
                  {/* Month nav */}
                  <div className="flex items-center justify-between px-2">
                    <button onClick={prevMonth} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg font-bold">‹</button>
                    <span className="text-white font-bold text-lg">{monthNames[viewMonth]} {viewYear}</span>
                    <button onClick={nextMonth} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg font-bold">›</button>
                  </div>
                  {/* Day labels */}
                  <div className="grid grid-cols-7 gap-1">
                    {dayLabels.map(d => (<div key={d} className="text-center text-gray-400 text-sm font-bold py-1">{d}</div>))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (<div key={`e-${i}`} />))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = formatDateStr(day);
                      const isPast = isDatePast(day);
                      const isSelected = appointmentDate === dateStr;
                      const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                      return (
                        <button key={day} disabled={isPast} onClick={() => { setAppointmentDate(dateStr); setDateTimeMode("time"); saveAnswers({ appointmentDate: dateStr }); }}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center text-base font-bold transition-all ${isPast ? "text-gray-700 cursor-not-allowed" : isSelected ? "bg-[#2dd4a0]/10 border-2 border-[#2dd4a0] text-[#2dd4a0]" : isToday ? "bg-[#2dd4a0]/20 text-[#2dd4a0] border-2 border-[#2dd4a0]" : "text-white bg-white/5 hover:bg-white/10 active:bg-[#2dd4a0]/30"}`}>
                          {day}
                          {isToday && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4a0] mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-gray-500 text-xs text-center">Times shown in your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selected date display */}
                  <button onClick={() => setDateTimeMode("date")} className="flex items-center gap-2 text-[#2dd4a0] text-sm font-semibold hover:underline">
                    ← {appointmentDate && (() => { const [y,m,d] = appointmentDate.split("-").map(Number); return `${monthNames[m-1]} ${d}, ${y}`; })()}
                  </button>
                  <p className="text-white font-bold text-lg">Available Times</p>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map(slot => {
                      const t24 = convertTo24(slot);
                      const isSelected = appointmentTime === t24;
                      return (
                        <button key={slot} onClick={() => { setAppointmentTime(t24); saveAnswers({ appointmentTime: t24 }); setDateTimeDialogOpen(false); }}
                          className={`py-3.5 rounded-xl text-base font-bold transition-all ${isSelected ? "bg-[#2dd4a0]/10 border-2 border-[#2dd4a0] text-[#2dd4a0]" : "bg-white/5 text-white hover:bg-white/10 active:bg-[#2dd4a0]/30 border border-white/10"}`}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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













