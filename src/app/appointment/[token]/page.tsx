"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";

interface AppointmentData {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  requested_date_time: string;
  visit_type: string;
  zoom_meeting_url: string | null;
  dailyco_meeting_url: string | null;
  patient_phone: string | null;
  doctor_id: string;
  doctor?: {
    first_name: string;
    last_name: string;
    specialty: string;
    phone: string | null;
  };
}

function AppointmentContent() {
  const params = useParams();
  const token = params?.token as string;
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

        if (!response.ok) {
          throw new Error(result.error || "Failed to load appointment");
        }

        const appointmentData = result.appointment;

        // If requested_date_time is missing, try to get it from sessionStorage
        if (!appointmentData.requested_date_time) {
          const storedData = sessionStorage.getItem('appointmentData');
          if (storedData) {
            const sessionData = JSON.parse(storedData);
            if (sessionData.appointmentDate && sessionData.appointmentTime) {
              // Convert date and time to ISO format
              const dateStr = sessionData.appointmentDate; // YYYY-MM-DD
              const timeStr = sessionData.appointmentTime; // HH:MM
              appointmentData.requested_date_time = `${dateStr}T${timeStr}:00`;
            }
          }
        }

        setAppointment(appointmentData);
      } catch (err) {
        console.error("Error fetching appointment:", err);
        setError(err instanceof Error ? err.message : "Failed to load appointment");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [token]);

  // Countdown timer effect
  useEffect(() => {
    if (!appointment?.requested_date_time) return;

    const updateCountdown = () => {
      const appointmentTime = new Date(appointment.requested_date_time);
      const now = new Date();
      const diff = appointmentTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isPast: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [appointment?.requested_date_time]);
  
  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "Not scheduled";
    
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return "Not scheduled";
      
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[date.getDay()];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? "pm" : "am";
      const formattedTime = `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}${ampm}`;
      
      return `${dayName} - ${month}-${day}-${year} ${formattedTime}`;
    } catch {
      return "Not scheduled";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-[#0d1218] border border-white/5 rounded-xl p-6 sm:p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-teal/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary-teal border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Loading...</h2>
          <p className="text-sm sm:text-base text-gray-400">Fetching your appointment details.</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-[#0d1218] border border-white/5 rounded-xl p-6 sm:p-8 shadow-2xl text-center max-w-md w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Appointment Not Found</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8">{error || "The appointment you're looking for doesn't exist."}</p>
          <Link href="/" className="inline-block bg-white text-black font-bold py-2.5 sm:py-3 px-8 sm:px-12 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const patientName = `${appointment.patient_first_name} ${appointment.patient_last_name}`;
  const doctorName = appointment.doctor 
    ? `${appointment.doctor.first_name} ${appointment.doctor.last_name}`
    : "Your Provider";
  const doctorTitle = appointment.doctor?.specialty || "Healthcare Provider";

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground p-3 sm:p-4">
      <div className="max-w-3xl mx-auto py-4 sm:py-6 lg:py-8">
        {/* Main Card with Green Glow Border */}
        <div className="bg-[#0a0f1a] border-2 border-primary-teal/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-[0_0_30px_rgba(0,203,169,0.2)]">
          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-teal mb-3 sm:mb-4">Appointment Confirmed</h1>
            <p className="text-base sm:text-lg text-white leading-relaxed">
              Dear {patientName}, Your {appointment.visit_type === "video" ? "video" : appointment.visit_type === "phone" ? "phone" : "consultation"} visit has been scheduled.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-primary-teal/30 my-4 sm:my-6"></div>

          {/* Date & Time Section */}
          <div className="mb-4 sm:mb-6 text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Date & Time</h2>
            <p className="text-white text-base sm:text-lg lg:text-xl mb-2">{formatDateTime(appointment.requested_date_time)}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-primary-teal/30 my-4 sm:my-6"></div>

          {/* Provider Information Section */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4 text-center">Provider Information</h2>
            
            {/* Doctor Photo and Details Side by Side */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-primary-teal/50 shadow-lg flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                  alt={`${doctorName} - ${doctorTitle}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,${encodeURIComponent(`<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="128" fill="#00cba9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="48" font-weight="bold">${doctorName.charAt(0)}</text></svg>`)}`;
                  }}
                />
              </div>

              {/* Provider Details */}
              <div className="flex-1 text-left">
                <p className="text-white text-sm sm:text-base font-semibold mb-2">
                  Medazon Health AZ — {doctorName}, {doctorTitle}
                </p>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs sm:text-sm">Visit Type:</span>
                  <div className="bg-primary-teal/10 text-primary-teal text-xs sm:text-sm font-bold px-3 py-1 rounded-full">
                    {appointment.visit_type === "video" ? "Video" : appointment.visit_type === "phone" ? "Audio" : "Consultation"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-primary-teal/30 my-4 sm:my-6"></div>
                  
          {/* Countdown Timer Section */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4 text-center">Time Until Your Appointment</h2>
            <div className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8">
              {timeRemaining && timeRemaining.days > 0 && (
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary-teal">{String(timeRemaining.days).padStart(2, '0')}</div>
                  <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1">Days</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary-teal">{String(timeRemaining?.hours || 0).padStart(2, '0')}</div>
                <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary-teal">{String(timeRemaining?.minutes || 0).padStart(2, '0')}</div>
                <div className="text-xs sm:text-sm text-gray-400 uppercase mt-1">Minutes</div>
              </div>
            </div>
          </div>

          {/* Start Visit Button */}
          <div className="mt-6 sm:mt-8">
            <a
              href={appointment.dailyco_meeting_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col block w-full text-center font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-lg transition-all shadow-lg ${
                appointment.dailyco_meeting_url
                  ? "bg-primary-orange hover:bg-orange-600 text-black"
                  : "bg-gray-600 text-white cursor-not-allowed"
              }`}
            >
              <span className="text-lg">Click Here to Start Visit</span>
              <span className="text-sm mt-3">We also sent it to you by SMS/E-mail</span>
            </a>
            {!appointment.dailyco_meeting_url && (
              <p className="text-center text-xs text-gray-400 mt-2">We also sent it to you by SMS/email</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4">
        <div className="text-white text-sm sm:text-base">Loading...</div>
      </div>
    }>
      <AppointmentContent />
    </Suspense>
  );
}

