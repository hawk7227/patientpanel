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
  reviewCount?: number; isOpen?: boolean; phone?: string;
}

// ═══════════════════════════════════════════════════════════════
// Visit Type Config
// ═══════════════════════════════════════════════════════════════
const VISIT_TYPES = [
  { key: "async" as VisitType, label: "Async", icon: Zap, desc: "No live visit", badge: "✨ NEW", needsCalendar: false, color: "#2d7a5f" },
  { key: "instant" as VisitType, label: "Instant\nVisit", icon: Zap, desc: "Private & discreet", badge: "⚡ FAST", needsCalendar: false, color: "#f59e0b" },
  { key: "refill" as VisitType, label: "Rx\nRefill", icon: Pill, desc: "No questions asked", badge: null, needsCalendar: false, color: "#f59e0b" },
  { key: "video" as VisitType, label: "Video\nVisit", icon: Video, desc: "Secure 1-on-1", badge: null, needsCalendar: true, color: "#3b82f6" },
  { key: "phone" as VisitType, label: "Phone\n/ SMS", icon: Phone, desc: "Private line", badge: null, needsCalendar: true, color: "#a855f7" },
];

// ═══════════════════════════════════════════════════════════════
// Visit Content — step-by-step timeline for each visit type
// ═══════════════════════════════════════════════════════════════
const visitContent = {
  async: {
    title: "Async Visit,\nHow It Works",
    sub: "Your provider reviews your case privately without a live call.",
    steps: [
      { icon: "📝", t: "Describe Your Symptoms", d: "Answer a few quick questions and share what's going on.", time: "~2 min" },
      { icon: "👩‍⚕️", t: "Provider Reviews Your Case", d: "A licensed provider reviews everything privately.", time: "~1–2 hrs" },
      { icon: "💊", t: "Treatment Sent Directly", d: "Treatment or prescriptions are sent to your pharmacy if appropriate.", time: "Same day" },
    ],
  },
  instant: {
    title: "Instant Visit,\nHow It Works",
    sub: "Join the queue and connect live with a provider as soon as one is available.",
    steps: [
      { icon: "📝", t: "Complete Quick Intake", d: "Tell us what you need help with before joining the queue.", time: "~2 min" },
      { icon: "⏱", t: "Wait For Your Turn", d: "You'll be notified when the provider is ready to see you.", time: "Usually minutes" },
      { icon: "📹", t: "Connect Live", d: "Meet with a provider by live video and get treated in real time.", time: "Starts when called" },
    ],
  },
  refill: {
    title: "Refill Request,\nHow It Works",
    sub: "Request your refill online and your provider will review it privately.",
    steps: [
      { icon: "💊", t: "Select Your Medication", d: "Choose the medication you want reviewed for refill.", time: "~1 min" },
      { icon: "👩‍⚕️", t: "Provider Reviews Request", d: "Your provider checks your history and refill eligibility.", time: "Same day" },
      { icon: "🏥", t: "Sent To Pharmacy", d: "Approved refills are sent directly to your pharmacy.", time: "Same day" },
    ],
  },
  video: {
    title: "Video Visit,\nHow It Works",
    sub: "Schedule a time and meet with your provider face-to-face by secure video.",
    steps: [
      { icon: "📅", t: "Pick A Time", d: "Choose the date and time that works best for you.", time: "~1 min" },
      { icon: "📹", t: "Meet By Video", d: "Join your secure video visit from your phone or computer.", time: "At appointment time" },
      { icon: "💊", t: "Get Your Treatment Plan", d: "Your provider reviews your needs and sends treatment if appropriate.", time: "Same day" },
    ],
  },
  phone: {
    title: "Phone Visit,\nHow It Works",
    sub: "Choose a time to speak with your provider privately by phone or text.",
    steps: [
      { icon: "📅", t: "Schedule Your Visit", d: "Pick the time that works best for your private consult.", time: "~1 min" },
      { icon: "📞", t: "Talk With Your Provider", d: "Connect by phone or SMS without needing video.", time: "At appointment time" },
      { icon: "💊", t: "Treatment Sent Directly", d: "Your provider sends treatment or prescriptions if appropriate.", time: "Same day" },
    ],
  },
};

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
  if (uiStep >= 4.5) return "Book Your Visit";
  return "Book Your Visit";
}

// ═══════════════════════════════════════════════════════════════
// Decline handling
// ═══════════════════════════════════════════════════════════════
type DeclineCategory = "soft" | "funds" | "card_data" | "expired" | "permanent" | "processing" | "generic";

interface DeclineState {
  category: DeclineCategory;
  code: string;
  headline: string;
  body: string;
  fieldHint: string | null;
  retryable: boolean;
  showBnpl: boolean;
}

function getDeclineState(err: { type?: string; code?: string; decline_code?: string; message?: string }): DeclineState {
  const code = err.decline_code || err.code || "";
  const type = err.type || "";

  if (["incorrect_cvc", "invalid_cvc"].includes(code)) {
    return { category: "card_data", code, retryable: true, showBnpl: true,
      headline: "Small typo — easy fix.",
      body: "Your security code doesn't match. No charge was made. Check the 3-digit number on the back of your card and try again.",
      fieldHint: "Check your security code (3 digits on the back)" };
  }
  if (["incorrect_number", "invalid_number"].includes(code)) {
    return { category: "card_data", code, retryable: true, showBnpl: true,
      headline: "Small typo — easy fix.",
      body: "One digit in your card number looks off. No charge was made. Give it a second look and try again.",
      fieldHint: "Double-check your card number" };
  }
  if (["incorrect_zip"].includes(code)) {
    return { category: "card_data", code, retryable: true, showBnpl: true,
      headline: "Small typo — easy fix.",
      body: "Your billing ZIP code doesn't match what your bank has on file. No charge was made.",
      fieldHint: "Check your billing ZIP code" };
  }
  if (["invalid_expiry_month", "invalid_expiry_year"].includes(code)) {
    return { category: "card_data", code, retryable: true, showBnpl: true,
      headline: "Small typo — easy fix.",
      body: "The expiration date doesn't look right. No charge was made. Check the month and year on your card.",
      fieldHint: "Check your expiration date" };
  }
  if (code === "expired_card") {
    return { category: "expired", code, retryable: false, showBnpl: true,
      headline: "Looks like this card has expired.",
      body: "Cards expire — easy to forget. No charge was made. Add a current card and we'll have you booked in under a minute.",
      fieldHint: "This card is expired — please use a different card" };
  }
  if (["insufficient_funds", "card_velocity_exceeded"].includes(code)) {
    return { category: "funds", code, retryable: false, showBnpl: true,
      headline: "Your health comes first — let's find another way.",
      body: `Remember: you're only paying ${"\u0024"}1.89 today. The visit fee is only collected after your provider accepts. Try a different card, or use a saved card below.`,
      fieldHint: null };
  }
  if (["fraudulent", "lost_card", "stolen_card", "pickup_card", "do_not_try_again", "restricted_card", "transaction_not_allowed"].includes(code)) {
    return { category: "permanent", code, retryable: false, showBnpl: false,
      headline: "Your bank has put a hold on this card.",
      body: "This sometimes happens after a card is replaced or flagged for security. There's nothing wrong on your end — your bank just needs you to use a different payment method. Your information is saved.",
      fieldHint: null };
  }
  if (["processing_error", "issuer_not_available", "try_again_later"].includes(code)) {
    return { category: "processing", code, retryable: true, showBnpl: true,
      headline: "That was us, not you.",
      body: "There was a temporary issue reaching your bank — your card was not charged. Tap Try Again below.",
      fieldHint: null };
  }
  if (type === "card_error" || ["card_declined", "do_not_honor", "no_action_taken", "generic_decline", "not_permitted"].includes(code)) {
    return { category: "soft", code, retryable: true, showBnpl: true,
      headline: "No worries — this happens more than you'd think.",
      body: "Your bank flagged this as unusual, which is common for new or online purchases. Your card wasn't charged. Try once more or use a different card — your information is saved.",
      fieldHint: null };
  }
  if (code === "authentication_required") {
    return { category: "card_data", code, retryable: true, showBnpl: true,
      headline: "One quick security step.",
      body: "Your bank needs to verify this purchase. No charge was made. Tap Try Again and complete the verification prompt from your bank.",
      fieldHint: null };
  }
  if (code === "card_not_supported") {
    return { category: "permanent", code, retryable: false, showBnpl: true,
      headline: "This card type isn\'t supported.",
      body: "We accept Visa, Mastercard, Amex, and Discover. Try a different card — your information is saved.",
      fieldHint: null };
  }
  if (["currency_not_supported"].includes(code)) {
    return { category: "permanent", code, retryable: false, showBnpl: true,
      headline: "This card can\'t be used for this transaction.",
      body: "Your card doesn\'t support USD transactions. Please use a different card — your information is saved.",
      fieldHint: null };
  }
  if (code === "duplicate_transaction") {
    return { category: "processing", code, retryable: false, showBnpl: false,
      headline: "Looks like this was already submitted.",
      body: "We received your payment — please don\'t tap again. Your appointment is being confirmed. If you don\'t see a confirmation in 30 seconds, contact us.",
      fieldHint: null };
  }
  return { category: "generic", code, retryable: true, showBnpl: false,
    headline: "Something went wrong with payment.",
    body: err.message || "Your card was not charged. Please try again.",
    fieldHint: null };
}

// ═══════════════════════════════════════════════════════════════
// Step 2 Payment Form — single viewport, no scroll
// ═══════════════════════════════════════════════════════════════
function Step2PaymentForm({
  patient, reason, chiefComplaint, visitType, appointmentDate, appointmentTime,
  currentPrice, visitFeePrice, pharmacy, pharmacyAddress, pharmacyPhone, selectedMedications, symptomsText, onSuccess, visitIntentId, bookingIntentId, onCardExpand, isNewPatient, onPulseForm, onValidateFields,
  npFirstName, npLastName, npEmail, npPhone, npAddress, npDobMonth, npDobDay, npDobYear,
}: {
  patient: PatientInfo; reason: string; chiefComplaint: string; visitType: string;
  appointmentDate: string; appointmentTime: string; currentPrice: { amount: number; display: string };
  pharmacy: string; pharmacyAddress: string; pharmacyPhone: string; selectedMedications: string[];
  symptomsText: string; onSuccess: () => void; visitIntentId: string; bookingIntentId: string; onCardExpand?: (expanded: boolean) => void;
  isNewPatient: boolean; visitFeePrice: { amount: number; display: string }; onPulseForm?: () => void; onValidateFields?: () => boolean;
  npFirstName?: string; npLastName?: string; npEmail?: string; npPhone?: string; npAddress?: string;
  npDobMonth?: string; npDobDay?: string; npDobYear?: string;
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
  const [showCardForm, setShowCardForm] = useState(false);
  const [pulseField, setPulseField] = useState<string | null>(null);
  const [declineState, setDeclineState] = useState<DeclineState | null>(null);

  const handleStripeError = (err: { type?: string; code?: string; decline_code?: string; message?: string }) => {
    const ds = getDeclineState(err);
    setDeclineState(ds);
    setError(null);
    setPayInFlight(false);
    if (ds.category === "card_data" || ds.category === "expired" || ds.category === "soft" || ds.category === "funds") {
      setPulseField("card");
      setTimeout(() => setPulseField(null), 2000);
    }
  };
  // New patient — values lifted to page level, received as props
  const newFirstName = npFirstName ?? "";
  const newLastName  = npLastName  ?? "";
  const newEmail     = npEmail     ?? "";
  const newPhone     = npPhone     ?? "";
  const newAddress   = npAddress   ?? "";
  const newDobMonth  = npDobMonth  ?? "";
  const newDobDay    = npDobDay    ?? "";
  const newDobYear   = npDobYear   ?? "";
  const newDobComplete = newDobMonth.length === 2 && newDobDay.length === 2 && newDobYear.length === 4;
  const newDobISO = newDobComplete ? `${newDobYear}-${newDobMonth}-${newDobDay}` : "";
  const newPatientFieldsComplete = !isNewPatient || (
    newFirstName.trim().length > 0 && newLastName.trim().length > 0 &&
    newEmail.includes("@") && newPhone.replace(/\D/g, "").length >= 10 &&
    newDobComplete
  );

  // ── Payment speed: pre-fire patient creation when all new patient fields complete ──
  const [prefetchedPatientId, setPrefetchedPatientId] = useState<string | null>(null);
  const prefetchPatientRef = useRef(false);
  useEffect(() => {
    if (!isNewPatient || !newPatientFieldsComplete || prefetchPatientRef.current) return;
    const pd = getPatientData();
    if (!pd.email || !pd.firstName || !pd.lastName) return;
    prefetchPatientRef.current = true;
    fetch("/api/check-create-patient", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
        phone: pd.phone, dateOfBirth: pd.dateOfBirth,
        address: pd.address, pharmacy: pharmacy || "",
        pharmacyAddress: pharmacyAddress || "",
      }),
    })
      .then(r => r.json())
      .then(result => { if (result.patientId) setPrefetchedPatientId(result.patientId); })
      .catch(() => { prefetchPatientRef.current = false; });
  }, [isNewPatient, newPatientFieldsComplete]);

  const getPatientData = () => {
    if (!isNewPatient) {
      return { email: patient.email, firstName: patient.firstName, lastName: patient.lastName, phone: patient.phone, dateOfBirth: convertDateToISO(patient.dateOfBirth), address: patient.address };
    }
    return { email: newEmail.trim(), firstName: newFirstName.trim(), lastName: newLastName.trim(), phone: newPhone.replace(/\D/g, ""), dateOfBirth: newDobISO, address: newAddress.trim() };
  };

  // ── Express Checkout (Apple Pay / Google Pay) one-tap handler ──
  const handleExpressConfirm = async () => {
    if (!acceptedTerms) { setPulseField("terms"); setTimeout(() => setPulseField(null), 1500); return; }
    setError(null);
    setDeclineState(null);
    setPayInFlight(true);
    try {
      const pd = getPatientData();

      // PERF: wallet sheet opens IMMEDIATELY — no DB waterfall before biometric prompt
      if (!stripe || !elements) { setError("Payment not ready."); setPayInFlight(false); return; }

      const { error: submitError } = await elements.submit();
      if (submitError) { handleStripeError(submitError); return; }

      // Step 1: Hold $1.89 booking fee via Elements (capture_method: manual)
      // Google/Apple Pay shows $1.89 — patient sees correct amount
      const result = await stripe.confirmPayment({
        elements, redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/success`,
          payment_method_data: { billing_details: { name: `${pd.firstName} ${pd.lastName}`, email: pd.email, phone: pd.phone } },
        },
      });

      if (result.error) { handleStripeError(result.error); return; }

      const bookingHoldCleared = result.paymentIntent?.status === "requires_capture" || result.paymentIntent?.status === "succeeded";
      if (!bookingHoldCleared) {
        setError("Payment hold could not be confirmed. Please try again.");
        setPayInFlight(false);
        return;
      }

      const paymentMethodId = typeof result.paymentIntent?.payment_method === "string"
        ? result.paymentIntent.payment_method
        : result.paymentIntent?.payment_method?.id;

      if (!paymentMethodId) {
        setError("Could not retrieve payment method. Please try again.");
        setPayInFlight(false);
        return;
      }

      setIsProcessing(true); setProgress(33); setStatusText("Verifying payment method...");

      // Step 2: Attempt $189 visit fee hold server-side using same payment method
      const visitHoldRes = await fetch("/api/confirm-visit-hold", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitIntentId, paymentMethodId }),
      });
      const visitHoldResult = await visitHoldRes.json();

      if (!visitHoldRes.ok) {
        // Visit hold failed — cancel $1.89 hold so patient owes nothing
        await fetch("/api/cancel-booking-hold", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingIntentId: result.paymentIntent.id }),
        }).catch(() => {});
        setIsProcessing(false);
        handleStripeError({ code: visitHoldResult.code, decline_code: visitHoldResult.decline_code, message: visitHoldResult.error });
        return;
      }

      // 3DS: bank requires authentication before hold can complete
      if (visitHoldResult.requiresAction && visitHoldResult.clientSecret) {
        setStatusText("Completing bank verification...");
        const { error: actionError } = await stripe!.handleNextAction({ clientSecret: visitHoldResult.clientSecret });
        if (actionError) {
          await fetch("/api/cancel-booking-hold", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingIntentId: result.paymentIntent.id }),
          }).catch(() => {});
          setIsProcessing(false);
          handleStripeError({ code: "authentication_required", message: actionError.message });
          return;
        }
        // 3DS passed — re-verify hold actually landed on server
        const verifyRes = await fetch("/api/confirm-visit-hold", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitIntentId, confirmAfter3DS: true }),
        });
        const verifyResult = await verifyRes.json();
        if (!verifyRes.ok || !verifyResult.success) {
          await fetch("/api/cancel-booking-hold", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingIntentId: result.paymentIntent.id }),
          }).catch(() => {});
          setIsProcessing(false);
          handleStripeError({ code: verifyResult.code || "authentication_required", message: verifyResult.error });
          return;
        }
      }

      setProgress(66); setStatusText("Confirming booking...");

      // Step 3 + 4 in parallel: capture $1.89 AND create/fetch patient record simultaneously
      let patientId = patient.id || prefetchedPatientId;
      const [captureRes, patientResult] = await Promise.all([
        fetch("/api/capture-booking-fee", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingIntentId: result.paymentIntent.id }),
        }),
        patientId ? Promise.resolve(null) : fetch("/api/check-create-patient", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
            phone: pd.phone, dateOfBirth: pd.dateOfBirth,
            address: pd.address, pharmacy: pharmacy || patient.pharmacy || "",
            pharmacyAddress: pharmacyAddress || "", pharmacyPhone: pharmacyPhone || "",
          }),
        }),
      ]);
      if (!captureRes.ok) console.error("[Payment] Booking fee capture failed — continuing");
      if (patientResult) {
        const createResult = await patientResult.json();
        if (!patientResult.ok) throw new Error(createResult.error || "Failed to create patient");
        patientId = createResult.patientId;
      }

      setProgress(80); setStatusText("Creating appointment...");

      const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let fullChiefComplaint = chiefComplaint || reason;
      if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
      if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

      const appointmentPayload = {
        payment_intent_id: result.paymentIntent.id, payment_intent_status: result.paymentIntent.status, visit_intent_id: visitIntentId,
        appointmentData: {
          email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
          phone: pd.phone, dateOfBirth: pd.dateOfBirth,
          streetAddress: pd.address, symptoms: reason, chief_complaint: fullChiefComplaint,
          visitType, appointmentDate: appointmentDate, appointmentTime: appointmentTime,
          patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: !isNewPatient,
          pharmacy: pharmacy || patient.pharmacy || "", pharmacyAddress: pharmacyAddress || "", pharmacyPhone: pharmacyPhone || "",
          browserInfo: (() => { try { return sessionStorage.getItem("browserInfo") || ""; } catch { return ""; } })(),
        },
      };

      const appointmentRes = await fetch("/api/create-appointment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentPayload),
      });
      const appointmentResult = await appointmentRes.json();
      if (!appointmentRes.ok) throw new Error(`${appointmentResult.error || "Failed to create appointment"}${appointmentResult.details ? ": " + appointmentResult.details : ""}`);

      setProgress(100); setStatusText("Appointment booked!");
      sessionStorage.setItem("appointmentData", JSON.stringify({
        ...appointmentPayload.appointmentData,
        appointmentId: appointmentResult.appointmentId,
        accessToken: appointmentResult.accessToken,
        payment_intent_id: result.paymentIntent.id, payment_intent_status: result.paymentIntent.status, visit_intent_id: visitIntentId,
      }));
      clearAnswers();
      await new Promise((r) => setTimeout(r, 200));
      onSuccess();
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
    setDeclineState(null);
    setPayInFlight(true);

    try {
      let patientId = patient.id || prefetchedPatientId;

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
        const isAsyncVisit = visitType === "async";
        let fullChiefComplaint = chiefComplaint || reason || "Test visit";
        if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
        if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

        const appointmentPayload = {
          payment_intent_id: paymentIntent.id, payment_intent_status: paymentIntent.status, visit_intent_id: visitIntentId,
          appointmentData: {
            email: patient.email || "test@medazon.com", firstName: patient.firstName || "Test", lastName: patient.lastName || "Patient",
            phone: patient.phone || "0000000000", dateOfBirth: convertDateToISO(patient.dateOfBirth) || "1990-01-01",
            streetAddress: patient.address || "Test Address", symptoms: reason || "Test", chief_complaint: fullChiefComplaint,
            visitType, appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: !!patient.id,
            pharmacy: pharmacy || patient.pharmacy || "", pharmacyAddress: pharmacyAddress || "", pharmacyPhone: pharmacyPhone || "",
            browserInfo: (() => { try { return sessionStorage.getItem("browserInfo") || ""; } catch { return ""; } })(),
          },
        };

        const appointmentRes = await fetch("/api/create-appointment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentPayload),
        });
        const appointmentResult = await appointmentRes.json();
        if (!appointmentRes.ok) throw new Error(`${appointmentResult.error || "Failed to create appointment"}${appointmentResult.details ? ": " + appointmentResult.details : ""}`);

        setProgress(100); setStatusText("Appointment booked!");
        sessionStorage.setItem("appointmentData", JSON.stringify({
          ...appointmentPayload.appointmentData,
          appointmentId: appointmentResult.appointmentId,
          accessToken: appointmentResult.accessToken,
          payment_intent_id: paymentIntent.id, payment_intent_status: paymentIntent.status, visit_intent_id: visitIntentId,
        }));
        clearAnswers();
        await new Promise((r) => setTimeout(r, 200));
        onSuccess();
        return;
      }

      // NORMAL MODE — real payment
      const pd = getPatientData();

      let paymentIntent: any = null; let paymentError: any = null;

      if (!stripe || !elements) { setError("Payment not ready. Please try again."); setPayInFlight(false); return; }

      // Step 1: Hold $1.89 via Elements (card form) — patient sees $1.89
      const submitResult = await elements.submit();
      if (submitResult.error) { handleStripeError(submitResult.error); return; }

      const result = await stripe.confirmPayment({
        elements, redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/success`,
          payment_method_data: {
            billing_details: {
              name: `${pd.firstName} ${pd.lastName}`.trim(),
              email: pd.email || undefined,
              phone: pd.phone || undefined,
            },
          },
        },
      });
      paymentError = result.error; paymentIntent = result.paymentIntent;

      if (paymentError) { handleStripeError(paymentError); return; }

      const bookingHoldCleared = paymentIntent?.status === "requires_capture" || paymentIntent?.status === "succeeded";
      if (!bookingHoldCleared) {
        setError("Payment hold could not be confirmed. Please try again.");
        setPayInFlight(false);
        return;
      }

      const paymentMethodId = typeof paymentIntent?.payment_method === "string"
        ? paymentIntent.payment_method
        : paymentIntent?.payment_method?.id;

      if (!paymentMethodId) {
        setIsProcessing(false);
        setError("Could not retrieve payment method. Please try again.");
        setPayInFlight(false);
        return;
      }

      // Hold cleared — safe to show progress
      setIsProcessing(true); setProgress(33); setStatusText("Verifying payment method...");

      // Step 2: Attempt $189 visit fee hold server-side
      const visitHoldRes = await fetch("/api/confirm-visit-hold", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitIntentId, paymentMethodId }),
      });
      const visitHoldResult = await visitHoldRes.json();

      if (!visitHoldRes.ok) {
        // Visit hold failed — cancel $1.89 hold so patient owes nothing
        await fetch("/api/cancel-booking-hold", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingIntentId: paymentIntent.id }),
        }).catch(() => {});
        setIsProcessing(false);
        handleStripeError({ code: visitHoldResult.code, decline_code: visitHoldResult.decline_code, message: visitHoldResult.error });
        return;
      }

      // 3DS: bank requires authentication before hold can complete
      if (visitHoldResult.requiresAction && visitHoldResult.clientSecret) {
        setStatusText("Completing bank verification...");
        const { error: actionError } = await stripe!.handleNextAction({ clientSecret: visitHoldResult.clientSecret });
        if (actionError) {
          await fetch("/api/cancel-booking-hold", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingIntentId: paymentIntent.id }),
          }).catch(() => {});
          setIsProcessing(false);
          handleStripeError({ code: "authentication_required", message: actionError.message });
          return;
        }
        // 3DS passed — re-verify hold actually landed on server
        const verifyRes = await fetch("/api/confirm-visit-hold", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitIntentId, confirmAfter3DS: true }),
        });
        const verifyResult = await verifyRes.json();
        if (!verifyRes.ok || !verifyResult.success) {
          await fetch("/api/cancel-booking-hold", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingIntentId: paymentIntent.id }),
          }).catch(() => {});
          setIsProcessing(false);
          handleStripeError({ code: verifyResult.code || "authentication_required", message: verifyResult.error });
          return;
        }
      }

      setProgress(66); setStatusText("Confirming booking...");

      // Step 3 + 4 in parallel: capture $1.89 AND create/fetch patient record simultaneously
      const [captureRes, patientResult] = await Promise.all([
        fetch("/api/capture-booking-fee", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingIntentId: paymentIntent.id }),
        }),
        patientId ? Promise.resolve(null) : fetch("/api/check-create-patient", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
            phone: pd.phone, dateOfBirth: pd.dateOfBirth,
            address: pd.address, pharmacy: pharmacy || patient.pharmacy || "",
            pharmacyAddress: pharmacyAddress || "", pharmacyPhone: pharmacyPhone || "",
          }),
        }),
      ]);
      if (!captureRes.ok) console.error("[Payment] Booking fee capture failed — continuing");
      if (patientResult) {
        const createResult = await patientResult.json();
        if (!patientResult.ok) throw new Error(createResult.error || "Failed to create patient");
        patientId = createResult.patientId;
      }

      setProgress(80); setStatusText("Creating appointment...");

      const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let fullChiefComplaint = chiefComplaint || reason;
      if (selectedMedications.length > 0) fullChiefComplaint = `Rx Refill: ${selectedMedications.join(", ")}. ${fullChiefComplaint}`;
      if (symptomsText) fullChiefComplaint = `${fullChiefComplaint}\n\nAdditional symptoms: ${symptomsText}`;

      const appointmentPayload = {
        payment_intent_id: paymentIntent.id, payment_intent_status: paymentIntent.status, visit_intent_id: visitIntentId,
        appointmentData: {
          email: pd.email, firstName: pd.firstName, lastName: pd.lastName,
          phone: pd.phone, dateOfBirth: pd.dateOfBirth,
          streetAddress: pd.address, symptoms: reason, chief_complaint: fullChiefComplaint,
          visitType, appointmentDate: appointmentDate, appointmentTime: appointmentTime,
          patientId, patientTimezone: patientTZ, skipIntake: true, isReturningPatient: !isNewPatient,
          pharmacy: pharmacy || patient.pharmacy || "", pharmacyAddress: pharmacyAddress || "", pharmacyPhone: pharmacyPhone || "",
          browserInfo: (() => { try { return sessionStorage.getItem("browserInfo") || ""; } catch { return ""; } })(),
        },
      };

      const appointmentRes = await fetch("/api/create-appointment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentPayload),
      });
      const appointmentResult = await appointmentRes.json();
      if (!appointmentRes.ok) throw new Error(`${appointmentResult.error || "Failed to create appointment"}${appointmentResult.details ? ": " + appointmentResult.details : ""}`);

      setProgress(100); setStatusText("Appointment booked!");
      sessionStorage.setItem("appointmentData", JSON.stringify({
        ...appointmentPayload.appointmentData,
        appointmentId: appointmentResult.appointmentId,
        accessToken: appointmentResult.accessToken,
        payment_intent_id: paymentIntent.id, payment_intent_status: paymentIntent.status, visit_intent_id: visitIntentId,
      }));
      clearAnswers();
      await new Promise((r) => setTimeout(r, 200));
      onSuccess();
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
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-[#2d7a5f] rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="text-[12px] text-gray-300 text-center">{statusText}</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-2">
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1.5 rounded-lg text-[10px]">{error}<button onClick={() => setError(null)} className="ml-2 underline text-[9px]">Dismiss</button></div>}

        {/* Decline state — warm, empathetic, actionable */}
        {declineState && (
          <div className="rounded-xl border border-[#2d7a5f]/25 px-3 py-3 space-y-2" style={{ background: "linear-gradient(135deg, rgba(13,18,24,0.95) 0%, rgba(20,28,36,0.95) 100%)" }}>
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ background: "rgba(45,122,95,0.12)" }}>
                <span className="text-[14px]">💙</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[12px] leading-[1.3]">{declineState.headline}</p>
                <p className="text-gray-400 text-[11px] leading-[1.4] mt-0.5">{declineState.body}</p>
              </div>
              <button onClick={() => setDeclineState(null)} className="flex-shrink-0 text-gray-600 hover:text-gray-400 text-[14px] leading-none mt-0.5">×</button>
            </div>
            <div className="flex gap-2 pt-0.5">
              {declineState.retryable && (
                <button
                  onClick={() => { setDeclineState(null); setTimeout(() => handlePay(), 50); }}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ background: "#2d6b4f", boxShadow: "0 2px 8px rgba(45,107,79,0.25)" }}
                >
                  Try Again
                </button>
              )}
              {!declineState.retryable && (
                <button
                  onClick={() => { setDeclineState(null); setShowCardForm(true); }}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white transition-all active:scale-[0.98]"
                  style={{ background: "#2d6b4f", boxShadow: "0 2px 8px rgba(45,107,79,0.25)" }}
                >
                  Use a Different Card
                </button>
              )}
              {declineState.showBnpl && process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK && (
                <a
                  href={`${process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(patient.email || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-[#2d7a5f] border border-[#2d7a5f]/30 text-center transition-all active:scale-[0.98]"
                  style={{ background: "rgba(45,122,95,0.06)" }}
                >
                  Book &amp; Pay {currentPrice.display} Now
                </a>
              )}
            </div>
            <p className="text-gray-600 text-[10px] leading-[1.3] text-center pt-0.5">
              Care first. Your information is saved — nothing to re-enter.
            </p>
          </div>
        )}

        {isTestMode ? (
          <button onClick={() => {
            if (!acceptedTerms) { setPulseField("terms"); setTimeout(() => setPulseField(null), 1500); return; }
            if (isNewPatient && !newDobComplete) { setPulseField("dob"); setTimeout(() => setPulseField(null), 1500); return; }
            handlePay();
          }} className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 font-bold text-white text-[14px] active:scale-[0.98]" style={{ background: "#2d6b4f", boxShadow: "0 4px 16px rgba(45,107,79,0.3)" }}>
            🧪 Test Pay — {currentPrice.display}
          </button>
        ) : (
          <div className="space-y-1.5">
            {/* Payment brand logos */}
            <div className="flex items-center justify-center gap-2 py-1">
              {/* Apple Pay */}
              <div style={{ background:"#fff", borderRadius:4, padding:"2px 6px", display:"flex", alignItems:"center", height:20, border:"1px solid #e5e7eb" }}>
                <svg width="38" height="14" viewBox="0 0 38 14" fill="none"><path d="M7.08 2.88c-.44.52-1.14.92-1.84.86-.08-.7.26-1.44.66-1.9.44-.52 1.2-.9 1.82-.92.08.72-.2 1.44-.64 1.96zm.62.98c-1.02-.06-1.88.58-2.36.58-.48 0-1.22-.54-2.02-.52C2.3 3.94 1.4 4.56.96 5.52c-.9 1.56-.24 3.86.64 5.12.42.62.94 1.3 1.62 1.28.64-.02.88-.42 1.66-.42.76 0 .98.42 1.66.4.7-.02 1.14-.62 1.56-1.24.5-.72.7-1.42.72-1.46-.02-.02-1.38-.54-1.4-2.1-.02-1.3 1.06-1.92 1.1-1.96-.62-.88-1.56-.98-1.82-1zm4.62-1.66v9.52h1.48V9.06h2.04c1.86 0 3.16-1.28 3.16-3.14 0-1.86-1.28-3.12-3.12-3.12h-3.56zm1.48 1.26h1.7c1.28 0 2 .68 2 1.88 0 1.2-.72 1.88-2.02 1.88h-1.68V3.46zm7.68 8.34c.92 0 1.78-.46 2.16-1.2h.03v1.12h1.36V6.86c0-1.38-1.1-2.26-2.78-2.26-1.56 0-2.72.9-2.76 2.12h1.32c.1-.58.64-.96 1.4-.96.9 0 1.4.42 1.4 1.18v.52l-1.84.1c-1.7.1-2.62.8-2.62 2.02 0 1.24.96 2.06 2.33 2.06zm.4-1.12c-.78 0-1.28-.38-1.28-1 0-.64.48-1 1.38-1.06l1.64-.1v.54c0 .92-.78 1.62-1.74 1.62zm5.2 3.58c1.44 0 2.12-.56 2.72-2.22l2.6-7.34h-1.52l-1.74 5.62h-.03l-1.74-5.62h-1.56l2.52 6.98-.14.42c-.22.72-.6 1-1.2 1-.12 0-.34-.02-.44-.04v1.14c.1.04.4.06.53.06z" fill="#000"/></svg>
              </div>
              {/* Google Pay */}
              <div style={{ background:"#fff", borderRadius:4, padding:"2px 6px", display:"flex", alignItems:"center", height:20, border:"1px solid #e5e7eb" }}>
                <svg width="38" height="14" viewBox="0 0 38 14" fill="none"><path d="M17.42 6.8v3.6h-1.14V1.6h3.02c.76 0 1.42.26 1.94.76.54.5.8 1.12.8 1.84 0 .74-.26 1.36-.8 1.86-.52.5-1.18.74-1.94.74h-1.88zm0-4.08v3h1.9c.46 0 .84-.16 1.14-.46.3-.3.46-.68.46-1.04 0-.38-.16-.74-.46-1.04-.3-.3-.68-.46-1.14-.46h-1.9zm7.24 1.54c.82 0 1.48.22 1.96.66.48.44.72 1.04.72 1.82v3.66h-1.08v-.82h-.04c-.48.68-1.1 1.02-1.88 1.02-.66 0-1.22-.2-1.66-.6-.44-.4-.66-.9-.66-1.52 0-.64.24-1.16.72-1.54.48-.38 1.12-.58 1.92-.58.68 0 1.24.12 1.68.38v-.26c0-.4-.16-.74-.48-1.02-.32-.28-.7-.42-1.12-.42-.66 0-1.16.28-1.52.82l-1-.62c.54-.76 1.32-1.14 2.44-1.14zm-1.46 4.56c0 .3.14.56.4.76.26.18.58.28.9.28.5 0 .94-.18 1.32-.56.38-.38.58-.82.58-1.32-.36-.28-.86-.44-1.5-.44-.46 0-.84.1-1.14.32-.3.22-.56.52-.56.96zm8.22-4.36l-3.2 7.36h-1.16l1.18-2.56-2.1-4.8h1.22l1.52 3.64h.02l1.48-3.64h1.04z" fill="#5F6368"/><path d="M10.6 6.14c0-.36-.04-.72-.1-1.06H5.8v2h2.7c-.12.62-.46 1.14-.96 1.5v1.26h1.54c.9-.84 1.42-2.06 1.42-3.7h.1z" fill="#4285F4"/><path d="M5.8 10.96c1.34 0 2.46-.44 3.28-1.2L7.54 8.5c-.44.3-1 .48-1.74.48-1.34 0-2.48-.9-2.88-2.12H.88v1.3c.84 1.64 2.54 2.8 4.92 2.8z" fill="#34A853"/><path d="M2.92 6.86c-.1-.3-.16-.62-.16-.96s.06-.66.16-.96V3.64H.88C.32 4.76 0 5.88 0 7.1c0 1.2.32 2.3.88 3.46l2.04-1.6c-.1-.3-.16-.62-.16-.96l.16.86z" fill="#FBBC05"/><path d="M5.8 3.78c.76 0 1.42.26 1.96.78l1.46-1.46C8.26 2.26 7.14 1.74 5.8 1.74 3.42 1.74 1.72 2.9.88 4.54l2.04 1.3c.4-1.22 1.54-2.06 2.88-2.06z" fill="#EA4335"/></svg>
              </div>
              {/* Visa */}
              <div style={{ background:"#fff", borderRadius:4, padding:"2px 5px", display:"flex", alignItems:"center", height:20, border:"1px solid #e5e7eb" }}>
                <svg width="28" height="9" viewBox="0 0 28 9" fill="none"><path d="M10.8.24L7.02 8.76H4.62L2.76 1.98C2.64 1.5 2.52 1.32 2.16 1.14 1.62.84.72.54 0 .36L.06.24H3.9c.48 0 .9.3 1.02.84l.9 4.8L8.4.24h2.4zm9.48 5.7c.012-.96-.66-1.68-2.1-2.28-.876-.384-1.416-.636-1.41-.996 0-.336.456-.696 1.44-.696.816-.012 1.404.174 1.86.372l.222.108.336-2.028C20.1.228 19.416 0 18.552 0c-2.34 0-3.984 1.2-3.996 2.916-.012 1.266 1.164 1.968 2.052 2.388.912.432 1.218.708 1.212 1.092-.006.588-.726.858-1.398.858-.936 0-1.434-.132-2.202-.456l-.3-.144-.324 1.98c.54.24 1.536.45 2.568.462 2.424-.006 4.002-1.188 4.014-3.042L20.28 5.94v-.012l.012.03h-.024zM26.4 8.76h2.1L26.82.24H24.9c-.516 0-.954.288-1.146.738L20.46 8.76h2.418l.48-1.308h2.952L26.4 8.76zm-2.58-3.12l1.218-3.24.684 3.24h-1.902zM11.4.24L9.498 8.76H7.2L9.102.24H11.4z" fill="#1A1F71"/></svg>
              </div>
              {/* Mastercard */}
              <div style={{ background:"#fff", borderRadius:4, padding:"2px 5px", display:"flex", alignItems:"center", height:20, border:"1px solid #e5e7eb" }}>
                <svg width="24" height="16" viewBox="0 0 24 16" fill="none"><circle cx="9" cy="8" r="7" fill="#EB001B"/><circle cx="15" cy="8" r="7" fill="#F79E1B"/><path d="M12 2.53A7 7 0 0115 8a7 7 0 01-3 5.47A7 7 0 019 8a7 7 0 013-5.47z" fill="#FF5F00"/></svg>
              </div>
              {/* Amex */}
              <div style={{ background:"#2671B9", borderRadius:4, padding:"2px 5px", display:"flex", alignItems:"center", height:20 }}>
                <svg width="24" height="9" viewBox="0 0 24 9" fill="none"><path d="M0 .12h3.48l.96 2.22L5.4.12H24v8.76H0V.12z" fill="#2671B9"/><path d="M1.44 1.32L0 4.68h.96l.24-.6H2.76l.24.6h.96L2.52 1.32h-1.08zm.12 2.1l.36-.9.36.9H1.56zm3.12-2.1v3.36h.84V2.94l1.08 1.74h.84V1.32H6.6v1.74L5.52 1.32h-.84zm3.6 0v3.36h2.64v-.72H9.12V2.94h1.68v-.72H9.12v-.6h1.8v-.72H8.28v.02zm3.48 0l1.08 1.74-.12.18-1.2-1.92h-.96L10.8 4.68h.96l.24-.6h1.56l.24.6h.96L13.32 1.32h-.96l-.12.12.12-.12zm-.24 1.98l.36-.9.36.9h-.72zM4.56 5.4v3.36H7.2V8.1H5.4V7.5h1.68V6.78H5.4V6.2h1.8V5.4H4.56zm3.12 0v3.36H8.52V7.02l1.08 1.74H10.44L9.36 7.02 10.44 5.4H9.6L8.52 7.14V5.4H7.68zm3.12 0v3.36h.84V5.4h-.84zm1.56 0v3.36h2.64V8.1H15.3V7.5h1.68V6.78H15.3V6.2h1.8V5.4H15.3l-.06.02.06-.02zm3.48 0l-1.08 1.62L13.08 5.4h-.96L13.2 7.2l-1.2 1.56h.96L14.04 7.2l1.08 1.56h.96L14.88 7.2l1.2-1.8h-.96l.12.12-.12-.12z" fill="#fff"/></svg>
              </div>
            </div>

            {/* Main CTA — opens card form when collapsed, submits when expanded */}
            <button
              onClick={() => {
                if (isNewPatient && !newPatientFieldsComplete) { onValidateFields?.(); return; }
                if (!showCardForm) { setShowCardForm(true); onCardExpand?.(true); return; }
                if (!acceptedTerms) { setPulseField("terms"); setTimeout(() => setPulseField(null), 1500); return; }
                if (!elementReady) { setPulseField("card"); setTimeout(() => setPulseField(null), 1500); return; }
                handlePay();
              }}
              disabled={payInFlight}
              style={{ width: "100%", background: "linear-gradient(180deg, #4e9a76 0%, #3f8464 50%, #2f6f53 100%)", color: "#fff", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif", fontSize: "15px", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" as const, height: "46px", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 6px rgba(47,111,83,0.35)", opacity: payInFlight ? 0.7 : 1, transition: "opacity 150ms ease" }}
            >
              {payInFlight ? "Processing..." : "BOOK NOW, PAY LATER"}
            </button>

            {/* Booking fee notice */}
            <p style={{ textAlign: "center", fontSize: "11px", color: "#6f6f73", lineHeight: 1.3, marginTop: "6px" }}>$1.89 Booking fee reserves your provider. Pay Visit Fee Only after provider accepts or offers treatment.</p>

            {/* Apple Pay + Link row */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (isNewPatient && !newPatientFieldsComplete) { onValidateFields?.(); return; }
                  handleExpressConfirm();
                }}
                disabled={payInFlight}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "44px", borderRadius: "12px", border: "1px solid #d0cac8", background: "#fff", color: "#1a1a1a", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "opacity 150ms ease" }}
              >
                <svg width="18" height="12" viewBox="0 0 38 14" fill="none"><path d="M7.08 2.88c-.44.52-1.14.92-1.84.86-.08-.7.26-1.44.66-1.9.44-.52 1.2-.9 1.82-.92.08.72-.2 1.44-.64 1.96zm.62.98c-1.02-.06-1.88.58-2.36.58-.48 0-1.22-.54-2.02-.52C2.3 3.94 1.4 4.56.96 5.52c-.9 1.56-.24 3.86.64 5.12.42.62.94 1.3 1.62 1.28.64-.02.88-.42 1.66-.42.76 0 .98.42 1.66.4.7-.02 1.14-.62 1.56-1.24.5-.72.7-1.42.72-1.46-.02-.02-1.38-.54-1.4-2.1-.02-1.3 1.06-1.92 1.1-1.96-.62-.88-1.56-.98-1.82-1zm4.62-1.66v9.52h1.48V9.06h2.04c1.86 0 3.16-1.28 3.16-3.14 0-1.86-1.28-3.12-3.12-3.12h-3.56zm1.48 1.26h1.7c1.28 0 2 .68 2 1.88 0 1.2-.72 1.88-2.02 1.88h-1.68V3.46zm7.68 8.34c.92 0 1.78-.46 2.16-1.2h.03v1.12h1.36V6.86c0-1.38-1.1-2.26-2.78-2.26-1.56 0-2.72.9-2.76 2.12h1.32c.1-.58.64-.96 1.4-.96.9 0 1.4.42 1.4 1.18v.52l-1.84.1c-1.7.1-2.62.8-2.62 2.02 0 1.24.96 2.06 2.33 2.06zm.4-1.12c-.78 0-1.28-.38-1.28-1 0-.64.48-1 1.38-1.06l1.64-.1v.54c0 .92-.78 1.62-1.74 1.62zm5.2 3.58c1.44 0 2.12-.56 2.72-2.22l2.6-7.34h-1.52l-1.74 5.62h-.03l-1.74-5.62h-1.56l2.52 6.98-.14.42c-.22.72-.6 1-1.2 1-.12 0-.34-.02-.44-.04v1.14c.1.04.4.06.53.06z" fill="#000"/></svg>

              </button>
              <button
                onClick={() => { setShowCardForm(true); onCardExpand?.(true); }}
                disabled={payInFlight}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "44px", borderRadius: "12px", border: "none", background: "linear-gradient(180deg, #4e9a76 0%, #3f8464 50%, #2f6f53 100%)", color: "#fff", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "opacity 150ms ease" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="white"/><path d="M6 4l4 4-4 4" stroke="#2d6b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                link
              </button>
            </div>



            {/* Card form — expands when main CTA or card button tapped */}
            {showCardForm ? (
              <>
                {/* Field hint — shown when a specific field caused the decline */}
                {declineState?.fieldHint && (
                  <p className="text-[#2d6b4f] text-[10px] font-medium px-1 -mb-1">
                    ⚠ {declineState.fieldHint}
                  </p>
                )}

                {/* Stripe PaymentElement — name/email/phone collected above; address collected by Stripe */}
                <div className={`rounded-xl border-2 border-[#2d7a5f]/35 p-1 transition-all ${pulseField === "card" ? "ring-2 ring-[#2d7a5f] animate-pulse" : ""}`} style={{ background: "#f9fafb" }}>
                  <PaymentElement onReady={() => setElementReady(true)} onChange={() => { if (declineState) setDeclineState(null); }} options={{
                    layout: "tabs",
                    paymentMethodOrder: ["card"],
                    wallets: { applePay: "never", googlePay: "never" },
                    fields: {
                      billingDetails: {
                        name: "never",
                        email: "never",
                        phone: "never",
                        address: "auto",
                      },
                    },
                  }} />
                </div>

                {/* Terms + pay button */}
                <div className="sticky bottom-0 z-10 pt-1 pb-0.5" style={{ background: "linear-gradient(to top, #ffffff 60%, transparent 100%)", paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)" }}>
                  <div className={`flex items-start gap-1.5 mb-1.5 rounded-lg px-1 py-0.5 transition-all ${pulseField === "terms" ? "ring-2 ring-[#2d6b4f] animate-pulse bg-[#2d6b4f]/10" : ""}`}>
                    <input type="checkbox" id="step2Terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="flex-shrink-0 mt-[1px]" style={{ width: '12px', height: '12px', borderRadius: '2px', accentColor: '#2d7a5f' }} />
                    <label htmlFor="step2Terms" className="leading-[1.4]" style={{ fontSize: '7px', color: '#888' }}>
                      By confirming, I agree to the <span className="text-[#2d7a5f] underline">Terms of Service</span>, <span className="text-[#2d7a5f] underline">Privacy Policy</span>, and <span className="text-[#2d7a5f] underline">Cancellation Policy</span>. This <strong className="text-[#1a1a1a]">{currentPrice.display}</strong> booking fee reserves your provider&apos;s time for a flat fee of <strong className="text-[#1a1a1a]">{visitFeePrice.display}</strong>. By completing this booking you acknowledged that your <strong className="text-[#1a1a1a]">{visitFeePrice.display}</strong> visit fee is non-refundable and reserves your provider&apos;s time slot. Visit fees are collected upon provider acceptance or engagement. No-shows and cancellations within 30 minutes of scheduled time are non-refundable.
                    </label>
                  </div>
                  <button onClick={() => {
                    if (!acceptedTerms) { setPulseField("terms"); setTimeout(() => setPulseField(null), 1500); return; }
                    if (isNewPatient && !newPatientFieldsComplete) {
                      onValidateFields?.();
                      return;
                    }
                    if (!elementReady) { setPulseField("card"); setTimeout(() => setPulseField(null), 1500); return; }
                    handlePay();
                  }}
                  style={{ width: "100%", height: "44px", borderRadius: "12px", border: "none", background: "linear-gradient(180deg, #4e9a76 0%, #3f8464 50%, #2f6f53 100%)", color: "#fff", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif", fontSize: "14px", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" as const, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: payInFlight ? 0.7 : 1, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }}>
                    <Lock size={13} /> {payInFlight ? "Processing..." : `Book & Pay ${currentPrice.display} Now`}
                  </button>
                  <p className="text-center text-gray-600 text-[9px] tracking-wide mt-1">CARE FIRST program</p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FAQ Accordion Components — Instant & Refill popup education
// ═══════════════════════════════════════════════════════════════
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", lineHeight: 1.3, flex: 1 }}>{q}</span>
        <span style={{ fontSize: 14, color: "#64748b", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>▾</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 8, paddingRight: 4 }}>
          <p style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5, margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

function InstantFAQ() {
  const [expanded, setExpanded] = useState(false);
  const faqs = [
    { q: "How long will I wait?", a: "Most patients connect within minutes. You'll see your position in the queue. If you book after 8:30 PM Arizona time, your visit is locked in for 9:00 AM the next morning." },
    { q: "What if no one is available right now?", a: "You hold your spot in queue and we notify you the moment a provider is ready. You don't have to stay on the screen." },
    { q: "Is this a real doctor?", a: "Yes. Our provider is a licensed nurse practitioner with full prescribing authority. Your care is clinically supervised." },
    { q: "Can I get a prescription?", a: "Yes. If clinically appropriate, your prescription is sent directly to your pharmacy the same day." },
    { q: "What if I book after 8:30 PM?", a: "We lock in your first available slot at 9:00 AM Arizona time the next morning — no need to book again." },
    { q: "Is my visit completely private?", a: "Completely. Your reason for visiting is encrypted and never shared outside your care team." },
  ];
  return (
    <div style={{ marginTop: 4, marginBottom: 2 }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em" }}>Common Questions</span>
        <span style={{ fontSize: 13, color: "#64748b", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>▾</span>
      </button>
      {expanded && (
        <div style={{ padding: "4px 10px 2px", background: "#f9fafb", borderRadius: "0 0 8px 8px", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
          {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      )}
    </div>
  );
}

function RefillFAQ() {
  const [expanded, setExpanded] = useState(false);
  const faqs = [
    { q: "Do I need an appointment?", a: "No. Submit your refill request and your provider reviews it same day. No video, no phone call required." },
    { q: "How fast will my pharmacy get it?", a: "Most refills are sent within a few hours during business hours. You'll receive a confirmation when it's sent." },
    { q: "What if I need a controlled substance?", a: "Controlled medications require a brief live consultation (video or phone). We'll upgrade your visit automatically — no extra charge." },
    { q: "Can they refill any medication?", a: "Most non-controlled medications, yes. Your provider will only decline if it's clinically unsafe to refill without a visit." },
    { q: "What if my prescription is expired?", a: "Your provider can issue a new prescription if your history supports it. Most routine medications are approved." },
    { q: "Is there a limit on refills?", a: "No standing limit. Each request is reviewed individually and approved based on your clinical history." },
  ];
  return (
    <div style={{ marginTop: 4, marginBottom: 2 }}>
      <button
        onClick={() => setExpanded(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em" }}>Common Questions</span>
        <span style={{ fontSize: 13, color: "#64748b", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>▾</span>
      </button>
      {expanded && (
        <div style={{ padding: "4px 10px 2px", background: "#f9fafb", borderRadius: "0 0 8px 8px", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
          {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
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

  // ═══ ROTATING BELOW-CARD CONTENT ═══
  // Session-seeded so it stays consistent within one visit but changes next time
  const contentSeed = useMemo(() => {
    try {
      const stored = sessionStorage.getItem("medazon_content_seed");
      if (stored) return parseInt(stored);
      const seed = Math.floor(Math.random() * 10000);
      sessionStorage.setItem("medazon_content_seed", String(seed));
      return seed;
    } catch { return Math.floor(Math.random() * 10000); }
  }, []);
  const pick = (arr: string[], step: number) => arr[(contentSeed + step) % arr.length];

  const step1Titles = ["What Brings\nYou In?", "How Can We\nHelp?", "Let's Get You\nTreated", "What's Going\nOn?"];
  const step1Subs = [
    "Everything is private. Only your provider sees your answers.",
    "Select your concern — your visit stays between you and your provider.",
    "100% discreet. Board-certified provider. Same person every visit.",
    "No judgment. No waiting rooms. Just private care.",
  ];
  const step2Titles = ["Tell Us\nMore", "Describe What's\nGoing On", "Share Your\nSymptoms", "Help Us\nHelp You"];
  const step2Subs = [
    "Only your provider sees this. Take your time.",
    "The more detail, the better your provider can help.",
    "Everything you share is encrypted and private.",
    "Your words go directly to your provider — no one else.",
  ];
  const step3Titles = ["Choose Your\nPharmacy", "Where Should We\nSend Your Rx?", "Pick Up\nDiscreetly", "Select\nPharmacy"];
  const step3Subs = [
    "Discreet pickup. No questions asked.",
    "Your prescription goes directly — private and fast.",
    "Same-day Rx to your preferred pharmacy.",
    "We send it. You pick it up. Nobody knows.",
  ];
  const step4Titles = ["How Would You Like\nTo Be Seen?", "Choose Your\nVisit Type", "Pick What Works\nFor You", "Your Visit,\nYour Way"];
  const step4Subs = [
    "Every option is private. Same provider every time.",
    "No cameras required unless you want one.",
    "All visit types are HIPAA encrypted end-to-end.",
    "Choose what's comfortable — your provider handles the rest.",
  ];
  const confirmTitles = ["You're In\nGood Hands", "Almost\nThere", "Confirm\nYour Visit", "One Step\nAway"];
  const confirmSubs = [
    "Your provider personally reviews every case.",
    "Review your details — then we take it from here.",
    "Everything looks good. Your provider is ready.",
    "Private. Discreet. Board-certified care.",
  ];
  const confirmPayTitles = ["Welcome\nBack", "Good To See\nYou Again", "Ready When\nYou Are", "Let's Get\nStarted"];

  // Timeline items rotate wording
  const timelineVariants = [
    { s1: "Share What's Going On", d1: "Private intake — only your provider sees", s2: "Provider Reviews Personally", d2: "The same provider who knows you", s3: "Treatment Sent Privately", d3: "Discreet Rx to your pharmacy" },
    { s1: "Tell Us What's Bothering You", d1: "Encrypted. Confidential. Just for your provider.", s2: "Your Provider Evaluates", d2: "Not a stranger — your dedicated provider", s3: "Prescription to Pharmacy", d3: "Same day. Discreet packaging available." },
    { s1: "Describe Your Symptoms", d1: "Takes under 2 minutes. Fully private.", s2: "Personal Case Review", d2: "Board-certified. Knows your history.", s3: "Rx Sent Directly", d3: "To your pharmacy. No one has to know." },
  ];
  const activeTimeline = timelineVariants[(contentSeed + 5) % timelineVariants.length];

  // Privacy callouts rotate
  const privacyCallouts = [
    "Nobody has to know. No insurance contacted. Billing shows as \"Medazon Health.\" No trace.",
    "Complete discretion. No insurance. Discreet billing. Your case stays between you and your provider.",
    "100% private. No apps to install. No insurance required. Discreet from start to finish.",
  ];
  const activePrivacy = privacyCallouts[(contentSeed + 7) % privacyCallouts.length];

  // Provider quotes rotate
  const providerQuotes = [
    "\"Your privacy and care come first — always.\"",
    "\"I personally review every case. You're not a number here.\"",
    "\"Every patient deserves to be heard and treated with dignity.\"",
    "\"I treat every patient like family. Discretion is non-negotiable.\"",
  ];
  const activeQuote = providerQuotes[(contentSeed + 3) % providerQuotes.length];

  // Below-card component
  const BelowCardContent = ({ step }: { step: number }) => {
    const titles = step === 1 ? step1Titles : step === 2 ? step2Titles : step === 3 ? step3Titles : step === 4 ? step4Titles : confirmTitles;
    const subs = step === 1 ? step1Subs : step === 2 ? step2Subs : step === 3 ? step3Subs : step === 4 ? step4Subs : confirmSubs;
    const title = pick(titles, step);
    const sub = pick(subs, step);
    return (
      <div style={{ animation: "fadeInBelow 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both" }}>
        <div className="px-1 mt-4 mb-1">
          <h2 className="text-white font-black leading-[1.05] tracking-tight whitespace-pre-line" style={{ fontSize: "clamp(40px, 11vw, 52px)", textAlign: "center" }}>
            {title.split("\n").map((line, i) => {
              // Last word of last line gets green accent
              const words = line.split(" ");
              if (i === title.split("\n").length - 1 && words.length > 0) {
                const last = words.pop();
                return <span key={i}>{words.join(" ")} <span className="text-[#2d7a5f]">{last}</span>{"\n"}</span>;
              }
              return <span key={i}>{line}{"\n"}</span>;
            })}
          </h2>
          <p className="text-[#6b7280] mt-2 leading-relaxed" style={{ textAlign: "center", fontSize: "13px" }}>{sub}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2 px-1 justify-center">
          {step <= 3 && <span className="text-[#6b7280] flex items-center gap-1" style={{ fontSize: "13px" }}><span className="w-1 h-1 rounded-full bg-[#2d7a5f] inline-block"></span>🔒 HIPAA Encrypted</span>}
          {step <= 3 && <span className="text-[#6b7280] flex items-center gap-1" style={{ fontSize: "13px" }}><span className="w-1 h-1 rounded-full bg-[#2d7a5f] inline-block"></span>👩‍⚕️ Board-Certified</span>}
          {step <= 3 && <span className="text-[#6b7280] flex items-center gap-1" style={{ fontSize: "13px" }}><span className="w-1 h-1 rounded-full bg-[#2d7a5f] inline-block"></span>⭐ 4.9 · 10K+</span>}
          {step <= 3 && <span className="text-[#6b7280] flex items-center gap-1" style={{ fontSize: "13px" }}><span className="w-1 h-1 rounded-full bg-[#2d7a5f] inline-block"></span>👤 Same Provider</span>}
        </div>
      </div>
    );
  };

  // Confirm below-card with timeline + privacy + quote
  const ConfirmBelowContent = ({ isReturn }: { isReturn: boolean }) => {
    const title = isReturn ? pick(confirmPayTitles, 10) : pick(confirmTitles, 5);
    const sub = isReturn ? "Your provider is ready for you." : pick(confirmSubs, 5);
    return (
      <div style={{ animation: "fadeInBelow 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both" }}>
        <div className="px-1 mt-4 mb-2" style={{ textAlign: "center" }}>
          <h2 className="text-white font-black leading-[1.05] tracking-tight whitespace-pre-line" style={{ fontSize: "clamp(40px, 11vw, 52px)", textAlign: "center" }}>
            {title.split("\n").map((line, i) => {
              const words = line.split(" ");
              if (i === title.split("\n").length - 1 && words.length > 0) {
                const last = words.pop();
                return <span key={i}>{words.join(" ")} <span className="text-[#2d7a5f]">{last}</span>{"\n"}</span>;
              }
              return <span key={i}>{line}{"\n"}</span>;
            })}
          </h2>
          <p className="text-[11px] text-[#6b7280] mt-1 leading-relaxed" style={{ textAlign: "center" }}>{sub}</p>
        </div>
        {/* Timeline */}
        <div className="mt-3 space-y-0">
          {[{ icon: "📝", t: activeTimeline.s1, d: activeTimeline.d1, time: "~2 min" },
            { icon: "👩‍⚕️", t: activeTimeline.s2, d: activeTimeline.d2, time: "~18 min" },
            { icon: "💊", t: activeTimeline.s3, d: activeTimeline.d3, time: "Same day" }].map((item, i) => (
            <div key={i}>
              {i > 0 && <div className="w-px h-1.5 bg-[#2d7a5f]/15" style={{ margin: "0 auto" }}></div>}
              <div className="flex flex-col items-center py-2" style={{ textAlign: "center" }}>
                <div className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center text-[14px] border border-[#2d7a5f]/15" style={{ background: "rgba(45,122,95,0.06)" }}>{item.icon}</div>
                <div className="mt-1" style={{ textAlign: "center" }}>
                  <div className="text-[11px] font-bold text-white">{item.t}</div>
                  <div className="text-[11px] text-[#6b7280] mt-0.5">{item.d}</div>
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#2d7a5f] font-bold px-1.5 py-0.5 rounded border border-[#2d7a5f]/12" style={{ background: "rgba(45,122,95,0.08)" }}>⏱ {item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Discretion callout */}
        <div className="mt-3 rounded-xl px-3 py-2.5 flex flex-col items-center gap-1.5 border border-dashed border-[#2d7a5f]/20" style={{ background: "rgba(45,122,95,0.02)", textAlign: "center" }}>
          <span className="text-[18px]">🙈</span>
          <p className="text-[11px] text-[#9ca3af] leading-relaxed" style={{ textAlign: "center" }}><strong className="text-[#d1d5db]">{activePrivacy}</strong></p>
        </div>
        {/* Provider quote */}
        <div className="mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-gray-100" style={{ background: "#f9fafb" }}>
          <img src="/assets/provider-lamonica.png" alt="" className="w-[34px] h-[34px] rounded-full border-2 border-[#2d7a5f] object-cover object-top flex-shrink-0" style={{ boxShadow: "0 0 8px rgba(45,122,95,0.2)" }} />
          <div>
            <p className="text-[10px] text-[#9ca3af] italic leading-relaxed">{activeQuote}</p>
            <p className="text-[8px] text-[#2d7a5f] font-bold mt-0.5">— LaMonica A. Hodges, APRN</p>
          </div>
        </div>
        {/* Rating */}
        <div className="mt-2 text-center text-[10px] text-[#4b5563]">⭐⭐⭐⭐⭐ <strong className="text-[#f59e0b]">4.9</strong> · 10,000+ patients</div>
        <div className="mt-1 text-center text-[9px] text-[#374151]">Your case stays between you and your provider. <strong className="text-[#2d7a5f]">No one else.</strong></div>
      </div>
    );
  };
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [calWeekOffset, setCalWeekOffset] = useState(0);
  const [calSelectedDay, setCalSelectedDay] = useState("");
  const [calSelectedTime, setCalSelectedTime] = useState("");
  const [calApiSlots, setCalApiSlots] = useState<string[]>([]);   // HH:MM from API
  const [calApiLoading, setCalApiLoading] = useState(false);
  const [calNextDaySlots, setCalNextDaySlots] = useState<string[]>([]);
  const [calNextDayObj, setCalNextDayObj] = useState<Date|null>(null);
  const [calNextDayLoading, setCalNextDayLoading] = useState(false);

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
  // ── New patient fields — live here, outside Elements, passed into Step2PaymentForm ──
  const [npFirstName, setNpFirstName] = useState("");
  const [npLastName,  setNpLastName]  = useState("");
  const [npEmail,     setNpEmail]     = useState("");
  const [npPhone,     setNpPhone]     = useState("");
  const [npAddress,   setNpAddress]   = useState("");
  const [npDobMonth,  setNpDobMonth]  = useState("");
  const [npDobDay,    setNpDobDay]    = useState("");
  const [npDobYear,   setNpDobYear]   = useState("");
  const npDobComplete = npDobMonth.length === 2 && npDobDay.length === 2 && npDobYear.length === 4;
  const npFieldsComplete = npFirstName.trim().length > 0 && npLastName.trim().length > 0 &&
    npEmail.includes("@") && npPhone.replace(/\D/g,"").length >= 10 && npAddress.trim().length > 0 && npDobComplete;
  const [npFormPulse, setNpFormPulse] = useState(false);
  // Per-field error state — shown after autofill scan or payment attempt
  const [npErrors, setNpErrors] = useState<Record<string,string>>({});
  // Refs for each np field — used for autofocus on first error
  const npFirstNameRef = useRef<HTMLInputElement>(null);
  const npLastNameRef  = useRef<HTMLInputElement>(null);
  const npEmailRef     = useRef<HTMLInputElement>(null);
  const npPhoneRef     = useRef<HTMLInputElement>(null);
  const npAddressRef   = useRef<HTMLInputElement>(null);
  const npDobRef       = useRef<HTMLInputElement>(null);


  // Validate np fields — returns true if all valid, false + sets errors if not
  // Safe to call at any time — only marks fields that are actually empty/invalid
  const validateNpFields = (): boolean => {
    // Read directly from DOM refs — uncontrolled inputs
    const fn = npFirstNameRef.current?.value?.trim() || "";
    const ln = npLastNameRef.current?.value?.trim()  || "";
    const em = npEmailRef.current?.value?.trim()     || "";
    const ph = npPhoneRef.current?.value?.replace(/\D/g,"") || "";
    const ad = npAddressRef.current?.value?.trim()   || "";
    // Sync ref values to state so payment form receives them
    if (fn) setNpFirstName(fn);
    if (ln) setNpLastName(ln);
    if (em) setNpEmail(em);
    if (ph) setNpPhone(ph);
    if (ad) setNpAddress(ad);
    const errs: Record<string,string> = {};
    if (!fn)                errs.firstName = "First name required";
    if (!ln)                errs.lastName  = "Last name required";
    if (!em.includes("@")) errs.email     = "Valid email required";
    if (ph.length < 10)    errs.phone     = "10-digit phone required";
    if (!ad)               errs.address   = "Street address required";
    // Check DOB from ref directly (uncontrolled) — fallback to state
    const dobRaw = npDobRef.current?.value?.replace(/\D/g,"") || "";
    const dobComplete = dobRaw.length >= 8 || npDobComplete;
    if (!dobComplete) errs.dob = "Date of birth required";
    setNpErrors(errs);
    // Auto-focus first error field
    if (errs.firstName)  { npFirstNameRef.current?.focus(); }
    else if (errs.lastName)  { npLastNameRef.current?.focus(); }
    else if (errs.email)     { npEmailRef.current?.focus(); }
    else if (errs.phone)     { npPhoneRef.current?.focus(); }
    else if (errs.address)   { npAddressRef.current?.focus(); }
    else if (errs.dob)       { npDobRef.current?.focus(); }
    return Object.keys(errs).length === 0;
  };

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
  const visitFeePrice = useMemo(() => {
    // Use appointment date+time to determine $189 vs $249 (after-hours/weekend)
    if (appointmentDate && appointmentTime) {
      try {
        const [y,mo,d] = appointmentDate.split("-").map(Number);
        const [h,m] = appointmentTime.split(":").map(Number);
        const apptDate = new Date(y, mo-1, d, h, m, 0);
        return getPrice(visitType as VisitType, Intl.DateTimeFormat().resolvedOptions().timeZone, apptDate);
      } catch {}
    }
    return getPrice(visitType as VisitType);
  }, [visitType, appointmentDate, appointmentTime]);
  const [visitIntentId, setVisitIntentId] = useState("");
  const [bookingIntentId, setBookingIntentId] = useState("");
  const needsCalendar = VISIT_TYPES.find(v => v.key === visitType)?.needsCalendar ?? false;
  const isAsync = visitType === "async";
  const isReturningPatient = !!patient?.id || (!!patient?.source && patient.source !== "new");

  // ── Arizona time helpers for instant visit after-hours cutoff ──
  const getArizonaHour = (): number => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "numeric", hour12: false }).formatToParts(new Date());
      return parseInt(parts.find(p => p.type === "hour")?.value || "12");
    } catch { return new Date().getHours(); }
  };
  const getArizonaTomorrowISO = (): string => {
    const now = new Date();
    const azFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" });
    const parts = azFormatter.formatToParts(now);
    const y = parseInt(parts.find(p => p.type === "year")?.value || "0");
    const m = parseInt(parts.find(p => p.type === "month")?.value || "0");
    const d = parseInt(parts.find(p => p.type === "day")?.value || "0");
    const tomorrow = new Date(y, m - 1, d + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
  };
  // After 8:30PM Arizona time, instant visits are locked to 9AM next morning
  const instantIsAfterCutoff = visitType === "instant" && getArizonaHour() >= 21;
  // (20:30 = 8:30PM; getArizonaHour returns 20 for 8:00-8:59PM, we use >=21 for after 9PM cutoff,
  //  but business logic is 8:30PM so we check minutes too)
  const getInstantAZInfo = (): { isAfterCutoff: boolean; nextMorningDate: string; nextMorningTime: string } => {
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "numeric", hour12: false });
      const parts = fmt.formatToParts(now);
      const azHour = parseInt(parts.find(p => p.type === "hour")?.value || "12");
      const azMin = parseInt(parts.find(p => p.type === "minute")?.value || "0");
      const isAfterCutoff = azHour > 20 || (azHour === 20 && azMin >= 30); // after 8:30PM AZ
      return { isAfterCutoff, nextMorningDate: getArizonaTomorrowISO(), nextMorningTime: "09:00" };
    } catch { return { isAfterCutoff: false, nextMorningDate: getArizonaTomorrowISO(), nextMorningTime: "09:00" }; }
  };
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
        if (data.bookingIntentId) setBookingIntentId(data.bookingIntentId);
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

  // ── Autofill scan: runs 600ms after form step becomes visible ──
  // Gives browser time to autofill, then marks any still-empty fields.
  // Only marks fields empty — never overwrites a value the user has typed.
  const formStepVisible = !isReturningPatient && visitTypeConfirmed;
  useEffect(() => {
    if (!formStepVisible) return;
    const timer = setTimeout(() => {
      // Read from DOM refs — uncontrolled inputs may have been autofilled
      const fn = npFirstNameRef.current?.value?.trim() || "";
      const ln = npLastNameRef.current?.value?.trim()  || "";
      const em = npEmailRef.current?.value?.trim()     || "";
      const ph = (npPhoneRef.current?.value || "").replace(/\D/g,"");
      const ad = npAddressRef.current?.value?.trim()   || "";
      // Sync to state so payment form has values
      if (fn) setNpFirstName(fn);
      if (ln) setNpLastName(ln);
      if (em) setNpEmail(em);
      if (ph) setNpPhone(ph);
      if (ad) setNpAddress(ad);
      const errs: Record<string,string> = {};
      if (!fn)               errs.firstName = "First name required";
      if (!ln)               errs.lastName  = "Last name required";
      if (!em.includes("@")) errs.email     = "Valid email required";
      if (ph.length < 10)    errs.phone     = "10-digit phone required";
      if (!ad)               errs.address   = "Street address required";
      // Check DOB from ref directly (uncontrolled) — fallback to state
    const dobRaw = npDobRef.current?.value?.replace(/\D/g,"") || "";
    const dobComplete = dobRaw.length >= 8 || npDobComplete;
    if (!dobComplete) errs.dob = "Date of birth required";
      setNpErrors(errs);
      // Auto-focus first empty field
      if      (errs.firstName) npFirstNameRef.current?.focus();
      else if (errs.lastName)  npLastNameRef.current?.focus();
      else if (errs.email)     npEmailRef.current?.focus();
      else if (errs.phone)     npPhoneRef.current?.focus();
      else if (errs.address)   npAddressRef.current?.focus();
      else if (errs.dob)       npDobRef.current?.focus();
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formStepVisible]);

  // ── Next business day for calendar ──
  useEffect(() => {
    if (!calSelectedDay || calApiLoading || calApiSlots.length === 0) {
      setCalNextDaySlots([]); setCalNextDayObj(null); return;
    }
    // Determine if all slots on selected day have a badge
    const selDate = new Date(calSelectedDay + "T12:00:00");
    const isWeekend = selDate.getDay() === 0 || selDate.getDay() === 6;
    const slots12 = calApiSlots.map(t24 => {
      const [h,m] = t24.split(":").map(Number);
      const p = h>=12?"PM":"AM"; const h12 = h===0?12:h>12?h-12:h;
      return `${h12}:${String(m).padStart(2,"0")} ${p}`;
    });
    const allBadged = slots12.length > 0 && slots12.every(slot => {
      const h = parseInt(t24FromSlot(slot).split(":")[0]);
      return selDate.getDay()===0 || selDate.getDay()===6 || (h>=17 && slot!=="5:00 PM");
    });
    if (!isWeekend && !allBadged) { setCalNextDaySlots([]); setCalNextDayObj(null); return; }
    // Find next business day
    const next = new Date(selDate);
    do { next.setDate(next.getDate()+1); } while(next.getDay()===0||next.getDay()===6);
    setCalNextDayObj(new Date(next)); setCalNextDaySlots([]); setCalNextDayLoading(true);
    const iso = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,"0")}-${String(next.getDate()).padStart(2,"0")}`;
    fetch(`/api/get-doctor-availability?date=${iso}`)
      .then(r=>r.json()).then(data=>{
        if(data.availableSlots){
          const s12 = data.availableSlots.slice(0,6).map((t24:string)=>{
            const[h,m]=t24.split(":").map(Number);
            const p=h>=12?"PM":"AM"; const h12=h===0?12:h>12?h-12:h;
            return`${h12}:${String(m).padStart(2,"0")} ${p}`;
          });
          setCalNextDaySlots(s12);
        }
      }).catch(()=>{}).finally(()=>setCalNextDayLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calApiSlots, calApiLoading, calSelectedDay]);

  function t24FromSlot(slot: string): string {
    const [time, period] = slot.split(" "); let [h,m] = time.split(":").map(Number);
    if(period==="PM"&&h!==12) h+=12; if(period==="AM"&&h===12) h=0;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }

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
        colorPrimary: "#2d7a5f",
        colorBackground: "#ffffff",
        colorText: "#1a1a1a",
        colorTextSecondary: "#555555",
        colorTextPlaceholder: "rgba(100,116,107,0.6)",
        borderRadius: "8px",
        spacingUnit: "2px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSizeBase: "12px",
        fontSizeSm: "10px",
      },
      rules: {
        ".Tab": { border: "2px solid rgba(45,122,95,0.35)", backgroundColor: "#ffffff", padding: "6px 0" },
        ".Tab--selected": { border: "2px solid #2d7a5f", backgroundColor: "rgba(45,122,95,0.08)", color: "#ffffff" },
        ".Tab:hover": { border: "1px solid rgba(45,122,95,0.5)" },
        ".TabIcon--selected": { fill: "#2d7a5f" },
        ".Label": { color: "#1a1a1a", fontSize: "10px", fontWeight: "600", marginBottom: "2px" },
        ".Input": { backgroundColor: "#ffffff", border: "1px solid #c8d8cb", color: "#1a1a1a", padding: "6px 8px", fontSize: "12px" },
        ".Input:focus": { border: "3px solid #2d7a5f", boxShadow: "0 0 0 2px rgba(45,122,95,0.25)" },
        ".Input::placeholder": { color: "rgba(100,116,107,0.8)", fontWeight: "600" },
        ".Block": { padding: "4px 0" },
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
    // Returning patients skip intake — route directly to confirmation
    if (isReturningPatient) {
      const stored = sessionStorage.getItem("appointmentData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          if (data.accessToken) { clearAnswers(); router.push(`/appointment/${data.accessToken}`); return; }
        } catch {}
      }
      clearAnswers();
      router.push("/success");
      return;
    }
    // New patients: show post-payment intake form
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
    // New patient: payment form step
    if (!isReturningPatient && !phoneConfirmed) return 4.75;
    // Returning patient: skip straight to pay (summary+wallets at 4.5)
    return 6;
  }, [reason, symptomsDone, pharmacy, visitTypeChosen, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, phoneConfirmed, isReturningPatient]);

  const totalSteps = 4.5;

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
          if (data.bookingIntentId) setBookingIntentId(data.bookingIntentId);
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
    // Use local date string (YYYY-MM-DD) — NOT toISOString() which is UTC and can be tomorrow
    const toLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const getAvailableDates = () => {
      const dates: { label: string; value: string; dayLabel: string; monthDay: string }[] = [];
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const value = toLocalDateStr(d); // local date, not UTC
        const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        dates.push({ label: `${monthNames[d.getMonth()]} ${d.getDate()}`, value, dayLabel: i === 0 ? "Today" : i === 1 ? "Tmrw" : dayNames[d.getDay()], monthDay: `${d.getDate()}` });
      }
      return dates;
    };
    const getTimeSlots = () => {
      const slots: { label: string; value: string }[] = [];
      const now = new Date();
      const todayStr = toLocalDateStr(now); // local date, not UTC
      const isToday = controlledScheduleDate === todayStr;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      for (let h = 9; h <= 21; h++) {
        for (const m of [0, 30]) {
          // Skip if this slot has already passed (compare slot time vs current time in minutes)
          if (isToday) {
            const slotMinutes = h * 60 + m;
            const nowMinutes = currentHour * 60 + currentMinute;
            if (slotMinutes <= nowMinutes) continue;
          }
          const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const ampm = h >= 12 ? "PM" : "AM";
          slots.push({ label: `${hr}:${String(m).padStart(2,"0")} ${ampm}`, value: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}` });
        }
      }
      return slots;
    };
    const controlledMeds = selectedMeds.filter(m => isControlledSubstance(m));

    return (
      <div className="text-[#1a1a1a] font-sans overflow-hidden" style={{ background: "#ffffff", height: "100dvh", minHeight: "0" }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } } @keyframes successPulse { 0%,100% { box-shadow: 0 0 12px rgba(34,197,94,0.2); } 50% { box-shadow: 0 0 24px rgba(34,197,94,0.4); } }`}</style>
        <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 12px)", paddingBottom: "env(safe-area-inset-bottom, 20px)", paddingLeft: "16px", paddingRight: "16px" }}>
          <div className="text-center pt-1 pb-1">
            <span className="text-white font-black text-[15px] tracking-tight">MEDAZON </span>
            <span className="text-[#2d7a5f] font-black text-[15px] tracking-tight">EXPRESS </span>
            <span className="text-white font-black text-[15px] tracking-tight">BOOKING</span>
            <span className="text-[9px] text-green-400 font-bold ml-2">✓ PAID</span>
          </div>
          <div className="rounded-xl p-3 mb-2 border border-green-500/25" style={{ background: "rgba(45,122,95,0.06)", animation: "successPulse 3s ease-in-out infinite" }}>
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
              <button onClick={() => setControlledVisitType("video")} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-[12px] transition-all ${controlledVisitType === "video" ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-gray-200 bg-[#11161c] text-gray-500"}`}><Video size={14} />Video Call</button>
              <button onClick={() => setControlledVisitType("phone")} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-[12px] transition-all ${controlledVisitType === "phone" ? "border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7]" : "border-gray-200 bg-[#11161c] text-gray-500"}`}><Phone size={14} />Phone Call</button>
            </div>
            <div>
              <span className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider pl-1">Select a date</span>
              <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {getAvailableDates().map(d => (<button key={d.value} onClick={() => { setControlledScheduleDate(d.value); setControlledScheduleTime(""); }} className={`flex-shrink-0 flex flex-col items-center w-[52px] py-2 rounded-xl border-2 transition-all ${controlledScheduleDate === d.value ? "border-[#2d7a5f] bg-[#2d7a5f]/10 text-white" : "border-gray-200 bg-[#11161c]/80 text-gray-500 hover:border-white/20"}`}><span className="text-[8px] font-bold uppercase">{d.dayLabel}</span><span className="text-[16px] font-black">{d.monthDay}</span><span className="text-[8px]">{d.label.split(" ")[0]}</span></button>))}
              </div>
            </div>
            {controlledScheduleDate && (<div><span className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider pl-1">Select a time</span><div className="grid grid-cols-4 gap-1.5 mt-1 max-h-[140px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>{getTimeSlots().map(t => (<button key={t.value} onClick={() => setControlledScheduleTime(t.value)} className={`py-2 rounded-lg border text-[11px] font-semibold transition-all ${controlledScheduleTime === t.value ? "bg-[#2d7a5f]/15 border-[#2d7a5f]/40 text-[#2d7a5f]" : "bg-[#11161c]/80 border-gray-200 text-gray-500 hover:border-white/15"}`}>{t.label}</button>))}</div></div>)}
            {controlledScheduleDate && controlledScheduleTime && (<div className="bg-[#2d7a5f]/5 border border-[#2d7a5f]/20 rounded-xl px-3 py-2 text-center"><p className="text-[11px] text-gray-300"><span className="text-[#2d7a5f] font-bold">{controlledVisitType === "video" ? "📹 Video" : "📞 Phone"} Visit</span>{" · "}<span className="text-white font-semibold">{new Date(controlledScheduleDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {(() => { const [h, m] = controlledScheduleTime.split(":").map(Number); const hr = h > 12 ? h - 12 : h === 0 ? 12 : h; return `${hr}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; })()}</span></p></div>)}
          </div>
          {scheduleError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-[10px] mb-1">{scheduleError}</div>}
          <div className="flex-shrink-0 pb-2 pt-1">
            <button onClick={() => {
              if (!controlledScheduleDate || !controlledScheduleTime) return;
              handleControlledSchedule();
            }} className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] border border-[#2d7a5f]" style={{ background: "#2d6b4f", color: "#fff", boxShadow: "0 4px 16px rgba(45,107,79,0.25)", opacity: schedulingAppointment ? 0.6 : 1 }}>
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
      <div className="ec-root fixed inset-0 overflow-hidden" style={{ background: "#f2efef", height: "100dvh" }}>
        <style>{`
          @supports not (height: 100dvh) { .ec-root { height: 100svh !important; } }
          @keyframes fadeInStep { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
          @keyframes onAutofill { from {} to {} }
          input:-webkit-autofill { animation-name: onAutofill; animation-duration: 1ms; }
        `}</style>
        <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 12px)", paddingBottom: "env(safe-area-inset-bottom, 20px)", paddingLeft: "16px", paddingRight: "16px", background: "#ffffff" }}>

          {/* Header — compact */}
          <div className="flex-shrink-0 text-center pt-1 pb-0.5">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-5 h-5 bg-[#2d7a5f]/20 rounded-md flex items-center justify-center"><Shield size={11} className="text-[#2d7a5f]" /></div>
              <span className="text-white font-bold text-[13px] tracking-tight">Medazon <span className="text-[#2d7a5f]">Health</span></span>
            </div>
            <p className="text-[#2d7a5f] text-[8px] font-bold uppercase tracking-[0.2em]">Private · Discreet</p>
            <h1 className="text-white font-black text-[18px] leading-tight mt-0.5">{allIntakeDone ? "Ready to submit." : "Secure intake unlocked."}</h1>
          </div>

          {/* Progress bar */}
          <div className="flex-shrink-0 pb-1">
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#2d6b4f] rounded-full transition-all duration-500" style={{ width: `${intakePct}%` }} />
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
            <div style={{ animation: "fadeInStep 0.5s cubic-bezier(0.22, 1, 0.36, 1) both", display: "flex", flexDirection: "column", gap: "5px", paddingTop: "2px", paddingBottom: "8px" }}>

              {/* Auto-filled demographics */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-white/35 text-[8px] font-extrabold uppercase tracking-widest">Your Information</span>
                <span className="text-[#2d6b4f] text-[7px] font-black uppercase tracking-wide bg-[#2d6b4f]/10 border border-[#2d6b4f]/25 rounded px-1 py-px">PRIORITY</span>
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
                        <span className="text-[#2d6b4f] text-[8px] font-bold bg-[#2d6b4f]/10 rounded px-1.5 py-0.5">Pending</span>
                      </div>
                    </div>
                  );
                }

                if (isDone) {
                  const ansText = a.val ? `Yes: ${a.detail || "—"}` : "No";
                  return (
                    <div key={q.id} className="border border-[#2d7a5f]/15 rounded-lg cursor-pointer" onClick={() => { const next = { ...intakeAnswers }; delete next[q.id]; setIntakeAnswers(next); setIntakeStep(i); }}>
                      <div className="flex items-center justify-between px-2.5 py-1.5">
                        <span className="text-white text-[11px] font-extrabold">{q.q}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#2d7a5f] text-[9px] font-semibold max-w-[120px] truncate">{ansText}</span>
                          <span className="text-[#2d7a5f] text-[8px] font-bold bg-[#2d7a5f]/10 rounded px-1 py-0.5">✓</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isActive) {
                  const showDetail = intakeDetailId === q.id;
                  return (
                    <div key={q.id} className="border border-[#2d6b4f]/30 rounded-lg shadow-[0_0_8px_rgba(45,107,79,0.1)]">
                      <div className="flex items-center justify-between px-2.5 py-1.5">
                        <span className="text-white text-[11px] font-extrabold">{q.q}</span>
                        <span className="text-[#2d6b4f] text-[8px] font-bold bg-[#2d6b4f]/10 rounded px-1.5 py-0.5">Answer</span>
                      </div>
                      <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => { setIntakeDetailId(q.id); setIntakeDetailText(""); }} className={`flex-1 py-2 rounded-lg border-2 font-extrabold text-[12px] transition-all active:scale-95 ${showDetail ? "border-[#2d7a5f] bg-[#2d7a5f] text-black" : "border-white/8 bg-transparent text-white"}`}>Yes</button>
                          <button onClick={() => {
                            setIntakeDetailId(null); setIntakeDetailText("");
                            setIntakeAnswers(prev => ({ ...prev, [q.id]: { val: false, detail: "" } }));
                            setIntakeStep(Math.max(intakeStep, i + 1));
                          }} className="flex-1 py-2 rounded-lg border-2 border-white/8 bg-transparent text-white font-extrabold text-[12px] transition-all active:scale-95">No</button>
                        </div>
                        {showDetail && (
                          <div className="flex flex-col gap-1.5">
                            <input value={intakeDetailText} onChange={(e) => setIntakeDetailText(e.target.value)} placeholder={q.ph} autoFocus className="w-full bg-transparent border border-gray-200 rounded-lg px-2.5 py-2 text-[11px] text-white caret-white focus:outline-none focus:border-[#2d7a5f] placeholder:text-white/50" onFocus={(e) => { setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }} />
                            <button onClick={() => {
                              if (!intakeDetailText.trim()) { const inp = document.querySelector<HTMLInputElement>(`input[placeholder="${q.ph}"]`); if (inp) { inp.classList.add("animate-pulse"); inp.style.boxShadow = "0 0 12px rgba(45,107,79,0.4)"; setTimeout(() => { inp.classList.remove("animate-pulse"); inp.style.boxShadow = "none"; }, 1500); inp.focus(); } return; }
                              setIntakeAnswers(prev => ({ ...prev, [q.id]: { val: true, detail: intakeDetailText.trim() } }));
                              setIntakeStep(Math.max(intakeStep, i + 1));
                              setIntakeDetailId(null); setIntakeDetailText("");
                            }} className="w-full py-1.5 rounded-md text-white font-bold text-[11px] transition-all active:scale-97" style={{ background: "#2d6b4f" }}>Next →</button>
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
                  <p className="text-[#2d7a5f] text-[10px] font-extrabold text-center">✓ All Questions Answered</p>
                  <button onClick={handleIntakeSubmit} className="w-full py-3 rounded-xl border-2 border-[#2d7a5f]/30 text-white font-extrabold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: "#2d6b4f", boxShadow: "0 4px 16px rgba(45,107,79,0.25)", opacity: intakeSubmitting ? 0.6 : 1 }}>
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
  const activeOrangeBorder = "border-[3px] border-[#2d6b4f] shadow-[0_0_20px_rgba(45,107,79,0.4)]";

  const CompletedPill = ({ text, onReset, subText }: { text: string; onReset: () => void; subText?: string }) => (
    <button onClick={onReset} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-gray-100 hover:bg-white/[0.05] transition-all" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <span className="text-gray-500 text-[10px] font-semibold truncate flex-1 text-left">{text}</span>
      <span className="text-[#2d7a5f]/60 text-[9px] font-semibold flex-shrink-0">change</span>
    </button>
  );

  const PharmacyCompletedView = () => (
    <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); setPharmacyInfo(null); saveAnswers({ pharmacy: "", pharmacyAddress: "", pharmacyInfo: null }); }}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-gray-100 hover:bg-white/[0.05] transition-all" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
      <Pill size={12} className="text-gray-600 flex-shrink-0" />
      <span className="text-gray-500 text-[10px] font-semibold truncate flex-1 text-left">{pharmacy}</span>
      <span className="text-[#2d7a5f]/60 text-[9px] font-semibold flex-shrink-0">change</span>
    </button>
  );

  return (
    <div className="ec-root text-[#1a1a1a] font-sans" style={{ background: "#f2efef", height: "100dvh", minHeight: "100vh", overflow: "hidden" }}>
      <style>{`
        @supports (height: 100dvh) { .ec-root { height: 100dvh !important; } }
        @supports not (height: 100dvh) { .ec-root { height: 100svh !important; } }
        @keyframes guidePulse { 0%,100% { box-shadow: 0 0 8px rgba(45,107,79,0.3); } 50% { box-shadow: 0 0 18px rgba(45,107,79,0.4); } }
        @keyframes slideUp { from { opacity:0; transform: translateY(100%); } to { opacity:1; transform: translateY(0); } }
        @keyframes ackPulse { 0%,100% { box-shadow: 0 0 0px rgba(45,107,79,0); } 50% { box-shadow: 0 0 16px rgba(45,107,79,0.4); } }
        @keyframes fadeInBtn { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInStep { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInPill { from { opacity:0; transform:translateY(12px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes fadeInBelow { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pillIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpCalendar { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slotFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes charPulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.25); opacity: 1; } }
      `}</style>
      <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)", paddingLeft: "16px", paddingRight: "16px" }}>

        {/* ═══ LOCKED HEADER — never scrolls, never shrinks ═══ */}
        <div className="flex-shrink-0 z-10 pb-1.5" style={{ background: "linear-gradient(180deg, #ffffff 0%, rgba(11,15,12,0.97) 100%)", paddingTop: "max(env(safe-area-inset-top, 12px), 12px)", padding: "max(env(safe-area-inset-top, 10px), 10px) 16px 10px" }}>
          {headerIsStep5 ? (
            /* ── PAYMENT STEP HEADER — appointment context ── */
            <div>
              {/* Row 1: Confirm & Book Your [Visit Type] */}
              <p className="text-white font-black text-center leading-tight" style={{ fontSize: "clamp(14px, 3.8vw, 17px)", marginBottom: 3 }}>
                Confirm &amp; Book Your {({async:"Async Visit",sms:"SMS Visit",refill:"Rx Refill",video:"Video Visit",phone:"Phone Visit",instant:"Instant Visit"} as Record<string,string>)[visitType] || "Visit"}
              </p>
              {/* Row 2: Day, Month Date @ Time — only if date/time exist */}
              {appointmentDate && appointmentTime && (() => {
                const [year,month,day] = appointmentDate.split("-").map(Number);
                const [hours,minutes] = appointmentTime.split(":").map(Number);
                const date = new Date(year, month-1, day);
                const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const h = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
                const ampm = hours >= 12 ? "pm" : "am";
                return (
                  <p className="text-center font-semibold" style={{ fontSize: 12, color: "#2d7a5f", marginBottom: 3 }}>
                    {dayNames[date.getDay()]}, {monthNames[month-1]} {day} @ {h}:{String(minutes).padStart(2,"0")}{ampm}
                  </p>
                );
              })()}
              {/* Row 3: Your Provider */}
              <p className="text-center" style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 0 }}>
                Your Provider · LaMonica A. Hodges, MSN, APRN, FNP-C
              </p>
            </div>
          ) : (
            /* ── REGULAR STEPS HEADER — logo + title + progress ── */
            <div>
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <div className="w-6 h-6 bg-[#2d7a5f]/20 rounded-md flex items-center justify-center">
                  <Shield size={13} className="text-[#2d7a5f]" />
                </div>
                <span className="text-white font-bold text-[15px] tracking-tight">Medazon <span className="text-[#2d7a5f]">Health</span></span>
              </div>
              <p className="text-[#2d7a5f] text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5 text-center">Private · Discreet</p>
              <h1 key={pillText} className="text-white font-black leading-tight text-center mb-1" style={{ fontSize: "clamp(20px, 5.5vw, 26px)" }}>
                {pillText}
              </h1>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#2d6b4f] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ═══ SCROLLABLE GUIDED FORM ═══ */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-1 space-y-2 min-h-0 overscroll-contain" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>

          {/* STEP 1: Reason for Visit — hidden when answered */}
          {!reason ? (
            <div style={{ position: "relative", zIndex: 1, marginTop: "12px" }}>
              <div className={`rounded-xl bg-transparent p-4 transition-all ${activeOrangeBorder}`} style={{ position: "relative" }}>
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2d7a5f]">REASON FOR VISIT</p>
                  <p className="text-[#6b7280] text-[12px] mt-0.5">Describe Your Symptoms</p>
                </div>
                <button
                  type="button"
                  onTouchEnd={(e) => { e.preventDefault(); setReasonDialogOpen(true); }}
                  onClick={() => setReasonDialogOpen(true)}
                  style={{
                    position: "relative",
                    zIndex: 10,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    cursor: "pointer",
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "2px solid rgba(45,122,95,0.4)",
                    background: "#0d1218",
                    textAlign: "left",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                  }}
                >
                  <span style={{ color: "#d1d5db", fontSize: "15px" }}>{reason || "Select a reason..."}</span>
                  <ChevronDown size={14} color="#6b7280" />
                </button>
              </div>
              <BelowCardContent step={1} />
            </div>
          ) : null}

          {/* STEP 2: Describe Symptoms — hidden when answered */}
          {reason && !symptomsDone ? (
            <div style={{ animation: "fadeInStep 1.2s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-3 space-y-2 transition-all mt-3 ${activeOrangeBorder} flex flex-col min-h-0`}>
                <textarea id="symptoms-textarea" value={chiefComplaint} onChange={(e) => { setChiefComplaint(e.target.value); saveAnswers({ chiefComplaint: e.target.value }); }} onFocus={(e) => { setTimeout(() => { e.target.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); }} placeholder="e.g., Burning during urination for 3 days..." rows={3} autoFocus className={`w-full bg-[#0d1218] border-2 rounded-xl px-4 py-3 text-[15px] text-white focus:outline-none resize-none placeholder:text-white/50 caret-white transition-all ${pulseSection === "symptoms" ? "ring-2 ring-[#2d6b4f] animate-pulse border-[#2d6b4f]" : chiefComplaint.length >= 10 ? "border-[#2d7a5f]/30" : "border-[#2d6b4f] focus:border-[#2d6b4f]"}`} />
                {chiefComplaint.length < 10 ? (
                  <p className="text-gray-300 text-[12px]">Type at least <span className="text-[#2d6b4f] font-black text-[16px] inline-block" style={{ animation: "charPulse 1.2s ease-in-out infinite" }}>{10 - chiefComplaint.length}</span> more characters</p>
                ) : (
                  <p className="text-[#2d7a5f] text-[12px] font-semibold">✓ Ready to continue</p>
                )}
                <div className="flex gap-2">
                  <button onClick={goBack} className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-[#2d7a5f]/30" style={{ background: "rgba(45,122,95,0.12)" }}><span style={{ fontSize: "14px", lineHeight: 1 }}>←</span> Back</button>
                  <button onClick={() => { if (chiefComplaint.length < 10) { triggerPulse("symptoms"); document.getElementById("symptoms-textarea")?.focus(); return; } setSymptomsDone(true); saveAnswers({ chiefComplaint, symptomsDone: true }); }} className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] transition-all active:scale-95 flex items-center justify-center gap-1 border-2 border-[#2d6b4f]" style={{ background: "#2d6b4f", boxShadow: "0 4px 16px rgba(45,107,79,0.25)" }}>Continue →</button>
                </div>
              </div>
              <BelowCardContent step={2} />
            </div>
          ) : null}

          {/* STEP 3: Preferred Pharmacy — inline, no modal */}
          {reason && symptomsDone && !pharmacy ? (
            <div style={{ animation: "fadeInStep 1.2s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className={`rounded-xl bg-transparent p-4 space-y-2 transition-all mt-3 relative z-10 ${activeOrangeBorder}`}>
                <PharmacySelector
                  value={pharmacy}
                  onChange={(val: string, info?: any) => {
                    setPharmacy(val);
                    if (info) {
                      const pInfo: PharmacyInfo = { name: info.name || val, address: info.address || info.formatted_address || "", photo: info.photo || info.photoUrl || "", rating: info.rating || undefined, reviewCount: info.reviewCount || info.user_ratings_total || undefined, isOpen: info.isOpen ?? info.opening_hours?.open_now ?? undefined, phone: info.phone || undefined };
                      setPharmacyInfo(pInfo); setPharmacyAddress(info.address || info.formatted_address || "");
                      saveAnswers({ pharmacy: val, pharmacyInfo: pInfo, pharmacyAddress: pInfo.address });
                    } else { saveAnswers({ pharmacy: val }); }
                  }}
                  placeholder="Search pharmacy..."
                  className="w-full bg-[#0d1218] border border-gray-200 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2d6b4f] placeholder:text-white/50"
                />
              </div>
              <BelowCardContent step={3} />
            </div>
          ) : null}

          {/* STEP 4: Select Visit Type */}
          <div ref={visitTypeRef}>
          {reason && symptomsDone && pharmacy && !visitTypeChosen && !visitTypePopup ? (
              <div style={{ animation: "fadeInStep 1.2s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                <div className="rounded-xl p-4 space-y-3 transition-all mt-3" style={{ background: "#f7f4f4", border: "1px solid #d8d3d1", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <span className="text-gray-400 text-[9px] font-semibold uppercase tracking-wider">Select Visit Type</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {VISIT_TYPES.map((vt) => {
                      const Icon = vt.icon;
                      const isActive = visitTypePopup === vt.key;
                      const hasPopupOpen = !!visitTypePopup;
                      return (<button key={vt.key} onClick={() => {
                        setVisitTypePopup(vt.key);
                      }} className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all ${isActive ? `border-[3px] border-[#2d7a5f]/30 shadow-[0_0_12px_rgba(45,122,95,0.15)]` : hasPopupOpen ? "border-2 border-gray-200" : "border-2 border-gray-200 hover:border-white/20"}`} style={{ minHeight: "72px" }}>
                        {vt.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: vt.color, color: "#000" }}>{vt.badge}</span>}
                        <Icon size={16} style={{ color: vt.color }} /><span className={`text-[8px] font-bold mt-1 text-center leading-tight whitespace-pre-line ${isActive ? "text-white" : ""}`} style={{ color: isActive ? "#fff" : vt.color }}>{vt.label}</span>
                      </button>);
                    })}
                  </div>
                </div>
              </div>
          ) : null}

          {/* ═══ VISIT TYPE INFO — compact popup with confirm button inside ═══ */}
          {visitTypePopup && !visitTypeConfirmed && (
            <div className="rounded-xl overflow-hidden" style={{ animation: "fadeInStep 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="p-3 space-y-2.5 relative bg-transparent border border-gray-200 rounded-xl" style={{ minHeight: "140px" }}>
                <button onClick={() => setVisitTypePopup(null)} className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors z-10"><X size={16} /></button>
                {visitTypePopup === "async" && (<>
                  <div className="px-1 mb-2" style={{ textAlign: "center" }}>
                    <h2 className="text-white font-black leading-[1.05] tracking-tight whitespace-pre-line" style={{ fontSize: "clamp(28px, 8vw, 36px)", textAlign: "center" }}>
                      {visitContent.async.title.split("\n").map((line, i) => {
                        const words = line.split(" ");
                        if (i === visitContent.async.title.split("\n").length - 1 && words.length > 0) {
                          const last = words.pop();
                          return <span key={i}>{words.join(" ")} <span className="text-[#2d7a5f]">{last}</span>{"\n"}</span>;
                        }
                        return <span key={i}>{line}{"\n"}</span>;
                      })}
                    </h2>
                    <p className="text-[11px] text-[#6b7280] mt-1 leading-relaxed" style={{ textAlign: "center" }}>{visitContent.async.sub}</p>
                  </div>
                  <div className="space-y-0">
                    {visitContent.async.steps.map((item, i) => (
                      <div key={i}>
                        {i > 0 && <div className="w-px h-1.5 bg-[#2d7a5f]/15" style={{ margin: "0 auto" }}></div>}
                        <div className="flex flex-col items-center py-2" style={{ textAlign: "center" }}>
                          <div className="w-[34px] h-[34px] rounded-full flex-shrink-0 flex items-center justify-center text-[14px] border border-[#2d7a5f]/15" style={{ background: "rgba(45,122,95,0.06)" }}>{item.icon}</div>
                          <div className="mt-1" style={{ textAlign: "center" }}>
                            <div className="text-[11px] font-bold text-white">{item.t}</div>
                            <div className="text-[11px] text-[#6b7280] mt-0.5">{item.d}</div>
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#2d7a5f] font-bold px-1.5 py-0.5 rounded border border-[#2d7a5f]/12" style={{ background: "rgba(45,122,95,0.08)" }}>⏱ {item.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#2d6b4f] text-white active:scale-95 transition-all" style={{ background: "#2d6b4f" }}>← Back</button><button onClick={() => { const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; setVisitType("async"); setVisitTypeChosen(true); setVisitTypeConfirmed(true); setAppointmentDate(today); setAppointmentTime(""); setVisitTypePopup(null); saveAnswers({ visitType: "async", visitTypeChosen: true, visitTypeConfirmed: true, appointmentDate: today, appointmentTime: "" }); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2d7a5f]/30 text-white" style={{ background: "rgba(45,122,95,0.12)" }}>Choose →</button></div>
                  <div className="flex items-center gap-1.5 opacity-50 justify-center"><Lock size={9} className="text-gray-500" /><span className="text-gray-500 text-[8px]">Full anonymity · Identity stays private</span></div>
                </>)}
                {visitTypePopup === "instant" && (<>
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}><Zap size={16} className="text-[#f59e0b]" /></div>
                    <div>
                      <h3 className="text-white font-black text-[14px] leading-tight">⚡ Instant Visit</h3>
                      <p className="text-[#f59e0b] text-[9px] font-bold uppercase tracking-wider">Connect with a provider right now</p>
                    </div>
                  </div>
                  {/* After-hours notice */}
                  {(() => { const azInfo = getInstantAZInfo(); return azInfo.isAfterCutoff ? (
                    <div className="rounded-xl px-3 py-2 mb-1" style={{ background: "rgba(45,107,79,0.06)", border: "1px solid rgba(45,107,79,0.2)" }}>
                      <p className="text-[#2d6b4f] text-[10px] font-bold">🌙 After Hours</p>
                      <p className="text-gray-300 text-[10px] mt-0.5">The provider will connect with you tomorrow at <strong>9:00 AM Arizona time</strong>. Your spot is locked in now.</p>
                    </div>
                  ) : null; })()}
                  {/* Steps */}
                  <div className="space-y-0">
                    {[{ icon: "📝", t: "Complete Quick Intake", d: "Tell us what you need — takes about 2 minutes.", time: "~2 min" }, { icon: "⏱", t: "Join the Queue", d: "You'll be notified the moment a provider is ready.", time: "Usually minutes" }, { icon: "📹", t: "Connect Live", d: "Meet by live video and get treated in real time.", time: "Starts when called" }].map((item, i) => (
                      <div key={i}>
                        {i > 0 && <div className="w-px h-1.5 bg-[#f59e0b]/15" style={{ margin: "0 auto" }}></div>}
                        <div className="flex flex-col items-center py-1.5" style={{ textAlign: "center" }}>
                          <div className="w-[30px] h-[30px] rounded-full flex-shrink-0 flex items-center justify-center text-[13px] border border-[#f59e0b]/15" style={{ background: "rgba(245,158,11,0.06)" }}>{item.icon}</div>
                          <div className="mt-1">
                            <div className="text-[10px] font-bold text-white">{item.t}</div>
                            <div className="text-[10px] text-[#6b7280] mt-0.5">{item.d}</div>
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-[#f59e0b] font-bold px-1.5 py-0.5 rounded border border-[#f59e0b]/12" style={{ background: "rgba(245,158,11,0.08)" }}>⏱ {item.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* FAQ accordion */}
                  <InstantFAQ />
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#2d6b4f] text-white active:scale-95 transition-all" style={{ background: "#2d6b4f" }}>← Back</button><button onClick={() => { setVisitType("instant"); setVisitTypeChosen(true); saveAnswers({ visitType: "instant", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setCalWeekOffset(0); setCalSelectedDay((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()); setCalSelectedTime(""); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2d7a5f]/30 text-white" style={{ background: "rgba(45,122,95,0.12)" }}>Choose →</button></div>
                  <div className="flex items-center gap-1.5 opacity-50 justify-center"><Lock size={9} className="text-gray-500" /><span className="text-gray-500 text-[8px]">Full anonymity · Identity stays private</span></div>
                </>)}
                {visitTypePopup === "refill" && (<>
                  <div className="flex items-center gap-2.5 mb-1"><div className="w-8 h-8 rounded-full bg-[#f59e0b]/15 flex items-center justify-center flex-shrink-0"><Pill size={16} className="text-[#f59e0b]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">💊 Rx Refill</h3><p className="text-[#f59e0b] text-[9px] font-bold uppercase tracking-wider">Provider reviews &amp; sends to pharmacy same day</p></div></div>
                  <div className="rounded-xl bg-[#0d1218] border border-gray-200 p-2.5 space-y-1.5">
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
                    <textarea value={symptomsText} onChange={(e) => { setSymptomsText(e.target.value); saveAnswers({ symptomsText: e.target.value }); }} placeholder="Additional medications or notes..." rows={1} className="w-full bg-[#11161c] border border-gray-100 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#f59e0b] resize-none placeholder:text-white/50" />
                  </div>
                  {/* FAQ accordion */}
                  <RefillFAQ />
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#2d6b4f] text-white active:scale-95 transition-all" style={{ background: "#2d6b4f" }}>← Back</button><button onClick={() => { const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; setVisitType("refill"); setVisitTypeChosen(true); setVisitTypeConfirmed(true); setAppointmentDate(today); setAppointmentTime(""); setVisitTypePopup(null); saveAnswers({ visitType: "refill", visitTypeChosen: true, visitTypeConfirmed: true, appointmentDate: today, appointmentTime: "" }); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2d7a5f]/30 text-white" style={{ background: "rgba(45,122,95,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "video" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#3b82f6]/15 flex items-center justify-center flex-shrink-0"><Video size={16} className="text-[#3b82f6]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Face-to-Face, From Anywhere</h3><p className="text-[#3b82f6] text-[9px] font-bold uppercase tracking-wider">Video Visit · Live</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">See your provider live on video — just like an in-office visit.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">Real-time</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">HIPAA encrypted</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#3b82f6]" /><span className="text-white text-[10px]">Pick a time</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#2d6b4f] text-white active:scale-95 transition-all" style={{ background: "#2d6b4f" }}>← Back</button><button onClick={() => { setVisitType("video"); setVisitTypeChosen(true); saveAnswers({ visitType: "video", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setCalWeekOffset(0); setCalSelectedDay((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()); setCalSelectedTime(""); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2d7a5f]/30 text-white" style={{ background: "rgba(45,122,95,0.12)" }}>Choose →</button></div>
                </>)}
                {visitTypePopup === "phone" && (<>
                  <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-[#a855f7]/15 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-[#a855f7]" /></div><div><h3 className="text-white font-black text-[13px] leading-tight">Talk, Text, or Both</h3><p className="text-[#a855f7] text-[9px] font-bold uppercase tracking-wider">Phone / SMS · No Camera</p></div></div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">Connect by phone or text — same quality care, no video.</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1"><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">No downloads</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">Flexible</span></div><div className="flex items-center gap-1"><Check size={11} className="text-[#a855f7]" /><span className="text-white text-[10px]">Follow-ups</span></div></div>
                  <div className="flex justify-between gap-2"><button onClick={goBack} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border-2 border-[#2d6b4f] text-white active:scale-95 transition-all" style={{ background: "#2d6b4f" }}>← Back</button><button onClick={() => { setVisitType("phone"); setVisitTypeChosen(true); saveAnswers({ visitType: "phone", visitTypeChosen: true }); setVisitTypePopup(null); setDateTimeDialogOpen(true); setCalWeekOffset(0); setCalSelectedDay((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()); setCalSelectedTime(""); }} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-[12px] border border-[#2d7a5f]/30 text-white" style={{ background: "rgba(45,122,95,0.12)" }}>Choose →</button></div>
                </>)}
                {(visitTypePopup === "refill" || visitTypePopup === "video" || visitTypePopup === "phone") && <div className="flex items-center gap-1.5 opacity-50"><Lock size={9} className="text-gray-500" /><span className="text-gray-500 text-[8px]">Full anonymity · Identity stays private</span></div>}
              </div>
            </div>
          )}
          {reason && symptomsDone && pharmacy && !visitTypeChosen && !visitTypePopup && <BelowCardContent step={4} />}
          </div>
          {/* END Step 4 wrapper */}

          {/* ═══ STEP 4.5 — PAYMENT PAGE (both patient types) ═══ */}

          {/* RETURNING PATIENT: compacted header + payment only */}
          {reason && symptomsDone && pharmacy && visitTypeChosen && visitTypeConfirmed && isReturningPatient ? (
            <div style={{ animation: "fadeInStep 1.2s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="rounded-xl p-4 space-y-3 transition-all mt-3" style={{ background: "#f7f4f4", border: "1px solid #d8d3d1", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {/* Compacted header */}
                <div className="text-center pb-2 border-b border-gray-100">
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#262626", lineHeight: 1.15, letterSpacing: "-0.01em", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif" }}>
                    Confirm &amp; Book Your{" "}
                    {visitType === "async" ? "Async" : visitType === "instant" ? "Instant" : visitType === "refill" ? "Rx Refill" : visitType === "video" ? "Video" : "SMS"} Visit
                  </h2>
                  {appointmentDate && appointmentTime ? (
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#2f7d5f", marginTop: "4px", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif" }}>{formatDisplayDateTime()}</p>
                  ) : null}
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#767d86", marginTop: "3px", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif" }}>Your Provider · LaMonica A. Hodges, MSN, APRN, FNP-C</p>
                </div>
                {/* Payment */}
                {clientSecret && stripeOptions ? (
                  <Elements options={stripeOptions} stripe={stripePromise}>
                    <Step2PaymentForm patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType} appointmentDate={appointmentDate} appointmentTime={appointmentTime} currentPrice={currentPrice} visitFeePrice={visitFeePrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress} pharmacyPhone={pharmacyInfo?.phone || ""} selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess} visitIntentId={visitIntentId} bookingIntentId={bookingIntentId} onCardExpand={(expanded) => setCardFormExpanded(expanded)} isNewPatient={false} />
                  </Elements>
                ) : paymentIntentError ? (
                  <div className="space-y-2 py-1">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                      <p className="text-red-400 text-[11px] font-semibold mb-1">Payment setup failed</p>
                      <p className="text-gray-400 text-[9px]">{paymentIntentError}</p>
                    </div>
                    <button onClick={retryPaymentIntent} className="w-full py-2.5 rounded-xl text-white font-bold text-[12px] border border-[#2d6b4f] hover:bg-[#2d6b4f]/10 transition-all" style={{ background: "rgba(45,107,79,0.05)" }}>Retry</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-[#2d7a5f] border-t-transparent rounded-full" />
                    <p className="text-gray-400 text-[10px]">Setting up payment…</p>
                  </div>
                )}
                <button onClick={goBack} style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1px solid #d8d3d1", background: "#f7f4f4", color: "#262626", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><span style={{ fontSize: "13px", lineHeight: 1 }}>←</span> Back</button>
              </div>
              <ConfirmBelowContent isReturn={true} />
            </div>
          ) : reason && symptomsDone && pharmacy && visitTypeChosen && visitTypeConfirmed && !isReturningPatient ? (
            /* ── NEW PATIENT: compacted header + fields + payment ── */
            <div style={{ animation: "fadeInStep 1.2s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              <div className="rounded-xl p-4 space-y-3 transition-all mt-3" style={{ background: "#f7f4f4", border: "1px solid #d8d3d1", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {/* Compacted header */}
                <div className="text-center pb-2 border-b border-gray-100">
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#262626", lineHeight: 1.15, letterSpacing: "-0.01em", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif" }}>
                    Confirm &amp; Book Your{" "}
                    {visitType === "async" ? "Async" : visitType === "instant" ? "Instant" : visitType === "refill" ? "Rx Refill" : visitType === "video" ? "Video" : "SMS"} Visit
                  </h2>
                  {appointmentDate && appointmentTime ? (
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#2f7d5f", marginTop: "4px", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif" }}>{formatDisplayDateTime()}</p>
                  ) : null}
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#767d86", marginTop: "3px", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif" }}>Your Provider · LaMonica A. Hodges, MSN, APRN, FNP-C</p>
                </div>

                {/* ── NEW PATIENT INFO FIELDS ── */}
                <form autoComplete="on" onSubmit={e => e.preventDefault()} className={`space-y-1 rounded-lg transition-all ${npFormPulse ? "ring-2 ring-[#2d6b4f] animate-pulse" : ""}`} style={{ padding: npFormPulse ? "6px" : "0" }}>
                  {/* Row 1: First + Last */}
                  <div className="flex gap-1">
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      {npErrors.firstName && <span className="text-[10px] font-semibold text-[#2d6b4f] px-0.5">{npErrors.firstName}</span>}
                      <input type="text" autoComplete="given-name" autoCorrect="off" autoCapitalize="words" spellCheck={false}
                        name="given-name" ref={npFirstNameRef} placeholder="First name" defaultValue=""
                        aria-invalid={!!npErrors.firstName}
                        className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[#1a1a1a] text-[11px] focus:outline-none placeholder:text-gray-400"
                        style={{ background: "#ffffff", border: npErrors.firstName ? "1.5px solid #2d6b4f" : "1.5px solid #c8d8cb" }}
                        onFocus={(e) => { e.target.style.border = "1.5px solid #2d7a5f"; }}
                        onBlur={(e) => { const v=e.target.value.trim(); setNpFirstName(v); if(v) setNpErrors(p=>({...p,firstName:""})); e.target.style.border = npErrors.firstName && !v ? "1.5px solid #2d6b4f" : v ? "1.5px solid rgba(45,122,95,0.5)" : "1.5px solid #c8d8cb"; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      {npErrors.lastName && <span className="text-[10px] font-semibold text-[#2d6b4f] px-0.5">{npErrors.lastName}</span>}
                      <input type="text" autoComplete="family-name" autoCorrect="off" autoCapitalize="words" spellCheck={false}
                        name="family-name" ref={npLastNameRef} placeholder="Last name" defaultValue=""
                        aria-invalid={!!npErrors.lastName}
                        className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[#1a1a1a] text-[11px] focus:outline-none placeholder:text-gray-400"
                        style={{ background: "#ffffff", border: npErrors.lastName ? "1.5px solid #2d6b4f" : "1.5px solid #c8d8cb" }}
                        onFocus={(e) => { e.target.style.border = "1.5px solid #2d7a5f"; }}
                        onBlur={(e) => { const v=e.target.value.trim(); setNpLastName(v); if(v) setNpErrors(p=>({...p,lastName:""})); e.target.style.border = npErrors.lastName && !v ? "1.5px solid #2d6b4f" : v ? "1.5px solid rgba(45,122,95,0.5)" : "1.5px solid #c8d8cb"; }}
                      />
                    </div>
                  </div>
                  {/* Row 2: Email + Phone */}
                  <div className="flex gap-1">
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      {npErrors.email && <span className="text-[10px] font-semibold text-[#2d6b4f] px-0.5">{npErrors.email}</span>}
                      <input type="email" inputMode="email" autoComplete="email" autoCorrect="off" spellCheck={false}
                        name="email" ref={npEmailRef} placeholder="Email" defaultValue=""
                        aria-invalid={!!npErrors.email}
                        className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[#1a1a1a] text-[11px] focus:outline-none placeholder:text-gray-400"
                        style={{ background: "#ffffff", border: npErrors.email ? "1.5px solid #2d6b4f" : "1.5px solid #c8d8cb" }}
                        onFocus={(e) => { e.target.style.border = "1.5px solid #2d7a5f"; }}
                        onBlur={(e) => { const v=e.target.value.trim(); setNpEmail(v); if(v.includes("@")) setNpErrors(p=>({...p,email:""})); e.target.style.border = npErrors.email && !v.includes("@") ? "1.5px solid #2d6b4f" : v.includes("@") ? "1.5px solid rgba(45,122,95,0.5)" : "1.5px solid #c8d8cb"; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      {npErrors.phone && <span className="text-[10px] font-semibold text-[#2d6b4f] px-0.5">{npErrors.phone}</span>}
                      <input type="tel" inputMode="tel" autoComplete="tel" autoCorrect="off" spellCheck={false}
                        name="tel" ref={npPhoneRef} placeholder="Phone" defaultValue=""
                        aria-invalid={!!npErrors.phone}
                        className="flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[#1a1a1a] text-[11px] focus:outline-none placeholder:text-gray-400"
                        style={{ background: "#ffffff", border: npErrors.phone ? "1.5px solid #2d6b4f" : "1.5px solid #c8d8cb" }}
                        onFocus={(e) => { e.target.style.border = "1.5px solid #2d7a5f"; }}
                        onBlur={(e) => { const v=e.target.value.replace(/\D/g,""); setNpPhone(v); if(v.length>=10) setNpErrors(p=>({...p,phone:""})); e.target.style.border = npErrors.phone && v.length<10 ? "1.5px solid #2d6b4f" : v.length>=10 ? "1.5px solid rgba(45,122,95,0.5)" : "1.5px solid #c8d8cb"; }}
                      />
                    </div>
                  </div>
                  {/* Row 3: Address + DOB */}
                  <div className="flex gap-1">
                    <div style={{flex:3,minWidth:0}} className="flex flex-col gap-0.5">
                      {npErrors.address && <span className="text-[10px] font-semibold text-[#2d6b4f] px-0.5">{npErrors.address}</span>}
                      <input type="text" autoComplete="address-line1" autoCorrect="off" spellCheck={false}
                        name="address1" ref={npAddressRef} placeholder="Street address" defaultValue=""
                        aria-invalid={!!npErrors.address}
                        className="rounded-lg px-2 py-1.5 text-[#1a1a1a] text-[11px] focus:outline-none placeholder:text-gray-400"
                        style={{ flex: 3, minWidth: 0, background: "#ffffff", border: npErrors.address ? "1.5px solid #2d6b4f" : "1.5px solid #c8d8cb" }}
                        onFocus={(e) => { e.target.style.border = "1.5px solid #2d7a5f"; }}
                        onBlur={(e) => { const v=e.target.value.trim(); setNpAddress(v); if(v) setNpErrors(p=>({...p,address:""})); e.target.style.border = npErrors.address && !v ? "1.5px solid #2d6b4f" : v ? "1.5px solid rgba(45,122,95,0.5)" : "1.5px solid #c8d8cb"; }}
                      />
                    </div>
                    <div style={{flex:2,minWidth:0}} className="flex flex-col gap-0.5">
                      {npErrors.dob && <span className="text-[10px] font-semibold text-[#2d6b4f] px-0.5">{npErrors.dob}</span>}
                      <input type="text" inputMode="numeric" autoComplete="bday" autoCorrect="off" spellCheck={false}
                        name="bday" ref={npDobRef} placeholder="MM/DD/YYYY" defaultValue=""
                        aria-invalid={!!npErrors.dob}
                        className="rounded-lg px-2 py-1.5 text-[#1a1a1a] text-[11px] text-center focus:outline-none placeholder:text-gray-400"
                        style={{ width: "100%", background: "#ffffff", border: npErrors.dob ? "1.5px solid #2d6b4f" : "1.5px solid #c8d8cb" }}
                        onFocus={(e) => { e.target.style.border = "1.5px solid #2d7a5f"; e.target.style.boxShadow = "0 0 0 2px rgba(45,122,95,0.15)"; }}
                        onBlur={(e) => {
                          const raw = e.target.value.replace(/\D/g,"").slice(0,8);
                          const mm = raw.slice(0,2); const dd = raw.slice(2,4); const yyyy = raw.slice(4,8);
                          setNpDobMonth(mm); setNpDobDay(dd); setNpDobYear(yyyy);
                          const complete = mm.length===2 && dd.length===2 && yyyy.length===4;
                          if (complete) setNpErrors(p=>({...p,dob:""}));
                          e.target.style.border = npErrors.dob && !complete ? "1.5px solid #2d6b4f" : complete ? "1.5px solid rgba(45,122,95,0.5)" : "1.5px solid #c8d8cb";
                          e.target.style.boxShadow = "none";
                          if (raw.length >= 4) { e.target.value = mm + "/" + dd + (yyyy ? "/" + yyyy : ""); }
                        }}
                      />
                    </div>
                  </div>
                </form>

                {/* Payment */}
                {clientSecret && stripeOptions ? (
                  <Elements options={stripeOptions} stripe={stripePromise}>
                    <Step2PaymentForm patient={patient} reason={reason} chiefComplaint={chiefComplaint} visitType={visitType} appointmentDate={appointmentDate} appointmentTime={appointmentTime} currentPrice={currentPrice} visitFeePrice={visitFeePrice} pharmacy={pharmacy} pharmacyAddress={pharmacyAddress} pharmacyPhone={pharmacyInfo?.phone || ""} selectedMedications={selectedMeds} symptomsText={symptomsText} onSuccess={handleSuccess} visitIntentId={visitIntentId} bookingIntentId={bookingIntentId} onCardExpand={(expanded) => setCardFormExpanded(expanded)} isNewPatient={true}
                      onPulseForm={() => { setNpFormPulse(true); setTimeout(() => setNpFormPulse(false), 1500); }}
                      onValidateFields={() => validateNpFields()}
                      npFirstName={npFirstName} npLastName={npLastName} npEmail={npEmail} npPhone={npPhone} npAddress={npAddress} npDobMonth={npDobMonth} npDobDay={npDobDay} npDobYear={npDobYear}
                    />
                  </Elements>
                ) : paymentIntentError ? (
                  <div className="space-y-2 py-1">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                      <p className="text-red-400 text-[11px] font-semibold mb-1">Payment setup failed</p>
                      <p className="text-gray-400 text-[9px]">{paymentIntentError}</p>
                    </div>
                    <button onClick={retryPaymentIntent} className="w-full py-2.5 rounded-xl text-white font-bold text-[12px] border border-[#2d6b4f] hover:bg-[#2d6b4f]/10 transition-all" style={{ background: "rgba(45,107,79,0.05)" }}>Retry</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-[#2d7a5f] border-t-transparent rounded-full" />
                    <p className="text-gray-400 text-[10px]">Setting up payment…</p>
                  </div>
                )}
                <button onClick={goBack} style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1px solid #d8d3d1", background: "#f7f4f4", color: "#262626", fontFamily: "'Avenir Next', Inter, -apple-system, sans-serif", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><span style={{ fontSize: "13px", lineHeight: 1 }}>←</span> Back</button>
              </div>
              <ConfirmBelowContent isReturn={false} />
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
            <button onClick={() => { setReasonDialogOpen(false); setReasonQuery(""); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          {/* Search */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={reasonQuery} onChange={(e) => setReasonQuery(e.target.value)} placeholder="Search symptoms..." autoFocus className="w-full bg-[#11161c] border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-[#2d7a5f]" />
            </div>
          </div>
          {/* Scrollable list — takes remaining space, keyboard pushes it up naturally */}
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 text-[#1a1a1a] bg-white/[0.03] hover:bg-[#2d7a5f]/10 hover:text-[#2d7a5f] cursor-pointer text-sm border-b border-gray-100 font-semibold active:bg-[#2d7a5f]/15 active:text-[#2d7a5f]" onClick={() => { setReason("Something Else"); setReasonDialogOpen(false); setReasonQuery(""); saveAnswers({ reason: "Something Else" }); }}>Something else</div>
              {filteredReasons.map((item: { name: string }) => (
                <div key={item.name} className="px-4 py-3 text-white hover:bg-[#2d7a5f]/10 hover:text-[#2d7a5f] cursor-pointer text-sm border-b border-gray-100 last:border-0 active:bg-[#2d7a5f]/15 active:text-[#2d7a5f]" onClick={() => { setReason(item.name); setReasonDialogOpen(false); setReasonQuery(""); saveAnswers({ reason: item.name }); }}>{item.name}</div>
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
        const timeSlots = ["9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM","6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM"];
        const convertTo24 = (t: string) => { const [time, period] = t.split(" "); let [h, m] = time.split(":").map(Number); if (period === "PM" && h !== 12) h += 12; if (period === "AM" && h === 12) h = 0; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; };
        const getSlotBadge = (slot: string, day: Date): { label: string; color: string } | null => {
          const dow = day.getDay(); // 0=Sun, 6=Sat
          const isWeekendDay = dow === 0 || dow === 6;
          if (isWeekendDay) return { label: "Weekend Rate", color: "#f59e0b" };
          // After hours: 5:30 PM onward on weekdays
          const t24 = convertTo24(slot);
          const [h] = t24.split(":").map(Number);
          if (h >= 17 && slot !== "5:00 PM") return { label: "After Hours", color: "#2d6b4f" };
          return null;
        };
        // Convert HH:MM (API format) to display string "9:00 AM"
        const to12h = (t24: string): string => {
          const [h, m] = t24.split(":").map(Number);
          const period = h >= 12 ? "PM" : "AM";
          const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return `${h12}:${String(m).padStart(2,"0")} ${period}`;
        };
        // Build slots for a given day:
        // 1. If calApiSlots loaded from API — use those (already filtered by doctor availability + booked slots)
        // 2. Otherwise fall back to static timeSlots with client-side AZ past-time filter
        const filterSlotsForDay = (day: Date): string[] => {
          if (calApiSlots.length > 0) {
            // API returns HH:MM — convert to display format, apply past-time filter for today
            const displaySlots = calApiSlots.map(t24 => to12h(t24));
            if (!isSameDay(day, today)) return displaySlots;
            try {
              const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "numeric", hour12: false });
              const parts = fmt.formatToParts(new Date());
              const azH = parseInt(parts.find(p => p.type === "hour")?.value || "0");
              const azM = parseInt(parts.find(p => p.type === "minute")?.value || "0");
              const nowMins = azH * 60 + azM;
              return displaySlots.filter(slot => {
                const t24 = convertTo24(slot);
                const [sh, sm] = t24.split(":").map(Number);
                return (sh * 60 + sm) > nowMins;
              });
            } catch { return displaySlots; }
          }
          // Fallback: static slots with AZ past-time filter for today
          if (!isSameDay(day, today)) return timeSlots;
          try {
            const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "numeric", hour12: false });
            const parts = fmt.formatToParts(new Date());
            const azH = parseInt(parts.find(p => p.type === "hour")?.value || "0");
            const azM = parseInt(parts.find(p => p.type === "minute")?.value || "0");
            const nowMins = azH * 60 + azM;
            return timeSlots.filter(slot => {
              const t24 = convertTo24(slot);
              const [sh, sm] = t24.split(":").map(Number);
              return (sh * 60 + sm) > nowMins;
            });
          } catch { return timeSlots; }
        };
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
                    <button key={iso} onClick={() => { setCalSelectedDay(iso); setCalSelectedTime(""); setCalApiSlots([]); setCalApiLoading(true); fetch(`/api/get-doctor-availability?date=${iso}`).then(r => r.json()).then(data => { if (data.availableSlots) setCalApiSlots(data.availableSlots); }).catch(() => {}).finally(() => setCalApiLoading(false)); }}
                      className="flex-1 flex flex-col items-center justify-center rounded-[14px] transition-all active:scale-95"
                      style={{
                        padding: "10px 4px 8px",
                        border: isSelected ? "2px solid rgba(45,122,95,0.4)" : isToday ? "2px solid rgba(45,122,95,0.2)" : "2px solid transparent",
                        background: isSelected ? "linear-gradient(135deg, #22805a 0%, #1a6b48 100%)" : "transparent",
                        boxShadow: isSelected ? "0 4px 16px rgba(45,122,95,0.15)" : "none",
                        cursor: "pointer",
                        gap: 2,
                        minWidth: 0,
                      }}>
                      <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 600, color: isSelected ? "#fff" : "#64748b", letterSpacing: "0.04em", lineHeight: 1 }}>{DAY_ABBR[day.getDay()]}</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: isSelected ? "#fff" : "#cbd5e1", lineHeight: 1.2 }}>{day.getDate()}</span>
                      {special ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? "#d1fae5" : "#2d7a5f", lineHeight: 1, marginTop: 1 }}>{special}</span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 600, color: isSelected ? "#d1fae5" : "#64748b", lineHeight: 1, marginTop: 1 }}>{SHORT_MO[day.getMonth()]}</span>
                      )}
                      {isToday && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a5f] mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Forward arrow + Next label */}
              {canGoForward ? (
                <button onClick={() => { setCalWeekOffset(Math.min(calWeekOffset + VISIBLE, TOTAL - VISIBLE)); setCalSelectedTime(""); }} className="flex-shrink-0 flex flex-col items-center p-1 text-[#64748b] active:scale-90 transition-transform" style={{ background: "none", border: "none" }}>
                  <ChevronDown size={20} className="-rotate-90" />
                  <span style={{ fontSize: 10, color: "#2d7a5f", fontWeight: 600, marginTop: -2 }}>Next &gt;</span>
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
                  {calApiLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
                      <div className="animate-spin" style={{ width: 24, height: 24, border: "2px solid rgba(45,122,95,0.2)", borderTop: "2px solid #2d7a5f", borderRadius: "50%" }} />
                      <p style={{ color: "#64748b", fontSize: 12 }}>Loading available times...</p>
                    </div>
                  ) : (
                  <>
                  <div id="cal-time-grid" className="rounded-xl transition-all" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {(() => {
                      const selectedDayDate = calSelectedDay ? new Date(calSelectedDay + "T12:00:00") : today;
                      const slots = filterSlotsForDay(selectedDayDate);
                      if (slots.length === 0) return (
                        <div style={{ gridColumn: "1/-1", padding: "24px 0", textAlign: "center" }}>
                          <p style={{ color: "#64748b", fontSize: 13 }}>No more slots available today.</p>
                          <p style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Please select a different day.</p>
                        </div>
                      );
                      return slots.map((slot, i) => {
                        const t24 = convertTo24(slot);
                        const isActive = calSelectedTime === t24;
                        const badge = getSlotBadge(slot, selectedDayDate);
                        return (
                          <button key={slot} onClick={() => setCalSelectedTime(t24)}
                            className="active:scale-95 transition-all"
                            style={{
                              padding: badge ? "6px 12px 6px" : "14px 16px",
                              borderRadius: 12,
                              border: isActive ? "2px solid rgba(45,122,95,0.5)" : badge ? "2px solid rgba(45,107,79,0.2)" : "2px solid rgba(255,255,255,0.1)",
                              background: isActive ? "linear-gradient(135deg, #22805a 0%, #1a6b48 100%)" : badge ? "rgba(45,107,79,0.04)" : "rgba(255,255,255,0.03)",
                              color: isActive ? "#ffffff" : "#e2e8f0",
                              fontSize: 15,
                              fontWeight: 700,
                              cursor: "pointer",
                              textAlign: "center" as const,
                              boxShadow: isActive ? "0 4px 16px rgba(45,122,95,0.2)" : "none",
                              animation: "slotFadeIn 0.3s ease both",
                              animationDelay: `${i * 0.05}s`,
                              display: "flex",
                              flexDirection: "column" as const,
                              alignItems: "center",
                              gap: 2,
                            }}>
                            {badge && <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? "#fed7aa" : badge.color, letterSpacing: "0.02em", lineHeight: 1 }}>{badge.label}</span>}
                            <span>{slot}</span>
                            {badge && <span style={{ fontSize: 9, fontWeight: 600, color: "#4ade80", lineHeight: 1 }}>I&apos;m available</span>}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  {/* Next business day suggestion row */}
                  {(calNextDaySlots.length > 0 || calNextDayLoading) && calNextDayObj && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                        ☀️ {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][calNextDayObj.getDay()]}, {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][calNextDayObj.getMonth()]} {calNextDayObj.getDate()}
                      </p>
                      {calNextDayLoading ? (
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Loading…</p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {calNextDaySlots.map((slot, i) => {
                            const t24n = t24FromSlot(slot);
                            const nextIso = `${calNextDayObj!.getFullYear()}-${String(calNextDayObj!.getMonth()+1).padStart(2,"0")}-${String(calNextDayObj!.getDate()).padStart(2,"0")}`;
                            const isActN = calSelectedTime === t24n && calSelectedDay === nextIso;
                            return (
                              <button key={slot}
                                className="active:scale-95 transition-all"
                                onClick={() => {
                                  setCalSelectedDay(nextIso);
                                  setCalSelectedTime(t24n);
                                  setCalApiSlots([]);
                                  setCalApiLoading(true);
                                  fetch(`/api/get-doctor-availability?date=${nextIso}`)
                                    .then(r=>r.json()).then(data=>{ if(data.availableSlots) setCalApiSlots(data.availableSlots); })
                                    .catch(()=>{}).finally(()=>setCalApiLoading(false));
                                }}
                                style={{
                                  padding: "14px 16px", borderRadius: 12,
                                  border: isActN ? "2px solid rgba(45,122,95,0.5)" : "2px solid rgba(255,255,255,0.1)",
                                  background: isActN ? "linear-gradient(135deg, #22805a 0%, #1a6b48 100%)" : "rgba(255,255,255,0.03)",
                                  color: isActN ? "#ffffff" : "#e2e8f0",
                                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                                  textAlign: "center" as const,
                                  boxShadow: isActN ? "0 4px 16px rgba(45,122,95,0.2)" : "none",
                                  animation: "slotFadeIn 0.3s ease both",
                                  animationDelay: `${i * 0.05}s`,
                                  display: "flex", flexDirection: "column" as const,
                                  alignItems: "center", gap: 2,
                                }}>
                                <span>{slot}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-center mt-3" style={{ fontSize: 10, color: "#475569" }}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                  </>
                  )}
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
                    if (strip) { strip.classList.add("animate-pulse"); strip.style.boxShadow = "0 0 20px rgba(45,107,79,0.4)"; setTimeout(() => { strip.classList.remove("animate-pulse"); strip.style.boxShadow = "none"; }, 1500); }
                    return;
                  }
                  if (!calSelectedTime) {
                    // Pulse the time grid
                    const grid = document.getElementById("cal-time-grid");
                    if (grid) { grid.classList.add("animate-pulse"); grid.style.boxShadow = "0 0 20px rgba(45,107,79,0.4)"; setTimeout(() => { grid.classList.remove("animate-pulse"); grid.style.boxShadow = "none"; }, 1500); }
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
                  background: "#2d6b4f",
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(45,107,79,0.25)",
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






































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































