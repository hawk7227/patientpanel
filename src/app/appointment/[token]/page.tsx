"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Check, Shield, Video, Phone, Clock, Lock, Calendar } from "lucide-react";
import PatientVideoEmbed from "@/components/PatientVideoEmbed";

// =============================================
// DATA CONTRACT — must match get-appointment API response
// =============================================
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
  doctor?: {
    first_name: string;
    last_name: string;
    specialty: string;
    phone: string | null;
  };
}

// =============================================
// MAIN CONTENT
// =============================================
function AppointmentContent() {
  const params = useParams();
  const token = params?.token as string;

  // ---- State ----
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  // ---- Fetch appointment ----
  useEffect(() => {
    const fetchAppointment = async () => {
      if (!token) {
        setError("Invalid appointment token");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/get-appointment?token=${token}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load appointment");
        const ad = result.appointment;
        // Fallback: try sessionStorage for date/time if missing
        if (!ad.requested_date_time) {
          const sd = sessionStorage.getItem("appointmentData");
          if (sd) {
            const p = JSON.parse(sd);
            if (p.appointmentDate && p.appointmentTime) {
              ad.requested_date_time = `${p.appointmentDate}T${p.appointmentTime}:00`;
            }
          }
        }
        setAppointment(ad);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError(err instanceof Error ? err.message : "Failed to load appointment");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [token]);

  // ---- Countdown timer ----
  useEffect(() => {
    if (!appointment?.requested_date_time) return;
    const update = () => {
      const diff = new Date(appointment.requested_date_time).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }
      setTimeRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isPast: false,
      });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [appointment?.requested_date_time]);

  // ---- Format date/time ----
  const formatDT = (s: string) => {
    if (!s) return "Pending";
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return "Pending";
      const dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const mn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const h = d.getHours();
      const hr = h % 12 || 12;
      return `${dn[d.getDay()]}, ${mn[d.getMonth()]} ${d.getDate()} · ${hr}:${String(d.getMinutes()).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    } catch {
      return "Pending";
    }
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div
        className="fixed inset-0 text-white font-sans flex items-center justify-center"
        style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#2dd4a0] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading appointment...</p>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error || !appointment) {
    return (
      <div
        className="fixed inset-0 text-white font-sans flex items-center justify-center px-4"
        style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)" }}
      >
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold mb-2">Appointment Not Found</h2>
          <p className="text-gray-400 text-sm mb-6">{error || "This link may have expired."}</p>
          <a href="/" className="inline-block bg-[#2dd4a0] text-black font-bold py-3 px-8 rounded-xl text-sm">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  // ---- Derived values ----
  const pName = `${appointment.patient_first_name} ${appointment.patient_last_name}`;
  const dName = appointment.doctor
    ? `${appointment.doctor.first_name} ${appointment.doctor.last_name}`
    : "Your Provider";
  const dTitle = appointment.doctor?.specialty || "Healthcare Provider";
  const isVid = appointment.visit_type === "video";
  const isPh = appointment.visit_type === "phone";
  const isAs = appointment.visit_type === "instant" || appointment.visit_type === "refill";

  // ---- Video embed props — contract verified ----
  const videoAppointment = {
    id: appointment.id,
    dailyco_meeting_url: appointment.dailyco_meeting_url,
    dailyco_room_name: appointment.dailyco_room_name,
    dailyco_owner_token: appointment.dailyco_owner_token,
    dailyco_patient_token: appointment.dailyco_patient_token,
    requested_date_time: appointment.requested_date_time,
  };

  // ---- Success state ----
  return (
    <div
      className="fixed inset-0 text-white font-sans overflow-hidden"
      style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)" }}
    >
      <style>{`@keyframes countPulse { 0%,100% { opacity:0.85; } 50% { opacity:1; } }`}</style>

      <div
        className="h-full max-w-[430px] mx-auto flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top, 8px)",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
          paddingLeft: "16px",
          paddingRight: "16px",
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-1">
            <span className="text-white font-black text-[15px] tracking-tight">MEDAZON</span>
            <span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">HEALTH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={12} className="text-[#2dd4a0]" />
            <span className="text-[9px] text-[#2dd4a0] font-bold">CONFIRMED</span>
          </div>
        </div>

        {/* CONFIRMED BANNER */}
        <div className="rounded-xl p-3 mb-2 border border-green-500/25" style={{ background: "rgba(34,197,94,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-black text-[14px]">Appointment Confirmed</p>
              <p className="text-gray-400 text-[10px]">Hi {appointment.patient_first_name}, your visit is all set.</p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pb-1" style={{ scrollbarWidth: "none" }}>
          {/* DETAILS CARD */}
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            {/* Doctor info */}
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/5">
              <div
                className="w-10 h-10 rounded-full border-2 border-[#2dd4a0] overflow-hidden flex-shrink-0"
                style={{ boxShadow: "0 0 10px rgba(45,212,160,0.2)" }}
              >
                <img
                  src="/assets/provider-lamonica.png"
                  alt={dName}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(
                      `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="#2dd4a0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#000" font-size="24" font-weight="bold">${dName.charAt(0)}</text></svg>`
                    )}`;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[13px]">{dName}</p>
                <p className="text-gray-500 text-[10px]">{dTitle} · Board-Certified</p>
              </div>
            </div>

            {/* Visit type */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/5">
              <span className="text-gray-500 text-[10px]">Visit Type</span>
              <span
                className="flex items-center gap-1.5 text-[11px] font-bold"
                style={{ color: isVid ? "#3b82f6" : isPh ? "#a855f7" : "#2dd4a0" }}
              >
                {isVid ? (
                  <><Video size={12} />Video Call</>
                ) : isPh ? (
                  <><Phone size={12} />Phone Call</>
                ) : (
                  <><Clock size={12} />Async Review</>
                )}
              </span>
            </div>

            {/* Date & Time */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/5">
              <span className="text-gray-500 text-[10px]">Date &amp; Time</span>
              <span className="text-white text-[11px] font-semibold flex items-center gap-1.5">
                <Calendar size={11} className="text-[#2dd4a0]" />
                {formatDT(appointment.requested_date_time)}
              </span>
            </div>

            {/* Patient */}
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-gray-500 text-[10px]">Patient</span>
              <span className="text-white text-[11px] font-medium">{pName}</span>
            </div>
          </div>

          {/* COUNTDOWN */}
          {timeRemaining && !timeRemaining.isPast && !isAs && (
            <div className="rounded-xl border border-[#2dd4a0]/15 p-3" style={{ background: "rgba(45,212,160,0.03)" }}>
              <p className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider text-center mb-2">
                Time Until Your Visit
              </p>
              <div className="flex items-center justify-center gap-4">
                {timeRemaining.days > 0 && (
                  <div className="text-center">
                    <div className="text-[28px] font-black text-[#2dd4a0]" style={{ animation: "countPulse 2s ease-in-out infinite" }}>
                      {String(timeRemaining.days).padStart(2, "0")}
                    </div>
                    <div className="text-[8px] text-gray-500 uppercase font-bold">Days</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-[28px] font-black text-[#2dd4a0]" style={{ animation: "countPulse 2s ease-in-out infinite" }}>
                    {String(timeRemaining.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[8px] text-gray-500 uppercase font-bold">Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-[28px] font-black text-[#2dd4a0]" style={{ animation: "countPulse 2s ease-in-out infinite" }}>
                    {String(timeRemaining.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[8px] text-gray-500 uppercase font-bold">Min</div>
                </div>
                <div className="text-center">
                  <div className="text-[28px] font-black text-gray-500">
                    {String(timeRemaining.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[8px] text-gray-500 uppercase font-bold">Sec</div>
                </div>
              </div>
            </div>
          )}

          {/* ASYNC */}
          {isAs && (
            <div className="rounded-xl border border-[#2dd4a0]/15 p-3" style={{ background: "rgba(45,212,160,0.03)" }}>
              <p className="text-[11px] text-gray-300 text-center leading-relaxed">
                Your provider is reviewing your information and will respond within{" "}
                <span className="text-[#2dd4a0] font-bold">1–2 hours</span> during business hours.
                You&apos;ll receive a notification when ready.
              </p>
            </div>
          )}

          {/* VISIT READY */}
          {(isVid || isPh) && timeRemaining?.isPast && (
            <div className="rounded-xl border border-green-500/30 p-3 text-center" style={{ background: "rgba(34,197,94,0.08)" }}>
              <p className="text-green-400 font-bold text-[12px]">🟢 Your visit is ready to start</p>
            </div>
          )}
        </div>

        {/* BOTTOM */}
        <div className="flex-shrink-0 pb-2 pt-1 space-y-1.5">
          {(isVid || isPh) && (
            <PatientVideoEmbed
              appointment={videoAppointment}
              patientName={pName}
              doctorName={dName}
            />
          )}
          {appointment.dailyco_meeting_url && (
            <p className="text-center text-[9px] text-gray-600">
              Having trouble?{" "}
              <a
                href={appointment.dailyco_meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2dd4a0] underline"
              >
                Open in new tab
              </a>
            </p>
          )}
          <p className="text-center text-gray-700 text-[8px]">
            <Lock size={8} className="inline mr-0.5" />
            HIPAA Compliant · Meeting link also sent via SMS/Email
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================
// EXPORT WITH SUSPENSE
// =============================================
export default function AppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#080c10" }}>
          <div className="w-8 h-8 border-2 border-[#2dd4a0] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AppointmentContent />
    </Suspense>
  );
}

