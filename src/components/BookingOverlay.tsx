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
  if (s===1) return "Describe Your Symptoms";
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
  if(day.getDay()===0||day.getDay()===6) return {label:"Weekend Rate",color:"#f59e0b"};
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
  const col = VISIT_COLORS[visitType] || VISIT_COLORS.async;
  const [mounted, setMounted] = useState(false);

  // Step state
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<PatientInfo|null>(null);
  const isReturning = !!(patient?.id || (patient?.source && patient.source !== "new"));

  // Returning: only 2 steps (reason + calendar)
  const totalSteps = isReturning ? 2 : TOTAL_STEPS;

  // Answers
  const [symptoms, setSymptoms]               = useState("");
  const [reason, setReason]                   = useState("");
  const [pharmaQuery, setPharmaQuery]          = useState("");
  const [pharmacy, setPharmacy]               = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [showDrop, setShowDrop]               = useState(false);
  const [pharmaResults, setPharmaResults]     = useState<{name:string;address:string}[]>([]);
  const [pharmaLoading, setPharmaLoading]     = useState(false);
  const [dropUp, setDropUp]                   = useState(false);
  const pharmaTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // Calendar
  const [calOffset, setCalOffset] = useState(0);
  const [calDay, setCalDay]       = useState("");
  const [calTime, setCalTime]     = useState("");
  const [apiSlots, setApiSlots]   = useState<string[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

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

  // ── Pharmacy search ──
  const searchPharmas = useCallback((q:string) => {
    if(pharmaTimer.current) clearTimeout(pharmaTimer.current);
    if(!q || q.length < 2) { setPharmaResults([]); setPharmaLoading(false); return; }
    setPharmaLoading(true);
    pharmaTimer.current = setTimeout(() => {
      fetch(`/api/pharmacy-search?q=${encodeURIComponent(q)}`)
        .then(r=>r.json()).then(data=>{ setPharmaResults(data.results || []); })
        .catch(()=>{ setPharmaResults([]); })
        .finally(()=>setPharmaLoading(false));
    }, 320);
  }, []);

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
    setStep(s=>s-1);
  };
  const goContinue = () => {
    if(isReturning) {
      if(step===1) { if(!reason.trim()) return; setStep(2); return; }
      navigateToCheckout(); return;
    }
    if(step===1) { if(symptoms.trim().length<10) { symRef.current?.focus(); return; } setStep(2); return; }
    if(step===2) { if(!pharmacy) return; setStep(3); return; }
    navigateToCheckout();
  };

  const navigateToCheckout = () => {
    try {
      localStorage.removeItem("medazon_express_answers");
      localStorage.setItem("medazon_express_answers", JSON.stringify({
        reason: isReturning ? reason : symptoms,
        chiefComplaint: isReturning ? reason : symptoms,
        symptomsDone: true, pharmacy, pharmacyAddress,
        visitType, visitTypeChosen: true, visitTypeConfirmed: true,
        appointmentDate: calDay, appointmentTime: calTime,
        confirmReviewed: true,
      }));
    } catch {}
    window.location.href = "/express-checkout";
  };

  const progressPct = Math.round((step / totalSteps) * 100);
  const fieldBorder = (valid:boolean) => `2px solid ${valid ? "rgba(45,212,160,.55)" : col.border}`;
  const contDisabled =
    (step===1 && !isReturning && symptoms.trim().length < 10) ||
    (step===1 && isReturning  && !reason.trim()) ||
    (step===2 && !isReturning && !pharmacy) ||
    (isCalStep && (!calDay || !calTime));

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
        // Overflow hidden — nothing can scroll or overflow this container
        overflow:"hidden",
      }}>

        {/* ── DIM AREA (top) — tappable to close ── */}
        <div
          onClick={onClose}
          style={{
            flex:1,
            background:"rgba(4,8,7,.82)",
            cursor:"pointer",
            // Minimum tap target — always show some dim above card
            minHeight:40,
          }}
        />

        {/* ── FORM CARD ── */}
        <div style={{
          background:"#090e0b",
          border:`2px solid ${col.border}`,
          borderRadius:"16px 16px 0 0",
          // Card content scrollable only if needed (calendar step is tallest)
          overflowY:"auto",
          overflowX:"hidden",
          scrollbarWidth:"none",
          flexShrink:0,
          animation:"cardSlideUp .25s cubic-bezier(.4,0,.2,1)",
          // Max height — card cannot take more than 90% of viewport
          maxHeight:"calc(100dvh - 40px)",
        }}>

          {/* Header */}
          <div style={{
            display:"flex",alignItems:"flex-start",justifyContent:"space-between",
            padding:"14px 16px 0",position:"sticky",top:0,
            background:"#090e0b",zIndex:2,
          }}>
            <div style={{flex:1,marginRight:10}}>
              <div style={{fontSize:"clamp(17px,4.5vw,21px)",fontWeight:900,color:"#fff",lineHeight:1.1}}
                   key={step}>
                {getStepTitle(step, isReturning)}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:3,fontWeight:600}}>
                {VISIT_LABELS[visitType]} · Step {step} of {totalSteps}
              </div>
            </div>
            <button onClick={onClose} style={{
              width:28,height:28,borderRadius:"50%",
              border:`1px solid ${col.border}`,background:col.dim,
              color:"#fff",fontSize:13,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            }}>✕</button>
          </div>

          {/* Progress bar */}
          <div style={{height:3,background:"rgba(255,255,255,.08)",margin:"10px 16px 0",borderRadius:2}}>
            <div style={{height:"100%",background:col.cta,borderRadius:2,width:`${progressPct}%`,transition:"width .35s"}}/>
          </div>

          {/* Step content */}
          <div style={{padding:"12px 16px 0"}} key={`step-${step}`}>

            {/* S1 NEW — Symptoms */}
            {step===1 && !isReturning && (
              <div style={{display:"flex",flexDirection:"column",gap:8,animation:"stepFade .2s ease"}}>
                <textarea
                  ref={symRef}
                  value={symptoms}
                  onChange={e=>setSymptoms(e.target.value)}
                  placeholder="e.g., Burning during urination for 3 days..."
                  style={{
                    width:"100%",height:120,background:"rgba(255,255,255,.04)",
                    border:fieldBorder(symptoms.trim().length>=10),
                    borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:14,
                    resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,
                  }}
                />
                <div style={{fontSize:12,color:symRem>0?"rgba(255,255,255,.45)":"#4ade80",fontWeight:symRem===0?700:400}}>
                  {symRem>0
                    ? <><b style={{color:col.accent,fontSize:14}}>{symRem}</b> more characters needed</>
                    : "✓ Ready to continue"
                  }
                </div>
              </div>
            )}

            {/* S1 RETURNING — Reason */}
            {step===1 && isReturning && (
              <div style={{display:"flex",flexDirection:"column",gap:8,animation:"stepFade .2s ease"}}>
                <textarea
                  value={reason}
                  onChange={e=>setReason(e.target.value)}
                  placeholder="e.g., Follow up for UTI, need prescription refill..."
                  autoFocus
                  style={{
                    width:"100%",height:120,background:"rgba(255,255,255,.04)",
                    border:fieldBorder(reason.trim().length>0),
                    borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:14,
                    resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,
                  }}
                />
                <div style={{fontSize:12,color:reason.trim()?"#4ade80":"rgba(255,255,255,.4)",fontWeight:reason.trim()?700:400}}>
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
                  onChange={e=>{
                    const v = e.target.value;
                    setPharmaQuery(v); setPharmacy(""); setPharmacyAddress(""); setShowDrop(true);
                    searchPharmas(v);
                  }}
                  onFocus={()=>setShowDrop(true)}
                  style={{
                    width:"100%",background:"rgba(255,255,255,.04)",
                    border:fieldBorder(!!pharmacy),
                    borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:14,
                    outline:"none",fontFamily:"system-ui",
                  }}
                />
                {/* Dropdown — flips above input when keyboard is open */}
                {showDrop && !pharmacy && (
                  <div style={{
                    background:"#0d1610",
                    border:`1px solid ${col.border}`,
                    borderRadius:10,overflow:"hidden",
                    maxHeight:dropUp ? 160 : 200,
                    overflowY:"auto",
                    // Flip above input when keyboard open
                    ...(dropUp ? {
                      position:"absolute",
                      bottom:"calc(100% + 4px)",
                      left:0,right:0,
                    } : {}),
                  }}>
                    {pharmaLoading ? (
                      <div style={{padding:"14px 12px",fontSize:12,color:"rgba(255,255,255,.4)",textAlign:"center"}}>
                        Searching…
                      </div>
                    ) : pharmaResults.length > 0 ? (
                      pharmaResults.map((p,i) => (
                        <div key={i}
                          onMouseDown={e=>{e.preventDefault();setPharmacy(p.name);setPharmacyAddress(p.address);setPharmaQuery(p.name);setShowDrop(false);}}
                          onTouchEnd={e=>{e.preventDefault();setPharmacy(p.name);setPharmacyAddress(p.address);setPharmaQuery(p.name);setShowDrop(false);}}
                          style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.05)"}}
                        >
                          <div style={{fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:600}}>{p.name}</div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>
                            {p.address.length > 40 ? p.address.slice(0,40)+"…" : p.address}
                          </div>
                        </div>
                      ))
                    ) : pharmaQuery.length >= 2 ? (
                      <div style={{padding:"14px 12px",fontSize:12,color:"rgba(255,255,255,.4)",textAlign:"center"}}>
                        No pharmacies found — try a different name
                      </div>
                    ) : null}
                  </div>
                )}
                {pharmacy && (
                  <div style={{fontSize:12,color:"#4ade80",fontWeight:700}}>
                    ✓ {pharmacy}{pharmacyAddress ? ` — ${pharmacyAddress.length>35?pharmacyAddress.slice(0,35)+"…":pharmacyAddress}` : ""}
                  </div>
                )}
              </div>
            )}

            {/* Calendar (S3 new / S2 returning) */}
            {isCalStep && (
              <div style={{display:"flex",flexDirection:"column",gap:0,animation:"stepFade .2s ease"}}>
                {/* Day strip */}
                <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:8}}>
                  <button
                    onClick={()=>{setCalOffset(Math.max(0,calOffset-VISIBLE));setCalDay("");setCalTime("");}}
                    disabled={calOffset===0}
                    style={{width:24,height:24,background:"none",border:"none",
                      color:calOffset===0?"rgba(255,255,255,.15)":col.accent,
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
                        <button key={iso} onClick={()=>fetchSlots(iso)} style={{
                          flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                          justifyContent:"center",padding:"6px 1px 5px",borderRadius:9,cursor:"pointer",
                          border:isSel?`2px solid ${col.accent}`:isToday?"2px solid rgba(45,212,160,.2)":"2px solid transparent",
                          background:isSel?col.cta:"transparent",gap:1,minWidth:0,
                        }}>
                          <span style={{fontSize:9,fontWeight:700,color:isSel?"#fff":"#64748b",letterSpacing:".04em",lineHeight:1}}>
                            {DAY_ABBR[day.getDay()]}
                          </span>
                          <span style={{fontSize:18,fontWeight:700,color:isSel?"#fff":"#cbd5e1",lineHeight:1.2}}>
                            {day.getDate()}
                          </span>
                          <span style={{fontSize:8,fontWeight:600,color:isSel?"#fff":col.accent,lineHeight:1,marginTop:1}}>
                            {isToday?"Today":isTom?"Tmrw":SHORT_MO[day.getMonth()]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={()=>{setCalOffset(Math.min(calOffset+VISIBLE,TOTAL-VISIBLE));setCalDay("");setCalTime("");}}
                    disabled={calOffset+VISIBLE>=TOTAL}
                    style={{width:24,height:24,background:"none",border:"none",
                      color:calOffset+VISIBLE>=TOTAL?"rgba(255,255,255,.15)":col.accent,
                      cursor:calOffset+VISIBLE>=TOTAL?"default":"pointer",flexShrink:0,
                      display:"flex",alignItems:"center",justifyContent:"center",transform:"rotate(180deg)"}}
                  ><ChevronLeft size={16}/></button>
                </div>

                <div style={{height:1,background:"rgba(255,255,255,.07)",marginBottom:8}}/>

                {/* Time grid */}
                <div style={{minHeight:100,maxHeight:180,overflowY:"auto",scrollbarWidth:"none"}}>
                  {!calDay ? (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                      height:100,color:"rgba(255,255,255,.3)",fontSize:13}}>
                      Select a day above
                    </div>
                  ) : apiLoading ? (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:100,gap:8}}>
                      <div style={{width:18,height:18,border:"2px solid rgba(45,212,160,.2)",
                        borderTop:`2px solid ${col.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                      <span style={{color:"rgba(255,255,255,.4)",fontSize:12}}>Loading times…</span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div style={{textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:13,paddingTop:20}}>
                      No slots available — try another day
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                      {slots.map((slot,i)=>{
                        const isAct  = calTime===to24(slot);
                        const badge  = selectedDayObj ? getSlotBadge(slot,selectedDayObj) : null;
                        return (
                          <button key={slot} onClick={()=>setCalTime(to24(slot))} style={{
                            padding:badge?"6px 3px 4px":"8px 3px",borderRadius:9,cursor:"pointer",
                            border:isAct?`2px solid ${col.accent}`:badge?"2px solid rgba(249,115,22,.25)":"2px solid rgba(255,255,255,.1)",
                            background:isAct?col.cta:badge?"rgba(249,115,22,.04)":"rgba(255,255,255,.03)",
                            color:isAct?"#fff":"#e2e8f0",fontSize:12,fontWeight:700,
                            display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                            animation:`slotIn .2s ease ${i*0.025}s both`,
                          }}>
                            <span>{slot}</span>
                            {badge && <span style={{fontSize:7,fontWeight:700,color:isAct?"#fed7aa":badge.color,lineHeight:1}}>{badge.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected summary */}
                {calDay && calTime && (
                  <div style={{marginTop:8,padding:"8px 10px",background:"rgba(45,212,160,.06)",
                    borderRadius:8,border:"1px solid rgba(45,212,160,.2)"}}>
                    <span style={{fontSize:12,color:"#2dd4a0",fontWeight:700}}>
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
            borderTop:"1px solid rgba(255,255,255,.06)",marginTop:12,
            background:"#090e0b",
            position:"sticky",bottom:0,zIndex:2,
          }}>
            <button onClick={goBack} style={{
              flex:1,height:48,borderRadius:12,
              background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",
              color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
            }}>← Back</button>
            <button onClick={goContinue} disabled={contDisabled} style={{
              flex:2,height:48,borderRadius:12,border:"none",
              background:contDisabled?"rgba(255,255,255,.07)":col.cta,
              color:contDisabled?"rgba(255,255,255,.25)":"#fff",
              fontSize:14,fontWeight:900,
              cursor:contDisabled?"default":"pointer",
              boxShadow:contDisabled?"none":`0 3px 12px ${col.border}`,
              transition:"all .2s",
            }}>
              {step===totalSteps ? "Book My Visit →" : "Continue →"}
            </button>
          </div>

        </div>
        {/* No bottom dim — card touches bottom of viewport */}
      </div>
    </>
  );

  return createPortal(portal, document.body);
}
