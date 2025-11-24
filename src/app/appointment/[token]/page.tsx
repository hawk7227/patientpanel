"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import { Calendar, Video, Phone, User, Clock, MapPin } from "lucide-react";
import Link from "next/link";

interface AppointmentData {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  requested_date_time: string;
  visit_type: string;
  zoom_meeting_url: string | null;
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
  const router = useRouter();
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

        setAppointment(result.appointment);
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
    
    const date = new Date(dateTimeStr);
    // Display the time in America/New_York timezone (EST/EDT) to match what the user selected
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: "America/New_York",
    };
    
    return date.toLocaleString("en-US", options);
  };

  const getCalendarLink = () => {
    if (!appointment?.requested_date_time) return "#";
    
    const date = new Date(appointment.requested_date_time);
    const startDate = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endDate = new Date(date.getTime() + 30 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    const title = encodeURIComponent(`Appointment with ${appointment.doctor?.first_name || "Doctor"} ${appointment.doctor?.last_name || ""}`);
    const details = encodeURIComponent("Medical consultation appointment");
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-primary-teal/20 flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-2 border-primary-teal border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Loading...</h2>
          <p className="text-gray-400">Fetching your appointment details.</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col items-center justify-center p-4">
        <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Appointment Not Found</h2>
          <p className="text-gray-400 mb-8">{error || "The appointment you're looking for doesn't exist."}</p>
          <Link href="/" className="inline-block bg-white text-black font-bold py-3 px-12 rounded-lg hover:bg-gray-200 transition-colors">
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
    <div className="min-h-screen bg-[#050b14] text-foreground p-4">
      <div className="max-w-3xl mx-auto py-8">
        {/* Main Card with Green Glow Border */}
        <div className="bg-[#0a0f1a] border-2 border-primary-teal/50 rounded-2xl p-8 shadow-[0_0_30px_rgba(0,203,169,0.2)]">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary-teal mb-3">Appointment Confirmed</h1>
            <p className="text-xl text-white">
              Dear {patientName}, Your {appointment.visit_type === "video" ? "video" : appointment.visit_type === "phone" ? "phone" : "consultation"} visit has been scheduled.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-primary-teal/30 my-6"></div>

          {/* Date & Time Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-3">Date & Time</h2>
            <div className="flex items-center justify-between">
              <p className="text-white text-lg">{formatDateTime(appointment.requested_date_time)}</p>
              <a
                href={getCalendarLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-teal hover:text-primary-teal/80 underline text-sm"
              >
                + Add to your calendar
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-primary-teal/30 my-6"></div>

          {/* Provider Information Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Provider Information</h2>
            
            {/* Doctor Photo - Above the info */}
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary-teal/50 shadow-lg">
                <img
                  src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                  alt={`${doctorName} - ${doctorTitle}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = `data:image/svg+xml,${encodeURIComponent(`<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="128" fill="#00cba9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="48" font-weight="bold">${doctorName.charAt(0)}</text></svg>`)}`;
                  }}
                />
              </div>
            </div>

            {/* Provider Details */}
            <div className="text-center">
              <p className="text-white text-lg font-semibold mb-2">
                Medazon Health AZ — {doctorName}, {doctorTitle}
              </p>
              
              <p className="text-gray-300">
                Appointment Type: {appointment.visit_type === "video" ? "Video Visit" : appointment.visit_type === "phone" ? "Phone Visit" : "Consultation"}
              </p>
            </div>
          </div>

          {/* Countdown Timer / Meeting Link Section */}
          {appointment.visit_type === "video" && (
            <>
              {/* Divider */}
              <div className="border-t border-primary-teal/30 my-6"></div>
              
              <div className="mb-6">
                {timeRemaining && !timeRemaining.isPast ? (
                  // Show countdown timer before appointment time
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-4 text-center">Time Until Your Appointment</h2>
                    <div className="flex items-center justify-center gap-4">
                      {timeRemaining.days > 0 && (
                        <div className="text-center">
                          <div className="text-3xl font-bold text-primary-teal">{String(timeRemaining.days).padStart(2, '0')}</div>
                          <div className="text-sm text-gray-400">Days</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary-teal">{String(timeRemaining.hours).padStart(2, '0')}</div>
                        <div className="text-sm text-gray-400">Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary-teal">{String(timeRemaining.minutes).padStart(2, '0')}</div>
                        <div className="text-sm text-gray-400">Minutes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary-teal">{String(timeRemaining.seconds).padStart(2, '0')}</div>
                        <div className="text-sm text-gray-400">Seconds</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show meeting link after appointment time has passed
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-3">Meeting Link</h2>
                    {appointment.zoom_meeting_url ? (
                      <a
                        href={appointment.zoom_meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-teal hover:text-primary-teal/80 underline"
                      >
                        Click here to open meeting
                      </a>
                    ) : (
                      <p className="text-gray-400">Meeting link will be provided closer to your appointment time.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Start Video Visit Button - Show whenever meeting URL exists (doctor may start early) */}
          {appointment.visit_type === "video" && appointment.zoom_meeting_url && (
            <div className="mt-8">
              <a
                href={appointment.zoom_meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-[#0a0f1a] border-2 border-primary-teal text-white font-bold py-4 px-8 rounded-lg hover:bg-primary-teal hover:text-black transition-colors shadow-lg"
              >
                Start Video Visit
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AppointmentContent />
    </Suspense>
  );
}

