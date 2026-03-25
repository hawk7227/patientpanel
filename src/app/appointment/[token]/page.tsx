"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Check, Shield, Video, Phone, Clock, Pill, Calendar } from "lucide-react";

interface AppointmentData {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  requested_date_time: string;
  visit_type: string;
  zoom_meeting_url: string | null;
  dailyco_meeting_url: string | null;
  dailyco_room_name: string | null;
  dailyco_owner_token: string | null;
  dailyco_patient_token: string | null;
  patient_phone: string | null;
  doctor_id: string;
  intake_completed: boolean | null;
  preferred_pharmacy: string | null;
  pharmacy_address: string | null;
  pharmacy_phone: string | null;
  chief_complaint: string | null;
  doctor?: {
    first_name: string;
    last_name: string;
    specialty: string;
    phone: string | null;
  };
}

function AppointmentContent() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number; hours: number; minutes: number; seconds: number; isPast: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!token) { setError("Invalid appointment token"); setLoading(false); return; }
      try {
        const response = await fetch(`/api/get-appointment?token=${token}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load appointment");
        const ad = result.appointment;
        if (!ad.requested_date_time) {
          const sd = sessionStorage.getItem("appointmentData");
          if (sd) {
            const p = JSON.parse(sd);
            if (p.appointmentDate && p.appointmentTime)
              ad.requested_date_time = `${p.appointmentDate}T${p.appointmentTime}:00`;
          }
        }
        setAppointment(ad);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load appointment");
      } finally { setLoading(false); }
    };
    fetchAppointment();
  }, [token]);

  useEffect(() => {
    if (!appointment?.requested_date_time) return;
    const update = () => {
      const diff = new Date(appointment.requested_date_time).getTime() - Date.now();
      if (diff <= 0) { setTimeRemaining({ days:0,hours:0,minutes:0,seconds:0,isPast:true }); return; }
      setTimeRemaining({
        days: Math.floor(diff/86400000),
        hours: Math.floor((diff%86400000)/3600000),
        minutes: Math.floor((diff%3600000)/60000),
        seconds: Math.floor((diff%60000)/1000),
        isPast: false,
      });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [appointment?.requested_date_time]);

  const formatDT = (s: string) => {
    if (!s) return "Pending";
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return "Pending";
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Phoenix", weekday: "short", month: "short",
        day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
      });
      const parts = fmt.formatToParts(d);
      const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
      return `${get("weekday")}, ${get("month")} ${get("day")} · ${get("hour")}:${get("minute")} ${get("dayPeriod")} AZ`;
    } catch { return "Pending"; }
  };

  const getVisitLabel = (vt: string) => {
    if (vt === "video") return "Video Visit";
    if (vt === "phone") return "Phone Visit";
    if (vt === "refill") return "Rx Refill";
    if (vt === "instant") return "Instant Care";
    return "Async Visit";
  };

  const getVisitColor = (vt: string) => {
    if (vt === "video") return "#3b82f6";
    if (vt === "phone") return "#a855f7";
    if (vt === "refill") return "#f59e0b";
    return "#00cba9";
  };

  const getVisitIcon = (vt: string) => {
    if (vt === "video") return <Video size={14} />;
    if (vt === "phone") return <Phone size={14} />;
    return <Clock size={14} />;
  };

  const getCTA = (vt: string) => {
    if (vt === "video") return "Click Here to Start Visit";
    if (vt === "phone") return "View Appointment Details";
    if (vt === "refill") return "Track Your Rx Status";
    return "Track Your Visit Status";
  };

  const getVisitLink = () => {
    if (!appointment) return "#";
    if (appointment.dailyco_meeting_url) {
      const t = appointment.dailyco_patient_token;
      const sep = appointment.dailyco_meeting_url.includes("?") ? "&" : "?";
      return t ? `${appointment.dailyco_meeting_url}${sep}t=${t}` : appointment.dailyco_meeting_url;
    }
    return "#";
  };

  if (loading) return (
    <div style={{ minHeight:"100vh",background:"#0a0f1a",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48,height:48,border:"2px solid #00cba9",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }} />
        <p style={{ color:"#64748b",fontSize:14,fontFamily:"system-ui",margin:0 }}>Loading appointment...</p>
      </div>
    </div>
  );

  if (error || !appointment) return (
    <div style={{ minHeight:"100vh",background:"#0a0f1a",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px" }}>
      <div style={{ textAlign:"center",maxWidth:360 }}>
        <div style={{ fontSize:40,marginBottom:16 }}>⚠️</div>
        <h2 style={{ color:"#fff",fontSize:18,fontWeight:700,marginBottom:8,fontFamily:"system-ui",margin:"0 0 8px" }}>Appointment Not Found</h2>
        <p style={{ color:"#64748b",fontSize:14,marginBottom:24,fontFamily:"system-ui",margin:"0 0 24px" }}>{error || "This link may have expired."}</p>
        <a href="/" style={{ display:"inline-block",background:"#00cba9",color:"#000",fontWeight:700,padding:"12px 32px",borderRadius:12,textDecoration:"none",fontFamily:"system-ui" }}>Return Home</a>
      </div>
    </div>
  );

  void router;
  const dName = appointment.doctor
    ? `${appointment.doctor.first_name} ${appointment.doctor.last_name}, ${appointment.doctor.specialty || "FNP-C"}`
    : "LaMonica A. Hodges, Family Medicine";
  const pName = `${appointment.patient_first_name} ${appointment.patient_last_name}`;
  const vt = appointment.visit_type;
  const isLive = vt === "video" || vt === "phone";
  const visitColor = getVisitColor(vt);

  return (
    <div style={{ minHeight:"100vh",background:"#0a0f1a",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",padding:"32px 16px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes countPulse { 0%,100%{opacity:.85} 50%{opacity:1} }
        @keyframes confirmGlow { 0%,100%{box-shadow:0 0 0 0 rgba(0,203,169,0)} 50%{box-shadow:0 0 24px 6px rgba(0,203,169,0.12)} }
      `}</style>

      <div style={{ maxWidth:600,margin:"0 auto" }}>

        {/* Medazon wordmark */}
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <p style={{ margin:0,color:"#00cba9",fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase" }}>Medazon Health</p>
        </div>

        {/* Main dark card */}
        <div style={{ background:"#0d1628",border:"1px solid #1e3a5f",borderRadius:16,overflow:"hidden",animation:"confirmGlow 4s ease-in-out infinite" }}>

          {/* CONFIRMED header */}
          <div style={{ padding:"36px 32px 24px",textAlign:"center",borderBottom:"1px solid #1e293b" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"rgba(0,203,169,0.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",border:"1.5px solid rgba(0,203,169,0.3)" }}>
              <Check size={28} color="#00cba9" />
            </div>
            <h1 style={{ margin:"0 0 10px",color:"#00cba9",fontSize:28,fontWeight:800,letterSpacing:"-0.01em" }}>
              Appointment Confirmed
            </h1>
            <p style={{ margin:0,color:"#cbd5e1",fontSize:15,lineHeight:1.5 }}>
              Dear {pName.toUpperCase()}, Your {getVisitLabel(vt)} has been scheduled.
            </p>
          </div>

          {/* Date & Time */}
          <div style={{ padding:"24px 32px",textAlign:"center",borderBottom:"1px solid #1e293b" }}>
            <p style={{ margin:"0 0 8px",color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em" }}>Date &amp; Time</p>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <Calendar size={16} color="#00cba9" />
              <p style={{ margin:0,color:"#fff",fontSize:20,fontWeight:700 }}>{formatDT(appointment.requested_date_time)}</p>
            </div>
          </div>

          {/* Provider information */}
          <div style={{ padding:"24px 32px",borderBottom:"1px solid #1e293b" }}>
            <p style={{ margin:"0 0 14px",color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",textAlign:"center" }}>Provider Information</p>
            <div style={{ display:"flex",alignItems:"center",gap:16,background:"#162032",border:"1px solid #1e3a5f",borderRadius:12,padding:"16px 20px" }}>
              <div style={{ width:56,height:56,borderRadius:"50%",border:"2px solid #00cba9",overflow:"hidden",flexShrink:0 }}>
                <img
                  src="/assets/provider-lamonica.png"
                  alt="Provider"
                  style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"top" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(`<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="56" height="56" fill="#00cba9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#000" font-size="22" font-weight="bold">LH</text></svg>`)}`; }}
                />
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ margin:"0 0 4px",color:"#fff",fontSize:15,fontWeight:700 }}>Medazon Health AZ — {dName}</p>
                <p style={{ margin:"0 0 8px",color:"#94a3b8",fontSize:12 }}>Board-Certified Family Nurse Practitioner</p>
                <span style={{ display:"inline-flex",alignItems:"center",gap:6,background:`${visitColor}22`,border:`1px solid ${visitColor}55`,borderRadius:6,color:visitColor,fontSize:12,fontWeight:700,padding:"3px 12px",letterSpacing:"0.04em" }}>
                  {getVisitIcon(vt)} {getVisitLabel(vt)}
                </span>
              </div>
            </div>
          </div>

          {/* Pharmacy */}
          {appointment.preferred_pharmacy && (
            <div style={{ padding:"20px 32px",borderBottom:"1px solid #1e293b" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                <Pill size={14} color="#00cba9" style={{ marginTop:2,flexShrink:0 }} />
                <div>
                  <p style={{ margin:"0 0 2px",color:"#64748b",fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700 }}>Pharmacy</p>
                  <p style={{ margin:"0 0 2px",color:"#fff",fontSize:13,fontWeight:600 }}>{appointment.preferred_pharmacy}</p>
                  {appointment.pharmacy_address && <p style={{ margin:"0 0 2px",color:"#64748b",fontSize:11 }}>{appointment.pharmacy_address}</p>}
                  {appointment.pharmacy_phone && <p style={{ margin:0,color:"#64748b",fontSize:11 }}>{appointment.pharmacy_phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Countdown timer */}
          {timeRemaining && !timeRemaining.isPast && (
            <div style={{ padding:"28px 32px",borderBottom:"1px solid #1e293b",textAlign:"center" }}>
              <p style={{ margin:"0 0 16px",color:"#64748b",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em" }}>Time Until Your Appointment</p>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:32 }}>
                {timeRemaining.days > 0 && (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:48,fontWeight:800,color:"#00cba9",lineHeight:1,animation:"countPulse 2s ease-in-out infinite" }}>{String(timeRemaining.days).padStart(2,"0")}</div>
                    <div style={{ fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginTop:6 }}>Days</div>
                  </div>
                )}
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:48,fontWeight:800,color:"#00cba9",lineHeight:1,animation:"countPulse 2s ease-in-out infinite" }}>{String(timeRemaining.hours).padStart(2,"0")}</div>
                  <div style={{ fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginTop:6 }}>Hours</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:48,fontWeight:800,color:"#00cba9",lineHeight:1,animation:"countPulse 2s ease-in-out infinite" }}>{String(timeRemaining.minutes).padStart(2,"0")}</div>
                  <div style={{ fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginTop:6 }}>Minutes</div>
                </div>
                {timeRemaining.days === 0 && (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:48,fontWeight:800,color:"#475569",lineHeight:1 }}>{String(timeRemaining.seconds).padStart(2,"0")}</div>
                    <div style={{ fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginTop:6 }}>Sec</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Async message */}
          {!isLive && (
            <div style={{ padding:"20px 32px",borderBottom:"1px solid #1e293b",textAlign:"center" }}>
              <p style={{ margin:0,color:"#94a3b8",fontSize:14,lineHeight:1.7 }}>
                Your provider is reviewing your information and will respond within{" "}
                <span style={{ color:"#00cba9",fontWeight:700 }}>1–2 hours</span> during business hours.
                You&apos;ll receive a notification when ready.
              </p>
            </div>
          )}

          {/* Orange CTA */}
          <div style={{ padding:"28px 32px 32px",textAlign:"center" }}>
            {isLive ? (
              <a
                href={getVisitLink()}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display:"block",background:"#f97316",color:"#fff",fontSize:16,fontWeight:800,textDecoration:"none",padding:"16px 48px",borderRadius:12,letterSpacing:"0.01em",boxShadow:"0 4px 20px rgba(249,115,22,0.35)" }}
              >
                {getCTA(vt)}
              </a>
            ) : (
              <div style={{ display:"block",background:"#f97316",color:"#fff",fontSize:16,fontWeight:800,padding:"16px 48px",borderRadius:12,letterSpacing:"0.01em",boxShadow:"0 4px 20px rgba(249,115,22,0.35)" }}>
                {getCTA(vt)}
              </div>
            )}
            <p style={{ margin:"12px 0 0",color:"#64748b",fontSize:12 }}>We also sent it to you by SMS/E-mail</p>
            <div style={{ marginTop:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <Shield size={12} color="#2dd4a0" />
              <span style={{ color:"#475569",fontSize:11 }}>HIPAA Compliant · Encrypted · Board-Certified Provider</span>
            </div>
          </div>

        </div>

        {/* Legal footer */}
        <div style={{ marginTop:20,textAlign:"center" }}>
          <p style={{ margin:"0 0 4px",color:"#334155",fontSize:11,lineHeight:1.7 }}>
            Your $1.89 booking fee is non-refundable and reserves your provider&apos;s time slot. Your visit fee is held on your card and collected upon provider acceptance.
          </p>
          <p style={{ margin:0,color:"#1e293b",fontSize:10 }}>
            Medazon Health · Telehealth Services · Arizona, USA · HIPAA Compliant
          </p>
        </div>

      </div>
    </div>
  );
}

export default function AppointmentPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh",background:"#0a0f1a",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:32,height:32,border:"2px solid #00cba9",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite" }} />
      </div>
    }>
      <AppointmentContent />
    </Suspense>
  );
}
