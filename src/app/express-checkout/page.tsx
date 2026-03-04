"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useStripe, useElements, PaymentElement, ExpressCheckoutElement } from "@stripe/react-stripe-js";
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
function getStepTitle(uiStep: number, isPreparingBooking: boolean, isReturning: boolean): string {
  if (isPreparingBooking) return "Preparing your booking…";
  if (uiStep <= 1) return "What Brings You In?";
  if (uiStep === 2) return "Describe Your Symptoms";
  if (uiStep === 3) return "Select Pharmacy";
  if (uiStep === 4) return "Visit Type";
  if (uiStep === 4.5 && !isReturning) return "Confirm";
  if (uiStep === 4.5) return "Confirm & Pay";
  if (uiStep === 4.75) return "Confirm & Pay";
  return "Confirm & Pay";
}

// ═══════════════════════════════════════════════════════════════
// Step 2 Payment Form — single viewport, no scroll
// ═══════════════════════════════════════════════════════════════
function Step2PaymentForm({
  patient, reason, chiefComplaint, visitType, appointmentDate, appointmentTime,
  currentPrice, pharmacy, pharmacyAddress, selectedMedications, symptomsText, onSuccess, visitIntentId, onCardExpand,
}: {
  patient: PatientInfo; reason: string; chiefComplaint: string; visitType: string;
  appointmentDate: string; appointmentTime: string; currentPrice: { amount: number; display: string };
  pharmacy: string; pharmacyAddress: string; selectedMedications: string[];
  symptomsText: string; onSuccess: () => void; visitIntentId: string; onCardExpand?: (expanded: boolean) => void;
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
  const [expressVisible, setExpressVisible] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [pulseField, setPulseField] = useState<string | null>(null);
  const isNewPatient = !patient?.id;
  const [newDobMonth, setNewDobMonth] = useState("");
  const [newDobDay, setNewDobDay] = useState("");
  const [newDobYear, setNewDobYear] = useState("");
  const newDobComplete = newDobMonth.length === 2 && newDobDay.length === 2 && newDobYear.length === 4;
  const newDobISO = newDobComplete ? `${newDobYear}-${newDobMonth}-${newDobDay}` : "";

  const getPatientData = () => {
    if (!isNewPatient) {
      return { email: patient.email, firstName: patient.firstName, lastName: patient.lastName, phone: patient.phone, dateOfBirth: convertDateToISO(patient.dateOfBirth), address: patient.address };
    }
    return { email: patient.email || "", firstName: patient.firstName || "", lastName: patient.lastName || "", phone: patient.phone || "", dateOfBirth: newDobISO, address: patient.address || "" };
  };

  // ── Express Checkout (Apple Pay / Google Pay) one-tap handler ──
  const handleExpressConfirm = async () => {
    setError(null);
    setPayInFlight(true);
    try {
      const pd = getPatientData();
      let patientId = patient.id;
      if (!patientId) {
        const createRes = await fetch("/api/check-create-patient", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
            phone: pd.phone, dateOfBirth: pd.dateOfBirth,
            address: pd.address, pharmacy: pharmacy || patient.pharmacy || "",
            pharmacyAddress: pharmacyAddress || "",
          }),
        });
        const createResult = await createRes.json();
        if (!createRes.ok) throw new Error(createResult.error || "Failed to create patient");
        patientId = createResult.patientId;
      }

      if (!stripe || !elements) { setError("Payment not ready."); setPayInFlight(false); return; }

      const { error: submitError } = await elements.submit();
      if (submitError) { setError(submitError.message || "Payment failed."); setPayInFlight(false); return; }

      const result = await stripe.confirmPayment({
        elements, redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/success`,
          payment_method_data: { billing_details: { name: `${pd.firstName} ${pd.lastName}`, email: pd.email, phone: pd.phone } },
        },
      });

      if (result.error) { setError(result.error.message || "Payment failed."); setPayInFlight(false); return; }

      setIsProcessing(true); setProgress(75); setStatusText("Creating appointment...");

      if (result.paymentIntent?.status === "succeeded") {
        const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isAsync = visitType === "instant" || visitType === "refill";
        let fullChiefComplaint = chiefComplaint || reason;
        if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
        if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

        const appointmentPayload = {
          payment_intent_id: result.paymentIntent.id, visit_intent_id: visitIntentId,
          appointmentData: {
            email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
            phone: pd.phone, dateOfBirth: pd.dateOfBirth,
            streetAddress: pd.address, symptoms: reason, chief_complaint: fullChiefComplaint,
            visitType, appointmentDate: isAsync ? new Date().toISOString().split("T")[0] : appointmentDate,
            appointmentTime: isAsync ? new Date().toTimeString().slice(0, 5) : appointmentTime,
            patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: !isNewPatient,
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
          payment_intent_id: result.paymentIntent.id, visit_intent_id: visitIntentId,
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
      const pd = getPatientData();
      if (!patientId) {
        const createRes = await fetch("/api/check-create-patient", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
            phone: pd.phone, dateOfBirth: pd.dateOfBirth,
            address: pd.address, pharmacy: pharmacy || patient.pharmacy || "",
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
            email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
            phone: pd.phone, dateOfBirth: pd.dateOfBirth,
            streetAddress: pd.address, symptoms: reason, chief_complaint: fullChiefComplaint,
            visitType, appointmentDate: isAsync ? new Date().toISOString().split("T")[0] : appointmentDate,
            appointmentTime: isAsync ? new Date().toTimeString().slice(0, 5) : appointmentTime,
            patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: !isNewPatient,
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

  const canPay = isNewPatient
    ? (!!(stripe && elements && acceptedTerms && elementReady && !payInFlight && newDobComplete))
    : (!!(stripe && elements && acceptedTerms && elementReady && !payInFlight));

  return (
    <>
      <div className="w-full space-y-2">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1.5 rounded-lg text-[10px]">{error}<button onClick={() => setError(null)} className="ml-2 underline text-[9px]">Dismiss</button></div>}

        {isTestMode ? (
          <button onClick={() => {
            if (!acceptedTerms) { setPulseField("terms"); setTimeout(() => setPulseField(null), 1500); return; }
            if (isNewPatient && !newDobComplete) { setPulseField("dob"); setTimeout(() => setPulseField(null), 1500); return; }
            handlePay();
          }} className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 font-bold text-white text-[14px] active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)", boxShadow: "0 4px 16px rgba(249,115,22,0.3)" }}>
            🧪 Test Pay — {currentPrice.display}
          </button>
        ) : (
          <div className="space-y-2">
            {/* Express Checkout — one-tap Apple Pay / Google Pay / Link */}
            <div style={{ visibility: expressVisible ? "visible" : "hidden", height: expressVisible ? "auto" : "0" }}>
              <ExpressCheckoutElement
                onConfirm={handleExpressConfirm}
                onReady={({ availablePaymentMethods }) => { if (availablePaymentMethods) setExpressVisible(true); }}
                options={{
                  buttonType: { applePay: "buy", googlePay: "buy" },
                  buttonTheme: { applePay: "white-outline", googlePay: "white" },
                  buttonHeight: 48,
                }}
              />
            </div>

            {/* Booking fee notice */}
            <p className="text-center text-gray-500 text-[9px] py-0.5">{currentPrice.display} booking fee · Visit fee collected separately after provider review</p>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-[10px] font-semibold uppercase">or pay with card</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Card form — ALWAYS open for new patients, collapsed for returning */}
            {showCardForm || !expressVisible || isNewPatient ? (
              <>
                {/* DOB field — new patients only */}
                {isNewPatient && (
                  <div className={`space-y-1.5 rounded-lg px-1 py-1 transition-all ${pulseField === "dob" ? "ring-2 ring-[#f97316] animate-pulse bg-[#f97316]/10" : ""}`}>
                    <label className="text-white text-[11px] font-semibold">Date of Birth</label>
                    <div className="flex gap-2">
                      <input type="text" inputMode="numeric" maxLength={2} placeholder="MM" value={newDobMonth}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); setNewDobMonth(v); if (v.length === 2) (document.getElementById("dob-day") as HTMLInputElement)?.focus(); }}
                        className="flex-1 rounded-xl px-3 py-2 text-white text-[13px] text-center focus:outline-none placeholder:text-gray-600" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid rgba(45,212,160,0.35)" }}
                        onFocus={(e) => { e.target.style.border = "2px solid #2dd4a0"; e.target.style.boxShadow = "0 0 0 1px #2dd4a0"; }}
                        onBlur={(e) => { e.target.style.border = "2px solid rgba(45,212,160,0.35)"; e.target.style.boxShadow = "none"; }}
                      />
                      <input id="dob-day" type="text" inputMode="numeric" maxLength={2} placeholder="DD" value={newDobDay}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); setNewDobDay(v); if (v.length === 2) (document.getElementById("dob-year") as HTMLInputElement)?.focus(); }}
                        className="flex-1 rounded-xl px-3 py-2 text-white text-[13px] text-center focus:outline-none placeholder:text-gray-600" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid rgba(45,212,160,0.35)" }}
                        onFocus={(e) => { e.target.style.border = "2px solid #2dd4a0"; e.target.style.boxShadow = "0 0 0 1px #2dd4a0"; }}
                        onBlur={(e) => { e.target.style.border = "2px solid rgba(45,212,160,0.35)"; e.target.style.boxShadow = "none"; }}
                      />
                      <input id="dob-year" type="text" inputMode="numeric" maxLength={4} placeholder="YYYY" value={newDobYear}
                        onChange={(e) => setNewDobYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="flex-1 rounded-xl px-3 py-2 text-white text-[13px] text-center focus:outline-none placeholder:text-gray-600" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid rgba(45,212,160,0.35)" }}
                        onFocus={(e) => { e.target.style.border = "2px solid #2dd4a0"; e.target.style.boxShadow = "0 0 0 1px #2dd4a0"; }}
                        onBlur={(e) => { e.target.style.border = "2px solid rgba(45,212,160,0.35)"; e.target.style.boxShadow = "none"; }}
                      />
                    </div>
                  </div>
                )}

                <div className={`rounded-xl border-2 border-[#2dd4a0]/35 p-1 transition-all ${pulseField === "card" ? "ring-2 ring-[#f97316] animate-pulse" : ""}`} style={{ background: "rgba(0,0,0,0.15)" }}>
                  <PaymentElement onReady={() => setElementReady(true)} options={{
                    layout: "tabs",
                    paymentMethodOrder: ["card"],
                    wallets: { applePay: "never", googlePay: "never" },
                    fields: { billingDetails: isNewPatient
                      ? { name: "auto", email: "auto", phone: "auto", address: "auto" }
                      : { name: "never", email: "never", phone: "never" }
                    },
                  }} />
                </div>

                {/* Sticky terms + pay button */}
                <div className="sticky bottom-0 z-10 pt-2 pb-1" style={{ background: "linear-gradient(to top, #070a08 60%, transparent 100%)", paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)" }}>
                  <div className={`flex items-start gap-1.5 mb-2 rounded-lg px-1 py-0.5 transition-all ${pulseField === "terms" ? "ring-2 ring-[#f97316] animate-pulse bg-[#f97316]/10" : ""}`}>
                    <input type="checkbox" id="step2Terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="flex-shrink-0 mt-[1px]" style={{ width: '12px', height: '12px', borderRadius: '2px', accentColor: '#2dd4a0' }} />
                    <label htmlFor="step2Terms" className="leading-[1.4]" style={{ fontSize: '7px', color: '#888' }}>
                      By confirming, I agree to the <span className="text-[#2dd4a0] underline">Terms of Service</span>, <span className="text-[#2dd4a0] underline">Privacy Policy</span>, and <span className="text-[#2dd4a0] underline">Cancellation Policy</span>. This <strong className="text-white">{currentPrice.display}</strong> booking fee reserves your provider&apos;s time.
                    </label>
                  </div>
                  <button onClick={() => {
                    if (!acceptedTerms) { setPulseField("terms"); setTimeout(() => setPulseField(null), 1500); return; }
                    if (isNewPatient && !newDobComplete) { setPulseField("dob"); setTimeout(() => setPulseField(null), 1500); return; }
                    if (!elementReady) { setPulseField("card"); setTimeout(() => setPulseField(null), 1500); return; }
                    handlePay();
                  }} className="w-full text-white font-extrabold py-3.5 rounded-xl transition-all text-[14px] flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)", boxShadow: "0 4px 16px rgba(249,115,22,0.3)", opacity: payInFlight ? 0.6 : 1 }}>
                    <Lock size={13} /> {payInFlight ? "Processing..." : `Pay ${currentPrice.display} & Reserve`}
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => { setShowCardForm(true); onCardExpand?.(true); }} className="w-full py-2.5 rounded-xl text-gray-400 font-semibold text-[12px] transition-all border border-white/10 hover:border-white/20">
                Pay with credit or debit card
              </button>
            )}
          </div>
        )}
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
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calSelectedDay, setCalSelectedDay] = useState("");
  const [calSelectedTime, setCalSelectedTime] = useState("");

  // Guided Sequence State
  const [visitTypePopup, setVisitTypePopup] = useState<VisitType | null>(null);
  const [wantToTalk, setWantToTalk] = useState(false);
  const [additionalMedsAnswer, setAdditionalMedsAnswer] = useState<"yes" | "no" | null>(null);
  // chiefComplaintDone replaced by symptomsDone — user must tap Continue after 10+ chars
  const [symptomsDone, setSymptomsDone] = useState(false);
  const [visitTypeConfirmed, setVisitTypeConfirmed] = useState(false);
  const [visitTypeChosen, setVisitTypeChosen] = useState(false);
  const [confirmReviewed, setConfirmReviewed] = useState(false);
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
  const paymentLoading = visitTypeChosen && !visitTypeConfirmed && !clientSecret;

  const currentPrice = useMemo(() => getBookingFee(), []);
  const visitFeePrice = useMemo(() => getPrice(visitType), [visitType]);
  const [visitIntentId, setVisitIntentId] = useState("");
  const needsCalendar = VISIT_TYPES.find(v => v.key === visitType)?.needsCalendar ?? false;
  const isAsync = visitType === "instant" || visitType === "refill";
  const isReturningPatient = !!patient?.id || (!!patient?.source && patient.source !== "new");
  useEffect(() => { console.log("[Patient] isReturning:", isReturningPatient, "id:", patient?.id, "source:", patient?.source); }, [patient, isReturningPatient]);

  // ── Load patient ───────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("expressPatient");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        console.warn("🔴 [PATIENT DEBUG] raw sessionStorage:", stored);
        console.warn("🔴 [PATIENT DEBUG] id:", p.id, "| type:", typeof p.id, "| truthy:", !!p.id, "| source:", p.source);
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
    if (s.confirmReviewed) setConfirmReviewed(true);
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
  const shouldPrefetch = visitTypeChosen && !clientSecret;

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
    setConfirmReviewed(false);
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
    appearance: {
      theme: "night" as const,
      variables: {
        colorPrimary: "#2dd4a0",
        colorBackground: "#0b0f0c",
        colorText: "#ffffff",
        colorTextSecondary: "#ffffff",
        colorTextPlaceholder: "#6b7280",
        borderRadius: "10px",
        spacingUnit: "3px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSizeBase: "13px",
        fontSizeSm: "11px",
      },
      rules: {
        ".Tab": { border: "2px solid rgba(45,212,160,0.35)", backgroundColor: "#0b0f0c", padding: "8px 0" },
        ".Tab--selected": { border: "2px solid #2dd4a0", backgroundColor: "rgba(45,212,160,0.08)", color: "#ffffff" },
        ".Tab:hover": { border: "1px solid rgba(45,212,160,0.5)" },
        ".TabIcon--selected": { fill: "#2dd4a0" },
        ".Label": { color: "#ffffff", fontSize: "11px", fontWeight: "600" },
        ".Input": { backgroundColor: "rgba(0,0,0,0.3)", border: "2px solid rgba(45,212,160,0.35)", color: "#ffffff", padding: "8px 10px", fontSize: "13px" },
        ".Input:focus": { border: "2px solid #2dd4a0", boxShadow: "0 0 0 1px #2dd4a0" },
        ".Input::placeholder": { color: "rgba(255,255,255,0.4)" },
        ".Block": { padding: "8px 0" },
      },
    },
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
  // 1=Reason, 2=Symptoms, 3=Pharmacy, 4=VisitType browse,
  // 4.5=Confirm summary (new patient review) / Summary+Pay (returning),
  // 4.75=Payment form (new patient only, after CONTINUE),
  // 5=Phone/contact (new patient), 6=Pay (returning)
  const activeGuideStep = useMemo((): number => {
    if (!reason) return 1;
    if (!symptomsDone) return 2;
    if (!pharmacy) return 3;
    if (!visitTypeChosen) return 4;
    if (!visitTypeConfirmed) return 4.5;
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return 4.5;
    // New patient: must review confirm summary before payment
    if (!isReturningPatient && !confirmReviewed) return 4.5;
    // New patient: payment form step
    if (!isReturningPatient && !phoneConfirmed) return 4.75;
    // Returning patient: skip straight to pay (summary+wallets at 4.5)
    return 6;
  }, [reason, symptomsDone, pharmacy, visitTypeChosen, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, phoneConfirmed, isReturningPatient, confirmReviewed]);

  const totalSteps = isReturningPatient ? 4.5 : 4.75;

  const uiStep = activeGuideStep;
  const [cardFormExpanded, setCardFormExpanded] = useState(false);
  const [pulseSection, setPulseSection] = useState<string | null>(null);
  const triggerPulse = (section: string) => { setPulseSection(section); setTimeout(() => setPulseSection(null), 1500); };
  const headerIsStep5 = uiStep >= 4.5;
  const headerUltraCompact = cardFormExpanded && isTightViewport;
  const progressPct = paymentLoading ? 90 : Math.min((uiStep / totalSteps) * 100, 100);

  // Speaking progress pill text (re-animates on change)
  const [pillText, setPillText] = useState("");
  useEffect(() => {
    const next = getStepTitle(uiStep, paymentLoading, isReturningPatient);
    setPillText(next);
  }, [uiStep, progressPct, paymentLoading]);

  // ── Fallback: if we reach step 5 without a clientSecret, force-fetch ──
  useEffect(() => {
    if (visitTypeChosen && !clientSecret && !paymentIntentError && !paymentFetchController.current) {
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
  }, [visitTypeChosen, clientSecret, paymentIntentError, currentPrice.amount, visitFeePrice.amount]);

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
      setConfirmReviewed(false);
      setPhoneConfirmed(false);
      setContactPhone("");
      setVisitTypePopup(null);
      setAppointmentDate("");
      setAppointmentTime("");
      setStep4PopupFired(false);
      paymentFetchController.current?.abort();
      setClientSecret("");
      setPaymentIntentError(null);
      saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null, visitTypeChosen: false, visitTypeConfirmed: false, confirmReviewed: false, phoneConfirmed: false, contactPhone: "", visitTypePopup: null, appointmentDate: "", appointmentTime: "" });
      return;
    }
    if (step === 4.5) {
      // Return to visit type browse
      setVisitTypeChosen(false);
      setVisitTypeConfirmed(false);
      setConfirmReviewed(false);
      setPhoneConfirmed(false);
      setContactPhone("");
      setStep4PopupFired(false);
      setCardFormExpanded(false);
      paymentFetchController.current?.abort();
      setClientSecret("");
      setPaymentIntentError(null);
      saveAnswers({ visitTypeChosen: false, visitTypeConfirmed: false, confirmReviewed: false, phoneConfirmed: false, contactPhone: "" });
      return;
    }
    if (step === 4.75) {
      // New patient: back from payment form to confirm summary
      setConfirmReviewed(false);
      setCardFormExpanded(false);
      saveAnswers({ confirmReviewed: false });
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
  const step6Ref = useRef<HTMLDivElement>(null);
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

  // ── Auto-scroll Step 6 (payment) into view when it activates ──
  // Step 6 scroll removed — payment is now in Step 4.5;

  // ── Autofill detection: poll fields after focus to catch iOS autofill ──
  // Step 5 autofill polling removed — contact form is now post-payment

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
            <button onClick={() => {
              if (!controlledScheduleDate || !controlledScheduleTime) return;
              handleControlledSchedule();
            }} className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] border border-[#2dd4a0]" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)", color: "#fff", boxShadow: "0 4px 16px rgba(249,115,22,0.25)", opacity: schedulingAppointment ? 0.6 : 1 }}>
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
          @keyframes fadeInStep { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
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
                            <button onClick={() => {
                              if (!intakeDetailText.trim()) { const inp = document.querySelector<HTMLInputElement>(`input[placeholder="${q.ph}"]`); if (inp) { inp.classList.add("animate-pulse"); inp.style.boxShadow = "0 0 12px rgba(249,115,22,0.4)"; setTimeout(() => { inp.classList.remove("animate-pulse"); inp.style.boxShadow = "none"; }, 1500); inp.focus(); } return; }
                              setIntakeAnswers(prev => ({ ...prev, [q.id]: { val: true, detail: intakeDetailText.trim() } }));
                              setIntakeStep(Math.max(intakeStep, i + 1));
                              setIntakeDetailId(null); setIntakeDetailText("");
                            }} className="w-full py-1.5 rounded-md text-white font-bold text-[11px] transition-all active:scale-97" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)" }}>Next →</button>
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
                  <button onClick={handleIntakeSubmit} className="w-full py-3 rounded-xl border-2 border-[#2dd4a0]/30 text-white font-extrabold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)", boxShadow: "0 4px 16px rgba(249,115,22,0.25)", opacity: intakeSubmitting ? 0.6 : 1 }}>
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
    <button onClick={onReset} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <span className="text-gray-500 text-[10px] font-semibold truncate flex-1 text-left">{text}</span>
      <span className="text-[#2dd4a0]/60 text-[9px] font-semibold flex-shrink-0">change</span>
    </button>
  );

  const PharmacyCompletedView = () => (
    <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null }); }}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <Pill size={12} className="text-gray-600 flex-shrink-0" />
      <span className="text-gray-500 text-[10px] font-semibold truncate flex-1 text-left">{pharmacy}</span>
      <span className="text-[#2dd4a0]/60 text-[9px] font-semibold flex-shrink-0">change</span>
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
        @keyframes fadeInStep { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInPill { from { opacity:0; transform:translateY(12px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pillIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpCalendar { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slotFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes charPulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.25); opacity: 1; } }
      `}</style>
      <div className="h-full max-w-[430px] mx-auto flex flex-col overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px" }}>

        {/* ═══ LOCKED HEADER — never scrolls, never shrinks ═══ */}
        <div className="flex-shrink-0 z-10 pb-1.5" style={{ background: "linear-gradient(180deg, #0b0f0c 0%, rgba(11,15,12,0.97) 100%)", paddingTop: "max(env(safe-area-inset-top, 8px), 8px)" }}>
          {/* Logo + Brand */}
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <div className="w-6 h-6 bg-[#2dd4a0]/20 rounded-md flex items-center justify-center">
              <Shield size={13} className="text-[#2dd4a0]" />
            </div>
            <span className="text-white font-bold text-[15px] tracking-tight">Medazon <span className="text-[#2dd4a0]">Health</span></span>
          </div>
          {/* Subtitle */}
          <p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5 text-center">Private · Discreet</p>
          {/* Heading — dynamic pill text */}
          <h1 key={pillText} className="text-white font-black leading-tight text-center mb-1" style={{ fontSize: "clamp(20px, 5.5vw, 26px)" }}>
            {pillText}
          </h1>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#f97316] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* ═══ SCROLLABLE GUIDED FORM ═══ */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-1 space-y-2 min-h-0 overscroll-contain" style={{ scrollbarWidth: "none" }}>

          {/* STEP 1: Reason for Visit — hidden when answered */}
          {!reason ? (
            <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-4 transition-all mt-3 ${activeOrangeBorder}`}>
                <button onClick={() => setReasonDialogOpen(true)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-[#2dd4a0]/40 bg-[#0d1218] hover:border-[#2dd4a0]/60 text-left transition-all">
                  <span className="text-gray-300 text-[15px]">{reason || "Select a reason..."}</span>
                  <ChevronDown size={14} className="text-gray-500" />
                </button>
              </div>
            </div>
          ) : null}

          {/* STEP 2: Describe Symptoms — hidden when answered */}
          {reason && !symptomsDone ? (
            <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-3 space-y-2 transition-all mt-3 ${activeOrangeBorder} flex flex-col min-h-0`}>
                <textarea id="symptoms-textarea" value={chiefComplaint} onChange={(e) => { setChiefComplaint(e.target.value); saveAnswers({ chiefComplaint: e.target.value }); }} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); }} placeholder="e.g., Burning during urination for 3 days..." rows={3} autoFocus className={`w-full bg-[#0d1218] border-2 rounded-xl px-4 py-3 text-[15px] text-white focus:outline-none resize-none placeholder:text-gray-400 caret-white transition-all ${pulseSection === "symptoms" ? "ring-2 ring-[#f97316] animate-pulse border-[#f97316]" : chiefComplaint.length >= 10 ? "border-[#2dd4a0]/30" : "border-[#f97316] focus:border-[#f97316]"}`} />
                {chiefComplaint.length < 10 ? (
                  <p className="text-gray-300 text-[12px]">Type at least <span className="text-[#f97316] font-black text-[16px] inline-block" style={{ animation: "charPulse 1.2s ease-in-out infinite" }}>{10 - chiefComplaint.length}</span> more characters</p>
                ) : (
                  <p className="text-[#2dd4a0] text-[12px] font-semibold">✓ Ready to continue</p>
                )}
                <div className="flex gap-2">
                  <button onClick={goBack} className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.12)" }}><span style={{ fontSize: "14px", lineHeight: 1 }}>←</span> Back</button>
                  <button onClick={() => { if (chiefComplaint.length < 10) { triggerPulse("symptoms"); document.getElementById("symptoms-textarea")?.focus(); return; } setSymptomsDone(true); saveAnswers({ chiefComplaint, symptomsDone: true }); }} className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1 border-2 border-[#f97316]" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)", boxShadow: "0 4px 16px rgba(249,115,22,0.25)" }}>Continue →</button>
                </div>
              </div>
            </div>
          ) : null}

          {/* STEP 3: Preferred Pharmacy — hidden when answered */}
          {reason && symptomsDone && !pharmacy ? (
            <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-4 space-y-2 transition-all mt-3 ${activeOrangeBorder}`}>
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
          ) : null}

          {/* STEP 4: Select Visit Type */}
          <div ref={visitTypeRef}>
          {reason && symptomsDone && pharmacy && !visitTypeChosen ? (
              <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all mt-3 ${activeOrangeBorder}`}>
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
                      return (<button key={vt.key} onClick={() => {
                        if (vt.key === "video" || vt.key === "phone") {
                          setVisitType(vt.key); setVisitTypePopup(null);
                          setDateTimeDialogOpen(true); setCalWeekOffset(0);
                          setCalSelectedDay((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })());
                          setCalSelectedTime("");
                        } else {
                          setVisitTypePopup(vt.key);
                        }
                      }} className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all ${isActive ? `border-[3px] border-[#2dd4a0]/30 shadow-[0_0_12px_rgba(45,212,160,0.15)]` : hasPopupOpen ? "border-2 border-white/10" : "border-2 border-white/10 hover:border-white/20"}`} style={{ minHeight: "72px" }}>
                        {vt.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: vt.color, color: "#000" }}>{vt.badge}</span>}
                        <Icon size={18} style={{ color: isActive ? vt.color : "#6b7280" }} /><span className={`text-[9px] font-bold mt-1 text-center leading-tight whitespace-pre-line ${isActive ? "text-white" : "text-gray-400"}`}>{vt.label}</span>
                        {hasPopupOpen && !isActive && <span className="text-[7px] text-gray-500 mt-0.5">tap to select</span>}
                      </button>);
                    })}
                  </div>
                </div>
              </div>
          ) : null}

          {/* ═══ VISIT TYPE INFO — compact popup with confirm button inside ═══ */}
          {visitTypePopup && !visitTypeConfirmed && (
            <div className="rounded-xl overflow-hidden" style={{ animation: "fadeInStep 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="p-3 space-y-2.5 relative bg-transparent border border-white/10 rounded-xl" style={{ minHeight: "140px" }}>
                <button onClick={() => setVisitTypePopup(null)} className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors z-10"><X size={16} /></button>
                {visitTypePopup === "instant" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#2dd4a0]/15 flex items-center justify-center flex-shrink-0"><Zap size={16} className="text-[#2dd4a0]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Get Seen Without Being Seen</h3><p className="text-[#2dd4a0] text-[9px] font-bold uppercase tracking-wider">Instant Care · No Appointment</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">Provider reviews your case privately, sends treatment + Rx to your pharmacy.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#2dd4a0]" /><span className="text-white text-[10px]">100% private</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#2dd4a0]" /><span className="text-white text-[10px]">1–2 hours</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#2dd4a0]" /><span className="text-white text-[10px]">Rx to pharmacy</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("instant"); setVisitTypeChosen(true); setVisitTypeConfirmed(true); saveAnswers({ visitType: "instant", visitTypeChosen: true, visitTypeConfirmed: true }); setVisitTypePopup(null); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
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
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("refill"); setVisitTypeChosen(true); setVisitTypeConfirmed(true); saveAnswers({ visitType: "refill", visitTypeChosen: true, visitTypeConfirmed: true }); setVisitTypePopup(null); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "video" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#3b82f6]/15 flex items-center justify-center flex-shrink-0"><Video size={16} className="text-[#3b82f6]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Face-to-Face, From Anywhere</h3><p className="text-[#3b82f6] text-[9px] font-bold uppercase tracking-wider">Video Visit · Live</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">See your provider live on video — just like an in-office visit.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">Real-time</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">HIPAA encrypted</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">Pick a time</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("video"); setVisitTypeChosen(true); saveAnswers({ visitType: "video", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setCalWeekOffset(0); setCalSelectedDay((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()); setCalSelectedTime(""); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "phone" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#a855f7]/15 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-[#a855f7]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Talk, Text, or Both</h3><p className="text-[#a855f7] text-[9px] font-bold uppercase tracking-wider">Phone / SMS · No Camera</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">Connect by phone or text — same quality care, no video.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">No downloads</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">Flexible</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">Follow-ups</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#f97316] text-white active:scale-95 transition-all" style={{ background: "#f97316" }}>← Back</button><button onClick={() => { setVisitType("phone"); setVisitTypeChosen(true); saveAnswers({ visitType: "phone", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setCalWeekOffset(0); setCalSelectedDay((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()); setCalSelectedTime(""); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2dd4a0]/30 text-white" style={{ background: "rgba(45,212,160,0.12)" }}>Choose →</button></div>
                </>)}
                <div className="flex items-center gap-1.5 opacity-50"><Lock size={9} className="text-gray-500" /><span className="text-gray-500 text-[8px]">Full anonymity · Identity stays private</span></div>
              </div>
            </div>
          )}
          </div>
          {/* END Step 4 wrapper */}

          {/* STEP 4.5: Confirm Summary (new patient) / Summary + Pay (returning patient) */}
          {reason && symptomsDone && pharmacy && visitTypeChosen && !confirmReviewed && !isReturningPatient ? (
            /* ── NEW PATIENT: Confirm Summary with CONTINUE button ── */
            <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all mt-3 ${activeOrangeBorder}`}>
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
                      <button onClick={() => { setReason(""); setChiefComplaint(""); setSymptomsDone(false); setVisitTypeChosen(false); setVisitTypeConfirmed(false); setConfirmReviewed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ reason: "", chiefComplaint: "", symptomsDone: false, visitTypeChosen: false, visitTypeConfirmed: false, confirmReviewed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">change</button>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Visit Type</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[13px] font-semibold">
                        {visitType === "instant" ? "⚡ Instant Care" : visitType === "refill" ? "💊 Rx Refill" : visitType === "video" ? "📹 Video Visit" : "📞 Phone / SMS"}
                      </span>
                      <button onClick={() => { setVisitTypeChosen(false); setVisitTypeConfirmed(false); setConfirmReviewed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ visitTypeChosen: false, visitTypeConfirmed: false, confirmReviewed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">change</button>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Pharmacy</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[13px] font-semibold truncate">{pharmacy}</span>
                      <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); setVisitTypeChosen(false); setVisitTypeConfirmed(false); setConfirmReviewed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null, visitTypeChosen: false, visitTypeConfirmed: false, confirmReviewed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">change</button>
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
                {/* CONTINUE button */}
                <button onClick={() => { setConfirmReviewed(true); saveAnswers({ confirmReviewed: true }); }} className="w-full py-4 rounded-xl text-white font-black text-[18px] tracking-wide transition-all active:scale-[0.98] uppercase" style={{ background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)", boxShadow: "0 4px 20px rgba(249,115,22,0.35)" }}>
                  CONTINUE
                </button>
              </div>
            </div>
          ) : reason && symptomsDone && pharmacy && visitTypeChosen && isReturningPatient ? (
            /* ── RETURNING PATIENT: Summary + Wallets + collapsed card form ── */
            <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all mt-3 ${activeOrangeBorder}`}>
                {/* Summary card — collapses when card form is open */}
                <div className="rounded-xl border border-white/10 overflow-hidden transition-all" style={{ background: "rgba(255,255,255,0.02)", ...(cardFormExpanded ? { maxHeight: 0, overflow: "hidden", opacity: 0, margin: 0, padding: 0, border: "none" } : {}) }}>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-white/5">
                    <div className="w-9 h-9 rounded-full border-2 border-[#2dd4a0] overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 8px rgba(45,212,160,0.2)" }}><img src="/assets/provider-lamonica.png" alt="Provider" className="w-full h-full object-cover object-top" /></div>
                    <div className="flex-1 min-w-0"><p className="text-white font-bold text-[13px]">LaMonica A. Hodges, MSN, APRN, FNP-C</p></div>
                    <Shield size={14} className="text-[#2dd4a0] flex-shrink-0" />
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Reason</span>
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex items-center"><span className="text-white text-[13px] font-semibold" style={{ filter: "blur(6px)", userSelect: "none" }}>{reason}</span><span className="absolute inset-0 flex items-center justify-center"><span className="bg-[#2dd4a0]/15 border border-[#2dd4a0]/30 text-[#2dd4a0] text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded">PRIVATE</span></span></span>
                      <button onClick={() => { setReason(""); setChiefComplaint(""); setSymptomsDone(false); setVisitTypeChosen(false); setVisitTypeConfirmed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ reason: "", chiefComplaint: "", symptomsDone: false, visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">change</button>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Visit Type</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[13px] font-semibold">
                        {visitType === "instant" ? "⚡ Instant Care" : visitType === "refill" ? "💊 Rx Refill" : visitType === "video" ? "📹 Video Visit" : "📞 Phone / SMS"}
                      </span>
                      <button onClick={() => { setVisitTypeChosen(false); setVisitTypeConfirmed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">change</button>
                    </div>
                  </div>
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-500 text-[12px] font-semibold">Pharmacy</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[13px] font-semibold truncate">{pharmacy}</span>
                      <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); setVisitTypeChosen(false); setVisitTypeConfirmed(false); setPhoneConfirmed(false); setContactPhone(""); setStep4PopupFired(false); paymentFetchController.current?.abort(); setClientSecret(""); setPaymentIntentError(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null, visitTypeChosen: false, visitTypeConfirmed: false, phoneConfirmed: false, contactPhone: "" }); }} className="text-[#2dd4a0] text-[10px] underline underline-offset-2 font-bold flex-shrink-0">change</button>
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

                {/* Payment — Express wallets + card fallback */}
                {clientSecret && stripeOptions ? (
                  <Elements options={stripeOptions} stripe={stripePromise}>
                    <Step2PaymentForm patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType} appointmentDate={appointmentDate} appointmentTime={appointmentTime} currentPrice={currentPrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress} selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess} visitIntentId={visitIntentId} onCardExpand={(expanded) => setCardFormExpanded(expanded)} />
                  </Elements>
                ) : paymentIntentError ? (
                  <div className="space-y-2 py-1">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                      <p className="text-red-400 text-[11px] font-semibold mb-1">Payment setup failed</p>
                      <p className="text-gray-400 text-[9px]">{paymentIntentError}</p>
                    </div>
                    <button onClick={retryPaymentIntent} className="w-full py-2.5 rounded-xl text-white font-bold text-[12px] border border-[#f97316] hover:bg-[#f97316]/10 transition-all" style={{ background: "rgba(249,115,22,0.05)" }}>Retry</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-[#2dd4a0] border-t-transparent rounded-full" />
                    <p className="text-gray-400 text-[10px]">Setting up payment…</p>
                  </div>
                )}
                {/* Back button */}
                <button onClick={goBack} className="w-full py-2.5 rounded-xl text-white font-bold text-[13px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.08)" }}><span style={{ fontSize: "13px", lineHeight: 1 }}>←</span> Back</button>
              </div>
            </div>
          ) : null}

          {/* STEP 4.75: New Patient Payment Form (after CONTINUE from confirm) */}
          {reason && symptomsDone && pharmacy && visitTypeChosen && confirmReviewed && !isReturningPatient ? (
            <div style={{ animation: "fadeInStep 0.9s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-4 space-y-3 transition-all mt-3 ${activeOrangeBorder}`}>
                {/* Payment — Express wallets + DOB + card form open */}
                {clientSecret && stripeOptions ? (
                  <Elements options={stripeOptions} stripe={stripePromise}>
                    <Step2PaymentForm patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType} appointmentDate={appointmentDate} appointmentTime={appointmentTime} currentPrice={currentPrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress} selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess} visitIntentId={visitIntentId} onCardExpand={(expanded) => setCardFormExpanded(expanded)} />
                  </Elements>
                ) : paymentIntentError ? (
                  <div className="space-y-2 py-1">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                      <p className="text-red-400 text-[11px] font-semibold mb-1">Payment setup failed</p>
                      <p className="text-gray-400 text-[9px]">{paymentIntentError}</p>
                    </div>
                    <button onClick={retryPaymentIntent} className="w-full py-2.5 rounded-xl text-white font-bold text-[12px] border border-[#f97316] hover:bg-[#f97316]/10 transition-all" style={{ background: "rgba(249,115,22,0.05)" }}>Retry</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-[#2dd4a0] border-t-transparent rounded-full" />
                    <p className="text-gray-400 text-[10px]">Setting up payment…</p>
                  </div>
                )}
                {/* Back button */}
                <button onClick={goBack} className="w-full py-2.5 rounded-xl text-white font-bold text-[13px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2dd4a0]/30" style={{ background: "rgba(45,212,160,0.08)" }}><span style={{ fontSize: "13px", lineHeight: 1 }}>←</span> Back</button>
              </div>
            </div>
          ) : null}


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

      {/* ═══ DATE/TIME DIALOG — MATCHES MOCKUP EXACTLY ═══ */}
      {dateTimeDialogOpen && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const VISIBLE = 6;
        const TOTAL = 28;
        const allDays: Date[] = [];
        for (let i = 0; i < TOTAL; i++) { const d = new Date(today); d.setDate(d.getDate() + i); allDays.push(d); }
        const visibleDays = allDays.slice(calWeekOffset, calWeekOffset + VISIBLE);
        const canGoBack = calWeekOffset > 0;
        const canGoForward = calWeekOffset + VISIBLE < TOTAL;
        const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const DAY_ABBR = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
        const SHORT_MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const timeSlots = ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM"];
        const convertTo24 = (t: string) => { const [time, period] = t.split(" "); let [h, m] = time.split(":").map(Number); if (period === "PM" && h !== 12) h += 12; if (period === "AM" && h === 12) h = 0; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; };
        const getSpecialLabel = (d: Date) => { if (isSameDay(d, today)) return "Today"; if (isSameDay(d, tomorrow)) return "Tomorrow"; return null; };
        const monthLabel = `${MONTH_FULL[visibleDays[0].getMonth()]} ${visibleDays[0].getFullYear()}`;
        const selectedDateObj = calSelectedDay ? new Date(calSelectedDay + "T12:00:00") : null;
        const selectedDayLabel = selectedDateObj ? `${DAY_ABBR[selectedDateObj.getDay()].charAt(0)}${DAY_ABBR[selectedDateObj.getDay()].slice(1).toLowerCase()}, ${SHORT_MO[selectedDateObj.getMonth()]} ${selectedDateObj.getDate()}` : "";

        return (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "linear-gradient(180deg, #0d1628 0%, #0b1120 40%, #0a0f1d 100%)", animation: "slideUpCalendar 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
            {/* Header */}
            <div className="flex justify-between items-center px-5 pt-5 pb-1 flex-shrink-0">
              <div>
                <h2 className="text-white font-black text-[22px] tracking-tight">Schedule Your Appointment</h2>
                <p className="text-[#64748b] text-[14px] mt-1">Please select a date and time for your {visitType === "video" ? "video" : "phone"} visit.</p>
              </div>
              <button onClick={() => setDateTimeDialogOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(255,255,255,0.08)" }}><X size={20} /></button>
            </div>

            {/* Day strip with arrows */}
            <div className="flex items-center px-3 pt-5 pb-1" style={{ gap: 0 }}>
              {/* Back arrow */}
              {canGoBack ? (
                <button onClick={() => { setCalWeekOffset(Math.max(0, calWeekOffset - VISIBLE)); setCalSelectedTime(""); }} className="flex-shrink-0 p-1 text-[#64748b] active:scale-90 transition-transform" style={{ background: "none", border: "none" }}>
                  <ChevronDown size={20} className="rotate-90" />
                </button>
              ) : <div style={{ width: 28 }} />}

              {/* Day cells */}
              <div id="cal-day-strip" className="flex flex-1 rounded-xl transition-all" style={{ gap: 2 }}>
                {visibleDays.map(day => {
                  const iso = toISO(day);
                  const isSelected = calSelectedDay === iso;
                  const isToday = isSameDay(day, today);
                  const special = getSpecialLabel(day);
                  return (
                    <button key={iso} onClick={() => { setCalSelectedDay(iso); setCalSelectedTime(""); }}
                      className="flex-1 flex flex-col items-center justify-center rounded-[14px] transition-all active:scale-95"
                      style={{
                        padding: "10px 4px 8px",
                        border: isSelected ? "2px solid rgba(45,212,160,0.4)" : isToday ? "2px solid rgba(45,212,160,0.2)" : "2px solid transparent",
                        background: isSelected ? "linear-gradient(135deg, #22805a 0%, #1a6b48 100%)" : "transparent",
                        boxShadow: isSelected ? "0 4px 16px rgba(45,212,160,0.15)" : "none",
                        cursor: "pointer",
                        gap: 2,
                        minWidth: 0,
                      }}>
                      <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 600, color: isSelected ? "#fff" : "#64748b", letterSpacing: "0.04em", lineHeight: 1 }}>{DAY_ABBR[day.getDay()]}</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: isSelected ? "#fff" : "#cbd5e1", lineHeight: 1.2 }}>{day.getDate()}</span>
                      {special ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? "#d1fae5" : "#2dd4a0", lineHeight: 1, marginTop: 1 }}>{special}</span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 600, color: isSelected ? "#d1fae5" : "#64748b", lineHeight: 1, marginTop: 1 }}>{SHORT_MO[day.getMonth()]}</span>
                      )}
                      {isToday && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4a0] mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Forward arrow + Next label */}
              {canGoForward ? (
                <button onClick={() => { setCalWeekOffset(Math.min(calWeekOffset + VISIBLE, TOTAL - VISIBLE)); setCalSelectedTime(""); }} className="flex-shrink-0 flex flex-col items-center p-1 text-[#64748b] active:scale-90 transition-transform" style={{ background: "none", border: "none" }}>
                  <ChevronDown size={20} className="-rotate-90" />
                  <span style={{ fontSize: 10, color: "#2dd4a0", fontWeight: 600, marginTop: -2 }}>Next &gt;</span>
                </button>
              ) : <div style={{ width: 28 }} />}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 24px 0" }} />

            {/* Time slots */}
            <div className="flex-1 overflow-y-auto" style={{ padding: "20px 24px 0", scrollbarWidth: "none" }}>
              {calSelectedDay ? (
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1", margin: "0 0 14px", lineHeight: 1 }}>Available Times for {selectedDayLabel}</p>
                  <div id="cal-time-grid" className="rounded-xl transition-all" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {timeSlots.map((slot, i) => {
                      const t24 = convertTo24(slot);
                      const isActive = calSelectedTime === t24;
                      return (
                        <button key={slot} onClick={() => setCalSelectedTime(t24)}
                          className="active:scale-95 transition-all"
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            border: isActive ? "2px solid rgba(45,212,160,0.5)" : "2px solid rgba(255,255,255,0.1)",
                            background: isActive ? "linear-gradient(135deg, #22805a 0%, #1a6b48 100%)" : "rgba(255,255,255,0.03)",
                            color: isActive ? "#ffffff" : "#e2e8f0",
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: "pointer",
                            textAlign: "center" as const,
                            boxShadow: isActive ? "0 4px 16px rgba(45,212,160,0.2)" : "none",
                            animation: "slotFadeIn 0.3s ease both",
                            animationDelay: `${i * 0.05}s`,
                          }}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-center mt-3" style={{ fontSize: 10, color: "#475569" }}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar size={36} className="text-[#334155] mb-3" />
                  <p style={{ color: "#64748b", fontSize: 14 }}>Select a day above</p>
                </div>
              )}
            </div>

            {/* Confirm button — always at bottom, always active */}
            <div className="flex-shrink-0" style={{ padding: "20px 24px", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)" }}>
              <button
                onClick={() => {
                  if (!calSelectedDay) {
                    // Pulse the day strip
                    const strip = document.getElementById("cal-day-strip");
                    if (strip) { strip.classList.add("animate-pulse"); strip.style.boxShadow = "0 0 20px rgba(249,115,22,0.4)"; setTimeout(() => { strip.classList.remove("animate-pulse"); strip.style.boxShadow = "none"; }, 1500); }
                    return;
                  }
                  if (!calSelectedTime) {
                    // Pulse the time grid
                    const grid = document.getElementById("cal-time-grid");
                    if (grid) { grid.classList.add("animate-pulse"); grid.style.boxShadow = "0 0 20px rgba(249,115,22,0.4)"; setTimeout(() => { grid.classList.remove("animate-pulse"); grid.style.boxShadow = "none"; }, 1500); }
                    return;
                  }
                  setAppointmentDate(calSelectedDay);
                  setAppointmentTime(calSelectedTime);
                  setVisitTypeChosen(true);
                  setVisitTypeConfirmed(true);
                  saveAnswers({ appointmentDate: calSelectedDay, appointmentTime: calSelectedTime, visitType: visitType, visitTypeChosen: true, visitTypeConfirmed: true });
                  setDateTimeDialogOpen(false);
                }}
                className="active:scale-[0.98] transition-all"
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: 14,
                  border: "none",
                  background: "linear-gradient(135deg, #f97316 0%, #ea8a2e 100%)",
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.25)",
                }}>
                Confirm
              </button>
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





































