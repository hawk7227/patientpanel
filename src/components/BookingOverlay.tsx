"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, ChevronLeft } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface PatientInfo {
  id: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  source: string;
  pharmacy: string;
}

interface BookingOverlayProps {
  visitType: string;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const PHARMAS = [
  "CVS Pharmacy","Walgreens","Rite Aid","Walmart Pharmacy",
  "Kroger Pharmacy","Publix Pharmacy","Costco Pharmacy",
  "Sam's Club Pharmacy","Target Pharmacy (CVS)","Albertsons Pharmacy",
  "Safeway Pharmacy","Fry's Pharmacy","HEB Pharmacy",
];

const VISIT_LABELS: Record<string, string> = {
  async:"📝 Async Visit", sms:"💬 SMS Visit", refill:"💊 Rx Refill",
  video:"📹 Video Visit", phone:"📞 Phone Visit", instant:"⚡ Instant Visit",
};

const VISIT_COLORS: Record<string, { accent: string; border: string; cta: string }> = {
  async:  { accent:"#f472b6", border:"rgba(236,72,153,.45)",  cta:"#ec4899" },
  sms:    { accent:"#c084fc", border:"rgba(168,85,247,.45)",  cta:"#a855f7" },
  refill: { accent:"#4ade80", border:"rgba(34,197,94,.45)",   cta:"#22c55e" },
  video:  { accent:"#60a5fa", border:"rgba(59,130,246,.45)",  cta:"#3b82f6" },
  phone:  { accent:"#22d3ee", border:"rgba(6,182,212,.45)",   cta:"#0891b2" },
  instant:{ accent:"#fb923c", border:"rgba(249,115,22,.45)",  cta:"#f97316" },
};

// ─────────────────────────────────────────────────────────────
// STEP DEFINITIONS
// new:      1=symptoms  2=pharmacy  3=calendar  4=confirm  5=payment
// returning: 1=reason   2=calendar  3=payment
// ─────────────────────────────────────────────────────────────
function getTotalSteps(isReturning: boolean) { return isReturning ? 3 : 5; }

function getStepTitle(step: number, isReturning: boolean): string {
  if (isReturning) {
    if (step === 1) return "Reason for Visit";
    if (step === 2) return "Pick Date & Time";
    return "Complete Booking";
  }
  if (step === 1) return "Describe Your Symptoms";
  if (step === 2) return "Select Pharmacy";
  if (step === 3) return "Pick Date & Time";
  if (step === 4) return "Confirm Your Visit";
  return "Complete Booking";
}

// ─────────────────────────────────────────────────────────────
// CALENDAR HELPERS
// ─────────────────────────────────────────────────────────────
const DAY_ABBR = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const SHORT_MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TIME_SLOTS_12 = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
  "6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM",
];

function to24(t: string): string {
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function getAZNowMins(): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US",{timeZone:"America/Phoenix",hour:"numeric",minute:"numeric",hour12:false});
    const parts = fmt.formatToParts(new Date());
    const h = parseInt(parts.find(p=>p.type==="hour")?.value||"0");
    const m = parseInt(parts.find(p=>p.type==="minute")?.value||"0");
    return h*60+m;
  } catch { return new Date().getHours()*60+new Date().getMinutes(); }
}

function getSlotBadge(t12: string, day: Date): { label: string; color: string } | null {
  const dow = day.getDay();
  if (dow===0||dow===6) return { label:"Weekend · $249", color:"#f59e0b" };
  const h = parseInt(to24(t12).split(":")[0]);
  if (h>=17 && t12!=="5:00 PM") return { label:"After Hours · $249", color:"#f97316" };
  return null;
}

function filterSlotsForDay(day: Date, apiSlots: string[]): string[] {
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = isSameDay(day, today);
  let slots: string[];
  if (apiSlots.length > 0) {
    slots = apiSlots.map(t24 => {
      const [h,m] = t24.split(":").map(Number);
      const period = h>=12?"PM":"AM";
      const h12 = h===0?12:h>12?h-12:h;
      return `${h12}:${String(m).padStart(2,"0")} ${period}`;
    });
  } else {
    slots = TIME_SLOTS_12;
  }
  if (!isToday) return slots;
  const nowMins = getAZNowMins();
  return slots.filter(s => {
    const [h,m] = to24(s).split(":").map(Number);
    return (h*60+m) > nowMins;
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function BookingOverlay({ visitType, onClose }: BookingOverlayProps) {
  const col = VISIT_COLORS[visitType] || VISIT_COLORS.async;
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const isReturning = !!(patient?.id || (patient?.source && patient.source !== "new"));
  const totalSteps = getTotalSteps(isReturning);

  // ── Answers ──
  const [symptoms, setSymptoms] = useState("");
  const [reason, setReason] = useState(""); // returning patient only
  const [pharmaQuery, setPharmaQuery] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [calOffset, setCalOffset] = useState(0);
  const [calDay, setCalDay] = useState("");
  const [calTime, setCalTime] = useState("");
  const [apiSlots, setApiSlots] = useState<string[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  const symRef = useRef<HTMLTextAreaElement>(null);
  const symRem = Math.max(0, 10 - symptoms.trim().length);

  // ── Load patient from sessionStorage ──
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("expressPatient");
      if (stored) setPatient(JSON.parse(stored));
    } catch {}
  }, []);

  // ── Pre-fill pharmacy from returning patient ──
  useEffect(() => {
    if (isReturning && patient?.pharmacy && !pharmacy) {
      setPharmacy(patient.pharmacy);
      setPharmaQuery(patient.pharmacy);
    }
  }, [isReturning, patient]);

  // ── Auto-focus textarea on step 1 ──
  useEffect(() => {
    if (step === 1 && !isReturning && symRef.current) {
      setTimeout(() => symRef.current?.focus(), 180);
    }
  }, [step, isReturning]);

  // ── Lock body scroll ──
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── visualViewport: shrink overlay when keyboard opens on iOS ──
  const [vpHeight, setVpHeight] = useState<number | null>(null);
  useEffect(() => {
    const vv = (window as Window & { visualViewport?: { height: number; addEventListener: (e: string, h: () => void) => void; removeEventListener: (e: string, h: () => void) => void } }).visualViewport;
    if (!vv) return;
    const update = () => setVpHeight(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  // ── Calendar day API fetch ──
  const fetchSlots = useCallback((day: string) => {
    setCalDay(day); setCalTime(""); setApiSlots([]); setApiLoading(true);
    fetch(`/api/get-doctor-availability?date=${day}`)
      .then(r => r.json())
      .then(data => { if (data.availableSlots) setApiSlots(data.availableSlots); })
      .catch(() => {})
      .finally(() => setApiLoading(false));
  }, []);

  // ── Auto-load today's slots when calendar step becomes active ──
  const calStepActive = (step===3 && !isReturning) || (step===2 && isReturning);
  useEffect(() => {
    if (!calStepActive) return;
    const todayIso = isoDate(today);
    if (!calDay) fetchSlots(todayIso);
  }, [calStepActive]);

  // ── Calendar days ──
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const VISIBLE = 6;
  const TOTAL = 28;
  const allDays: Date[] = [];
  for (let i=0;i<TOTAL;i++) { const d=new Date(today); d.setDate(d.getDate()+i); allDays.push(d); }
  const visibleDays = allDays.slice(calOffset, calOffset+VISIBLE);
  const selectedDayObj = calDay ? new Date(calDay+"T12:00:00") : null;
  const slots = selectedDayObj ? filterSlotsForDay(selectedDayObj, apiSlots) : [];

  // ── Navigate ──
  const goBack = () => {
    if (step === 1) { onClose(); return; }
    setStep((s: number) => s-1);
  };

  const goContinue = () => {
    if (isReturning) {
      if (step===1) {
        if (!reason.trim()) return;
        setStep(2); return;
      }
      if (step===2) {
        if (!calDay || !calTime) return;
        setStep(3); return;
      }
      // step 3 = payment — navigate
      navigateToCheckout();
      return;
    }
    // new patient
    if (step===1) {
      if (symptoms.trim().length < 10) { symRef.current?.focus(); return; }
      setStep(2); return;
    }
    if (step===2) {
      if (!pharmacy) return;
      setStep(3); return;
    }
    if (step===3) {
      if (!calDay || !calTime) return;
      setStep(4); return;
    }
    if (step===4) {
      setStep(5); return;
    }
    // step 5 = payment — navigate
    navigateToCheckout();
  };

  const navigateToCheckout = () => {
    try {
      localStorage.removeItem("medazon_express_answers");
      const answers = {
        reason: isReturning ? reason : symptoms,
        chiefComplaint: isReturning ? reason : symptoms,
        symptomsDone: true,
        pharmacy: pharmacy,
        visitType: visitType,
        visitTypeChosen: true,
        visitTypeConfirmed: true,
        appointmentDate: calDay,
        appointmentTime: calTime,
        confirmReviewed: isReturning ? true : false,
      };
      localStorage.setItem("medazon_express_answers", JSON.stringify(answers));
    } catch {}
    window.location.href = "/express-checkout";
  };

  // ── Pharma filter ──
  const filteredPharmas = pharmaQuery
    ? PHARMAS.filter(p => p.toLowerCase().includes(pharmaQuery.toLowerCase()))
    : PHARMAS.slice(0, 6);

  const progressPct = Math.round((step / totalSteps) * 100);
  const stepTitle = getStepTitle(step, isReturning);

  // ── Determine if continue is disabled ──
  const isCalStep = (step===2 && isReturning) || (step===3 && !isReturning);
  const contDisabled =
    (step===1 && !isReturning && symptoms.trim().length < 10) ||
    (step===1 && isReturning && !reason.trim()) ||
    (step===2 && !isReturning && !pharmacy) ||
    (isCalStep && (!calDay || !calTime));

  return (
    <div
      style={{
        position:"fixed",inset:0,zIndex:200,
        background:"linear-gradient(180deg,#0b1218 0%,#070c10 100%)",
        display:"flex",flexDirection:"column",
        height: vpHeight ? `${vpHeight}px` : "100dvh",
        top: 0,
        animation:"overlayIn .22s cubic-bezier(.4,0,.2,1)",
      }}
    >
      <style>{`
        @keyframes overlayIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes stepIn    { from { opacity:0; transform:translateY(8px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes slotIn    { from { opacity:0; transform:scale(.96); }       to { opacity:1; transform:scale(1); } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"14px 16px 0",flexShrink:0,
      }}>
        <div style={{flex:1,marginRight:10}}>
          <div style={{fontSize:"clamp(18px,4.5vw,24px)",fontWeight:900,color:"#fff",lineHeight:1.1}}>
            {stepTitle}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:3,fontWeight:600}}>
            {VISIT_LABELS[visitType]} · Step {step} of {totalSteps}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width:30,height:30,borderRadius:"50%",
            border:"1px solid rgba(255,255,255,.18)",
            background:"rgba(255,255,255,.06)",
            color:"#fff",fontSize:14,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,
          }}
        >✕</button>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{
        height:3,background:"rgba(255,255,255,.08)",
        margin:"10px 16px 0",borderRadius:2,flexShrink:0,
      }}>
        <div style={{
          height:"100%",background:col.cta,borderRadius:2,
          width:`${progressPct}%`,transition:"width .35s",
        }} />
      </div>

      {/* ── STEP CONTENT ── */}
      <div style={{
        flex:1,padding:"14px 16px 0",display:"flex",
        flexDirection:"column",minHeight:0,overflow:"hidden",
        animation:"stepIn .25s cubic-bezier(.4,0,.2,1)",
      }} key={step}>

        {/* STEP 1 NEW — Symptoms */}
        {step===1 && !isReturning && (
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
            <textarea
              ref={symRef}
              value={symptoms}
              onChange={(e: { target: { value: string } }) => setSymptoms(e.target.value)}
              placeholder="e.g., Burning during urination for 3 days..."
              style={{
                flex:1,width:"100%",background:"#0a110d",maxHeight:"40vh",
                border:`2px solid ${symptoms.trim().length>=10?"rgba(45,212,160,.5)":col.cta}`,
                borderRadius:12,padding:"13px 14px",color:"#fff",fontSize:15,
                resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,minHeight:0,
              }}
            />
            <div style={{fontSize:12,flexShrink:0,
              color:symRem>0?"rgba(255,255,255,.45)":"#4ade80",fontWeight:symRem===0?700:400}}>
              {symRem>0
                ? <>Type at least <b style={{color:col.cta,fontSize:15}}>{symRem}</b> more characters</>
                : "✓ Ready to continue"
              }
            </div>
          </div>
        )}

        {/* STEP 1 RETURNING — Reason */}
        {step===1 && isReturning && (
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
            <textarea
              value={reason}
              onChange={(e: { target: { value: string } }) => setReason(e.target.value)}
              placeholder="e.g., Follow up for UTI, need prescription refill..."
              autoFocus
              style={{
                flex:1,width:"100%",background:"#0a110d",maxHeight:"40vh",
                border:`2px solid ${reason.trim()?"rgba(45,212,160,.5)":col.cta}`,
                borderRadius:12,padding:"13px 14px",color:"#fff",fontSize:15,
                resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,minHeight:0,
              }}
            />
            {reason.trim()
              ? <div style={{fontSize:12,color:"#4ade80",fontWeight:700,flexShrink:0}}>✓ Ready to continue</div>
              : <div style={{fontSize:12,color:"rgba(255,255,255,.4)",flexShrink:0}}>Describe why you're booking today</div>
            }
          </div>
        )}

        {/* STEP 2 NEW — Pharmacy */}
        {step===2 && !isReturning && (
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,minHeight:0,position:"relative"}}>
            <input
              type="text"
              placeholder="Type pharmacy name..."
              value={pharmaQuery}
              autoFocus
              onChange={(e: { target: { value: string } }) => { setPharmaQuery(e.target.value); setPharmacy(""); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              style={{
                width:"100%",background:"#0a110d",flexShrink:0,
                border:`2px solid ${pharmacy?`rgba(45,212,160,.5)`:col.cta}`,
                borderRadius:12,padding:"13px 14px",color:"#fff",fontSize:15,
                outline:"none",fontFamily:"system-ui",
              }}
            />
            {showDrop && !pharmacy && filteredPharmas.length > 0 && (
              <div style={{
                background:"#111c14",border:"1px solid rgba(45,212,160,.2)",
                borderRadius:12,overflow:"hidden",flex:1,minHeight:0,overflowY:"auto",
              }}>
                {filteredPharmas.map(p => (
                  <div
                    key={p}
                    onMouseDown={(e: { preventDefault: () => void }) => { e.preventDefault(); setPharmacy(p); setPharmaQuery(p); setShowDrop(false); }}
                    onTouchEnd={(e: { preventDefault: () => void }) => { e.preventDefault(); setPharmacy(p); setPharmaQuery(p); setShowDrop(false); }}
                    style={{
                      padding:"12px 14px",fontSize:14,color:"rgba(255,255,255,.85)",
                      cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.05)",
                    }}
                  >{p}</div>
                ))}
              </div>
            )}
            {pharmacy && (
              <div style={{fontSize:12,color:"#4ade80",fontWeight:700,flexShrink:0}}>
                ✓ {pharmacy} selected
              </div>
            )}
          </div>
        )}

        {/* STEP 3 NEW / STEP 2 RETURNING — Calendar */}
        {((step===3 && !isReturning) || (step===2 && isReturning)) && (
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:0,minHeight:0,overflow:"hidden"}}>

            {/* Day strip */}
            <div style={{display:"flex",alignItems:"center",gap:0,flexShrink:0,marginBottom:8}}>
              <button
                onClick={() => { setCalOffset(Math.max(0,calOffset-VISIBLE)); setCalDay(""); setCalTime(""); }}
                disabled={calOffset===0}
                style={{
                  width:26,height:26,background:"none",border:"none",
                  color:calOffset===0?"rgba(255,255,255,.15)":"#2dd4a0",
                  cursor:calOffset===0?"default":"pointer",flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}
              ><ChevronLeft size={18}/></button>

              <div style={{flex:1,display:"flex",gap:3}}>
                {visibleDays.map(day => {
                  const iso = isoDate(day);
                  const isSel = calDay===iso;
                  const isToday = isSameDay(day,today);
                  const isTomorrow = isSameDay(day,tomorrow);
                  return (
                    <button
                      key={iso}
                      onClick={() => fetchSlots(iso)}
                      style={{
                        flex:1,display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center",
                        padding:"7px 2px 6px",borderRadius:10,cursor:"pointer",
                        border:isSel?"2px solid rgba(45,212,160,.5)":isToday?"2px solid rgba(45,212,160,.2)":"2px solid transparent",
                        background:isSel?"linear-gradient(135deg,#22805a,#1a6b48)":"transparent",
                        gap:1,minWidth:0,
                      }}
                    >
                      <span style={{fontSize:9,fontWeight:700,color:isSel?"#fff":"#64748b",letterSpacing:".04em",lineHeight:1}}>
                        {DAY_ABBR[day.getDay()]}
                      </span>
                      <span style={{fontSize:19,fontWeight:700,color:isSel?"#fff":"#cbd5e1",lineHeight:1.2}}>
                        {day.getDate()}
                      </span>
                      <span style={{fontSize:8,fontWeight:600,color:isSel?"#d1fae5":"#2dd4a0",lineHeight:1,marginTop:1}}>
                        {isToday?"Today":isTomorrow?"Tmrw":SHORT_MO[day.getMonth()]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { setCalOffset(Math.min(calOffset+VISIBLE,TOTAL-VISIBLE)); setCalDay(""); setCalTime(""); }}
                disabled={calOffset+VISIBLE>=TOTAL}
                style={{
                  width:26,height:26,background:"none",border:"none",
                  color:calOffset+VISIBLE>=TOTAL?"rgba(255,255,255,.15)":"#2dd4a0",
                  cursor:calOffset+VISIBLE>=TOTAL?"default":"pointer",flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transform:"rotate(180deg)",
                }}
              ><ChevronLeft size={18}/></button>
            </div>

            {/* Divider */}
            <div style={{height:1,background:"rgba(255,255,255,.07)",flexShrink:0,marginBottom:8}} />

            {/* Time grid — scrollable, fills remaining space */}
            <div style={{flex:1,minHeight:0,overflowY:"auto",scrollbarWidth:"none"}}>
              {!calDay ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"rgba(255,255,255,.3)",fontSize:13}}>
                  Select a day above
                </div>
              ) : apiLoading ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",gap:10}}>
                  <div style={{width:20,height:20,border:"2px solid rgba(45,212,160,.2)",borderTop:"2px solid #2dd4a0",borderRadius:"50%",animation:"spin 1s linear infinite"}} />
                  <span style={{color:"rgba(255,255,255,.4)",fontSize:12}}>Loading times…</span>
                </div>
              ) : slots.length === 0 ? (
                <div style={{textAlign:"center",color:"rgba(255,255,255,.35)",fontSize:13,paddingTop:20}}>
                  No slots available — try another day
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
                  {slots.map((slot,i) => {
                    const isAct = calTime===to24(slot);
                    const badge = selectedDayObj ? getSlotBadge(slot, selectedDayObj) : null;
                    return (
                      <button
                        key={slot}
                        onClick={() => setCalTime(to24(slot))}
                        style={{
                          padding:badge?"7px 4px 5px":"9px 4px",
                          borderRadius:10,cursor:"pointer",
                          border:isAct?"2px solid rgba(45,212,160,.5)":badge?"2px solid rgba(249,115,22,.2)":"2px solid rgba(255,255,255,.1)",
                          background:isAct?"linear-gradient(135deg,#22805a,#1a6b48)":badge?"rgba(249,115,22,.04)":"rgba(255,255,255,.03)",
                          color:isAct?"#fff":"#e2e8f0",
                          fontSize:13,fontWeight:700,
                          display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                          animation:`slotIn .25s ease ${i*0.03}s both`,
                        }}
                      >
                        <span>{slot}</span>
                        {badge && (
                          <span style={{fontSize:8,fontWeight:700,color:isAct?"#fed7aa":badge.color,lineHeight:1}}>
                            {badge.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4 NEW — Confirm Summary */}
        {step===4 && !isReturning && (
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:0,minHeight:0,overflowY:"auto",scrollbarWidth:"none"}}>
            <div style={{
              border:"1px solid rgba(255,255,255,.1)",borderRadius:12,
              overflow:"hidden",background:"rgba(255,255,255,.02)",
            }}>
              {[
                ["Visit Type", VISIT_LABELS[visitType]],
                ["Symptoms", symptoms],
                ["Pharmacy", pharmacy],
                ["Date", calDay ? (() => { const d=new Date(calDay+"T12:00:00"); return `${DAY_ABBR[d.getDay()]}, ${SHORT_MO[d.getMonth()]} ${d.getDate()}`; })() : ""],
                ["Time", calTime ? (() => { const [h,m]=calTime.split(":").map(Number); const p=h>=12?"PM":"AM"; const h12=h===0?12:h>12?h-12:h; return `${h12}:${String(m).padStart(2,"0")} ${p}`; })() : ""],
              ].map(([k,v],i,arr) => (
                <div key={k} style={{
                  display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                  padding:"10px 14px",
                  borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,.05)":"none",
                  fontSize:12,
                }}>
                  <span style={{color:"rgba(255,255,255,.4)",fontWeight:600,flexShrink:0}}>{k}</span>
                  <span style={{
                    color:"#fff",fontWeight:700,textAlign:"right",
                    maxWidth:"62%",wordBreak:"break-word",fontSize:12,
                    ...(k==="Symptoms"?{filter:"blur(4px)",userSelect:"none"}:{}),
                  }}>{v}</span>
                </div>
              ))}
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"11px 14px",background:"rgba(45,212,160,.04)",
              }}>
                <span style={{color:"rgba(255,255,255,.5)",fontSize:13,fontWeight:700}}>Booking Fee</span>
                <span style={{color:"#2dd4a0",fontSize:19,fontWeight:900}}>$1.89</span>
              </div>
            </div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.25)",textAlign:"center",marginTop:8,flexShrink:0}}>
              $189 visit fee charged only after provider review
            </div>
          </div>
        )}

        {/* STEP 5 NEW / STEP 3 RETURNING — Navigate to checkout */}
        {((step===5 && !isReturning) || (step===3 && isReturning)) && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
            <div style={{
              width:48,height:48,borderRadius:"50%",
              background:"rgba(45,212,160,.1)",border:"1px solid rgba(45,212,160,.3)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
            }}>🔒</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:16,fontWeight:900,color:"#fff",marginBottom:4}}>Ready to Book</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>
                {isReturning ? "We have your info on file." : "Fill in your details and pay."}<br/>
                Tap Continue to complete your booking.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{
        display:"flex",gap:10,
        padding:"10px 16px 16px",
        paddingBottom:"max(16px,env(safe-area-inset-bottom))",
        borderTop:"1px solid rgba(255,255,255,.06)",flexShrink:0,
      }}>
        <button
          onClick={goBack}
          style={{
            flex:1,height:52,borderRadius:13,
            background:"rgba(255,255,255,.05)",
            border:"1px solid rgba(255,255,255,.12)",
            color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",
          }}
        >← Back</button>
        <button
          onClick={goContinue}
          disabled={contDisabled}
          style={{
            flex:2,height:52,borderRadius:13,border:"none",
            background:contDisabled?"rgba(255,255,255,.08)":col.cta,
            color:contDisabled?"rgba(255,255,255,.3)":"#fff",
            fontSize:15,fontWeight:900,cursor:contDisabled?"default":"pointer",
            boxShadow:contDisabled?"none":`0 4px 16px ${col.border}`,
            transition:"all .2s",
          }}
        >
          {(step===totalSteps) ? "Book My Visit →" : "Continue →"}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
