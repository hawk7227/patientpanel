"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft } from "lucide-react";

interface PatientInfo {
  id: string | null;
  firstName: string; lastName: string; email: string; phone: string;
  dateOfBirth: string; address: string; source: string; pharmacy: string;
}
interface BookingOverlayProps { visitType: string; onClose: () => void; }

const PHARMAS = [
  "CVS Pharmacy","Walgreens","Rite Aid","Walmart Pharmacy","Kroger Pharmacy",
  "Publix Pharmacy","Costco Pharmacy","Sam's Club Pharmacy",
  "Target Pharmacy (CVS)","Albertsons Pharmacy","Safeway Pharmacy","Fry's Pharmacy","HEB Pharmacy",
];

const VISIT_LABELS: Record<string,string> = {
  async:"📝 Async Visit", sms:"💬 SMS Visit", refill:"💊 Rx Refill",
  video:"📹 Video Visit", phone:"📞 Phone Visit", instant:"⚡ Instant Visit",
};

const VISIT_COLORS: Record<string,{accent:string;border:string;cta:string;dim:string}> = {
  async:  {accent:"#f472b6",border:"rgba(236,72,153,.55)", cta:"#ec4899",dim:"rgba(236,72,153,.08)"},
  sms:    {accent:"#c084fc",border:"rgba(168,85,247,.55)", cta:"#a855f7",dim:"rgba(168,85,247,.08)"},
  refill: {accent:"#4ade80",border:"rgba(34,197,94,.55)",  cta:"#22c55e",dim:"rgba(34,197,94,.08)"},
  video:  {accent:"#60a5fa",border:"rgba(59,130,246,.55)", cta:"#3b82f6",dim:"rgba(59,130,246,.08)"},
  phone:  {accent:"#22d3ee",border:"rgba(6,182,212,.55)",  cta:"#0891b2",dim:"rgba(6,182,212,.08)"},
  instant:{accent:"#fb923c",border:"rgba(249,115,22,.55)", cta:"#f97316",dim:"rgba(249,115,22,.08)"},
};

function getTotalSteps(r:boolean){return r?3:5;}
function getStepTitle(s:number,r:boolean){
  if(r){if(s===1)return"Reason for Visit";if(s===2)return"Pick Date & Time";return"Complete Booking";}
  if(s===1)return"Describe Your Symptoms";if(s===2)return"Select Pharmacy";
  if(s===3)return"Pick Date & Time";if(s===4)return"Confirm Your Visit";return"Complete Booking";
}

const DAY_ABBR=["SUN","MON","TUE","WED","THU","FRI","SAT"];
const SHORT_MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const TIME_SLOTS_12=[
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
  "6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM",
];

function to24(t:string){
  const[time,period]=t.split(" ");let[h,m]=time.split(":").map(Number);
  if(period==="PM"&&h!==12)h+=12;if(period==="AM"&&h===12)h=0;
  return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function isoDate(d:Date){
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function isSameDay(a:Date,b:Date){
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
}
function getAZNowMins(){
  try{
    const fmt=new Intl.DateTimeFormat("en-US",{timeZone:"America/Phoenix",hour:"numeric",minute:"numeric",hour12:false});
    const parts=fmt.formatToParts(new Date());
    return parseInt(parts.find(p=>p.type==="hour")?.value||"0")*60+parseInt(parts.find(p=>p.type==="minute")?.value||"0");
  }catch{return new Date().getHours()*60+new Date().getMinutes();}
}
function getSlotBadge(t12:string,day:Date):{label:string;color:string}|null{
  const dow=day.getDay();
  if(dow===0||dow===6)return{label:"Weekend · $249",color:"#f59e0b"};
  const h=parseInt(to24(t12).split(":")[0]);
  if(h>=17&&t12!=="5:00 PM")return{label:"After Hours · $249",color:"#f97316"};
  return null;
}
function filterSlotsForDay(day:Date,apiSlots:string[]){
  const today=new Date();today.setHours(0,0,0,0);
  const isToday=isSameDay(day,today);
  let slots=apiSlots.length>0
    ?apiSlots.map(t24=>{const[h,m]=t24.split(":").map(Number);const p=h>=12?"PM":"AM";const h12=h===0?12:h>12?h-12:h;return`${h12}:${String(m).padStart(2,"0")} ${p}`;})
    :TIME_SLOTS_12;
  if(!isToday)return slots;
  const nowMins=getAZNowMins();
  return slots.filter(s=>{const[h,m]=to24(s).split(":").map(Number);return(h*60+m)>nowMins;});
}

export default function BookingOverlay({visitType,onClose}:BookingOverlayProps){
  const col=VISIT_COLORS[visitType]||VISIT_COLORS.async;
  const [step,setStep]=useState(1);
  const [patient,setPatient]=useState<PatientInfo|null>(null);
  const isReturning=!!(patient?.id||(patient?.source&&patient.source!=="new"));
  const totalSteps=getTotalSteps(isReturning);

  const [symptoms,setSymptoms]=useState("");
  const [reason,setReason]=useState("");
  const [pharmaQuery,setPharmaQuery]=useState("");
  const [pharmacy,setPharmacy]=useState("");
  const [showDrop,setShowDrop]=useState(false);
  const [calOffset,setCalOffset]=useState(0);
  const [calDay,setCalDay]=useState("");
  const [calTime,setCalTime]=useState("");
  const [apiSlots,setApiSlots]=useState<string[]>([]);
  const [apiLoading,setApiLoading]=useState(false);

  const cardRef=useRef<HTMLDivElement>(null);
  const symRef=useRef<HTMLTextAreaElement>(null);
  const symRem=Math.max(0,10-symptoms.trim().length);

  useEffect(()=>{
    try{const s=sessionStorage.getItem("expressPatient");if(s)setPatient(JSON.parse(s));}catch{}
  },[]);

  useEffect(()=>{
    if(isReturning&&patient?.pharmacy&&!pharmacy){setPharmacy(patient.pharmacy);setPharmaQuery(patient.pharmacy);}
  },[isReturning,patient]);

  useEffect(()=>{
    if(step===1&&!isReturning)setTimeout(()=>symRef.current?.focus(),180);
  },[step,isReturning]);

  // Scroll card into view when step changes or keyboard opens
  const scrollCardIntoView=useCallback(()=>{
    if(cardRef.current){
      setTimeout(()=>cardRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),100);
    }
  },[]);

  useEffect(()=>{scrollCardIntoView();},[step]);

  const fetchSlots=useCallback((day:string)=>{
    setCalDay(day);setCalTime("");setApiSlots([]);setApiLoading(true);
    fetch(`/api/get-doctor-availability?date=${day}`)
      .then(r=>r.json()).then(data=>{if(data.availableSlots)setApiSlots(data.availableSlots);})
      .catch(()=>{}).finally(()=>setApiLoading(false));
  },[]);

  const today=new Date();today.setHours(0,0,0,0);
  const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
  const VISIBLE=6,TOTAL=28;
  const allDays:Date[]=[];
  for(let i=0;i<TOTAL;i++){const d=new Date(today);d.setDate(d.getDate()+i);allDays.push(d);}
  const visibleDays=allDays.slice(calOffset,calOffset+VISIBLE);
  const selectedDayObj=calDay?new Date(calDay+"T12:00:00"):null;
  const slots=selectedDayObj?filterSlotsForDay(selectedDayObj,apiSlots):[];

  // Auto-load today on calendar step
  const calStepActive=(step===3&&!isReturning)||(step===2&&isReturning);
  useEffect(()=>{
    if(!calStepActive)return;
    if(!calDay)fetchSlots(isoDate(today));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[calStepActive]);

  const goBack=()=>{if(step===1){onClose();return;}setStep(s=>s-1);};
  const goContinue=()=>{
    if(isReturning){
      if(step===1){if(!reason.trim())return;setStep(2);return;}
      if(step===2){if(!calDay||!calTime)return;setStep(3);return;}
      navigateToCheckout();return;
    }
    if(step===1){if(symptoms.trim().length<10){symRef.current?.focus();return;}setStep(2);return;}
    if(step===2){if(!pharmacy)return;setStep(3);return;}
    if(step===3){if(!calDay||!calTime)return;setStep(4);return;}
    if(step===4){setStep(5);return;}
    navigateToCheckout();
  };

  const navigateToCheckout=()=>{
    try{
      localStorage.removeItem("medazon_express_answers");
      localStorage.setItem("medazon_express_answers",JSON.stringify({
        reason:isReturning?reason:symptoms,chiefComplaint:isReturning?reason:symptoms,
        symptomsDone:true,pharmacy,visitType,visitTypeChosen:true,visitTypeConfirmed:true,
        appointmentDate:calDay,appointmentTime:calTime,confirmReviewed:isReturning,
      }));
    }catch{}
    window.location.href="/express-checkout";
  };

  const filteredPharmas=pharmaQuery
    ?PHARMAS.filter(p=>p.toLowerCase().includes(pharmaQuery.toLowerCase()))
    :PHARMAS.slice(0,6);

  const progressPct=Math.round((step/totalSteps)*100);
  const isCalStep=(step===2&&isReturning)||(step===3&&!isReturning);
  const contDisabled=
    (step===1&&!isReturning&&symptoms.trim().length<10)||
    (step===1&&isReturning&&!reason.trim())||
    (step===2&&!isReturning&&!pharmacy)||
    (isCalStep&&(!calDay||!calTime));

  // Field border style helper
  const fieldBorder=(valid:boolean)=>`2px solid ${valid?`rgba(45,212,160,.5)`:col.border}`;

  return(
    <>
      {/* Dim background — behind card, pointer-events none */}
      <div style={{
        position:"fixed",inset:0,zIndex:50,
        background:"rgba(4,8,7,.72)",
        pointerEvents:"none",
        animation:"dimIn .2s ease",
      }}/>

      <style>{`
        @keyframes dimIn{from{opacity:0}to{opacity:1}}
        @keyframes cardIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes stepIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slotIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Card — inline, replaces VisitCards, auto-height */}
      <div
        ref={cardRef}
        style={{
          position:"relative",zIndex:60,
          background:"#090e0b",
          border:`2px solid ${col.border}`,
          borderRadius:16,
          overflow:"hidden",
          animation:"cardIn .22s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"14px 14px 0"}}>
          <div style={{flex:1,marginRight:10}}>
            <div style={{fontSize:"clamp(17px,4.5vw,22px)",fontWeight:900,color:"#fff",lineHeight:1.1}}
                 key={step}>
              {getStepTitle(step,isReturning)}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:3,fontWeight:600}}>
              {VISIT_LABELS[visitType]} · Step {step} of {totalSteps}
            </div>
          </div>
          <button onClick={onClose} style={{
            width:28,height:28,borderRadius:"50%",
            border:`1px solid ${col.border}`,
            background:col.dim,
            color:"#fff",fontSize:13,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{height:3,background:"rgba(255,255,255,.08)",margin:"10px 14px 0",borderRadius:2}}>
          <div style={{height:"100%",background:col.cta,borderRadius:2,width:`${progressPct}%`,transition:"width .35s"}}/>
        </div>

        {/* Step content — auto height, no flex:1 stretching */}
        <div style={{padding:"12px 14px 0",animation:"stepIn .25s cubic-bezier(.4,0,.2,1)"}} key={`content-${step}`}>

          {/* STEP 1 NEW — Symptoms */}
          {step===1&&!isReturning&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <textarea
                ref={symRef}
                value={symptoms}
                onChange={e=>setSymptoms(e.target.value)}
                placeholder="e.g., Burning during urination for 3 days..."
                rows={5}
                onFocus={scrollCardIntoView}
                style={{
                  width:"100%",height:120,background:"rgba(255,255,255,.04)",
                  border:fieldBorder(symptoms.trim().length>=10),
                  borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:14,
                  resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,
                }}
              />
              <div style={{fontSize:12,color:symRem>0?"rgba(255,255,255,.45)":"#4ade80",fontWeight:symRem===0?700:400}}>
                {symRem>0?<>Type at least <b style={{color:col.accent,fontSize:14}}>{symRem}</b> more characters</>:"✓ Ready to continue"}
              </div>
            </div>
          )}

          {/* STEP 1 RETURNING — Reason */}
          {step===1&&isReturning&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <textarea
                value={reason}
                onChange={e=>setReason(e.target.value)}
                placeholder="e.g., Follow up for UTI, need prescription refill..."
                rows={5}
                autoFocus
                onFocus={scrollCardIntoView}
                style={{
                  width:"100%",height:120,background:"rgba(255,255,255,.04)",
                  border:fieldBorder(reason.trim().length>0),
                  borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:14,
                  resize:"none",outline:"none",fontFamily:"system-ui",lineHeight:1.5,
                }}
              />
              <div style={{fontSize:12,color:reason.trim()?"#4ade80":"rgba(255,255,255,.4)",fontWeight:reason.trim()?700:400}}>
                {reason.trim()?"✓ Ready to continue":"Describe why you're booking today"}
              </div>
            </div>
          )}

          {/* STEP 2 NEW — Pharmacy */}
          {step===2&&!isReturning&&(
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <input
                type="text"
                placeholder="Type pharmacy name..."
                value={pharmaQuery}
                autoFocus
                onChange={e=>{setPharmaQuery(e.target.value);setPharmacy("");setShowDrop(true);}}
                onFocus={()=>{setShowDrop(true);scrollCardIntoView();}}
                style={{
                  width:"100%",background:"rgba(255,255,255,.04)",
                  border:fieldBorder(!!pharmacy),
                  borderRadius:10,padding:"11px 12px",color:"#fff",fontSize:14,
                  outline:"none",fontFamily:"system-ui",
                }}
              />
              {showDrop&&!pharmacy&&filteredPharmas.length>0&&(
                <div style={{
                  background:"#111c14",border:`1px solid ${col.border}`,
                  borderRadius:10,overflow:"hidden",maxHeight:200,overflowY:"auto",
                }}>
                  {filteredPharmas.map(p=>(
                    <div key={p}
                      onMouseDown={e=>{e.preventDefault();setPharmacy(p);setPharmaQuery(p);setShowDrop(false);}}
                      onTouchEnd={e=>{e.preventDefault();setPharmacy(p);setPharmaQuery(p);setShowDrop(false);}}
                      style={{
                        padding:"11px 12px",fontSize:13,color:"rgba(255,255,255,.85)",
                        cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.05)",
                      }}
                    >{p}</div>
                  ))}
                </div>
              )}
              {pharmacy&&(
                <div style={{fontSize:12,color:"#4ade80",fontWeight:700}}>✓ {pharmacy} selected</div>
              )}
            </div>
          )}

          {/* STEP 3 NEW / STEP 2 RETURNING — Calendar */}
          {isCalStep&&(
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
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
                    const iso=isoDate(day);const isSel=calDay===iso;
                    const isToday=isSameDay(day,today);const isTom=isSameDay(day,tomorrow);
                    return(
                      <button key={iso} onClick={()=>fetchSlots(iso)} style={{
                        flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                        justifyContent:"center",padding:"6px 1px 5px",borderRadius:9,cursor:"pointer",
                        border:isSel?`2px solid ${col.accent}`:isToday?`2px solid rgba(45,212,160,.2)`:"2px solid transparent",
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
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transform:"rotate(180deg)"}}
                ><ChevronLeft size={16}/></button>
              </div>

              {/* Divider */}
              <div style={{height:1,background:"rgba(255,255,255,.07)",marginBottom:8}}/>

              {/* Time grid — fixed height, scrollable */}
              <div style={{height:180,overflowY:"auto",scrollbarWidth:"none"}}>
                {!calDay?(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                    height:"100%",color:"rgba(255,255,255,.3)",fontSize:13}}>
                    Select a day above
                  </div>
                ):apiLoading?(
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",gap:8}}>
                    <div style={{width:18,height:18,border:"2px solid rgba(45,212,160,.2)",
                      borderTop:`2px solid ${col.accent}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                    <span style={{color:"rgba(255,255,255,.4)",fontSize:12}}>Loading times…</span>
                  </div>
                ):slots.length===0?(
                  <div style={{textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:13,paddingTop:20}}>
                    No slots available — try another day
                  </div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                    {slots.map((slot,i)=>{
                      const isAct=calTime===to24(slot);
                      const badge=selectedDayObj?getSlotBadge(slot,selectedDayObj):null;
                      return(
                        <button key={slot} onClick={()=>setCalTime(to24(slot))} style={{
                          padding:badge?"6px 3px 4px":"8px 3px",borderRadius:9,cursor:"pointer",
                          border:isAct?`2px solid ${col.accent}`:badge?"2px solid rgba(249,115,22,.25)":"2px solid rgba(255,255,255,.1)",
                          background:isAct?col.cta:badge?"rgba(249,115,22,.04)":"rgba(255,255,255,.03)",
                          color:isAct?"#fff":"#e2e8f0",fontSize:12,fontWeight:700,
                          display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                          animation:`slotIn .2s ease ${i*0.025}s both`,
                        }}>
                          <span>{slot}</span>
                          {badge&&<span style={{fontSize:7,fontWeight:700,color:isAct?"#fed7aa":badge.color,lineHeight:1}}>{badge.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 NEW — Confirm */}
          {step===4&&!isReturning&&(
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              <div style={{border:`1px solid ${col.border}`,borderRadius:10,overflow:"hidden",background:"rgba(255,255,255,.02)"}}>
                {[
                  ["Visit Type",VISIT_LABELS[visitType]],
                  ["Symptoms",symptoms],
                  ["Pharmacy",pharmacy],
                  ["Date",calDay?(()=>{const d=new Date(calDay+"T12:00:00");return`${DAY_ABBR[d.getDay()]}, ${SHORT_MO[d.getMonth()]} ${d.getDate()}`;})():""],
                  ["Time",calTime?(()=>{const[h,m]=calTime.split(":").map(Number);const p=h>=12?"PM":"AM";const h12=h===0?12:h>12?h-12:h;return`${h12}:${String(m).padStart(2,"0")} ${p}`;})():""],
                ].map(([k,v],i,arr)=>(
                  <div key={k} style={{
                    display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                    padding:"9px 12px",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,.05)":"none",fontSize:12,
                  }}>
                    <span style={{color:"rgba(255,255,255,.4)",fontWeight:600,flexShrink:0}}>{k}</span>
                    <span style={{
                      color:"#fff",fontWeight:700,textAlign:"right",maxWidth:"62%",wordBreak:"break-word",fontSize:12,
                      ...(k==="Symptoms"?{filter:"blur(4px)",userSelect:"none" as const}:{}),
                    }}>{v}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"10px 12px",background:"rgba(45,212,160,.05)"}}>
                  <span style={{color:"rgba(255,255,255,.5)",fontSize:12,fontWeight:700}}>Booking Fee</span>
                  <span style={{color:"#2dd4a0",fontSize:18,fontWeight:900}}>$1.89</span>
                </div>
              </div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.2)",textAlign:"center",marginTop:7}}>
                $189 visit fee charged only after provider review
              </div>
            </div>
          )}

          {/* STEP 5 / STEP 3 RETURNING — Ready */}
          {((step===5&&!isReturning)||(step===3&&isReturning))&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:"12px 0 4px"}}>
              <div style={{
                width:44,height:44,borderRadius:"50%",
                background:col.dim,border:`1px solid ${col.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
              }}>🔒</div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:900,color:"#fff",marginBottom:4}}>Ready to Book</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.4)",lineHeight:1.5}}>
                  {isReturning?"We have your info on file.":"Fill in your details and pay."}<br/>
                  Tap Continue to complete your booking.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom nav — always right below content */}
        <div style={{
          display:"flex",gap:8,padding:"12px 14px 14px",
          borderTop:"1px solid rgba(255,255,255,.06)",marginTop:12,
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
            fontSize:14,fontWeight:900,cursor:contDisabled?"default":"pointer",
            boxShadow:contDisabled?"none":`0 3px 12px ${col.border}`,
            transition:"all .2s",
          }}>
            {step===totalSteps?"Book My Visit →":"Continue →"}
          </button>
        </div>
      </div>
    </>
  );
}
