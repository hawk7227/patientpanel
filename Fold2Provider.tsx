"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPrice, isControlledSubstance, type VisitType } from "@/lib/pricing";
import { trackEvent } from "../lib/analytics";
import type { PatientInfo, MedicationItem, PharmacyInfo, VisibleStep } from "../types";

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

export function clearAnswers() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function useExpressCheckout() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientInfo | null>(null);

  // Step 1: Reason + Symptoms
  const [reason, setReason] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonQuery, setReasonQuery] = useState("");

  // Step 2: Pharmacy
  const [pharmacy, setPharmacy] = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [pharmacyInfo, setPharmacyInfo] = useState<PharmacyInfo | null>(null);

  // Step 3: Visit Type
  const [visitType, setVisitType] = useState<VisitType>("instant");
  const [visitTypeConfirmed, setVisitTypeConfirmed] = useState(false);
  const [visitTypePopup, setVisitTypePopup] = useState<VisitType | null>(null);

  // Step 3b: Date/Time
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");

  // Step 4: Acknowledgment
  const [asyncAcknowledged, setAsyncAcknowledged] = useState(false);
  const [controlledAcknowledged, setControlledAcknowledged] = useState(false);

  // Refill-specific
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [hasControlledSelected, setHasControlledSelected] = useState(false);
  const [symptomsText, setSymptomsText] = useState("");

  // Instant-specific
  const [wantToTalk, setWantToTalk] = useState(false);

  // Post-payment demographics
  const [demoFirstName, setDemoFirstName] = useState("");
  const [demoLastName, setDemoLastName] = useState("");
  const [demoPhone, setDemoPhone] = useState("");
  const [demoDOB, setDemoDOB] = useState("");
  const [demoAddress, setDemoAddress] = useState("");

  // Flow control
  const [currentPhase, setCurrentPhase] = useState<"booking" | "payment" | "demographics" | "success">("booking");
  const [clientSecret, setClientSecret] = useState("");

  // Controlled substance post-payment
  const [showControlledScheduler, setShowControlledScheduler] = useState(false);
  const [controlledScheduleDate, setControlledScheduleDate] = useState("");
  const [controlledScheduleTime, setControlledScheduleTime] = useState("");
  const [controlledVisitType, setControlledVisitType] = useState<"video" | "phone">("video");

  // DEA popup
  const [showDeaInfoPopup, setShowDeaInfoPopup] = useState(false);

  // Derived
  const currentPrice = useMemo(() => getPrice(visitType), [visitType]);
  const needsCalendar = visitType === "video" || visitType === "phone";
  const isAsync = visitType === "instant" || visitType === "refill";
  const isReturning = patient?.source !== "new" && !!patient?.firstName;

  // ── Load patient ───────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("expressPatient");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setPatient(p);
        // Pre-fill demographics from patient data (returning patients)
        if (p.firstName) setDemoFirstName(p.firstName);
        if (p.lastName) setDemoLastName(p.lastName);
        if (p.phone) setDemoPhone(p.phone);
        if (p.dateOfBirth) setDemoDOB(p.dateOfBirth);
        if (p.address) setDemoAddress(p.address);
        trackEvent("checkout_started", { isReturning: p.source !== "new" });
      } catch { router.push("/"); }
    } else { router.push("/"); }
    // Capture browser info
    if (!sessionStorage.getItem("browserInfo")) {
      try {
        const bi = { userAgent: navigator.userAgent, screen: `${window.screen.width}x${window.screen.height}`, language: navigator.language, platform: navigator.platform || "unknown", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0, connectionType: (navigator as any).connection?.effectiveType || "unknown", timestamp: new Date().toISOString() };
        sessionStorage.setItem("browserInfo", JSON.stringify(bi));
      } catch {}
    }
  }, [router]);

  // ── Restore saved answers ──────────────────────────────
  useEffect(() => {
    const s = loadAnswers();
    if (s.reason) setReason(s.reason);
    if (s.chiefComplaint) setChiefComplaint(s.chiefComplaint);
    if (s.pharmacy) setPharmacy(s.pharmacy);
    if (s.pharmacyAddress) setPharmacyAddress(s.pharmacyAddress);
    if (s.pharmacyInfo) setPharmacyInfo(s.pharmacyInfo);
    if (s.visitType) setVisitType(s.visitType);
    if (s.visitTypeConfirmed) setVisitTypeConfirmed(true);
    if (s.symptomsText) setSymptomsText(s.symptomsText);
    if (s.selectedMeds) setSelectedMeds(s.selectedMeds);
    if (s.wantToTalk !== undefined) setWantToTalk(s.wantToTalk);
    if (s.asyncAcknowledged) setAsyncAcknowledged(s.asyncAcknowledged);
    if (s.controlledAcknowledged) setControlledAcknowledged(s.controlledAcknowledged);
    if (s.appointmentDate) setAppointmentDate(s.appointmentDate);
    if (s.appointmentTime) setAppointmentTime(s.appointmentTime);
  }, []);

  // ── Fetch medications (3-tier fallback) ────────────────
  useEffect(() => {
    if ((visitType === "refill" || visitTypePopup === "refill") && patient?.email) {
      setMedsLoading(true);
      const email = patient.email || "";
      const patientId = patient.id;
      const tryStaticFile = () => {
        fetch("/data/patient-medications.json").then(r => r.json()).then(fileData => {
          const pts = fileData.patients || [];
          const match = pts.find((p: any) => (p.email || "").toLowerCase() === email.toLowerCase());
          if (match?.medications?.length > 0) {
            const seen = new Set<string>();
            const meds = match.medications
              .filter((m: any) => { const k = (m.name||"").toLowerCase().trim(); if (!k||k.length<2||seen.has(k)) return false; seen.add(k); return true; })
              .map((m: any) => ({ name: m.name, dosage: m.dosage||"", source: "Offline", is_active: m.status!=="inactive"&&!m.date_stopped }));
            setMedications(meds);
          }
          setMedsLoading(false);
        }).catch(() => setMedsLoading(false));
      };
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
        tryStaticFile();
      }
    }
  }, [visitType, visitTypePopup, patient?.id, patient?.email]);

  // ── Controlled substance detection ─────────────────────
  useEffect(() => { setHasControlledSelected(selectedMeds.some(m => isControlledSubstance(m))); }, [selectedMeds]);

  // ── Active visible step calculation ────────────────────
  const activeStep = useMemo((): VisibleStep => {
    if (!reason || chiefComplaint.length < 10) return "reason";
    if (!pharmacy) return "pharmacy";
    if (!visitTypeConfirmed) return "visitType";
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return "dateTime";
    if (visitType === "instant" && wantToTalk && (!appointmentDate || !appointmentTime)) return "dateTime";
    // Acknowledgment check
    if (visitType === "refill") {
      const hasMedsOrNotes = selectedMeds.length > 0 || symptomsText.trim().length > 0;
      if (!hasMedsOrNotes) return "visitType"; // still on visit type step (need meds)
      if (hasControlledSelected && !controlledAcknowledged) return "acknowledgment";
    } else if (isAsync && !asyncAcknowledged) {
      return "acknowledgment";
    }
    return "payment";
  }, [reason, chiefComplaint, pharmacy, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, visitType, wantToTalk, selectedMeds, symptomsText, hasControlledSelected, controlledAcknowledged, isAsync, asyncAcknowledged]);

  // ── Visible steps list (for progress bar) ──────────────
  const visibleSteps = useMemo((): VisibleStep[] => {
    const steps: VisibleStep[] = ["reason", "pharmacy", "visitType"];
    if (needsCalendar || (visitType === "instant" && wantToTalk)) steps.push("dateTime");
    steps.push("acknowledgment", "payment");
    return steps;
  }, [needsCalendar, visitType, wantToTalk]);

  const progressPercent = useMemo(() => {
    const idx = visibleSteps.indexOf(activeStep);
    if (idx === -1) return 100; // past all steps
    return Math.round((idx / visibleSteps.length) * 100);
  }, [visibleSteps, activeStep]);

  // ── All fields ready for payment ───────────────────────
  const allFieldsReady = useMemo(() => {
    if (!reason || chiefComplaint.length < 10) return false;
    if (!pharmacy) return false;
    if (!visitTypeConfirmed) return false;
    if (needsCalendar && (!appointmentDate || !appointmentTime)) return false;
    if (visitType === "instant" && wantToTalk && (!appointmentDate || !appointmentTime)) return false;
    if (visitType === "refill") {
      const hasMedsOrNotes = selectedMeds.length > 0 || symptomsText.trim().length > 0;
      if (!hasMedsOrNotes) return false;
      if (hasControlledSelected) return !!controlledAcknowledged;
      return true;
    }
    return !!asyncAcknowledged;
  }, [reason, chiefComplaint, pharmacy, visitTypeConfirmed, needsCalendar, appointmentDate, appointmentTime, visitType, wantToTalk, selectedMeds, symptomsText, hasControlledSelected, asyncAcknowledged, controlledAcknowledged]);

  // ── Demographics complete check ────────────────────────
  const demographicsReady = useMemo(() => {
    return demoFirstName.trim().length > 0 && demoLastName.trim().length > 0 && demoPhone.trim().length >= 10 && demoDOB.trim().length > 0;
  }, [demoFirstName, demoLastName, demoPhone, demoDOB]);

  // ── Create payment intent ──────────────────────────────
  useEffect(() => {
    if (allFieldsReady && !clientSecret && currentPhase === "booking") {
      fetch("/api/create-payment-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: currentPrice.amount }) })
        .then(res => res.json()).then(data => { if (data.clientSecret) setClientSecret(data.clientSecret); })
        .catch(err => console.error("Payment intent error:", err));
    }
  }, [allFieldsReady, clientSecret, currentPrice.amount, currentPhase]);

  // ── Handlers ───────────────────────────────────────────
  const handleReasonSelect = useCallback((r: string) => {
    setReason(r);
    setReasonDialogOpen(false);
    setReasonQuery("");
    saveAnswers({ reason: r });
    trackEvent("reason_selected", { reason: r });
  }, []);

  const handleSymptomsChange = useCallback((text: string) => {
    setChiefComplaint(text);
    saveAnswers({ chiefComplaint: text });
    if (text.length >= 10) trackEvent("symptoms_entered");
  }, []);

  const handlePharmacySelect = useCallback((val: string, info?: any) => {
    setPharmacy(val);
    if (info) {
      const pInfo: PharmacyInfo = { name: info.name || val, address: info.address || info.formatted_address || "", photo: info.photo || info.photoUrl || "", rating: info.rating || undefined, reviewCount: info.reviewCount || info.user_ratings_total || undefined, isOpen: info.isOpen ?? info.opening_hours?.open_now ?? undefined };
      setPharmacyInfo(pInfo); setPharmacyAddress(info.address || info.formatted_address || "");
      saveAnswers({ pharmacy: val, pharmacyInfo: pInfo, pharmacyAddress: pInfo.address });
    } else { saveAnswers({ pharmacy: val }); }
    trackEvent("pharmacy_selected");
  }, []);

  const handleVisitTypeChange = useCallback((type: VisitType) => {
    setVisitType(type); setClientSecret(""); setAsyncAcknowledged(false);
    if (type !== "refill") {
      setSelectedMeds([]); setHasControlledSelected(false); setControlledAcknowledged(false);
      saveAnswers({ visitType: type, asyncAcknowledged: false, selectedMeds: [], controlledAcknowledged: false });
    } else {
      saveAnswers({ visitType: type, asyncAcknowledged: false });
    }
  }, []);

  const handleVisitTypeConfirm = useCallback(() => {
    if (!visitTypePopup) return;
    handleVisitTypeChange(visitTypePopup);
    setVisitTypeConfirmed(true);
    saveAnswers({ visitType: visitTypePopup, visitTypeConfirmed: true });
    setVisitTypePopup(null);
    trackEvent("visit_type_confirmed", { visitType: visitTypePopup });
  }, [visitTypePopup, handleVisitTypeChange]);

  const toggleMed = useCallback((name: string) => {
    const newMeds = selectedMeds.includes(name) ? selectedMeds.filter(m => m !== name) : [...selectedMeds, name];
    setSelectedMeds(newMeds); setClientSecret(""); saveAnswers({ selectedMeds: newMeds });
  }, [selectedMeds]);

  const handlePaymentSuccess = useCallback(() => {
    trackEvent("payment_completed", { visitType });
    if (isReturning && patient?.firstName) {
      // Returning patient already has demographics — skip to success
      setCurrentPhase("success");
    } else {
      // New patient — collect demographics
      setCurrentPhase("demographics");
    }
  }, [visitType, isReturning, patient]);

  const handleDemographicsSubmit = useCallback(async () => {
    trackEvent("demographics_completed");
    // Update the patient record with demographics
    try {
      const stored = sessionStorage.getItem("appointmentData");
      const apptData = stored ? JSON.parse(stored) : {};
      // Update appointment with real patient info
      if (apptData.appointmentId) {
        await fetch("/api/update-appointment-intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: apptData.appointmentId,
            firstName: demoFirstName,
            lastName: demoLastName,
            phone: demoPhone,
            dateOfBirth: demoDOB,
            address: demoAddress,
          }),
        });
      }
    } catch (err) {
      console.error("Demographics update error:", err);
    }
    if (hasControlledSelected) {
      setShowControlledScheduler(true);
    } else {
      setCurrentPhase("success");
    }
  }, [demoFirstName, demoLastName, demoPhone, demoDOB, demoAddress, hasControlledSelected]);

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

  return {
    // Patient
    patient, isReturning,
    // Step 1
    reason, chiefComplaint, reasonDialogOpen, reasonQuery,
    setReason, setChiefComplaint: handleSymptomsChange, setReasonDialogOpen, setReasonQuery,
    handleReasonSelect,
    // Step 2
    pharmacy, pharmacyAddress, pharmacyInfo,
    setPharmacy, setPharmacyAddress, setPharmacyInfo,
    handlePharmacySelect,
    // Step 3
    visitType, visitTypeConfirmed, visitTypePopup,
    setVisitType, setVisitTypeConfirmed, setVisitTypePopup,
    handleVisitTypeChange, handleVisitTypeConfirm,
    // Step 3b
    appointmentDate, appointmentTime, dateTimeDialogOpen, dateTimeMode,
    setAppointmentDate, setAppointmentTime, setDateTimeDialogOpen, setDateTimeMode,
    formatDisplayDateTime,
    // Step 4
    asyncAcknowledged, controlledAcknowledged,
    setAsyncAcknowledged: (v: boolean) => { setAsyncAcknowledged(v); setClientSecret(""); saveAnswers({ asyncAcknowledged: v }); },
    setControlledAcknowledged: (v: boolean) => { setControlledAcknowledged(v); setClientSecret(""); saveAnswers({ controlledAcknowledged: v }); },
    // Refill
    medications, selectedMeds, medsLoading, hasControlledSelected, symptomsText,
    setSymptomsText: (v: string) => { setSymptomsText(v); saveAnswers({ symptomsText: v }); },
    toggleMed,
    // Instant
    wantToTalk,
    setWantToTalk: (v: boolean) => { setWantToTalk(v); saveAnswers({ wantToTalk: v }); },
    // Demographics
    demoFirstName, demoLastName, demoPhone, demoDOB, demoAddress,
    setDemoFirstName, setDemoLastName, setDemoPhone, setDemoDOB, setDemoAddress,
    demographicsReady, handleDemographicsSubmit,
    // Flow
    currentPhase, setCurrentPhase,
    activeStep, visibleSteps, progressPercent, allFieldsReady,
    currentPrice, needsCalendar, isAsync, clientSecret,
    handlePaymentSuccess,
    // Controlled scheduler
    showControlledScheduler, setShowControlledScheduler,
    controlledScheduleDate, setControlledScheduleDate,
    controlledScheduleTime, setControlledScheduleTime,
    controlledVisitType, setControlledVisitType,
    showDeaInfoPopup, setShowDeaInfoPopup,
    // Utilities
    saveAnswers,
    router,
  };
}
