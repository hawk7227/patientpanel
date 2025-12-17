"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import symptomSuggestions from "@/data/symptom-suggestions.json";
import { 
  Video, 
  Calendar, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  Phone,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import UrgentCollapse from "@/components/home/UrgentCollapse";
import CheckoutForm from "@/components/CheckoutForm";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const STEPS = [
   { 
     id: 0, 
     key: 'appointmentDetails', 
    //  title: 'Step 1 of 2',
     title: '1st Step',
     detailKey: null 
   },
   { 
     id: 1, 
     key: 'checkout', 
    //  title: 'Step 2 of 2', 
     title: 'Final Step', 
     detailKey: null 
   }
 ];
function SubmitEmailForExpressBooking() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [visitTypeDialogOpen, setVisitTypeDialogOpen] = useState(false);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [dateTimeDialogOpen, setDateTimeDialogOpen] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<{
    id: string;
    name: string;
    credentials: string;
    specialty: string;
  } | null>(null);
  const [reasonQuery, setReasonQuery] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState({
    allergies: null as boolean | null,
    allergiesDetails: "",
    surgeries: null as boolean | null,
    surgeriesDetails: "",
    medications: null as boolean | null,
    medicationsDetails: "",
  });
  const [appointmentData, setAppointmentData] = useState({
    reason: "",
    visitType: "",
    appointmentDate: "",
    appointmentTime: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    streetAddress: "",
    postalCode: "",
    placeId: "",
    chiefComplaint: "",
    pharmacy: "",
    pharmacyAddress: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    patientOwnWords: "",
    allergies: "",
    surgeries: "",
    medicalIssues: "",
  });
  const [timeUntilAppointment, setTimeUntilAppointment] = useState({ days: 0, hours: 0, minutes: 0 });
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [highlightedField, setHighlightedField] = useState<string | null>("reason");
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");
  const [chiefComplaintDialogOpen, setChiefComplaintDialogOpen] = useState(false);
  const prefillHighlight = emailExists && appointmentData.appointmentDate && appointmentData.appointmentTime;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const filled = digits.padEnd(10, "_");
    const formatted = `(${filled.slice(0, 3)})-${filled.slice(3, 6)}-${filled.slice(6, 10)}`;
    return { digits, formatted };
  };

  const isPhoneValid = useCallback((value: string) => formatPhone(value).digits.length === 10, []);

  const formatDob = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const filled = digits.padEnd(8, "_");
    const formatted = `${filled.slice(0, 2)}/${filled.slice(2, 4)}/${filled.slice(4, 8)}`;
    return { digits, formatted };
  };

  const isDobValid = useCallback((value: string) => {
    const { digits } = formatDob(value);
    if (digits.length !== 8) return false;
    const mm = Number(digits.slice(0, 2));
    const dd = Number(digits.slice(2, 4));
    const yyyy = Number(digits.slice(4, 8));
    if (mm < 1 || mm > 12) return false;
    const dt = new Date(yyyy, mm - 1, dd);
    if (dt.getMonth() !== mm - 1 || dt.getDate() !== dd || dt.getFullYear() !== yyyy) return false;
    const today = new Date();
    dt.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (dt > today) return false;
    return true;
  }, []);

  const isValidEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    // RFC5322-like, pragmatic validation: local@domain.tld (2+ TLD chars), allows dots/hyphens
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(trimmed);
  };

  // Require at least two words (each 2+ letters) separated by space (e.g., "it is")
  const hasOneWord = useCallback((value: string) => /\b[A-Za-z]{2,}\b(?:\s+\b[A-Za-z]{2,}\b)+/.test(value.trim()), []);

  const markTouched = (..._args: unknown[]) => {
    void _args;
  };

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#00cba9",
      colorBackground: "#0a1219",
      colorText: "#ffffff",
      colorDanger: "#ef4444",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      spacingUnit: "4px",
      borderRadius: "8px",
    },
  };

  const options = {
    clientSecret,
    appearance,
  };
  const convertDateToISO = (dateStr: string): string => {
    if (dateStr && dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const month = parts[0].padStart(2, "0");
        const day = parts[1].padStart(2, "0");
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    return "";
  };


  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        const response = await fetch('/api/get-doctor-availability?date=2025-01-01&doctorId=1fd1af57-5529-4d00-a301-e653b4829efc');
        if (response.ok) {
          const data = await response.json();
          if (data.doctor) {
            setDoctorInfo({
              id: data.doctor.id,
              name: data.doctor.name,
              credentials: "MSN, APRN, FNP-C",
              specialty: data.doctor.specialty || "A Private Practice Provider",
            });
          }
        }
      } catch {
        setDoctorInfo({
          id: "1fd1af57-5529-4d00-a301-e653b4829efc",
          name: "LaMonica A. Hodges",
          credentials: "MSN, APRN, FNP-C",
          specialty: "A Private Practice Provider",
        });
      }
    };
    fetchDoctorInfo();
  }, []);

  useEffect(() => {
    if (step === 2 && !clientSecret) {
      const initPaymentIntent = async () => {
        try {
          const res = await fetch("/api/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: 18900 }),
          });
          const data = await res.json();
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          }
        } catch (error) {
          console.error("Error creating payment intent:", error);
        }
      };
      void initPaymentIntent();
    }
  }, [step, clientSecret]);

  useEffect(() => {
    if (step === 1) {
      if (!appointmentData.reason) {
        setHighlightedField("reason");
      } else if (!appointmentData.visitType) {
        setHighlightedField("visitType");
      } else if (!appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        setHighlightedField("dateTime");
      } else if (!appointmentData.firstName.trim()) {
        setHighlightedField("firstName");
      } else if (!appointmentData.lastName.trim()) {
        setHighlightedField("lastName");
      } else if (!isPhoneValid(appointmentData.phone)) {
        setHighlightedField("phone");
      } else if (!isDobValid(appointmentData.dateOfBirth)) {
        setHighlightedField("dateOfBirth");
      } else if (!appointmentData.streetAddress || !appointmentData.placeId) {
        setHighlightedField("streetAddress");
      } else {
        setHighlightedField(null);
      }
    }
  }, [step, appointmentData, isPhoneValid, isDobValid]);

  useEffect(() => {
    if ((paymentComplete || intakeComplete) && appointmentData.appointmentDate && appointmentData.appointmentTime) {
      const calculateTimeRemaining = () => {
        const appointmentDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
        const now = new Date();
        const diff = appointmentDateTime.getTime() - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeUntilAppointment({ days, hours, minutes });
        }
      };

      calculateTimeRemaining();
      const interval = setInterval(calculateTimeRemaining, 60000);
      return () => clearInterval(interval);
    }
  }, [paymentComplete, intakeComplete, appointmentData.appointmentDate, appointmentData.appointmentTime]);

  const filteredReasons = useMemo(() => {
    if (!reasonQuery.trim()) return [];
    const searchTerm = reasonQuery.toLowerCase().trim();
    
    // First, get all name matches
    const nameMatches = symptomSuggestions
      .filter((item) => item.name.toLowerCase().startsWith(searchTerm))
      .map((item) => ({ item, priority: 1 }));
    
    // Then, get smart_search matches (only if search term is at least 3 chars to avoid too broad matches)
    const smartMatches = searchTerm.length >= 3
      ? symptomSuggestions
          .filter((item) => {
            const nameLower = item.name.toLowerCase();
            // Only include if name doesn't already match
            if (nameLower.startsWith(searchTerm)) return false;
            
            return item.smart_search.some((keyword) => {
              const keywordLower = keyword.toLowerCase();
              // Only match shorter keywords to avoid partial matches in long words like "hyperpigmentation"
              return keywordLower.startsWith(searchTerm) && keywordLower.length <= 15;
            });
          })
          .map((item) => ({ item, priority: 2 }))
      : [];
    
    // Combine and sort by priority, then limit results
    return [...nameMatches, ...smartMatches]
      .sort((a, b) => a.priority - b.priority)
      .map((result) => result.item)
      .slice(0, 8);
  }, [reasonQuery]);

  const handleEmailSubmission = async () => {
    if (!isValidEmail(email)) {
      alert("Please enter your email address to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/check-user-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check user');
      }
      setEmailSubmitted(true);

      if (result.exists) {
        setEmailExists(true);
        if (result.user) {
          setAppointmentData((prev) => {
            // Convert date_of_birth from YYYY-MM-DD to MM/DD/YYYY format
            let formattedDateOfBirth = prev.dateOfBirth;
            if (result.user.date_of_birth) {
              const dateParts = result.user.date_of_birth.split("-");
              if (dateParts.length === 3) {
                formattedDateOfBirth = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
              }
            }
            // Format phone with mask
            const phoneDigits = (result.user.mobile_phone || "").replace(/\D/g, "").slice(0, 10);
            const phoneFormatted = formatPhone(phoneDigits).formatted;
            const addressIncoming = result.user.address || "";
            
            return {
              ...prev,
              firstName: result.user.first_name || prev.firstName,
              lastName: result.user.last_name || prev.lastName,
              phone: phoneDigits ? phoneFormatted : prev.phone,
              dateOfBirth: formattedDateOfBirth,
              streetAddress: addressIncoming || prev.streetAddress,
              placeId: addressIncoming ? prev.placeId || "api-prefill-address" : prev.placeId,
            };
          });
        }
        if (result.patientId) {
        sessionStorage.setItem('appointmentData', JSON.stringify({
          email: email.trim(),
          patientId: result.patientId,
            skipIntake: true,
            user: result.user,
          }));
        } else if (result.user) {
          sessionStorage.setItem('appointmentData', JSON.stringify({
            email: email.trim(),
            user: result.user,
          }));
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
      alert(error instanceof Error ? error.message : 'Failed to process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateOfBirthChange = (value: string) => {
    const { formatted } = formatDob(value);
    setAppointmentData((prev) => ({ ...prev, dateOfBirth: formatted }));
  };

  const formatDateTime = (date: string, time: string): string => {
    if (!date || !time) return "";
    try {
      // Handle YYYY-MM-DD format
      const dateObj = new Date(date + "T00:00:00");
      if (isNaN(dateObj.getTime())) {
        return `${date} • ${time}`;
      }
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[dateObj.getDay()];
      const month = months[dateObj.getMonth()];
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      
      // Format time (assuming time is in HH:MM format)
      const [hours, minutes] = time.split(":");
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 % 12 || 12;
      const ampm = hour24 >= 12 ? "pm" : "am";
      const formattedTime = `${hour12.toString().padStart(2, "0")}:${minutes}${ampm}`;
      
      return `${dayName} - ${month}-${day}-${year} ${formattedTime}`;
    } catch {
      return `${date} • ${time}`;
    }
  };

  const personalDetailsValid =
    appointmentData.reason &&
    appointmentData.visitType &&
    appointmentData.appointmentDate &&
    appointmentData.appointmentTime &&
    appointmentData.firstName.trim() &&
    appointmentData.lastName.trim() &&
    isPhoneValid(appointmentData.phone) &&
    isDobValid(appointmentData.dateOfBirth) &&
    appointmentData.streetAddress.trim() &&
    appointmentData.placeId.trim();

  const totalStepFields = 9;
  const completedFields = useMemo(() => {
    let count = 0;
    if (email.trim()) count += 1; // email entered before step 1
    if (appointmentData.reason && hasOneWord(appointmentData.chiefComplaint)) count += 1; // reason + chiefComplaint
    if (appointmentData.visitType) count += 1;
    if (appointmentData.appointmentDate && appointmentData.appointmentTime) count += 1;
    if (appointmentData.firstName.trim()) count += 1;
    if (appointmentData.lastName.trim()) count += 1;
    if (isPhoneValid(appointmentData.phone)) count += 1;
    if (isDobValid(appointmentData.dateOfBirth)) count += 1;
    if (appointmentData.streetAddress.trim() && appointmentData.placeId.trim()) count += 1;
    return Math.min(count, totalStepFields);
  }, [
    email,
    appointmentData.reason,
    appointmentData.visitType,
    appointmentData.appointmentDate,
    appointmentData.appointmentTime,
    appointmentData.firstName,
    appointmentData.lastName,
    appointmentData.phone,
    appointmentData.dateOfBirth,
    appointmentData.streetAddress,
    appointmentData.placeId,
    isPhoneValid,
    isDobValid,
    appointmentData.chiefComplaint,
    hasOneWord,
  ]);

  return (
    <div className="bg-[#050b14] p-3 md:p-8 rounded-2xl border border-white/10 shadow-2xl relative w-full">
      {!emailSubmitted && (
        <div className="mt-1 md:mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-left text-white font-bold mb-2 text-sm ml-1">EMAIL:</label>
         <input 
          type="email" 
          value={email}
          placeholder="your.email@example.com"
          className="w-full bg-[#11161c] border border-white/10 rounded-lg py-4 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all text-[16px]"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) {
                handleEmailSubmission();
              }
            }}
          />
        <div className="flex justify-center gap-4 mt-4 md:mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <button 
            onClick={handleEmailSubmission}
            disabled={!isValidEmail(email) || isLoading}
            className={`bg-primary-orange text-white px-8 py-3 rounded-lg transition-all text-sm font-bold shadow-lg shadow-orange-900/20 flex items-center gap-2 ${
                !isValidEmail(email) || isLoading ? "opacity-50 cursor-not-allowed grayscale" : "hover:bg-orange-600"
            }`}
         >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && <Calendar size={18} />}
              Submit Email
         </button>
      </div>
    </div>
      )}

      {emailSubmitted && !paymentComplete && (
        <div className="space-y-3 md:space-y-6">
          {/* <div className="font-bold text-lg md:text-xl text-primary-orange">Step {step} of 2</div> */}
          <div className="font-bold text-lg md:text-xl text-primary-orange">{STEPS[step - 1].title}</div>
          {/* <div className={`font-bold text-lg md:text-xl ${step === 1 ? "text-primary-orange" : "text-primary-teal"}`}>{STEPS[step - 1].title}</div> */}

          {/* Progress bar for 9 fields */}
          {step === 1 && (
            <div className="bg-[#0d1218] border border-white/10 rounded-xl p-2 md:p-3 space-y-2">
              <div className="text-center text-white font-bold text-xs md:text-sm">Priority Queue Assigned</div>
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: totalStepFields }).map((_, idx) => {
                  const filled = idx < completedFields;
                  const isLastFilled = filled && completedFields === totalStepFields && idx === totalStepFields - 1;
                  return (
                    <div
                      key={idx}
                      className={`h-2 w-6 md:h-3 w-full rounded-xs border ${
                        filled ? "bg-green-500 border-green-500" : "bg-transparent border-primary-teal/60"
                      } flex items-center justify-center text-white`}
                    >
                      {isLastFilled ? <Check size={10} /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {doctorInfo && appointmentData.visitType && (
            <div className="border border-white/10 rounded-xl p-2.5 md:p-3 flex items-center gap-2 md:gap-3 bg-[#0d1218]">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden ring-2 ring-primary-teal/40 flex-shrink-0">
                <Image
                  src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                  alt={doctorInfo.name}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-white font-semibold text-xs md:text-sm truncate">{doctorInfo.name}</div>
                <div className="text-gray-400 text-[10px] md:text-xs">{doctorInfo.credentials}</div>
                <div className="text-primary-teal text-[10px] md:text-xs truncate">{doctorInfo.specialty}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5 md:gap-1 flex-shrink-0">
                <div className="text-gray-400 text-[9px] md:text-[10px]">Visit Type</div>
                <div className="bg-primary-teal/10 text-primary-teal text-[10px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                  {appointmentData.visitType}
                </div>
                {step === 2 && (
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="text-white font-bold text-xs md:text-sm mt-0.5 md:mt-1">$189</div>
                    <div className="text-center text-primary-teal font-md text-xs md:text-sm">{`"When Your Privacy Matters"`}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
                <div className="relative">
                  <button
                    onClick={() => setReasonDialogOpen(true)}
                    className={`w-full bg-[#0d1218] border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-left text-white font-semibold flex items-center justify-between min-h-[48px] md:min-h-[52px] text-xs transition-all ${
                      highlightedField === "reason" 
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]" 
                        : appointmentData.reason 
                        ? "border-primary-teal" 
                        : "border-white/10"
                    }`}
                  >
                    <span className="truncate">{appointmentData.reason ? appointmentData.reason : "Reason For Visit"}</span>
                    <ChevronRight size={16} className="text-primary-teal" />
                  </button>

                  {reasonDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
                      <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-6 w-full max-w-lg space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="text-white font-bold text-base md:text-lg">Select Reason for Visit</div>
                          <button onClick={() => setReasonDialogOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <input
                          value={reasonQuery}
                          onChange={(e) => setReasonQuery(e.target.value)}
                          placeholder="Search symptoms..."
                          className="w-full bg-[#11161c] border border-white/10 rounded px-3 py-2 text-[16px] text-white focus:outline-none focus:border-primary-teal"
                        />
                        <div className="max-h-72 overflow-y-auto border border-white/5 rounded-lg">
                          {filteredReasons.map((item) => (
                 <div 
                    key={item.name}
                                  className="px-3 py-2 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-xs border-b border-white/5 last:border-0"
                                  onClick={() => {
                                    setAppointmentData((prev) => ({ ...prev, reason: item.name }));
                                    setReasonDialogOpen(false);
                                    setReasonQuery("");
                                    setChiefComplaintDialogOpen(true);
                                  }}
                 >
                    {item.name}
                 </div>
              ))}
                        </div>
                      </div>
           </div>
         )}
      </div>

                <div className="relative">
                  <button
                    onClick={() => setVisitTypeDialogOpen(true)}
                    className={`w-full bg-[#0d1218] border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-left text-white font-semibold flex items-center justify-between min-h-[48px] md:min-h-[52px] text-xs transition-all ${
                      highlightedField === "visitType" 
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]" 
                        : appointmentData.visitType 
                        ? "border-primary-teal" 
                        : "border-white/10"
                    }`}
                  >
                    <span className="truncate">{appointmentData.visitType ? appointmentData.visitType + " Visit" : "Visit Type"}</span>
                    <ChevronRight size={16} className="text-primary-teal" />
                  </button>

                  {visitTypeDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
                      <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-6 w-full max-w-sm space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="text-white font-bold text-base md:text-lg">Select Visit Type</div>
                          <button onClick={() => setVisitTypeDialogOpen(false)} className="text-gray-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          {["Video", "Audio"].map((type) => (
                            <button
                              key={type}
                              onClick={() => {
                                setAppointmentData((prev) => ({ ...prev, visitType: type }));
                                setVisitTypeDialogOpen(false);
                              }}
                              className={`border rounded-lg p-3 md:p-4 flex flex-col items-center gap-1.5 md:gap-2 text-white font-semibold transition-all ${
                                appointmentData.visitType === type
                                  ? "border-primary-teal bg-primary-teal/10"
                                  : "border-white/10 hover:border-primary-teal"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                {type === "Video" ? <Video size={18} /> : <Phone size={18} />}
                              </div>
                              <span>{type} Call</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {chiefComplaintDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
                  <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-5 w-full max-w-lg space-y-3 md:space-y-4">
                    <div className="flex justify-center items-center">
                      <div className="text-white font-bold text-base md:text-lg">Describe symptoms</div>
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={appointmentData.chiefComplaint}
                        onChange={(e) => setAppointmentData((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                        placeholder="Describe symptoms"
                        rows={2}
                        className="w-full bg-[#11161c] border border-white/10 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-primary-teal min-h-[60px]"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setChiefComplaintDialogOpen(false)}
                        disabled={!hasOneWord(appointmentData.chiefComplaint)}
                        className={`bg-primary-teal text-black font-bold px-4 py-2 rounded-lg text-sm md:text-base ${
                          hasOneWord(appointmentData.chiefComplaint)
                            ? "hover:bg-primary-teal/90"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 text-sm">
                <div className="relative">
                  <button
                    onClick={() => {
                      setDateTimeMode("date");
                      setDateTimeDialogOpen(true);
                    }}
                    className={`w-full bg-[#0d1218] border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-left text-white font-semibold flex items-center justify-between transition-all ${
                      highlightedField === "dateTime" 
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]" 
                        : appointmentData.appointmentDate && appointmentData.appointmentTime
                        ? "border-primary-teal py-2 text-lg" 
                        : "border-white/10 text-xs"
                    }`}
                  >
                    <span>
                      {appointmentData.appointmentDate && appointmentData.appointmentTime
                        ? formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime)
                        : "Appointment Day / Time"}
                    </span>
                    <ChevronRight size={16} className="text-primary-teal" />
                  </button>
                </div>
              </div>

              {dateTimeDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
                  <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-6 w-full max-w-3xl space-y-3 md:space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-white font-bold text-base md:text-lg">
                        {dateTimeMode === "date" ? "Select Appointment Day" : "Select Appointment Time"}
                      </div>
                      <button onClick={() => setDateTimeDialogOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>

                    {dateTimeMode === "time" && (
                      <div className="flex justify-start">
                        <button
                          onClick={() => setDateTimeMode("date")}
                          className="text-xs md:text-sm text-primary-teal hover:text-primary-teal/80 underline"
                        >
                          Change day
                        </button>
                      </div>
                    )}

                    <div className="bg-[#11161c]/60 rounded-lg p-2 border border-white/5">
                      <AppointmentCalendar
                        selectedDate={appointmentData.appointmentDate || null}
                        selectedTime={appointmentData.appointmentTime || null}
                        onDateSelect={(date) => {
                          setAppointmentData((prev) => ({ ...prev, appointmentDate: date, appointmentTime: "" }));
                          setDateTimeMode("time");
                        }}
                        onTimeSelect={(time) => setAppointmentData((prev) => ({ ...prev, appointmentTime: time }))}
                        doctorId="1fd1af57-5529-4d00-a301-e653b4829efc"
                        mode={dateTimeMode === "date" ? "date" : "time"}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDateTimeDialogOpen(false)}
                        className="bg-primary-teal text-black font-bold px-4 py-2 rounded-lg text-xs md:text-sm hover:bg-primary-teal/90 w-full md:w-auto"
                        disabled={!appointmentData.appointmentDate || !appointmentData.appointmentTime}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#0d1218] border border-white/10 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">
                <div className="text-white font-semibold text-xs md:text-sm">Patient Details</div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={`bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal col-span-2 transition-all ${
                      appointmentData.appointmentDate && appointmentData.appointmentTime ? "border-primary-teal" : "border-white/10"
                    }`}
                    disabled
                  />
                  <input
                    value={appointmentData.firstName}
                    onFocus={() => markTouched("firstName")}
                    onChange={(e) => {
                      markTouched("firstName");
                      setAppointmentData((prev) => ({ ...prev, firstName: e.target.value }));
                    }}
                    placeholder="First Name"
                    className={`bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all ${
                      highlightedField === "firstName"
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]"
                        : appointmentData.firstName.trim() && (!emailExists || prefillHighlight)
                        ? "border-primary-teal"
                        : "border-white/10"
                    }`}
                  />
                  <input
                    value={appointmentData.lastName}
                    onFocus={() => markTouched("lastName")}
                    onChange={(e) => {
                      markTouched("lastName");
                      setAppointmentData((prev) => ({ ...prev, lastName: e.target.value }));
                    }}
                    placeholder="Last Name"
                    className={`bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all ${
                      highlightedField === "lastName"
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]"
                        : appointmentData.lastName.trim() && (!emailExists || prefillHighlight)
                        ? "border-primary-teal"
                        : "border-white/10"
                    }`}
                  />
                  <input
                    value={appointmentData.phone}
                    onChange={(e) => {
                      markTouched("phone");
                      const { formatted } = formatPhone(e.target.value);
                      setAppointmentData((prev) => ({ ...prev, phone: formatted }));
                    }}
                    placeholder="Phone Number"
                    onFocus={(e) => {
                      markTouched("phone");
                      if (!appointmentData.phone.trim()) {
                        const { formatted } = formatPhone("");
                        setAppointmentData((prev) => ({ ...prev, phone: formatted }));
                        // Move caret to after "("
                        requestAnimationFrame(() => {
                          e.target.setSelectionRange(1, 1);
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const digits = formatPhone(e.target.value).digits;
                      if (!digits.length) {
                        setAppointmentData((prev) => ({ ...prev, phone: "" }));
                      }
                    }}
                    inputMode="numeric"
                    className={`bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all ${
                      highlightedField === "phone"
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]"
                        : isPhoneValid(appointmentData.phone) && (!emailExists || prefillHighlight)
                        ? "border-primary-teal"
                        : "border-white/10"
                    }`}
                  />
                  <input
                    value={appointmentData.dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    placeholder="Date of Birth"
                    onFocus={(e) => {
                      markTouched("dateOfBirth");
                      if (!appointmentData.dateOfBirth.trim()) {
                        const { formatted } = formatDob("");
                        setAppointmentData((prev) => ({ ...prev, dateOfBirth: formatted }));
                        // Move caret to start
                        requestAnimationFrame(() => {
                          e.target.setSelectionRange(0, 0);
                        });
                      }
                    }}
                    onBlur={(e) => {
                      markTouched("dateOfBirth");
                      const { digits } = formatDob(e.target.value);
                      if (!digits.length) {
                        setAppointmentData((prev) => ({ ...prev, dateOfBirth: "" }));
                        return;
                      }
                      // If future date, alert and reset
                      if (!isDobValid(e.target.value)) {
                        alert("Date of birth can't be in the future or invalid.");
                        setAppointmentData((prev) => ({ ...prev, dateOfBirth: "" }));
                      }
                    }}
                    inputMode="numeric"
                    className={`bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all ${
                      highlightedField === "dateOfBirth"
                        ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]"
                        : isDobValid(appointmentData.dateOfBirth) && (!emailExists || prefillHighlight)
                        ? "border-primary-teal"
                        : "border-white/10"
                    }`}
                  />
                  <div className="col-span-2">
                    <GooglePlacesAutocomplete
                      value={appointmentData.streetAddress}
                      onChange={(value) => {
                        markTouched("streetAddress");
                        setAppointmentData((prev) => ({ ...prev, streetAddress: value }));
                      }}
                      onPlaceSelect={(place) => {
                        if (place.formatted_address) {
                          let postalCode = "";
                          const addressComponents = place.address_components;
                          if (addressComponents) {
                            const postalCodeComponent = addressComponents.find(
                              (component) => component.types?.includes("postal_code")
                            );
                            if (postalCodeComponent) {
                              postalCode = postalCodeComponent.long_name || "";
                            }
                          }
                          setAppointmentData((prev) => ({
                            ...prev,
                            streetAddress: place.formatted_address || "",
                            postalCode: postalCode,
                            placeId: place.place_id || "",
                          }));
                          markTouched("streetAddress");
                        }
                      }}
                      placeholder="Street Address"
                      types={["address"]}
                      componentRestrictions={{ country: "us" }}
                      className={`w-full bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all ${
                        highlightedField === "streetAddress"
                          ? "border-primary-teal animate-pulse shadow-[0_0_10px_rgba(0,203,169,0.5)]"
                          : appointmentData.streetAddress.trim() && appointmentData.placeId.trim() && (!emailExists || prefillHighlight)
                          ? "border-primary-teal"
                          : "border-white/10"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
          <button 
                  onClick={() => setStep(2)}
                  disabled={!personalDetailsValid}
                  className={`w-full md:w-auto bg-primary-orange text-white px-6 py-3 rounded-lg font-bold text-sm shadow-lg ${
                    personalDetailsValid ? "hover:bg-orange-600" : "opacity-50 cursor-not-allowed grayscale"
                  }`}
                >
                  Proceed Next
         </button>
      </div>
        </div>
      )}

          {step === 2 && (
            <div className="space-y-3 md:space-y-4">
              {/* <div className="text-center text-primary-teal font-semibold text-xs md:text-sm">When Your Privacy Matters</div> */}
              {/* <div className="bg-[#0d1218] border border-white/10 rounded-xl p-3 md:p-4 space-y-2 md:space-y-3"> */}
              <div className="text-white font-semibold text-sm"><span className="text-primary-orange">Confirm Appointment Request:</span> {appointmentData.appointmentDate} {appointmentData.appointmentTime}</div>
              {clientSecret && (
                <Elements options={options} stripe={stripePromise}>
                  <CheckoutForm
                    formData={{
                      email: email.trim(),
                      firstName: appointmentData.firstName,
                      lastName: appointmentData.lastName,
                      phone: appointmentData.phone,
                      dateOfBirth: appointmentData.dateOfBirth,
                      streetAddress: appointmentData.streetAddress,
                      postalCode: appointmentData.postalCode || "",
                    }}
                    acceptedTerms={acceptedTerms}
                    onTermsChange={setAcceptedTerms}
                    isFormValid={() => !!personalDetailsValid && acceptedTerms}
                    convertDateToISO={convertDateToISO}
                    onSuccess={() => {
                      setPaymentComplete(true);
                      setStep(3);
                    }}
                  />
                </Elements>
              )}
            </div>
          )}
        </div>
      )}

      {paymentComplete && !intakeComplete && (
        <div className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <div className="bg-[#0d1218] border border-white/10 rounded-xl p-3 md:p-4">
            <div className="text-primary-teal font-bold text-base md:text-lg mb-2">Appointment Confirmed</div>
            {doctorInfo && (
              <div className="flex items-center gap-2 md:gap-3 mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden ring-2 ring-primary-teal/40 flex-shrink-0">
                  <Image
                    src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                    alt={doctorInfo.name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-white font-semibold text-xs md:text-sm">{doctorInfo.name}</div>
                  <div className="text-gray-400 text-[10px] md:text-xs">{doctorInfo.credentials}</div>
                  <div className="text-primary-teal text-[10px] md:text-xs">{doctorInfo.specialty}</div>
                </div>
              </div>
            )}
            <div className="text-gray-300 text-xs md:text-sm">
              {appointmentData.appointmentDate && appointmentData.appointmentTime && (
                <div className="font-semibold mb-1">
                  Date & Time: {formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime)}
                </div>
              )}
              Thank you for scheduling. We&apos;ve reserved your spot and sent a confirmation to {email}.
            </div>
          </div>

          {!emailExists && (
            <div className="bg-[#0d1218] border border-white/10 rounded-xl p-3 md:p-4 space-y-3 md:space-y-4">
              <div className="text-center">
                <div className="text-red-500 font-bold text-xs md:text-sm mb-2">REQUIRED BEFORE VISIT</div>
                <div className="text-white font-bold text-base md:text-xl mb-3">Complete Your Intake</div>
                
                <div className="flex justify-center gap-4 md:gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-primary-teal font-bold text-2xl md:text-3xl">{timeUntilAppointment.days.toString().padStart(2, '0')}</div>
                    <div className="text-gray-400 text-[10px] md:text-xs uppercase">Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-primary-teal font-bold text-2xl md:text-3xl">{timeUntilAppointment.hours.toString().padStart(2, '0')}</div>
                    <div className="text-gray-400 text-[10px] md:text-xs uppercase">Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-primary-teal font-bold text-2xl md:text-3xl">{timeUntilAppointment.minutes.toString().padStart(2, '0')}</div>
                    <div className="text-gray-400 text-[10px] md:text-xs uppercase">Minutes</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a2128] border border-primary-orange/30 rounded-lg p-3 md:p-4">
                <div className="text-gray-300 text-xs text-center md:text-justify">
                  Provide these details so we can route your request and prepare the provider <span className="text-red-500 font-semibold">Before Visit Starts</span>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div>
                  <div className="text-white font-semibold text-sm md:text-base mb-2">Any Drug Allergies?</div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
          <button 
                      onClick={() => setIntakeAnswers((prev) => ({ ...prev, allergies: true }))}
                      className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                        intakeAnswers.allergies === true
                          ? "bg-primary-teal text-black border-primary-teal"
                          : "border-white/20 text-white hover:border-primary-teal/50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setIntakeAnswers((prev) => ({ ...prev, allergies: false, allergiesDetails: "" }))}
                      className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                        intakeAnswers.allergies === false
                          ? "bg-primary-teal text-black border-primary-teal"
                          : "border-white/20 text-white hover:border-primary-teal/50"
                      }`}
                    >
                      No
         </button>
      </div>
                  {intakeAnswers.allergies === true && (
                    <input
                      value={intakeAnswers.allergiesDetails}
                      onChange={(e) => setIntakeAnswers((prev) => ({ ...prev, allergiesDetails: e.target.value }))}
                      placeholder="List any known drug allergies..."
                      className="w-full mt-2 bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal"
                    />
      )}
    </div>

                <div>
                  <div className="text-white font-semibold text-sm md:text-base mb-2">Any Recent Surgeries or Procedures?</div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <button
                      onClick={() => setIntakeAnswers((prev) => ({ ...prev, surgeries: true }))}
                      className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                        intakeAnswers.surgeries === true
                          ? "bg-primary-teal text-black border-primary-teal"
                          : "border-white/20 text-white hover:border-primary-teal/50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setIntakeAnswers((prev) => ({ ...prev, surgeries: false, surgeriesDetails: "" }))}
                      className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                        intakeAnswers.surgeries === false
                          ? "bg-primary-teal text-black border-primary-teal"
                          : "border-white/20 text-white hover:border-primary-teal/50"
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {intakeAnswers.surgeries === true && (
                    <input
                      value={intakeAnswers.surgeriesDetails}
                      onChange={(e) => setIntakeAnswers((prev) => ({ ...prev, surgeriesDetails: e.target.value }))}
                      placeholder="List recent surgeries..."
                      className="w-full mt-2 bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal"
                    />
                  )}
                </div>

                <div>
                  <div className="text-white font-semibold text-sm md:text-base mb-2">Any Ongoing Medical Issues?</div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <button
                      onClick={() => setIntakeAnswers((prev) => ({ ...prev, medications: true }))}
                      className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                        intakeAnswers.medications === true
                          ? "bg-primary-teal text-black border-primary-teal"
                          : "border-white/20 text-white hover:border-primary-teal/50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setIntakeAnswers((prev) => ({ ...prev, medications: false, medicationsDetails: "" }))}
                      className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                        intakeAnswers.medications === false
                          ? "bg-primary-teal text-black border-primary-teal"
                          : "border-white/20 text-white hover:border-primary-teal/50"
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {intakeAnswers.medications === true && (
                    <input
                      value={intakeAnswers.medicationsDetails}
                      onChange={(e) => setIntakeAnswers((prev) => ({ ...prev, medicationsDetails: e.target.value }))}
                      placeholder="List ongoing medical issues..."
                      className="w-full mt-2 bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal"
                    />
                  )}
                </div>

                <div>
                  <div className="text-white font-semibold text-sm md:text-base mb-2">Preferred Pharmacy</div>
                  <GooglePlacesAutocomplete
                    value={appointmentData.pharmacy}
                    onChange={(value) => setAppointmentData((prev) => ({ ...prev, pharmacy: value }))}
                    onPlaceSelect={(place) => {
                      if (place.name) {
                        setAppointmentData((prev) => ({
                          ...prev,
                          pharmacy: place.name || "",
                          pharmacyAddress: place.formatted_address || "",
                        }));
                      }
                    }}
                    placeholder="Pharmacy name (City or ZIP)"
                    types={["pharmacy", "drugstore"]}
                    componentRestrictions={{ country: "us" }}
                    className="w-full bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal"
                  />
                  {appointmentData.pharmacyAddress && (
                    <div className="text-gray-500 text-[10px] md:text-xs mt-1">{appointmentData.pharmacyAddress}</div>
                  )}
                </div>
              </div>

              <button
                onClick={async () => {
                  const intakeValid =
                    intakeAnswers.allergies !== null &&
                    intakeAnswers.surgeries !== null &&
                    intakeAnswers.medications !== null &&
                    appointmentData.pharmacy.trim() !== "";

                  if (!intakeValid) {
                    alert("Please complete all required fields");
      return;
    }

    setIsLoading(true);

    try {
                    const storedData = sessionStorage.getItem("appointmentData");
                    let patientId = null;
                    
                    if (storedData) {
                      const data = JSON.parse(storedData);
                      patientId = data.patientId;
                    }

                    const response = await fetch("/api/update-intake-patient", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        patientId,
                        email: email.trim(),
                        has_drug_allergies: intakeAnswers.allergies,
                        has_recent_surgeries: intakeAnswers.surgeries,
                        has_ongoing_medical_issues: intakeAnswers.medications,
                        preferred_pharmacy: appointmentData.pharmacy,
                      }),
      });

      const result = await response.json();

      if (!response.ok) {
                      throw new Error(result.error || "Failed to submit intake");
                    }

                    const payload = {
          email: email.trim(),
                      ...appointmentData,
                      intakeAnswers: {
                        has_drug_allergies: intakeAnswers.allergies,
                        has_recent_surgeries: intakeAnswers.surgeries,
                        has_ongoing_medical_issues: intakeAnswers.medications,
                      },
          patientId: result.patientId,
                    };
                    sessionStorage.setItem("appointmentData", JSON.stringify(payload));
                    setIntakeComplete(true);
    } catch (error) {
                    console.error("Error submitting intake:", error);
                    alert(error instanceof Error ? error.message : "Failed to submit intake. Please try again.");
                  } finally {
      setIsLoading(false);
    }
                }}
                disabled={isLoading}
                className={`w-full bg-gray-600 text-white font-bold py-3 md:py-4 rounded-lg text-sm md:text-base transition-all ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-500"
                }`}
              >
                {isLoading ? "SUBMITTING..." : "SUBMIT INTAKE"}
              </button>
      </div>
          )}
        </div>
      )}

      {intakeComplete && (
        <div className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <div className="bg-[#0a0f1a] border-2 border-primary-teal/50 rounded-xl p-4 md:p-6 shadow-[0_0_30px_rgba(0,203,169,0.2)]">
            <div className="mb-4 md:mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-primary-teal mb-2">Appointment Confirmed</h1>
              <p className="text-base md:text-lg text-white">
                Dear {appointmentData.firstName} {appointmentData.lastName}, Your {appointmentData.visitType.toLowerCase()} visit has been scheduled.
              </p>
            </div>

            <div className="border-t border-primary-teal/30 my-4 md:my-6"></div>

            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-2 md:mb-3">Date & Time</h2>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <p className="text-white text-sm md:text-base">
                  {formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime)}
                </p>
              </div>
            </div>

            <div className="border-t border-primary-teal/30 my-4 md:my-6"></div>

            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Provider Information</h2>
              
              <div className="flex justify-center mb-3 md:mb-4">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-primary-teal/50 shadow-lg">
                  <Image
                    src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                    alt={doctorInfo?.name || "Doctor"}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-white text-sm md:text-base font-semibold mb-2">
                  Medazon Health AZ — {doctorInfo?.name || "LaMonica A. Hodges"}, Family Medicine
                </p>
                <p className="text-gray-300 text-xs md:text-sm">
                  Appointment Type: {appointmentData.visitType} Visit
                </p>
         </div>
            </div>

            <div className="border-t border-primary-teal/30 my-4 md:my-6"></div>

            <div className="mb-4 md:mb-6">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4 text-center">Time Until Your Appointment</h2>
              <div className="flex items-center justify-center gap-3 md:gap-4">
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div className="text-2xl md:text-3xl font-bold text-primary-teal">{timeUntilAppointment.days.toString().padStart(2, '0')}</div>
                  <div className="text-xs md:text-sm text-gray-400 uppercase">Days</div>
      </div>
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div className="text-2xl md:text-3xl font-bold text-primary-teal">{timeUntilAppointment.hours.toString().padStart(2, '0')}</div>
                  <div className="text-xs md:text-sm text-gray-400 uppercase">Hours</div>
                </div>
                <div className="text-center min-w-[60px] md:min-w-[70px]">
                  <div className="text-2xl md:text-3xl font-bold text-primary-teal">{timeUntilAppointment.minutes.toString().padStart(2, '0')}</div>
                  <div className="text-xs md:text-sm text-gray-400 uppercase">Minutes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
   const [showEmailForExpressBooking, setShowEmailForExpressBooking] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      <UrgentCollapse />
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-20 pb-12 px-4 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary-teal/10 blur-[120px] rounded-full -z-10" />
        
        <div className="border border-white/10 bg-card-bg/50 backdrop-blur-sm rounded-3xl p-8 max-w-3xl w-full shadow-2xl shadow-primary-teal/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-teal to-transparent opacity-50"></div>
            <p className="text-xs md:text-sm text-gray-400 mb-2 uppercase tracking-wider font-semibold">Online Telehealth Services</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">
              Instant Private Medical Visits
            </h1>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm md:text-base">
              Get medical advice, prescriptions, and sick notes from the comfort of your home.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              {/* <button 
                onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary-teal hover:bg-teal-500 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
              >
                Start an Instant Visit <Video size={18} />
              </button> */}
              <button 
                onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary-orange hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
              >
                Book My Appointment <Calendar size={18} />
              </button>
            </div>

            <div className="text-primary-teal font-bold mb-4 text-sm md:text-base">
               No Waiting. No Sign ups. No Account Needed
            </div>
            <div className="text-xs text-primary-teal mb-6">
               $59 per visit — Traditional Insurances Accepted
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 text-[10px] md:text-xs text-gray-300 font-medium">
               <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><ShieldCheck size={12} className="text-primary-teal"/> HIPAA Secure</span>
               <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><MessageSquare size={12} className="text-blue-400"/> Private Messaging Chat</span>
               <span className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"><FileText size={12} className="text-purple-400"/> Medical Records</span>
            </div>
        </div>
      </section>

      {/* Provider Profile Section */}
      <section className="bg-[#11161c] py-12 border-b border-white/5">
         <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
               <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-teal shadow-[0_0_20px_rgba(0,203,169,0.3)]">
                  <Image 
                    src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg" 
                    alt="LaMonica A. Hodges" 
                    width={128} 
                    height={128}
                    className="object-cover"
                  />
               </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
               LaMonica A. Hodges, MSN, APRN, FNP-C
            </h2>
            
            <p className="text-gray-400 mb-6 text-sm md:text-base font-medium">
               Board-Certified Family Medicine · 10+ Years Experience .Private
            </p>
            
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-sm font-medium max-w-3xl mx-auto">
               {[
                  "AL", "AZ", "CO", "DE", "FL", "GA", "ID", "IL", "MI", "MS", 
                  "NV", "NM", "ND", "OH", "OR", "UT", "VA", "WA", "DC"
               ].map((state, index, array) => (
                  <span key={state} className="flex items-center">
                     <span className={`${
                        ["GA", "MI", "MS", "OH"].includes(state) 
                           ? "text-primary-teal font-bold" 
                           : "text-primary-teal/60"
                     }`}>
                        {state}
                     </span>
                     {index < array.length - 1 && (
                        <span className="text-gray-700 ml-3">·</span>
                     )}
                  </span>
               ))}
            </div>
         </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 container mx-auto px-4">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-teal mb-2">
               Our Services
            </h2>
            <p className="text-gray-400 text-sm">
               No waiting rooms · No insurance · No records shared.
            </p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
               { 
                  title: "UTI/STD", 
                  subtitle: "Start in 5 Minutes", 
                  image: "/assets/service_uti.jpg" 
               },
               { 
                  title: "Cold / Flu", 
                  subtitle: "Fast Relief", 
                  image: "/assets/service_cold_flu.jpg" 
               },
               { 
                  title: "Anxiety / Depression", 
                  subtitle: "Private Care", 
                  image: "/assets/service_anxiety.jpg" 
               },
               { 
                  title: "Weight Care/Injections", 
                  subtitle: "Clinician Guided", 
                  image: "/assets/service_weight.jpg" 
               },
               { 
                  title: "ADHD Initial /Follow-Up", 
                  subtitle: "Same Provider", 
                  image: "/assets/service_adhd.jpg" 
               },
               { 
                  title: "Men / Women's Health", 
                  subtitle: "Dermatology", 
                  image: "/assets/service_general.jpg" 
               },
            ].map((service, index) => (
               <div key={index} className="relative h-48 rounded-2xl overflow-hidden border border-white/20 group cursor-pointer">
                  <Image 
                     src={service.image} 
                     alt={service.title} 
                     fill 
                     className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                     <h3 className="text-white font-bold text-xl mb-1 drop-shadow-md">{service.title}</h3>
                     <span className="text-primary-teal text-sm font-medium drop-shadow-md">{service.subtitle}</span>
                  </div>
               </div>
            ))}
         </div>
      </section>

      {/* Symptoms Input Section */}
      <section id="symptoms-section" className="bg-[#11161c] py-6 md:py-20 border-y border-white/5">
         <div className="container mx-auto px-4 text-center max-w-4xl flex flex-col items-center justify-center">
           <h2 className="text-2xl md:text-4xl font-bold text-primary-teal mb-2">
              60 Seconds Express Booking
           </h2>
           <p className="hidden md:block text-gray-400 mb-8 text-xl tracking-wider">
              No Account Needed
           </p>
           {showEmailForExpressBooking && <SubmitEmailForExpressBooking />}
           
            {!showEmailForExpressBooking && <button 
               onClick={() => setShowEmailForExpressBooking(true)}
               className="bg-primary-orange hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
            >
               Book My Appointment <Calendar size={18} />
            </button>}
         </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-transparent">
         <h2 className="text-2xl font-bold text-center text-primary-teal mb-12">How It Works</h2>
         
         <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary-teal/30 to-transparent -z-10"></div>

            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-black border border-primary-teal/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)]">
                  <Image src="/assets/download_(3).svg" alt="Step 1" width={24} height={24} className="text-primary-teal" />
               </div>
               <h3 className="font-bold mb-2 text-white text-sm">Choose Your Appointment Type</h3>
               <p className="text-xs text-gray-400 max-w-[200px]">Select a doctor & time of your choice — Both private & secure.</p>
            </div>
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-black border border-primary-teal/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)]">
                  <Image src="/assets/download_(2).svg" alt="Step 2" width={24} height={24} />
               </div>
               <h3 className="font-bold mb-2 text-white text-sm">Answer a Few Quick Questions</h3>
               <p className="text-xs text-gray-400 max-w-[200px]">Complete 2 minute intake questions telling your providing symptoms to help history of any reg meds.</p>
            </div>
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-black border border-primary-teal/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)]">
                  <Image src="/assets/download_(1).svg" alt="Step 3" width={24} height={24} />
               </div>
               <h3 className="font-bold mb-2 text-white text-sm">Consult & Receive Treatment</h3>
               <p className="text-xs text-gray-400 max-w-[200px]">Speak with a US-licensed provider — Receive talk, medication & sent to your local pharmacy.</p>
            </div>
         </div>
      </section>

      {/* Choose Visit Type */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
         <h2 className="text-2xl font-bold text-center text-primary-teal mb-8">Choose Your Visit Type</h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 rounded-2xl overflow-hidden relative group border border-white/10">
               <Image src="/assets/maw.jpg" alt="Instant Visit" fill className="object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-6">
                  <h3 className="text-2xl font-bold text-white mb-1">Instant Visit</h3>
                  <p className="text-primary-teal mb-6 text-sm font-medium">Get Seen Now</p>
                  <button 
                     onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                     className="bg-primary-teal text-black px-8 py-2.5 rounded-full font-bold hover:bg-white transition-colors text-sm"
                  >
                     Talk to a Doctor Now →
                  </button>
               </div>
            </div>

            <div className="h-64 rounded-2xl overflow-hidden relative group border border-white/10">
               <Image src="/assets/4.jpg" alt="Book Appointment" fill className="object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
               <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center p-6">
                  <h3 className="text-2xl font-bold text-white mb-1">Book an Appointment</h3>
                  <p className="text-primary-teal mb-6 text-sm font-medium">Book for Later</p>
                  <button 
                     onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                     className="border border-white text-white px-8 py-2.5 rounded-full font-bold hover:bg-white hover:text-black transition-colors text-sm"
                  >
                     Book for Later →
                  </button>
               </div>
            </div>
         </div>
      </section>

      {/* FAQ / Trust */}
      <section className="py-12 px-4 max-w-2xl mx-auto">
         <h2 className="text-2xl font-bold text-center text-primary-teal mb-4">Why Patients Trust Medazon</h2>
         <p className="text-center text-gray-400 text-xs mb-8 max-w-lg mx-auto">
            Fast, affordable, and high-quality care. We treat you like family.
            <br/>
            <span className="text-primary-teal">★ 5.0 (150+ Reviews)</span> — 15+ Years Experience
         </p>

         <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all whitespace-nowrap"
            >
               Talk to a Doctor Now <ArrowRight size={16} />
            </button>
            <button className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap">
               Read Reviews <ArrowRight size={16} />
            </button>
         </div>

         <div className="space-y-2">
            {[
               "What medical services do you provide?",
               "How fast will a doctor review my intake?",
               "Is my personal information secure?",
               "Do I need insurance?",
               "Can I choose my provider?",
               "What if my case requires in-person care?"
            ].map((q, i) => (
               <div key={i} className="border-b border-white/5 py-4 flex justify-between items-center cursor-pointer hover:bg-white/5 px-2 rounded transition-colors group">
                  <span className="text-primary-teal font-medium text-sm group-hover:text-white transition-colors">{q}</span>
                  <ChevronRight size={16} className="text-primary-teal" />
               </div>
            ))}
         </div>
         
         <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all whitespace-nowrap"
            >
               Talk to a Doctor Now <ArrowRight size={16} />
            </button>
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
               Book for Later <ArrowRight size={16} />
            </button>
         </div>
      </section>



      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-xs bg-black">
         <h3 className="text-lg font-bold text-white mb-1">Medazon Health</h3>
         <p className="mb-6 text-[10px] uppercase tracking-widest text-primary-teal">Secure. Convenient. Private Medical Care.</p>
         
         <div className="flex justify-center gap-6 mb-6 uppercase tracking-wider text-[10px] font-medium">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#" className="hover:text-white transition-colors">Services</a>
            <a href="#" className="hover:text-white transition-colors">About Us</a>
            <a href="#" className="hover:text-white transition-colors">FAQ</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
         </div>
         
         <p className="mb-4 text-primary-teal">support@medazonhealth.com</p>
         
         <div className="flex justify-center gap-4 mb-8">
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary-teal hover:text-black transition-colors cursor-pointer">
               <span className="text-xs">IG</span>
            </div>
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary-teal hover:text-black transition-colors cursor-pointer">
               <span className="text-xs">FB</span>
            </div>
            <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary-teal hover:text-black transition-colors cursor-pointer">
               <span className="text-xs">YT</span>
            </div>
         </div>
         
         <p className="text-[10px] text-gray-600">© 2024 Medazon Health. All rights reserved. <br/> Medazon Health is a private telehealth service.</p>
      </footer>

    </div>
  );
}
