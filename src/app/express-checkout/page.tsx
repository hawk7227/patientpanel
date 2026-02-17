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
// Step 2 Payment Form — single viewport, no scroll
// Google Pay (Android) / Apple Pay (iOS) auto-detected
// Card form slides up from bottom as overlay
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

  // Processing state
  if (isProcessing) {
    return (
      <div className="w-full space-y-2 py-1">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-[#2dd4a0] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="text-[12px] text-gray-300 text-center">{statusText}</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-1.5">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1.5 rounded-lg text-[10px]">{error}</div>
        )}

        {/* Google Pay / Apple Pay button — auto-detected by device */}
        {!isTestMode ? (
          <div className="rounded-xl overflow-hidden" style={{ maxHeight: '48px' }}>
            <PaymentElement
              options={{
                layout: { type: "accordion", defaultCollapsed: true, radios: false, spacedAccordionItems: false },
                paymentMethodOrder: ["google_pay", "apple_pay"],
                wallets: { applePay: "auto", googlePay: "auto" },
                fields: { billingDetails: { name: "never", email: "never", phone: "never" } },
              }}
            />
          </div>
        ) : (
          <button onClick={handlePay} disabled={!acceptedTerms}
            className="w-full bg-white rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50">
            <span className="text-black font-semibold text-sm">Test Pay {currentPrice.display}</span>
          </button>
        )}

        {/* OR PAY WITH CARD — opens slide-up */}
        <button onClick={() => setShowCardSlide(true)} className="w-full text-center py-0.5">
          <span className="text-[#2dd4a0] text-[11px] font-extrabold tracking-wider uppercase">
            OR PAY WITH CARD
          </span>
        </button>

        {/* Terms Checkbox — compact */}
        <div className="flex items-start gap-1.5">
          <input type="checkbox" id="step2Terms" checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="flex-shrink-0 mt-[1px]"
            style={{ width: '12px', height: '12px', borderRadius: '2px', accentColor: '#2dd4a0' }}
          />
          <label htmlFor="step2Terms" className="leading-[1.4]" style={{ fontSize: '7px', color: '#888' }}>
            By confirming, I agree to the{" "}
            <span className="text-[#2dd4a0] underline">Terms of Service</span>,{" "}
            <span className="text-[#2dd4a0] underline">Privacy Policy</span>, and{" "}
            <span className="text-[#2dd4a0] underline">Cancellation Policy</span>.{" "}
            By requesting a provider appointment, I acknowledge that my card will not be charged until a 
            provider accepts my appointment request. Once accepted, I authorize a one-time charge of{" "}
            <strong className="text-white">{currentPrice.display}.00</strong> (flat, non-refundable) for this visit.
          </label>
        </div>
      </div>

      {/* ═══ CARD SLIDE-UP OVERLAY ═══ */}
      {showCardSlide && (
        <div className="fixed inset-0 z-[150] flex items-end" onClick={() => setShowCardSlide(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />
          {/* Slide-up panel */}
          <div className="relative w-full bg-[#0d1218] border-t border-[#2dd4a0]/30 rounded-t-2xl p-4 pb-8 space-y-3 animate-slide-up"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease-out' }}>
            {/* Handle bar */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#2dd4a0]" />
                <span className="text-white font-bold text-sm">Pay with Card</span>
              </div>
              <button onClick={() => setShowCardSlide(false)} className="text-gray-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Stripe Card Element */}
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

            {/* Pay Button */}
            <button onClick={handlePay} disabled={!stripe || !elements || !acceptedTerms}
              className="w-full text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-[15px]"
              style={{ background: '#2dd4a0' }}>
              Pay {currentPrice.display} & Book
            </button>

            {!acceptedTerms && (
              <p className="text-center text-[10px] text-amber-400">
                ↑ Please accept the terms above first
              </p>
            )}
          </div>
        </div>
      )}

      {/* Slide-up animation keyframes */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
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

  // ── Guided Sequence State ────────────────────────────────
  const [visitTypePopup, setVisitTypePopup] = useState<VisitType | null>(null);
  const [wantToTalk, setWantToTalk] = useState(false);
  const [additionalMedsAnswer, setAdditionalMedsAnswer] = useState<"yes" | "no" | null>(null);

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
      // Controlled substances: only need controlled ack (async ack not shown/required)
      if (hasControlledSelected) {
        return !!(selectedMeds.length > 0 && controlledAcknowledged);
      }
      // Non-controlled refill: need async ack
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
    if (isAsync && !hasControlledSelected && !asyncAcknowledged) return "Acknowledge the async visit terms to continue";
    return "Complete all fields to continue";
  }, [reason, needsCalendar, appointmentDate, appointmentTime, visitType, selectedMeds, hasControlledSelected, isAsync, asyncAcknowledged, controlledAcknowledged]);

  // ── Guided Sequence: compute active step ────────────────
  const activeGuideStep = useMemo((): number => {
    if (!reason) return 1;
    if (!pharmacy) return 2;
    if (!visitType) return 3;
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return 4;
    if (visitType === "instant" && wantToTalk && (!appointmentDate || !appointmentTime)) return 4;
    if (visitType === "instant" && !wantToTalk) {
      if (additionalMedsAnswer === null) return 5;
    } else if (visitType === "refill") {
      if (selectedMeds.length === 0) return 4;
      if (additionalMedsAnswer === null) return 5;
    } else {
      if (additionalMedsAnswer === null) return 5;
    }
    if (isAsync && !hasControlledSelected && !asyncAcknowledged) return 6;
    if (hasControlledSelected && !controlledAcknowledged) return 6;
    return 7;
  }, [reason, pharmacy, visitType, needsCalendar, appointmentDate, appointmentTime, wantToTalk, additionalMedsAnswer, selectedMeds, isAsync, hasControlledSelected, asyncAcknowledged, controlledAcknowledged]);

  const totalSteps = 7;

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
  // STEP 2 — REVIEW & PAY — SINGLE VIEWPORT, NO SCROLL
  // Mobile-first: fits entire screen without scrolling
  // Google Pay (Android) / Apple Pay (iOS) auto-detected
  // Card form slides up from bottom
  // ═══════════════════════════════════════════════════════════
  if (currentStep === 2) {
    // Visit type display config
    const vtConfig: Record<string, { label: string; color: string; icon: string }> = {
      instant: { label: "Instant Care", color: "#2dd4a0", icon: "⚡" },
      refill: { label: "Rx Refill", color: "#f59e0b", icon: "💊" },
      video: { label: "Video Visit", color: "#3b82f6", icon: "📹" },
      phone: { label: "Phone / SMS", color: "#a855f7", icon: "📞" },
    };
    const vt = vtConfig[visitType] || vtConfig.instant;
    const isAsyncType = visitType === "instant" || visitType === "refill";

    return (
      <div className="fixed inset-0 text-white font-sans overflow-hidden"
        style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)" }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes confirmPulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
        `}</style>
        <div className="h-full max-w-[430px] mx-auto flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top, 8px)", paddingBottom: "env(safe-area-inset-bottom, 8px)", paddingLeft: "16px", paddingRight: "16px" }}>

          {/* HEADER — matches Step 1 */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <div className="flex items-center gap-1">
              <span className="text-white font-black text-[15px] tracking-tight">MEDAZON</span>
              <span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">EXPRESS</span>
              <span className="text-white font-black text-[15px] tracking-tight">BOOKING</span>
            </div>
            <button onClick={() => setCurrentStep(1)} className="text-gray-500 text-[10px] font-semibold flex items-center gap-1 hover:text-white">
              ← Edit
            </button>
          </div>

          {/* CONFIRM HEADING */}
          <div className="text-center py-1">
            <span className="font-black italic text-[#2dd4a0]" style={{ fontSize: "17px" }}>CONFIRM </span>
            <span className="font-black italic text-[#f59e0b]" style={{ fontSize: "17px" }}>YOUR </span>
            <span className="font-black italic text-[#2dd4a0]" style={{ fontSize: "17px" }}>BOOKING</span>
          </div>

          {/* ORDER SUMMARY CARD */}
          <div className="rounded-xl border border-white/10 overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.02)" }}>
            {/* Provider row */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5">
              <div className="w-9 h-9 rounded-full border-2 border-[#2dd4a0] overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 10px rgba(45,212,160,0.2)" }}>
                <img src="/assets/provider-lamonica.png" alt="Provider" className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[12px]">LaMonica A. Hodges</p>
                <p className="text-gray-500 text-[9px]">MSN, APRN, FNP-C · Board-Certified</p>
              </div>
              <Shield size={14} className="text-[#2dd4a0] flex-shrink-0" />
            </div>
            {/* Summary rows */}
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
              <span className="text-gray-500 text-[10px]">Reason</span>
              <span className="text-white text-[11px] font-semibold">{reason || "—"}</span>
            </div>
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
              <span className="text-gray-500 text-[10px]">Visit Type</span>
              <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: vt.color }}>
                <span>{vt.icon}</span>{vt.label}
              </span>
            </div>
            {pharmacy && (
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                <span className="text-gray-500 text-[10px]">Pharmacy</span>
                <span className="text-white text-[10px] font-medium truncate max-w-[55%] text-right">{pharmacy}</span>
              </div>
            )}
            {!isAsyncType && appointmentDate && appointmentTime ? (
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                <span className="text-gray-500 text-[10px]">Date & Time</span>
                <span className="text-white text-[11px] font-semibold">{formatDisplayDateTime()}</span>
              </div>
            ) : isAsyncType ? (
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                <span className="text-gray-500 text-[10px]">Delivery</span>
                <span className="text-[#2dd4a0] text-[10px] font-bold">Provider responds in 1–2 hrs</span>
              </div>
            ) : null}
            {selectedMeds.length > 0 && (
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                <span className="text-gray-500 text-[10px]">Medications</span>
                <span className="text-white text-[10px] font-medium">{selectedMeds.length} selected</span>
              </div>
            )}
            {wantToTalk && visitType === "instant" && appointmentDate && (
              <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                <span className="text-gray-500 text-[10px]">Live Add-on</span>
                <span className="text-white text-[11px] font-semibold">{formatDisplayDateTime()}</span>
              </div>
            )}
            {/* Price row — emphasized */}
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: "rgba(45,212,160,0.04)" }}>
              <span className="text-gray-400 text-[11px] font-semibold">Total</span>
              <span className="text-[#2dd4a0] font-black text-[16px]">{currentPrice.display}</span>
            </div>
          </div>

          {/* PAYMENT AREA — fills remaining space */}
          <div className="flex-1 flex flex-col justify-end min-h-0">
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
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin w-5 h-5 border-2 border-[#2dd4a0] border-t-transparent rounded-full" />
                <span className="ml-2 text-gray-400 text-xs">Loading payment...</span>
              </div>
            )}
          </div>

          {/* BOTTOM TRUST BAR */}
          <div className="flex-shrink-0 pt-1 pb-1">
            <p className="text-center text-gray-700 text-[8px]">
              <Lock size={8} className="inline mr-0.5" />HIPAA Compliant · 256-bit Encryption · Secure Checkout
            </p>
          </div>

        </div>

        {/* DEA Info Popup — reused */}
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
  const guideRing = (step: number) =>
    activeGuideStep === step
      ? "ring-2 ring-[#f97316] shadow-[0_0_14px_rgba(249,115,22,0.45)] animate-[guidePulse_2s_ease-in-out_infinite]"
      : "";
  const completedPill = (step: number) => activeGuideStep > step;

  return (
    <div className="fixed inset-0 text-white font-sans overflow-hidden"
      style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)" }}>
      <style>{`
        @keyframes guidePulse { 0%,100% { box-shadow: 0 0 8px rgba(249,115,22,0.3); } 50% { box-shadow: 0 0 18px rgba(249,115,22,0.55); } }
        @keyframes wanderQ { 0%,100% { opacity:0; transform:scale(0.7); } 30%,70% { opacity:1; transform:scale(1.15); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ackPulse { 0%,100% { box-shadow: 0 0 0px rgba(249,115,22,0); } 50% { box-shadow: 0 0 16px rgba(249,115,22,0.5); } }
        @keyframes fadeInBtn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 8px)", paddingBottom: "env(safe-area-inset-bottom, 8px)", paddingLeft: "16px", paddingRight: "16px" }}>
        {/* HEADER */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-1">
            <span className="text-white font-black text-[15px] tracking-tight">MEDAZON</span>
            <span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">EXPRESS</span>
            <span className="text-white font-black text-[15px] tracking-tight">BOOKING</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-500 font-medium">{activeGuideStep < totalSteps ? `${Math.min(activeGuideStep, 6)}/${totalSteps - 1}` : "✓"}</span>
            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#f97316] rounded-full transition-all duration-500" style={{ width: `${Math.min((activeGuideStep / totalSteps) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Zap size={12} className="text-[#f97316]" />
          <span className="text-[#f97316] font-semibold text-[11px]">Welcome back, {patient.firstName}!</span>
          <span className="text-gray-600 text-[9px]">Priority Patient</span>
        </div>
        {/* SCROLLABLE FORM */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2 space-y-2" style={{ scrollbarWidth: "none" }}>
          {/* STEP 1: Reason */}
          {completedPill(1) ? (
            <button onClick={() => { setReason(""); setChiefComplaint(""); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2dd4a0]/8 border border-[#2dd4a0]/20">
              <Check size={12} className="text-[#2dd4a0]" /><span className="text-[#2dd4a0] text-[11px] font-semibold truncate">{reason}</span><span className="text-gray-600 text-[9px] ml-auto">tap to change</span>
            </button>
          ) : (
            <button onClick={() => setReasonDialogOpen(true)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-[#11161c] text-left ${guideRing(1)} border-[#f97316]/40`}>
              <div className="flex items-center gap-2"><span className="text-[10px] font-black text-[#f97316] bg-[#f97316]/10 w-5 h-5 rounded-full flex items-center justify-center">1</span><span className="text-gray-400 text-sm">Reason for Visit</span></div>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
          )}
          {/* STEP 2: Pharmacy */}
          {activeGuideStep >= 2 && (completedPill(2) ? (
            <button onClick={() => { setPharmacy(""); setPharmacyAddress(""); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2dd4a0]/8 border border-[#2dd4a0]/20">
              <Check size={12} className="text-[#2dd4a0]" /><span className="text-[#2dd4a0] text-[11px] font-semibold truncate">{pharmacy}</span><span className="text-gray-600 text-[9px] ml-auto">tap to change</span>
            </button>
          ) : (
            <div className={`rounded-xl ${guideRing(2)}`}>
              <div className="flex items-center gap-2 px-4 pt-3 pb-1"><span className="text-[10px] font-black text-[#f97316] bg-[#f97316]/10 w-5 h-5 rounded-full flex items-center justify-center">2</span><span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Preferred Pharmacy</span></div>
              <PharmacySelector value={pharmacy} onChange={(val: string) => setPharmacy(val)} placeholder="Search pharmacy..." className="w-full bg-[#11161c] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#f97316] placeholder:text-gray-600" />
            </div>
          ))}
          {/* STEP 3: Visit Type */}
          {activeGuideStep >= 3 && (
            <div className={`rounded-xl p-3 ${activeGuideStep === 3 ? guideRing(3) : ""}`}>
              <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-black text-[#f97316] bg-[#f97316]/10 w-5 h-5 rounded-full flex items-center justify-center">3</span><span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Select Visit Type</span></div>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { key: "instant" as VisitType, label: "Treat Me\nNow", icon: Zap, color: "#2dd4a0", borderActive: "border-[#2dd4a0]", badge: "✨ NEW" },
                  { key: "refill" as VisitType, label: "Rx\nRefill", icon: Pill, color: "#f59e0b", borderActive: "border-[#f59e0b]", badge: "⚡ FAST" },
                  { key: "video" as VisitType, label: "Video\nVisit", icon: Video, color: "#3b82f6", borderActive: "border-[#3b82f6]", badge: null },
                  { key: "phone" as VisitType, label: "Phone\n/ SMS", icon: Phone, color: "#a855f7", borderActive: "border-[#a855f7]", badge: null },
                ] as const).map((vt, idx) => {
                  const Icon = vt.icon; const isSel = visitType === vt.key && activeGuideStep > 3;
                  return (<button key={vt.key} onClick={() => setVisitTypePopup(vt.key)} className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 transition-all ${isSel ? `${vt.borderActive} shadow-lg` : "border-white/10 bg-[#11161c]/80 hover:border-white/20"}`} style={{ minHeight: "72px", background: isSel ? `${vt.color}15` : undefined }}>
                    {vt.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: vt.color, color: "#000" }}>{vt.badge}</span>}
                    {activeGuideStep === 3 && <span className="absolute top-1 right-1 text-[#f97316] font-black text-[11px]" style={{ animation: `wanderQ 2.5s ease-in-out infinite`, animationDelay: `${idx * 0.6}s` }}>?</span>}
                    <Icon size={18} style={{ color: isSel ? vt.color : "#6b7280" }} />
                    <span className="text-[9px] font-bold mt-1 text-center leading-tight whitespace-pre-line" style={{ color: isSel ? vt.color : "#9ca3af" }}>{vt.label}</span>
                    {isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: vt.color }} />}
                  </button>);
                })}
              </div>
            </div>
          )}
          {/* STEP 4: Conditional */}
          {activeGuideStep >= 4 && (<div className={`${activeGuideStep === 4 ? guideRing(4) : ""} rounded-xl`}>
            {visitType === "instant" && (<div className="space-y-2">
              <div className="bg-[#2dd4a0]/5 border border-[#2dd4a0]/15 rounded-xl p-3"><p className="text-[11px] text-gray-300 leading-relaxed">📋 <span className="text-white font-semibold">Your visit will be submitted now.</span> Provider responds within <span className="text-[#2dd4a0] font-bold">1–2 hours</span>.</p></div>
              <textarea value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)} placeholder="Describe your symptoms in detail..." rows={2} className="w-full bg-[#11161c] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#2dd4a0] resize-none placeholder:text-gray-600" />
              <div className="flex items-center gap-3 bg-[#11161c]/60 border border-white/5 rounded-xl px-3 py-2.5">
                <button onClick={() => setWantToTalk(!wantToTalk)} className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${wantToTalk ? "bg-[#2dd4a0]" : "bg-white/10"}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${wantToTalk ? "left-[22px]" : "left-0.5"}`} /></button>
                <div><p className="text-white text-[11px] font-semibold">Want to talk to your provider?</p><p className="text-gray-500 text-[9px]">Add an optional live video or phone call</p></div>
              </div>
              {wantToTalk && (<button onClick={() => { setDateTimeDialogOpen(true); setDateTimeMode("date"); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left ${appointmentDate && appointmentTime ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : "border-white/10 bg-[#11161c]"}`}><div className="flex items-center gap-2"><Calendar size={14} className={appointmentDate ? "text-[#2dd4a0]" : "text-gray-500"} /><span className={`text-sm ${appointmentDate ? "text-white font-medium" : "text-gray-500"}`}>{formatDisplayDateTime() || "Select Date & Time"}</span></div><ChevronDown size={14} className="text-gray-500" /></button>)}
            </div>)}
            {visitType === "refill" && (<div className="bg-[#11161c] border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black text-[#f97316] bg-[#f97316]/10 w-5 h-5 rounded-full flex items-center justify-center">4</span><span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Select Medications</span></div>
              <button type="button" onClick={() => setMedsListOpen(!medsListOpen)} className="w-full flex items-center justify-between"><span className="text-xs font-semibold text-white">{selectedMeds.length > 0 ? `${selectedMeds.length} Medication${selectedMeds.length > 1 ? "s" : ""} Selected` : "Select Medications to Refill"}</span><div className="flex items-center gap-2">{medsLoading && <div className="animate-spin w-3 h-3 border border-[#2dd4a0] border-t-transparent rounded-full" />}<ChevronDown size={14} className={`text-gray-500 transition-transform ${medsListOpen ? "rotate-180" : ""}`} /></div></button>
              {!medsListOpen && selectedMeds.length > 0 && (<div className="flex flex-wrap gap-1">{selectedMeds.map(m => (<span key={m} className="text-[9px] bg-[#2dd4a0]/10 text-[#2dd4a0] border border-[#2dd4a0]/20 px-1.5 py-0.5 rounded-full font-medium">{m} {isControlledSubstance(m) ? "⚠️" : "✓"}</span>))}</div>)}
              {medsListOpen && (<>{medications.length > 0 ? (<div className="space-y-1 max-h-32 overflow-y-auto">{medications.map((med) => { const ic = isControlledSubstance(med.name); const ck = selectedMeds.includes(med.name); return (<label key={med.name} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs ${ck ? "bg-[#2dd4a0]/10 border border-[#2dd4a0]/30" : "hover:bg-white/5"} ${ic ? "border border-red-500/30" : ""}`}><input type="checkbox" checked={ck} onChange={() => toggleMed(med.name)} className="w-3.5 h-3.5 rounded border-white/20 bg-[#0d1218] text-[#2dd4a0] focus:ring-[#2dd4a0]" /><span className={`flex-1 ${ic ? "text-red-400" : "text-white"}`}>{med.name} {med.dosage ? `(${med.dosage})` : ""}</span>{ic && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">CTRL</span>}</label>); })}</div>) : !medsLoading ? <p className="text-gray-500 text-xs py-2">No medications found.</p> : null}{selectedMeds.length > 0 && (<button type="button" onClick={() => setMedsListOpen(false)} className="w-full py-2 rounded-lg bg-[#2dd4a0]/10 border border-[#2dd4a0]/20 text-[#2dd4a0] text-xs font-bold">Done — {selectedMeds.length} selected ✓</button>)}</>)}
              {hasControlledSelected && (<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5"><div className="flex items-start gap-2 pl-1"><input type="checkbox" id="ctrlAckG" checked={controlledAcknowledged} onChange={(e) => { setControlledAcknowledged(e.target.checked); setClientSecret(""); }} className="mt-0.5 w-4 h-4 rounded border-amber-500/50 bg-[#0d1218] text-amber-500 focus:ring-amber-500" /><label htmlFor="ctrlAckG" className="text-[10px] text-gray-400 leading-relaxed"><span className="text-white font-semibold">I understand and accept</span> controlled substance request. <button type="button" onClick={() => setShowDeaInfoPopup(true)} className="text-amber-400 underline font-semibold">DEA/Ryan Haight Act</button>. A live visit may be required.</label></div></div>)}
              <textarea value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)} placeholder="Additional medications or notes..." rows={2} className="w-full bg-[#0d1218] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4a0] resize-none placeholder:text-gray-600" />
            </div>)}
            {(visitType === "video" || visitType === "phone") && (<div className="space-y-2">
              <div className="flex items-center gap-2 px-1 mb-1"><span className="text-[10px] font-black text-[#f97316] bg-[#f97316]/10 w-5 h-5 rounded-full flex items-center justify-center">4</span><span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Pick Date & Time</span></div>
              <button onClick={() => { setDateTimeDialogOpen(true); setDateTimeMode("date"); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left ${appointmentDate && appointmentTime ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : "border-white/10 bg-[#11161c]"}`}><div className="flex items-center gap-2"><Calendar size={14} className={appointmentDate ? "text-[#2dd4a0]" : "text-gray-500"} /><span className={`text-sm ${appointmentDate ? "text-white font-medium" : "text-gray-500"}`}>{formatDisplayDateTime() || "Select Date & Time"}</span></div><ChevronDown size={14} className="text-gray-500" /></button>
            </div>)}
          </div>)}
          {/* STEP 5: Additional Meds */}
          {activeGuideStep >= 5 && (<div className={`rounded-xl p-3 ${activeGuideStep === 5 ? guideRing(5) : ""}`}>
            <div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-black text-[#f97316] bg-[#f97316]/10 w-5 h-5 rounded-full flex items-center justify-center">5</span><span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Need additional medications?</span></div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAdditionalMedsAnswer("yes")} className={`py-2.5 rounded-xl text-sm font-bold border-2 ${additionalMedsAnswer === "yes" ? "border-[#2dd4a0] bg-[#2dd4a0]/10 text-[#2dd4a0]" : "border-white/10 bg-[#11161c] text-gray-400"}`}>Yes, add meds</button>
              <button onClick={() => setAdditionalMedsAnswer("no")} className={`py-2.5 rounded-xl text-sm font-bold border-2 ${additionalMedsAnswer === "no" ? "border-[#2dd4a0] bg-[#2dd4a0]/10 text-[#2dd4a0]" : "border-white/10 bg-[#11161c] text-gray-400"}`}>{"No, I'm good"}</button>
            </div>
            {additionalMedsAnswer === "yes" && (<textarea value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)} placeholder="List any additional medications or notes..." rows={2} className="w-full mt-2 bg-[#0d1218] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2dd4a0] resize-none placeholder:text-gray-600" />)}
          </div>)}
          {/* STEP 6: Acknowledgment */}
          {activeGuideStep >= 6 && !hasControlledSelected && (<button onClick={() => { setAsyncAcknowledged(!asyncAcknowledged); setClientSecret(""); }} className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left ${asyncAcknowledged ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : "border-[#f97316]/30 bg-[#11161c]"} ${activeGuideStep === 6 && !asyncAcknowledged ? "animate-[ackPulse_1.5s_ease-in-out_infinite]" : ""}`}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${asyncAcknowledged ? "border-[#2dd4a0] bg-[#2dd4a0]" : "border-[#f97316]/50"}`}>{asyncAcknowledged && <Check size={12} className="text-black" />}</div>
            <div><p className="text-white text-[11px] font-semibold">I understand and agree</p><p className="text-gray-500 text-[9px] mt-0.5 leading-relaxed">A provider will review my information and respond within 1–2 hours. If a live evaluation is needed, I may be asked to schedule one.</p></div>
          </button>)}
          {/* Photo upload compact */}
          {activeGuideStep >= 5 && isAsync && (<div className="flex items-center gap-2"><label className="text-[9px] text-gray-600">Photo (optional):</label><button type="button" onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }; i.click(); }} className="text-[9px] text-[#2dd4a0] bg-[#2dd4a0]/10 px-2 py-1 rounded font-semibold"><Camera size={10} className="inline mr-1" />Upload</button>{photoPreview && (<div className="relative"><img src={photoPreview} alt="" className="w-8 h-8 rounded object-cover border border-white/10" /><button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"><X size={6} className="text-white" /></button></div>)}</div>)}
        </div>
        {/* BOTTOM BUTTON */}
        <div className="flex-shrink-0 pb-2 pt-1">
          {allFieldsReady ? (<button onClick={() => setCurrentStep(2)} className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg" style={{ background: "#f97316", color: "#fff", animation: "fadeInBtn 0.4s ease-out" }}>Continue to Final Step<ChevronDown size={16} className="rotate-[-90deg]" /></button>) : (<div className="text-center py-2"><p className="text-gray-600 text-[10px]">{notReadyMessage}</p></div>)}
          <p className="text-center text-gray-700 text-[8px] mt-1"><Lock size={8} className="inline mr-0.5" />HIPAA Compliant · Encrypted · {currentPrice.display}</p>
        </div>
      </div>
      {/* VISIT TYPE POPUP */}
      {visitTypePopup && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70" onClick={() => setVisitTypePopup(null)}>
          <div className="w-full max-w-[430px] rounded-t-2xl overflow-hidden" style={{ animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-3" style={{ background: "linear-gradient(180deg, #131a20 0%, #0d1218 100%)" }}>
              {visitTypePopup === "instant" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#2dd4a0]/15 flex items-center justify-center"><Zap size={20} className="text-[#2dd4a0]" /></div><div><h3 className="text-white font-black text-base">Get Seen Without Being Seen</h3><p className="text-[#2dd4a0] text-[10px] font-bold uppercase tracking-wider">Instant Care · No Appointment</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">No video. No phone call. No waiting room. Your provider reviews your case privately and sends treatment + prescription to your pharmacy.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#2dd4a0]" /><span className="text-white text-[11px] font-medium">100% private — no face-to-face</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#2dd4a0]" /><span className="text-white text-[11px] font-medium">Treatment in 1–2 hours</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#2dd4a0]" /><span className="text-white text-[11px] font-medium">Rx sent straight to your pharmacy</span></div></div><p className="text-gray-500 text-[9px] italic">Perfect for: UTIs, cold & flu, skin issues, allergies</p></>)}
              {visitTypePopup === "refill" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#f59e0b]/15 flex items-center justify-center"><Pill size={20} className="text-[#f59e0b]" /></div><div><h3 className="text-white font-black text-base">Your Meds. Refilled. No Appointment.</h3><p className="text-[#f59e0b] text-[10px] font-bold uppercase tracking-wider">Rx Refill · Skip the Wait</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">Running low? Select your medications, provider reviews and approves, refill sent to your pharmacy.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#f59e0b]" /><span className="text-white text-[11px] font-medium">No appointment needed</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#f59e0b]" /><span className="text-white text-[11px] font-medium">Same-day pharmacy pickup</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#f59e0b]" /><span className="text-white text-[11px] font-medium">Same provider every refill</span></div></div><p className="text-gray-500 text-[9px] italic">Perfect for: blood pressure, birth control, cholesterol</p></>)}
              {visitTypePopup === "video" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#3b82f6]/15 flex items-center justify-center"><Video size={20} className="text-[#3b82f6]" /></div><div><h3 className="text-white font-black text-base">Face-to-Face, From Anywhere</h3><p className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-wider">Video Visit · Live Consultation</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">See your provider live on video — just like an in-office visit, but from your couch.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" /><span className="text-white text-[11px] font-medium">Real-time conversation</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" /><span className="text-white text-[11px] font-medium">Private & encrypted — HIPAA</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#3b82f6]" /><span className="text-white text-[11px] font-medium">Pick a time that works</span></div></div><p className="text-gray-500 text-[9px] italic">Best for: ADHD evaluations, anxiety, complex conditions</p></>)}
              {visitTypePopup === "phone" && (<><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#a855f7]/15 flex items-center justify-center"><Phone size={20} className="text-[#a855f7]" /></div><div><h3 className="text-white font-black text-base">Talk, Text, or Both</h3><p className="text-[#a855f7] text-[10px] font-bold uppercase tracking-wider">Phone / SMS · No Camera</p></div></div><p className="text-gray-300 text-[12px] leading-relaxed">Connect by phone call or secure text — same quality care with zero screen time.</p><div className="space-y-1.5"><div className="flex items-center gap-2"><Check size={14} className="text-[#a855f7]" /><span className="text-white text-[11px] font-medium">No video, no downloads</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#a855f7]" /><span className="text-white text-[11px] font-medium">Flexible scheduling</span></div><div className="flex items-center gap-2"><Check size={14} className="text-[#a855f7]" /><span className="text-white text-[11px] font-medium">Great for follow-ups</span></div></div><p className="text-gray-500 text-[9px] italic">Perfect for: medication adjustments, follow-ups, quick questions</p></>)}
              <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 mt-1"><Lock size={12} className="text-gray-500" /><span className="text-gray-500 text-[9px]">Full anonymity · Your identity stays private</span></div>
              <button onClick={() => { handleVisitTypeChange(visitTypePopup); setVisitTypePopup(null); }} className="w-full py-3.5 rounded-xl font-bold text-sm" style={{ background: visitTypePopup === "instant" ? "#2dd4a0" : visitTypePopup === "refill" ? "#f59e0b" : visitTypePopup === "video" ? "#3b82f6" : "#a855f7", color: "#000" }}>Choose {visitTypePopup === "instant" ? "Instant Care" : visitTypePopup === "refill" ? "Rx Refill" : visitTypePopup === "video" ? "Video Visit" : "Phone/SMS"} →</button>
            </div>
          </div>
        </div>
      )}
      {/* REASON DIALOG */}
      {reasonDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => { setReasonDialogOpen(false); setReasonQuery(""); }}>
          <div className="w-full max-w-[430px] rounded-t-2xl p-4 space-y-3" style={{ background: "#0d1218", animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-white font-bold text-base">Reason For Visit</span><button onClick={() => { setReasonDialogOpen(false); setReasonQuery(""); }} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={reasonQuery} onChange={(e) => setReasonQuery(e.target.value)} placeholder="Search symptoms..." autoFocus className="w-full bg-[#11161c] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#2dd4a0]" /></div>
            <div className="max-h-60 overflow-y-auto border border-white/5 rounded-lg">
              <div className="px-3 py-2 text-white hover:bg-[#2dd4a0] hover:text-black cursor-pointer text-xs border-b border-white/5 font-semibold" onClick={() => { setReason("Something Else"); setReasonDialogOpen(false); setReasonQuery(""); setChiefComplaintDialogOpen(true); }}>Something else</div>
              {filteredReasons.map((item: { name: string }) => (<div key={item.name} className="px-3 py-2 text-white hover:bg-[#2dd4a0] hover:text-black cursor-pointer text-xs border-b border-white/5 last:border-0" onClick={() => { setReason(item.name); setReasonDialogOpen(false); setReasonQuery(""); setChiefComplaintDialogOpen(true); }}>{item.name}</div>))}
            </div>
          </div>
        </div>
      )}
      {/* CHIEF COMPLAINT DIALOG */}
      {chiefComplaintDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setChiefComplaintDialogOpen(false)}>
          <div className="w-full max-w-[430px] rounded-t-2xl p-4 space-y-3" style={{ background: "#0d1218", animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-white font-bold text-base">Describe Your Symptoms</span><button onClick={() => setChiefComplaintDialogOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
            <p className="text-gray-400 text-xs">Briefly describe what&apos;s going on.</p>
            <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} placeholder="e.g., Burning during urination for 3 days..." rows={3} autoFocus className="w-full bg-[#11161c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2dd4a0] resize-none" />
            <div className="flex gap-2"><button onClick={() => setChiefComplaintDialogOpen(false)} className="flex-1 bg-white/5 text-gray-400 py-2 rounded-lg text-sm">Skip</button><button onClick={() => setChiefComplaintDialogOpen(false)} className="flex-1 bg-[#2dd4a0] text-black py-2 rounded-lg text-sm font-bold">Done</button></div>
          </div>
        </div>
      )}
      {/* DATE/TIME DIALOG */}
      {dateTimeDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setDateTimeDialogOpen(false)}>
          <div className="w-full max-w-[430px] rounded-t-2xl p-4 space-y-3" style={{ background: "#0d1218", animation: "slideUp 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-white font-bold text-base">{dateTimeMode === "date" ? "Select Date" : "Select Time"}</span><button onClick={() => setDateTimeDialogOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div>
            <AppointmentCalendar selectedDate={appointmentDate || null} selectedTime={appointmentTime || null} onDateSelect={(date) => { setAppointmentDate(date); setDateTimeMode("time"); }} onTimeSelect={(time) => { setAppointmentTime(time); setDateTimeDialogOpen(false); }} mode={dateTimeMode === "date" ? "date" : "time"} />
            {dateTimeMode === "time" && (<button onClick={() => setDateTimeMode("date")} className="w-full text-center text-xs text-[#2dd4a0] hover:underline">← Change date</button>)}
          </div>
        </div>
      )}
      {/* DEA INFO POPUP */}
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
