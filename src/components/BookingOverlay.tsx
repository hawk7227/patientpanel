"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface PatientInfo {
  id: string | null;
  firstName: string; lastName: string; email: string; phone: string;
  dateOfBirth: string; address: string; source: string; pharmacy: string;
}
interface BookingOverlayProps {
  visitType: string;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────
const VISIT_LABELS: Record<string,string> = {
  async:"📝 Async Visit", sms:"💬 SMS Visit", refill:"💊 Rx Refill",
  video:"📹 Video Visit", phone:"📞 Phone Visit", instant:"⚡ Instant Visit",
};
const VISIT_COLORS: Record<string,{accent:string;border:string;cta:string;dim:string}> = {
  async:   {accent:"#f472b6",border:"rgba(236,72,153,.6)",  cta:"#ec4899", dim:"rgba(236,72,153,.08)"},
  sms:     {accent:"#c084fc",border:"rgba(168,85,247,.6)",  cta:"#a855f7", dim:"rgba(168,85,247,.08)"},
  refill:  {accent:"#4ade80",border:"rgba(34,197,94,.6)",   cta:"#22c55e", dim:"rgba(34,197,94,.08)"},
  video:   {accent:"#60a5fa",border:"rgba(59,130,246,.6)",  cta:"#3b82f6", dim:"rgba(59,130,246,.08)"},
  phone:   {accent:"#22d3ee",border:"rgba(6,182,212,.6)",   cta:"#0891b2", dim:"rgba(6,182,212,.08)"},
  instant: {accent:"#fb923c",border:"rgba(249,115,22,.6)",  cta:"#f97316", dim:"rgba(249,115,22,.08)"},
};

// ─── Step helpers ────────────────────────────────────────────
// New:      1=symptoms  2=pharmacy  3=calendar  → navigate
// Returning: 1=reason   2=calendar  → navigate
function getStepTitle(s:number, r:boolean): string {
  if (r) { if(s===1) return "Reason for Visit"; return "Pick Date & Time"; }
  if (s===1) return "Reason for Visit";
  if (s===2) return "Select Pharmacy";
  return "Pick Date & Time";
}
const TOTAL_STEPS = 3;

// ─── Calendar helpers ─────────────────────────────────────────
const DAY_ABBR = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const SHORT_MO  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TIME_SLOTS_12 = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
  "6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM",
];

function to24(t:string): string {
  const [time,period] = t.split(" "); let [h,m] = time.split(":").map(Number);
  if(period==="PM"&&h!==12) h+=12; if(period==="AM"&&h===12) h=0;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function isoDate(d:Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function nextBusinessDay(from:Date): Date {
  const d = new Date(from); d.setHours(0,0,0,0);
  do { d.setDate(d.getDate()+1); } while(d.getDay()===0||d.getDay()===6);
  return d;
}
function isSameDay(a:Date,b:Date): boolean {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function getAZNowMins(): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US",{timeZone:"America/Phoenix",hour:"numeric",minute:"numeric",hour12:false});
    const parts = fmt.formatToParts(new Date());
    return parseInt(parts.find(p=>p.type==="hour")?.value||"0")*60 + parseInt(parts.find(p=>p.type==="minute")?.value||"0");
  } catch { return new Date().getHours()*60+new Date().getMinutes(); }
}
function getSlotBadge(t12:string, day:Date): {label:string;color:string}|null {
  if(day.getDay()===0||day.getDay()===6) return {label:"Weekend Rate",color:"#f97316"};
  const h = parseInt(to24(t12).split(":")[0]);
  if(h>=17&&t12!=="5:00 PM") return {label:"After Hours",color:"#f97316"};
  return null;
}
function filterSlotsForDay(day:Date, apiSlots:string[]): string[] {
  const today = new Date(); today.setHours(0,0,0,0);
  let slots = apiSlots.length>0
    ? apiSlots.map(t24=>{const[h,m]=t24.split(":").map(Number);const p=h>=12?"PM":"AM";const h12=h===0?12:h>12?h-12:h;return`${h12}:${String(m).padStart(2,"0")} ${p}`;})
    : TIME_SLOTS_12;
  if(!isSameDay(day,today)) return slots;
  const nowMins = getAZNowMins();
  return slots.filter(s=>{const[h,m]=to24(s).split(":").map(Number);return(h*60+m)>nowMins;});
}

// ─── Main component ───────────────────────────────────────────
export default function BookingOverlay({ visitType, onClose }: BookingOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Step state
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<PatientInfo|null>(null);
  const isReturning = !!patient?.id;

  // Returning: only 2 steps (reason + calendar)
  const totalSteps = isReturning ? 2 : TOTAL_STEPS;

  // Answers
  const [symptoms, setSymptoms]               = useState("");
  const [selectedVisitType, setSelectedVisitType] = useState<string|null>(null);
  const col = VISIT_COLORS[selectedVisitType || visitType] || VISIT_COLORS.async;
  const [reason, setReason]                   = useState("");
  const [pharmaQuery, setPharmaQuery]          = useState("");
  const [pharmacy, setPharmacy]               = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [showDrop, setShowDrop]               = useState(false);
  const [pharmaResults, setPharmaResults]     = useState<{name:string;address:string}[]>([]);
  const [pharmaLoading, setPharmaLoading]     = useState(false);
  const [dropUp, setDropUp]                   = useState(false);
  const [gpsLoading, setGpsLoading]           = useState(false);
  const [gpsError, setGpsError]               = useState("");
  const [manualMode, setManualMode]           = useState(false);
  const pharmaTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Calendar
  const [calOffset, setCalOffset] = useState(0);
  const [calDay, setCalDay]       = useState("");
  const [calTime, setCalTime]     = useState("");
  const [calPulseDay, setCalPulseDay]   = useState(false);
  const [calPulseTime, setCalPulseTime] = useState(false);
  const [calMissingMsg, setCalMissingMsg] = useState("");
  const [apiSlots, setApiSlots]   = useState<string[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [nextDaySlots, setNextDaySlots]   = useState<string[]>([]);
  const [nextDayObj, setNextDayObj]       = useState<Date|null>(null);
  const [nextDayLoading, setNextDayLoading] = useState(false);

  const symRef = useRef<HTMLTextAreaElement>(null);
  const symRem = Math.max(0, 10 - symptoms.trim().length);

  // Calendar days
  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const VISIBLE=6, TOTAL=28;
  const allDays: Date[] = [];
  for(let i=0;i<TOTAL;i++){const d=new Date(today);d.setDate(d.getDate()+i);allDays.push(d);}
  const visibleDays    = allDays.slice(calOffset, calOffset+VISIBLE);
  const selectedDayObj = calDay ? new Date(calDay+"T12:00:00") : null;
  const slots          = selectedDayObj ? filterSlotsForDay(selectedDayObj, apiSlots) : [];

  // ── Mount ──
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Patient ──
  useEffect(() => {
    try { const s = sessionStorage.getItem("expressPatient"); if(s) setPatient(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    if(isReturning && patient?.pharmacy && !pharmacy) {
      setPharmacy(patient.pharmacy); setPharmaQuery(patient.pharmacy);
    }
  }, [isReturning, patient]);

  // ── Auto-focus textarea step 1 ──
  useEffect(() => {
    if(step===1 && !isReturning) setTimeout(()=>symRef.current?.focus(), 200);
  }, [step, isReturning]);

  // ── Calendar auto-load today ──
  // Fetch next business day slots when all current slots have badges (after-hours/weekend)
  const fetchNextDay = useCallback((fromDay: Date) => {
    const next = nextBusinessDay(fromDay);
    setNextDayObj(next); setNextDaySlots([]); setNextDayLoading(true);
    fetch(`/api/get-doctor-availability?date=${isoDate(next)}`)
      .then(r=>r.json()).then(data=>{
        if(data.availableSlots && data.availableSlots.length>0){
          // Convert to 12h and take first 6
          const slots12 = data.availableSlots.slice(0,6).map((t24:string)=>{
            const[h,m]=t24.split(":").map(Number);
            const p=h>=12?"PM":"AM"; const h12=h===0?12:h>12?h-12:h;
            return`${h12}:${String(m).padStart(2,"0")} ${p}`;
          });
          setNextDaySlots(slots12);
        }
      })
      .catch(()=>{}).finally(()=>setNextDayLoading(false));
  }, []);

  const isCalStep = (step===3 && !isReturning) || (step===2 && isReturning);
  const fetchSlots = useCallback((day:string) => {
    setCalDay(day); setCalTime(""); setApiSlots([]); setApiLoading(true);
    fetch(`/api/get-doctor-availability?date=${day}`)
      .then(r=>r.json()).then(data=>{if(data.availableSlots) setApiSlots(data.availableSlots);})
      .catch(()=>{}).finally(()=>setApiLoading(false));
  }, []);
  useEffect(() => {
    if(!isCalStep) return;
    if(!calDay) fetchSlots(isoDate(today));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalStep]);

  // When slots load, check if all are after-hours/weekend → fetch next business day
  useEffect(() => {
    if(!selectedDayObj || apiLoading || apiSlots.length===0) return;
    const allBadged = slots.length>0 && slots.every(s=>getSlotBadge(s, selectedDayObj)!==null);
    const isWeekend = selectedDayObj.getDay()===0 || selectedDayObj.getDay()===6;
    if(allBadged || isWeekend){
      fetchNextDay(selectedDayObj);
    } else {
      setNextDaySlots([]); setNextDayObj(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiSlots, apiLoading, calDay]);

  // ── Pharmacy search ──
  const searchPharmas = useCallback((q:string, lat?:number, lng?:number) => {
    if(pharmaTimer.current) clearTimeout(pharmaTimer.current);
    if(!q || q.length < 2) { setPharmaResults([]); setPharmaLoading(false); return; }
    setPharmaLoading(true);
    const url = lat && lng
      ? `/api/pharmacy-search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}`
      : `/api/pharmacy-search?q=${encodeURIComponent(q)}`;
    pharmaTimer.current = setTimeout(() => {
      fetch(url)
        .then(r=>r.json()).then(data=>{ setPharmaResults(data.results || []); })
        .catch(()=>{ setPharmaResults([]); })
        .finally(()=>setPharmaLoading(false));
    }, 320);
  }, []);

  // ── GPS precise search ──
  const searchWithGPS = useCallback(() => {
    if(!navigator.geolocation) { setGpsError("GPS not available on this device"); return; }
    setGpsLoading(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const q = pharmaQuery.trim() || "pharmacy";
        setPharmaLoading(true); setShowDrop(true);
        fetch(`/api/pharmacy-search?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}`)
          .then(r=>r.json()).then(data=>{ setPharmaResults(data.results || []); })
          .catch(()=>{ setPharmaResults([]); })
          .finally(()=>{ setPharmaLoading(false); setGpsLoading(false); });
      },
      (err) => {
        setGpsLoading(false);
        if(err.code===1) setGpsError("Location permission denied");
        else setGpsError("Could not get location — try typing your pharmacy");
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, [pharmaQuery]);

  // ── Dropdown flip detection (keyboard open = drop up) ──
  useEffect(() => {
    if(!showDrop) return;
    const vv = (window as any).visualViewport;
    if(!vv) return;
    const check = () => {
      const shrunk = window.innerHeight - vv.height > 150;
      setDropUp(shrunk);
    };
    check();
    vv.addEventListener("resize", check);
    return () => vv.removeEventListener("resize", check);
  }, [showDrop]);

  // ── Nav ──
  const goBack = () => {
    if(step===1) { onClose(); return; }
    setStep((s:number)=>s-1);
  };
  const goContinue = () => {
    if(isReturning) {
      if(step===1) { if(!reason.trim()) return; setStep(2); return; }
      navigateToCheckout(); return;
    }
    if(step===1) { if(symptoms.trim().length<3 || !selectedVisitType) return; setStep(2); return; }
    if(step===2) { if(!pharmacy) return; setStep(3); return; }
    // Cal step — pulse missing items instead of silently blocking
    if(!calDay && !calTime) {
      setCalMissingMsg("Please select a date and time");
      setCalPulseDay(true); setTimeout(()=>setCalPulseDay(false), 900);
      return;
    }
    if(!calDay) {
      setCalMissingMsg("Please select a date first");
      setCalPulseDay(true); setTimeout(()=>setCalPulseDay(false), 900);
      return;
    }
    if(!calTime) {
      setCalMissingMsg("Please select a time slot");
      setCalPulseTime(true); setTimeout(()=>setCalPulseTime(false), 900);
      return;
    }
    setCalMissingMsg("");
    navigateToCheckout();
  };

  const navigateToCheckout = () => {
    try {
      localStorage.removeItem("medazon_express_answers");
      localStorage.setItem("medazon_express_answers", JSON.stringify({
        reason: isReturning ? reason : symptoms,
        chiefComplaint: isReturning ? reason : symptoms,
        symptomsDone: true, pharmacy, pharmacyAddress,
        visitType: selectedVisitType || visitType, visitTypeChosen: true, visitTypeConfirmed: true,
        appointmentDate: calDay, appointmentTime: calTime,
        confirmReviewed: true,
      }));
    } catch {}
    window.location.href = "/express-checkout";
  };

  const progressPct = Math.round((step / totalSteps) * 100);
  const fieldBorder = (valid:boolean) => `2px solid ${valid ? "rgba(45,212,160,.55)" : col.border}`;
  const contDisabled =
    (step===1 && !isReturning && (symptoms.trim().length < 3 || !selectedVisitType)) ||
    (step===1 && isReturning  && !reason.trim()) ||
    (step===2 && !isReturning && !pharmacy) ||
    (isCalStep && false); // cal step uses pulse validation, not disabled state

  if(!mounted) return null;

  // ── Format selected time for display ──
  const formatTime = (t24:string) => {
    const [h,m] = t24.split(":").map(Number);
    const p = h>=12?"PM":"AM"; const h12 = h===0?12:h>12?h-12:h;
    return `${h12}:${String(m).padStart(2,"0")} ${p}`;
  };

  const portal = (
    <>
      <style>{`
        @keyframes overlayFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes cardSlideUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes stepFade      { from{opacity:0;transform:translateY(4px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes slotIn        { from{opacity:0;transform:scale(.97)}        to{opacity:1;transform:scale(1)} }
        @keyframes spin          { to{transform:rotate(360deg)} }
        @keyframes calPulse      { 0%,100%{opacity:1;transform:scale(1)} 30%{opacity:.5;transform:scale(.97)} 60%{opacity:1;transform:scale(1.01)} }
        .booking-textarea::placeholder { color: #16A34A; opacity: 0.7; }
      `}</style>

      {/*
        ── ROOT CONTAINER ──
        position:fixed + height:100dvh is the key.
        100dvh shrinks automatically when the iOS keyboard opens.
        No JS scroll lock needed. No coordinate math. No body manipulation.
        Portal to body means no parent stacking context can break position:fixed.
      */}
      <div style={{
        position:"fixed", top:0, left:0, right:0,
        height:"100dvh",
        zIndex:9999,
        display:"flex",
        flexDirection:"column",
        animation:"overlayFadeIn .18s ease",
        overflow:"hidden",
        // Full dim behind everything
        background:"rgba(0,0,0,0.45)",
      }}>

        {/* ── TOP GAP — safe area clearance, tappable to close ── */}
        <div
          onClick={onClose}
          style={{
            height:"env(safe-area-inset-top, 16px)",
            minHeight:16,
            maxHeight:24,
            flexShrink:0,
            cursor:"pointer",
          }}
        />

        {/* ── FORM CARD — starts near top ── */}
        <div style={{
          background:isCalStep?"#0d1117":"#FFFFFF",
          border:"none",
          borderRadius:"20px 20px 0 0",
          boxShadow:"0 -4px 32px rgba(0,0,0,0.18)",
          overflowY:"auto",
          overflowX:"hidden",
          scrollbarWidth:"none",
          flex:1,
          animation:"cardSlideUp .25s cubic-bezier(.4,0,.2,1)",
        }}>

          {/* Header */}
          <div style={{
            display:"flex",alignItems:"flex-start",justifyContent:"space-between",
            padding:"14px 16px 0",position:"sticky",top:0,
            background:isCalStep?"#0d1117":"#FFFFFF",zIndex:2,
          }}>
            <div style={{flex:1,marginRight:10}}>
              <div style={{fontSize:"clamp(17px,4.5vw,21px)",fontWeight:900,color:isCalStep?"#FFFFFF":"#111827",lineHeight:1.1}}
                   key={step}>
                {getStepTitle(step, isReturning)}
              </div>
              <div style={{fontSize:11,color:isCalStep?"rgba(255,255,255,.5)":"#16A34A",marginTop:3,fontWeight:600}}>
                {VISIT_LABELS[visitType]} · Step {step} of {totalSteps}
              </div>
            </div>
            <button onClick={onClose} style={{
              width:30,height:30,borderRadius:"50%",
              border:"1.5px solid #E5E7EB",background:"#F9FAFB",
              color:"#6B7280",fontSize:13,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            }}>✕</button>
          </div>

          {/* Progress bar */}
          <div style={{height:3,background:isCalStep?"rgba(255,255,255,.08)":"#E5E7EB",margin:"10px 16px 0",borderRadius:2}}>
            <div style={{height:"100%",background:"#16A34A",borderRadius:2,width:`${progressPct}%`,transition:"width .35s"}}/>
          </div>

          {/* Step content */}
          <div style={{padding:"12px 16px 0"}} key={`step-${step}`}>

            {/* S1 NEW — Symptoms */}
            {step===1 && !isReturning && (
              <div style={{display:"flex",flexDirection:"column",gap:8,animation:"stepFade .2s ease"}}>
                <textarea
                  ref={symRef}
                  value={symptoms}
                  onChange={(e:React.ChangeEvent<HTMLTextAreaElement>)=>setSymptoms(e.target.value)}
                  placeholder="e.g., Burning during urination for 3 days..." className="booking-textarea"
                  style={{
                    width:"100%",height:120,background:isMobile?"#F0FDF4":"transparent",
                    border:symptoms.trim().length>=3?"2px solid #16A34A":"1.5px solid #BBF7D0",
                    borderRadius:10,padding:"11px 12px",color:"#111827",fontSize:14,
                    resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,
                  }}
                />
                <div style={{fontSize:12,color:"#16A34A",fontWeight:500}}>Describe why you&apos;re booking today</div>
                {/* Line 1+2: char counter below 3 chars, visit type selector at 3+ */}
                {symptoms.trim().length < 3 ? (
                  <div style={{fontSize:12,color:"#6B7280"}}>
                    <b style={{color:"#16A34A",fontSize:14}}>{Math.max(0,3-symptoms.trim().length)}</b> more characters needed
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6,animation:"stepFade .15s ease"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>Select visit type</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                      {(["async","sms","refill","video","phone","instant"] as const).map((vt) => {
                        const vtColors: Record<string,{bg:string;border:string;text:string;activeBg:string}> = {
                          async:   {bg:"transparent",border:"rgba(236,72,153,0.3)",  text:"#f472b6", activeBg:"#ec4899"},
                          sms:     {bg:"transparent",border:"rgba(168,85,247,0.3)",  text:"#c084fc", activeBg:"#a855f7"},
                          refill:  {bg:"transparent",border:"rgba(34,197,94,0.3)",   text:"#4ade80", activeBg:"#22c55e"},
                          video:   {bg:"transparent",border:"rgba(59,130,246,0.3)",  text:"#60a5fa", activeBg:"#3b82f6"},
                          phone:   {bg:"transparent",border:"rgba(6,182,212,0.3)",   text:"#22d3ee", activeBg:"#0891b2"},
                          instant: {bg:"transparent",border:"rgba(249,115,22,0.3)",  text:"#fb923c", activeBg:"#f97316"},
                        };
                        const vtLabels: Record<string,string> = {
                          async:"Async", sms:"SMS", refill:"Rx Refill",
                          video:"Video", phone:"Phone", instant:"Instant",
                        };
                        const isSelected = selectedVisitType === vt;
                        const c = vtColors[vt];
                        return (
                          <button key={vt} onClick={()=>setSelectedVisitType(vt)} style={{
                            padding:"7px 4px",
                            borderRadius:8,
                            border:`1.5px solid ${isSelected ? c.activeBg : c.border}`,
                            background:isSelected ? c.activeBg : "rgba(255,255,255,0.05)",
                            color:isSelected ? "#fff" : c.text,
                            fontSize:11,fontWeight:700,
                            cursor:"pointer",
                            transition:"all .15s",
                            boxShadow:isSelected ? `0 2px 8px ${c.border}` : "none",
                          }}>
                            {vtLabels[vt]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* S1 RETURNING — Reason */}
            {step===1 && isReturning && (
              <div style={{display:"flex",flexDirection:"column",gap:8,animation:"stepFade .2s ease"}}>
                <textarea
                  value={reason}
                  onChange={(e:React.ChangeEvent<HTMLTextAreaElement>)=>setReason(e.target.value)}
                  placeholder="e.g., Follow up for UTI, need prescription refill..." className="booking-textarea"
                  autoFocus
                  style={{
                    width:"100%",height:120,background:isMobile?"#F0FDF4":"transparent",
                    border:reason.trim().length>0?"2px solid #16A34A":"1.5px solid #BBF7D0",
                    borderRadius:10,padding:"11px 12px",color:"#111827",fontSize:14,
                    resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,
                  }}
                />
                <div style={{fontSize:12,color:reason.trim()?"#16A34A":"#9CA3AF",fontWeight:reason.trim()?700:400}}>
                  {reason.trim() ? "✓ Ready to continue" : "Describe why you're booking today"}
                </div>
              </div>
            )}

            {/* S2 NEW — Pharmacy */}
            {step===2 && !isReturning && (
              <div style={{display:"flex",flexDirection:"column",gap:6,position:"relative",animation:"stepFade .2s ease"}}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g. CVS near 5th Ave, Walgreens on Main..."
                  value={pharmaQuery}
                  autoFocus
                  onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{
                    const v = e.target.value;
                    setPharmaQuery(v); setPharmacy(""); setPharmacyAddress(""); setShowDrop(true);
                    searchPharmas(v);
                  }}
                  onFocus={()=>setShowDrop(true)}
                  style={{
                    width:"100%",background:"#F9FAFB",
                    border:pharmacy?"2px solid #16A34A":"1.5px solid #D1D5DB",
                    borderRadius:10,padding:"11px 12px",color:"#111827",fontSize:14,
                    outline:"none",fontFamily:"system-ui",
                  }}
                />
                {/* Dropdown — flips above input when keyboard is open */}
                {showDrop && !pharmacy && (
                  <div style={{
                    background:isCalStep?"#0d1117":"#FFFFFF",
                    border:"1px solid #E5E7EB",
                    borderRadius:10,overflow:"hidden",
                    maxHeight:dropUp ? 160 : 220,
                    overflowY:"auto",
                    position:"absolute",
                    left:0, right:0,
                    zIndex:10,
                    boxShadow:"0 4px 16px rgba(0,0,0,0.1)",
                    ...(dropUp
                      ? { bottom:"calc(100% + 4px)" }
                      : { top:"calc(100% + 4px)" }
                    ),
                  }}>
                    {pharmaLoading ? (
                      <div style={{padding:"14px 12px",fontSize:12,color:"#9CA3AF",textAlign:"center"}}>
                        Searching…
                      </div>
                    ) : pharmaResults.length > 0 ? (
                      pharmaResults.map((p:{name:string;address:string},i:number) => (
                        <div key={i}
                          onMouseDown={(e:React.MouseEvent)=>{e.preventDefault();setPharmacy(p.name);setPharmacyAddress(p.address);setPharmaQuery(p.name);setShowDrop(false);}}
                          onTouchEnd={(e:React.TouchEvent)=>{e.preventDefault();setPharmacy(p.name);setPharmacyAddress(p.address);setPharmaQuery(p.name);setShowDrop(false);}}
                          style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid #F3F4F6"}}
                        >
                          <div style={{fontSize:13,color:"#111827",fontWeight:600}}>{p.name}</div>
                          <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>
                            {p.address.length > 40 ? p.address.slice(0,40)+"…" : p.address}
                          </div>
                        </div>
                      ))
                    ) : pharmaQuery.length >= 2 ? (
                      <div style={{padding:"14px 12px",fontSize:12,color:"#9CA3AF",textAlign:"center"}}>
                        No pharmacies found — try a different name
                      </div>
                    ) : null}
                  </div>
                )}

                {/* GPS button */}
                {!pharmacy && !manualMode && (
                  <button
                    onMouseDown={(e:React.MouseEvent)=>{e.preventDefault();searchWithGPS();}}
                    onTouchEnd={(e:React.TouchEvent)=>{e.preventDefault();searchWithGPS();}}
                    style={{
                      display:"flex",alignItems:"center",gap:8,
                      padding:"10px 12px",borderRadius:10,cursor:"pointer",
                      background:"#F0FDF4",
                      border:"1px solid #BBF7D0",
                      color:"#15803D",fontSize:13,fontWeight:600,textAlign:"left",
                      width:"100%",
                    }}
                  >
                    {gpsLoading
                      ? <><div style={{width:14,height:14,border:"2px solid #BBF7D0",borderTop:"2px solid #16A34A",borderRadius:"50%",animation:"spin 1s linear infinite",flexShrink:0}}/> Getting your location…</>
                      : <><span style={{fontSize:16,flexShrink:0}}>📍</span><div><div>Use my exact location</div><div style={{fontSize:11,color:"#6B7280",fontWeight:400,marginTop:1}}>Get pharmacies closest to you</div></div></>
                    }
                  </button>
                )}
                {gpsError && (
                  <div style={{fontSize:11,color:"#DC2626",padding:"0 2px"}}>{gpsError}</div>
                )}

                {/* Manual entry toggle */}
                {!pharmacy && !manualMode && (
                  <button
                    onMouseDown={(e:React.MouseEvent)=>{e.preventDefault();setManualMode(true);setShowDrop(false);setPharmaQuery("");}}
                    onTouchEnd={(e:React.TouchEvent)=>{e.preventDefault();setManualMode(true);setShowDrop(false);setPharmaQuery("");}}
                    style={{
                      display:"flex",alignItems:"center",gap:8,
                      padding:"10px 12px",borderRadius:10,cursor:"pointer",
                      background:"#F9FAFB",
                      border:"1px solid #E5E7EB",
                      color:"#6B7280",fontSize:13,textAlign:"left",
                      width:"100%",
                    }}
                  >
                    <span style={{fontSize:16,flexShrink:0}}>🔍</span>
                    <div>
                      <div style={{fontWeight:600,color:"#374151"}}>Can&apos;t find yours? Enter manually</div>
                      <div style={{fontSize:11,color:"#9CA3AF",fontWeight:400,marginTop:1}}>Type any pharmacy name or address</div>
                    </div>
                  </button>
                )}

                {/* Manual entry mode */}
                {manualMode && !pharmacy && (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{fontSize:11,color:"#6B7280"}}>Enter your pharmacy name &amp; address:</div>
                    <input
                      type="text"
                      placeholder="e.g. Smith's Pharmacy, 123 Oak St"
                      autoFocus
                      onKeyDown={(e:React.KeyboardEvent<HTMLInputElement>)=>{
                        if(e.key==="Enter" && (e.target as HTMLInputElement).value.trim()) {
                          const v = (e.target as HTMLInputElement).value.trim();
                          setPharmacy(v); setPharmacyAddress(""); setPharmaQuery(v);
                        }
                      }}
                      style={{
                        width:"100%",background:"#F9FAFB",
                        border:"1.5px solid #D1D5DB",
                        borderRadius:10,padding:"11px 12px",color:"#111827",fontSize:14,
                        outline:"none",fontFamily:"system-ui",
                      }}
                    />
                    <div style={{display:"flex",gap:6}}>
                      <button
                        onMouseDown={(e:React.MouseEvent)=>{e.preventDefault();
                          const inp = e.currentTarget.closest("div")?.previousElementSibling as HTMLInputElement;
                          if(inp?.value?.trim()){setPharmacy(inp.value.trim());setPharmacyAddress("");setPharmaQuery(inp.value.trim());}
                        }}
                        onTouchEnd={(e:React.TouchEvent)=>{e.preventDefault();
                          const inp = e.currentTarget.closest("div")?.previousElementSibling as HTMLInputElement;
                          if(inp?.value?.trim()){setPharmacy(inp.value.trim());setPharmacyAddress("");setPharmaQuery(inp.value.trim());}
                        }}
                        style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}
                      >Confirm</button>
                      <button
                        onMouseDown={(e:React.MouseEvent)=>{e.preventDefault();setManualMode(false);}}
                        onTouchEnd={(e:React.TouchEvent)=>{e.preventDefault();setManualMode(false);}}
                        style={{flex:1,padding:"9px",borderRadius:9,border:"1.5px solid #E5E7EB",background:"#FFFFFF",color:"#6B7280",fontSize:13,cursor:"pointer"}}
                      >Back</button>
                    </div>
                  </div>
                )}

                {pharmacy && (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"8px 10px",background:"#F0FDF4",
                    borderRadius:8,border:"1px solid #BBF7D0"}}>
                    <div style={{fontSize:12,color:"#15803D",fontWeight:700,flex:1,minWidth:0}}>
                      ✓ {pharmacy}{pharmacyAddress ? ` — ${pharmacyAddress.length>35?pharmacyAddress.slice(0,35)+"…":pharmacyAddress}` : ""}
                    </div>
                    <button
                      onMouseDown={(e:React.MouseEvent)=>{e.preventDefault();setPharmacy("");setPharmacyAddress("");setPharmaQuery("");setManualMode(false);setShowDrop(false);}}
                      onTouchEnd={(e:React.TouchEvent)=>{e.preventDefault();setPharmacy("");setPharmacyAddress("");setPharmaQuery("");setManualMode(false);setShowDrop(false);}}
                      style={{fontSize:11,color:"#16A34A",background:"none",border:"none",cursor:"pointer",padding:"0 4px",flexShrink:0,textDecoration:"underline"}}
                    >change</button>
                  </div>
                )}
              </div>
            )}

            {/* Calendar (S3 new / S2 returning) */}
            {isCalStep && (
              <div style={{
                display:"flex",flexDirection:"column",gap:0,animation:"stepFade .2s ease",
                background:"#0d1117",
                borderRadius:12,
                padding:"12px 10px",
                margin:"0 -4px",
              }}>
                {/* Day strip */}
                <div style={{
                  display:"flex",alignItems:"center",gap:0,marginBottom:8,
                  animation:calPulseDay?"calPulse .6s ease":"none",
                  borderRadius:8,
                  outline:calPulseDay?"2px solid rgba(249,115,22,.6)":"2px solid transparent",
                  transition:"outline .15s",
                }}>
                  <button
                    onClick={()=>{setCalOffset(Math.max(0,calOffset-VISIBLE));setCalDay("");setCalTime("");}}
                    disabled={calOffset===0}
                    style={{width:24,height:24,background:"none",border:"none",
                      color:calOffset===0?"rgba(255,255,255,.2)":"rgba(45,212,160,.8)",
                      cursor:calOffset===0?"default":"pointer",flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center"}}
                  ><ChevronLeft size={16}/></button>

                  <div style={{flex:1,display:"flex",gap:2}}>
                    {visibleDays.map(day=>{
                      const iso = isoDate(day);
                      const isSel = calDay===iso;
                      const isToday = isSameDay(day,today);
                      const isTom   = isSameDay(day,tomorrow);
                      return (
                        <button key={iso} onClick={()=>{fetchSlots(iso);setCalMissingMsg("");}} style={{
                          flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                          justifyContent:"center",padding:"6px 1px 5px",borderRadius:9,cursor:"pointer",
                          border:isSel?"2px solid #16A34A":isToday?"2px solid rgba(45,212,160,.25)":"2px solid transparent",
                          background:isSel?"#16A34A":"transparent",gap:1,minWidth:0,
                        }}>
                          <span style={{fontSize:9,fontWeight:700,color:isSel?"#fff":"rgba(255,255,255,.5)",letterSpacing:".04em",lineHeight:1}}>
                            {DAY_ABBR[day.getDay()]}
                          </span>
                          <span style={{fontSize:20,fontWeight:800,color:"#fff",lineHeight:1.15}}>
                            {day.getDate()}
                          </span>
                          <span style={{fontSize:8,fontWeight:600,color:isSel?"#fff":"rgba(255,255,255,.4)",lineHeight:1,marginTop:1}}>
                            {isToday?"Today":isTom?"Tmrw":SHORT_MO[day.getMonth()]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={()=>{setCalOffset(Math.min(calOffset+VISIBLE,TOTAL-VISIBLE));setCalDay("");setCalTime("");}}
                    disabled={calOffset+VISIBLE>=TOTAL}
                    style={{background:"none",border:"none",
                      color:calOffset+VISIBLE>=TOTAL?"rgba(255,255,255,.2)":"rgba(45,212,160,.8)",
                      cursor:calOffset+VISIBLE>=TOTAL?"default":"pointer",flexShrink:0,
                      fontSize:11,fontWeight:700,letterSpacing:".02em",paddingRight:2}}>Next&nbsp;&gt;</button>
                </div>

                <div style={{height:1,background:"rgba(255,255,255,.08)",marginBottom:8}}/>

                {/* Missing message */}
                {calMissingMsg ? (
                  <div style={{
                    fontSize:11,fontWeight:700,color:"#f97316",
                    textAlign:"center",padding:"4px 0 6px",
                    animation:"stepFade .2s ease",
                  }}>⚠ {calMissingMsg}</div>
                ) : null}

                {/* Time grid */}
                <div style={{
                  minHeight:100,maxHeight:260,overflowY:"auto",scrollbarWidth:"none",
                  animation:calPulseTime?"calPulse .6s ease":"none",
                  borderRadius:8,
                  outline:calPulseTime?"2px solid rgba(249,115,22,.6)":"2px solid transparent",
                  transition:"outline .15s",
                }}>
                  {!calDay ? (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                      height:100,color:"rgba(255,255,255,.3)",fontSize:13}}>
                      Select a day above
                    </div>
                  ) : apiLoading ? (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:100,gap:8}}>
                      <div style={{width:18,height:18,border:"2px solid rgba(45,212,160,.2)",
                        borderTop:"2px solid #2dd4a0",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                      <span style={{color:"rgba(255,255,255,.4)",fontSize:12}}>Loading times…</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div style={{textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:13,paddingTop:20}}>
                      No slots available — try another day
                    </div>
                  ) : (
                    <>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                      {slots.map((slot,i)=>{
                        const isAct  = calTime===to24(slot);
                        const badge  = selectedDayObj ? getSlotBadge(slot,selectedDayObj) : null;
                        return (
                          <button key={slot} onClick={()=>{setCalTime(to24(slot));setCalMissingMsg("");}} style={{
                            padding:badge?"6px 4px":"10px 4px",borderRadius:9,cursor:"pointer",
                            border:isAct?"2px solid #16A34A":badge?"2px solid rgba(249,115,22,.55)":"1.5px solid rgba(255,255,255,.1)",
                            background:isAct?"#16A34A":badge?"rgba(22,13,4,.95)":"rgba(255,255,255,.05)",
                            color:isAct?"#fff":badge?"#fff":"#e2e8f0",fontSize:13,fontWeight:700,
                            display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                            animation:`slotIn .2s ease ${i*0.025}s both`,
                          }}>
                            {badge && <span style={{fontSize:9,fontWeight:800,color:isAct?"#fff":"#f97316",lineHeight:1,letterSpacing:".03em",textTransform:"uppercase"}}>{badge.label}</span>}
                            <span>{slot}</span>
                            {badge && <span style={{fontSize:8,fontWeight:700,color:isAct?"#d1fae5":"#4ade80",lineHeight:1}}>I'm available</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next business day suggestion row */}
                    {(nextDaySlots.length>0 || nextDayLoading) && nextDayObj && (
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",marginBottom:4,paddingLeft:2}}>
                          ☀️ {FULL_DAYS[nextDayObj.getDay()]}, {SHORT_MO[nextDayObj.getMonth()]} {nextDayObj.getDate()}
                        </div>
                        {nextDayLoading ? (
                          <div style={{fontSize:11,color:"rgba(255,255,255,.3)",padding:"6px 2px"}}>Loading…</div>
                        ) : (
                          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                            {nextDaySlots.map((slot:string,i:number)=>{
                              const t24n = to24(slot);
                              const isActN = calTime===t24n && calDay===isoDate(nextDayObj!);
                              return (
                                <button key={slot} onClick={()=>{
                                  // Jump calendar to next day and select time
                                  fetchSlots(isoDate(nextDayObj!));
                                  setCalTime(t24n);
                                  // Make sure next day is visible — update offset if needed
                                  const nextIdx = allDays.findIndex(d=>isoDate(d)===isoDate(nextDayObj!));
                                  if(nextIdx>=0) setCalOffset(Math.floor(nextIdx/VISIBLE)*VISIBLE);
                                }} style={{
                                  padding:"10px 4px",borderRadius:9,cursor:"pointer",
                                  border:isActN?"2px solid #16A34A":"1.5px solid rgba(255,255,255,.1)",
                                  background:isActN?"#16A34A":"rgba(255,255,255,.05)",
                                  color:isActN?"#fff":"#e2e8f0",fontSize:13,fontWeight:700,
                                  display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                                  animation:`slotIn .2s ease ${i*0.025}s both`,
                                }}>
                                  <span>{slot}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    </>
                  )}
                </div>

                {/* Selected summary */}
                {calDay && calTime && (
                  <div style={{marginTop:8,padding:"10px 12px",background:"rgba(45,212,160,.08)",
                    borderRadius:8,border:"1px solid rgba(45,212,160,.25)",overflow:"hidden"}}>
                    <span style={{
                      fontSize:"clamp(13px,4vw,18px)",
                      color:"#2dd4a0",fontWeight:800,
                      whiteSpace:"nowrap",
                      display:"block",
                      letterSpacing:"-0.01em",
                    }}>
                      ✓ {FULL_DAYS[new Date(calDay+"T12:00:00").getDay()]}, {SHORT_MO[new Date(calDay+"T12:00:00").getMonth()]} {new Date(calDay+"T12:00:00").getDate()} @ {formatTime(calTime)}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Nav buttons */}
          <div style={{
            display:"flex",gap:8,padding:"12px 16px 16px",
            paddingBottom:"max(16px,env(safe-area-inset-bottom))",
            borderTop:isCalStep?"1px solid rgba(255,255,255,.06)":"1px solid #F3F4F6",marginTop:12,
            background:isCalStep?"#0d1117":"#FFFFFF",
            position:"sticky",bottom:0,zIndex:2,
          }}>
            <button onClick={goBack} style={{
              flex:1,height:48,borderRadius:12,
              background:isCalStep?"#16A34A":"#FFFFFF",
              border:isCalStep?"none":"1.5px solid #E5E7EB",
              color:isCalStep?"#fff":"#374151",fontSize:14,fontWeight:700,cursor:"pointer",
            }}>← Back</button>
            <button onClick={goContinue} disabled={!isCalStep && contDisabled} style={{
              flex:2,height:48,borderRadius:12,
              border:isCalStep?(calDay&&calTime?"2.5px solid #16A34A":"2.5px solid rgba(255,255,255,0.5)"):"none",
              background:(!isCalStep&&contDisabled)?"#F3F4F6":isCalStep?"#f97316":"linear-gradient(135deg,#16A34A 0%,#15803D 100%)",
              color:(!isCalStep&&contDisabled)?"#16A34A":"#fff",
              fontSize:14,fontWeight:900,
              cursor:(!isCalStep&&contDisabled)?"default":"pointer",
              boxShadow:isCalStep?(calDay&&calTime?"0 4px 16px rgba(22,163,74,0.4)":"0 4px 16px rgba(249,115,22,0.3)"):(contDisabled?"none":"0 4px 12px rgba(22,163,74,0.3)"),
              transition:"all .25s",
            }}>
              {step===totalSteps ? "Book My Visit →" : "Continue →"}
            </button>
          </div>

          {/* Trust footer */}
          <div style={{textAlign:"center",paddingBottom:"max(12px,env(safe-area-inset-bottom))",paddingTop:6,background:isCalStep?"#0d1117":"#FFFFFF"}}>
            <span style={{fontSize:10,color:isCalStep?"rgba(255,255,255,.25)":"#9CA3AF",letterSpacing:".02em"}}>
              HIPAA Secure · Licensed Providers · No subscription
            </span>
          </div>

        </div>
        {/* No bottom dim — card touches bottom of viewport */}
      </div>
    </>
  );

  return createPortal(portal, document.body);
}
