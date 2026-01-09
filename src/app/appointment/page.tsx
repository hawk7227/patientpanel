"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import symptomSuggestions from "@/data/symptom-suggestions.json";
import { 
  Video, 
  Phone,
  ChevronRight,
  Check,
  Calendar,
} from "lucide-react";
import AppointmentCalendar from "@/components/AppointmentCalendar";
import CheckoutForm from "@/components/CheckoutForm";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import PharmacySelector from "@/components/PharmacySelector";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const STEPS = [
   { 
     id: 0, 
     key: 'appointmentDetails', 
     title: 'Step 1 of 2',
     detailKey: null 
   },
   { 
     id: 1, 
     key: 'checkout', 
     title: 'Final Step', 
     detailKey: null 
   }
 ];

export default function AppointmentProcess() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
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
  const [reasonInputFocused, setReasonInputFocused] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState({
    allergies: null as boolean | null,
    allergiesDetails: "",
    surgeries: null as boolean | null,
    surgeriesDetails: "",
    medicalIssues: null as boolean | null,
    medicalIssuesDetails: "",
    medications: null as boolean | null,
    medicationsDetails: "",
  });
  const [appointmentData, setAppointmentData] = useState({
    symptoms: "",
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
    chief_complaint: "",
    pharmacy: "",
    pharmacyAddress: "",
  });
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [highlightedField, setHighlightedField] = useState<string | null>("symptoms");
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");
  const [chiefComplaintDialogOpen, setChiefComplaintDialogOpen] = useState(false);
  const prefillHighlight = emailExists && appointmentData.appointmentDate && appointmentData.appointmentTime;

  // Helper functions
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

  const hasOneWord = useCallback((value: string) => /\b[A-Za-z]{2,}\b(?:\s+\b[A-Za-z]{2,}\b)+/.test(value.trim()), []);
  
  const isChiefComplaintValid = useCallback((value: string) => value.trim().length >= 2, []);

  const isNameValid = useCallback((value: string) => {
    const trimmed = value.trim();
    // Min 2 characters, only letters (no numbers or special chars except spaces, hyphens, apostrophes)
    return trimmed.length >= 2 && /^[A-Za-z][A-Za-z\s'\-]*$/.test(trimmed) && !/\d/.test(trimmed);
  }, []);

  const markTouched = (..._args: unknown[]) => {
    void _args;
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

  const formatDateTime = (date: string, time: string, showDay: boolean = true): string => {
    if (!date || !time) return "";
    try {
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
      
      const [hours, minutes] = time.split(":");
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 % 12 || 12;
      const ampm = hour24 >= 12 ? "pm" : "am";
      const formattedTime = `${hour12.toString().padStart(2, "0")}:${minutes}${ampm}`;
      
      return `${showDay ? `${dayName} - ` : ""}${month}-${day}-${year} ${formattedTime}`;
    } catch {
      return `${date} • ${time}`;
    }
  };

  const handleDateOfBirthChange = (value: string) => {
    const { formatted } = formatDob(value);
    setAppointmentData((prev) => ({ ...prev, dateOfBirth: formatted }));
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

  // Load email and user data from sessionStorage on mount
  useEffect(() => {
    const emailCheckData = sessionStorage.getItem('emailCheckResponse');
    if (!emailCheckData) {
      // No email data, redirect to home
      router.push('/');
      return;
    }

    try {
      const data = JSON.parse(emailCheckData);
      setEmail(data.email);
      setEmailExists(data.exists);

      if (data.user) {
        // Prefill user data
        let formattedDateOfBirth = "";
        if (data.user.date_of_birth) {
          const dateParts = data.user.date_of_birth.split("-");
          if (dateParts.length === 3) {
            formattedDateOfBirth = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
          }
        }
        const phoneDigits = (data.user.mobile_phone || "").replace(/\D/g, "").slice(0, 10);
        const phoneFormatted = formatPhone(phoneDigits).formatted;
        const addressIncoming = data.user.address || "";
        
        setAppointmentData((prev) => ({
          ...prev,
          firstName: data.user.first_name || "",
          lastName: data.user.last_name || "",
          phone: phoneDigits ? phoneFormatted : "",
          dateOfBirth: formattedDateOfBirth,
          streetAddress: addressIncoming,
          placeId: addressIncoming ? "api-prefill-address" : "",
        }));
      }

      // Also save to appointmentData sessionStorage for CheckoutForm
      // Note: We always collect intake data in this flow, so skipIntake is false
      if (data.patientId) {
        sessionStorage.setItem('appointmentData', JSON.stringify({
          email: data.email,
          patientId: data.patientId,
          skipIntake: false, // Always collect intake data
          user: data.user,
        }));
      } else if (data.user) {
        sessionStorage.setItem('appointmentData', JSON.stringify({
          email: data.email,
          user: data.user,
          skipIntake: false, // Always collect intake data
        }));
      }
    } catch (error) {
      console.error('Error parsing email check data:', error);
      router.push('/');
    }
  }, [router]);

  // Fetch doctor info
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

  // Create payment intent when moving to step 2
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

  // Field highlighting logic
  useEffect(() => {
    if (step === 1) {
      if (!appointmentData.symptoms) {
        setHighlightedField("symptoms");
      } else if (!isChiefComplaintValid(appointmentData.chief_complaint)) {
        setHighlightedField("chief_complaint");
      } else if (!appointmentData.visitType) {
        setHighlightedField("visitType");
      } else if (!appointmentData.appointmentDate || !appointmentData.appointmentTime) {
        setHighlightedField("dateTime");
      } else if (!appointmentData.pharmacy.trim()) {
        setHighlightedField("pharmacy");
      } else if (!isNameValid(appointmentData.firstName)) {
        setHighlightedField("firstName");
      } else if (!isNameValid(appointmentData.lastName)) {
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
  }, [step, appointmentData, isPhoneValid, isDobValid, hasOneWord, isChiefComplaintValid, isNameValid]);

  // Filtered reasons for symptom search
  const filteredReasons = useMemo(() => {
    // Show top 8-9 options when focused but empty
    if (!reasonQuery.trim()) {
      if (reasonInputFocused) {
        return symptomSuggestions.slice(0, 9);
      }
      return [];
    }
    
    const searchTerm = reasonQuery.toLowerCase().trim();
    
    const nameMatches = symptomSuggestions
      .filter((item) => item.name.toLowerCase().startsWith(searchTerm))
      .map((item) => ({ item, priority: 1 }));
    
    const smartMatches = searchTerm.length >= 3
      ? symptomSuggestions
          .filter((item) => {
            const nameLower = item.name.toLowerCase();
            if (nameLower.startsWith(searchTerm)) return false;
            
            return item.smart_search.some((keyword) => {
              const keywordLower = keyword.toLowerCase();
              return keywordLower.startsWith(searchTerm) && keywordLower.length <= 15;
            });
          })
          .map((item) => ({ item, priority: 2 }))
      : [];
    
    return [...nameMatches, ...smartMatches]
      .sort((a, b) => a.priority - b.priority)
      .map((result) => result.item)
      .slice(0, 8);
  }, [reasonQuery, reasonInputFocused]);

  const personalDetailsValid =
    appointmentData.symptoms &&
    isChiefComplaintValid(appointmentData.chief_complaint) &&
    appointmentData.visitType &&
    appointmentData.appointmentDate &&
    appointmentData.appointmentTime &&
    appointmentData.pharmacy.trim() &&
    isNameValid(appointmentData.firstName) &&
    isNameValid(appointmentData.lastName) &&
    isPhoneValid(appointmentData.phone) &&
    isDobValid(appointmentData.dateOfBirth) &&
    appointmentData.streetAddress.trim() &&
    appointmentData.placeId.trim();

  const totalStepFields = 10;
  const completedFields = useMemo(() => {
    let count = 0;
    if (email.trim()) count += 1;
    if (appointmentData.symptoms && isChiefComplaintValid(appointmentData.chief_complaint)) count += 1;
    if (appointmentData.visitType) count += 1;
    if (appointmentData.appointmentDate && appointmentData.appointmentTime) count += 1;
    if (appointmentData.pharmacy.trim()) count += 1;
    if (isNameValid(appointmentData.firstName)) count += 1;
    if (isNameValid(appointmentData.lastName)) count += 1;
    if (isPhoneValid(appointmentData.phone)) count += 1;
    if (isDobValid(appointmentData.dateOfBirth)) count += 1;
    if (appointmentData.streetAddress.trim() && appointmentData.placeId.trim()) count += 1;
    return Math.min(count, totalStepFields);
  }, [
    email,
    appointmentData.symptoms,
    appointmentData.visitType,
    appointmentData.appointmentDate,
    appointmentData.appointmentTime,
    appointmentData.pharmacy,
    appointmentData.firstName,
    appointmentData.lastName,
    appointmentData.phone,
    appointmentData.dateOfBirth,
    appointmentData.streetAddress,
    appointmentData.placeId,
    isPhoneValid,
    isDobValid,
    appointmentData.chief_complaint,
    isChiefComplaintValid,
    isNameValid,
  ]);

  // Handle navigation after payment
  const handlePaymentSuccess = async () => {
    setPaymentComplete(true);
    
    // Always show intake form after payment, regardless of emailExists
    // The intake form is required to collect medical history before creating appointment
    // Only navigate away if we already have an access token (appointment already created)
    if (emailExists) {
      const storedData = sessionStorage.getItem("appointmentData");
      if (storedData) {
        const data = JSON.parse(storedData);
        // Only skip intake if appointment is already created (has accessToken)
        if (data.accessToken) {
          router.push(`/appointment/${data.accessToken}`);
          return;
        }
      }
    }
    // Show intake form (by not navigating) - this will be rendered below
    // Scroll to intake form section if needed
    setTimeout(() => {
      const intakeSection = document.getElementById('intake-form-section');
      if (intakeSection) {
        intakeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle intake submission
  const handleIntakeSubmit = async () => {
    const intakeValid =
      intakeAnswers.allergies !== null &&
      intakeAnswers.surgeries !== null &&
      intakeAnswers.medicalIssues !== null &&
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
      let payment_intent_id = null;
      
      if (storedData) {
        const data = JSON.parse(storedData);
        patientId = data.patientId;
        payment_intent_id = data.payment_intent_id;
      }

      // Update patient record with intake data
      const updateResponse = await fetch("/api/update-intake-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          email: email.trim(),
          has_drug_allergies: intakeAnswers.allergies,
          has_recent_surgeries: intakeAnswers.surgeries,
          has_ongoing_medical_issues: intakeAnswers.medicalIssues,
          preferred_pharmacy: appointmentData.pharmacy,
        }),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(updateResult.error || "Failed to submit intake");
      }

      // Save intake answers to sessionStorage
      const currentSessionData = sessionStorage.getItem('appointmentData');
      const existingData = currentSessionData ? JSON.parse(currentSessionData) : {};
      
      // Convert dateOfBirth to ISO format if needed
      const convertDateToISO = (dateStr: string) => {
        if (!dateStr) return "";
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // If in MM/DD/YYYY format, convert to YYYY-MM-DD
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const [month, day, year] = parts;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        return dateStr;
      };

      const isoDateOfBirth = convertDateToISO(existingData.dateOfBirth || appointmentData.dateOfBirth);

        // Detect patient's local timezone
        const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Prepare complete appointment data with intake form data
        const completeAppointmentData = {
        ...existingData,
          ...appointmentData,
        // Include intake answers for medical history
        allergies: intakeAnswers.allergies,
        allergiesDetails: intakeAnswers.allergiesDetails,
        surgeries: intakeAnswers.surgeries,
        surgeriesDetails: intakeAnswers.surgeriesDetails,
        medicalIssues: intakeAnswers.medicalIssues,
        medicalIssuesDetails: intakeAnswers.medicalIssuesDetails,
        medications: intakeAnswers.medications,
        medicationsDetails: intakeAnswers.medicationsDetails,
          dateOfBirth: isoDateOfBirth,
          patientId: patientId,
          email: email.trim(),
          patientTimezone: patientTZ, // Include patient timezone for proper conversion
          skipIntake: false, // Set to false since we're completing intake now
        };

      // Save to sessionStorage
      sessionStorage.setItem('appointmentData', JSON.stringify(completeAppointmentData));

      // Now call create-appointment API with all the data including intake form data
      if (!payment_intent_id) {
        throw new Error("Payment intent ID is missing. Please try the payment process again.");
      }

      console.log('📤 [API] Calling create-appointment with complete intake form data:', {
        allergies: completeAppointmentData.allergies,
        allergiesDetails: completeAppointmentData.allergiesDetails,
        surgeries: completeAppointmentData.surgeries,
        surgeriesDetails: completeAppointmentData.surgeriesDetails,
        medicalIssues: completeAppointmentData.medicalIssues,
        medicalIssuesDetails: completeAppointmentData.medicalIssuesDetails,
        medications: completeAppointmentData.medications,
        medicationsDetails: completeAppointmentData.medicationsDetails,
      });

      const createAppointmentResponse = await fetch("/api/create-appointment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment_intent_id: payment_intent_id,
          appointmentData: completeAppointmentData,
        }),
      });

      const createAppointmentResult = await createAppointmentResponse.json();

      if (!createAppointmentResponse.ok) {
        throw new Error(createAppointmentResult.error || "Failed to create appointment");
      }

      setIntakeComplete(true);

      // Store access token
      if (createAppointmentResult.accessToken) {
        const finalData = JSON.parse(sessionStorage.getItem('appointmentData') || '{}');
        finalData.accessToken = createAppointmentResult.accessToken;
        sessionStorage.setItem('appointmentData', JSON.stringify(finalData));
        
        // Navigate to appointment page with access token
        router.push(`/appointment/${createAppointmentResult.accessToken}`);
      } else {
        throw new Error("No access token received from appointment creation");
      }
    } catch (error) {
      console.error("Error submitting intake:", error);
      alert(error instanceof Error ? error.message : "Failed to submit intake. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4">
        <div className="text-white text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b14] p-3 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-3xl font-bold text-primary-teal">
            <span className="text-white">Medazon Health</span> Express Booking
          </h2>
          {step === 2 && <div className="text-center text-primary-teal font-bold text-xl md:text-2xl mb-2">{`"When Your Privacy Matters"`}</div>}
        </div>

        <div className="space-y-3 md:space-y-6">
          {!paymentComplete && (
            <div className="space-y-3 md:space-y-6">
              <div className="font-bold text-sm md:text-base text-primary-orange text-center">{STEPS[step - 1].title}</div>

              {step !== 2 && doctorInfo && appointmentData.visitType && (
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
                    {/* {step === 2 && (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="text-white font-bold text-xs md:text-sm mt-0.5 md:mt-1">$189</div>
                      </div>
                    )} */}
                  </div>
                </div>
              )}

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
                            filled ? "bg-primary-teal border-primary-teal" : "bg-transparent border-primary-teal/60"
                          } flex items-center justify-center text-white`}
                        >
                          {isLastFilled ? <Check size={10} /> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3 md:space-y-4">
                  {/* Reason and Visit Type buttons */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
                    <div className="relative">
                      <button
                        onClick={() => {
                          setReasonDialogOpen(true);
                          setReasonInputFocused(true);
                        }}
                        className={`w-full bg-[#0d1218] border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-left text-white font-semibold flex items-center justify-between min-h-[48px] md:min-h-[52px] text-xs transition-all ${
                          highlightedField === "symptoms"
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                            : appointmentData.symptoms && isChiefComplaintValid(appointmentData.chief_complaint)
                            ? "border-primary-teal" 
                            : "border-white/10"
                        }`}
                      >
                        <span className="truncate">{appointmentData.symptoms ? appointmentData.symptoms : "Reason For Visit"}</span>
                        <ChevronRight size={16} className="text-primary-teal" />
                      </button>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setVisitTypeDialogOpen(true)}
                        className={`w-full bg-[#0d1218] border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-left text-white font-semibold flex items-center justify-between min-h-[48px] md:min-h-[52px] text-xs transition-all ${
                          highlightedField === "visitType"
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
                            : appointmentData.visitType
                            ? "border-primary-teal" 
                            : "border-white/10"
                        }`}
                      >
                        <span className="truncate">{appointmentData.visitType ? appointmentData.visitType + " Visit" : "Visit Type"}</span>
                        <ChevronRight size={16} className="text-primary-teal" />
                      </button>
                    </div>
                  </div>

                  {/* Appointment Day/Time and Pharmacy */}
                  <div className="grid grid-cols-2 gap-2 md:gap-3 text-sm">
                    <div className="relative">
                      <button
                        onClick={() => {
                          setDateTimeMode("date");
                          setDateTimeDialogOpen(true);
                        }}
                        className={`w-full bg-[#0d1218] border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-left text-white font-semibold flex items-center justify-between min-h-[48px] md:min-h-[52px] transition-all ${
                          highlightedField === "dateTime"
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)] text-[11px]" 
                            : appointmentData.appointmentDate && appointmentData.appointmentTime
                            ? "border-primary-teal py-2 text-sm md:text-base" 
                            : "border-white/10 text-[11px]"
                        }`}
                      >
                        <span className="flex-1 truncate pr-2">
                          {appointmentData.appointmentDate && appointmentData.appointmentTime
                            ? formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime, false)
                            : "Appointment Day/Time"}
                        </span>
                        <Calendar size={16} className="text-primary-teal flex-shrink-0" />
                      </button>
                    </div>

                    <div className="relative flex flex-col">
                      <PharmacySelector
                        value={appointmentData.pharmacy}
                        onChange={(value) => setAppointmentData((prev) => ({ ...prev, pharmacy: value }))}
                        onPlaceSelect={(place) => {
                          const fullAddress = place.formatted_address 
                            ? `${place.name}, ${place.formatted_address}`
                            : place.name;
                          setAppointmentData((prev) => ({
                            ...prev,
                            pharmacy: fullAddress,
                            pharmacyAddress: place.formatted_address || "",
                          }));
                        }}
                        placeholder="Preferred Pharmacy"
                        highlighted={highlightedField === "pharmacy"}
                        className={`w-full bg-[#0d1218] border rounded-lg px-3 py-2.5 md:py-3 text-white text-xs md:text-sm focus:outline-none focus:border-primary-teal transition-all min-h-[48px] md:min-h-[52px] ${
                          highlightedField === "pharmacy"
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                            : appointmentData.pharmacy.trim()
                            ? "border-primary-teal"
                            : "border-white/10"
                        }`}
                      />
                      {/* {appointmentData.pharmacyAddress && (
                        <div className="text-gray-500 text-[10px] md:text-xs mt-1 px-1">{appointmentData.pharmacyAddress}</div>
                      )} */}
                    </div>
                  </div>

                  {/* Patient Details Form */}
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
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                            : isNameValid(appointmentData.firstName) && (!emailExists || prefillHighlight)
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
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                            : isNameValid(appointmentData.lastName) && (!emailExists || prefillHighlight)
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
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
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
                          if (!isDobValid(e.target.value)) {
                            alert("Date of birth can't be in the future or invalid.");
                            setAppointmentData((prev) => ({ ...prev, dateOfBirth: "" }));
                          }
                        }}
                        inputMode="numeric"
                        className={`bg-[#11161c] border rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all ${
                          highlightedField === "dateOfBirth"
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
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
                              const addressComponents =
                                (place as { address_components?: Array<{ types?: string[]; long_name?: string }> })
                                  .address_components;
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
                              ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
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
                      onClick={() => {
                        // Save appointment data to sessionStorage before proceeding
                        const currentSessionData = sessionStorage.getItem('appointmentData');
                        const existingData = currentSessionData ? JSON.parse(currentSessionData) : {};
                        const dataToSave = {
                          ...existingData,
                          symptoms: appointmentData.symptoms,
                          chief_complaint: appointmentData.chief_complaint,
                          visitType: appointmentData.visitType,
                          appointmentDate: appointmentData.appointmentDate,
                          appointmentTime: appointmentData.appointmentTime,
                          pharmacy: appointmentData.pharmacy,
                          pharmacyAddress: appointmentData.pharmacyAddress,
                          firstName: appointmentData.firstName,
                          lastName: appointmentData.lastName,
                          phone: appointmentData.phone,
                          dateOfBirth: appointmentData.dateOfBirth,
                          streetAddress: appointmentData.streetAddress,
                          postalCode: appointmentData.postalCode,
                          placeId: appointmentData.placeId,
                          // Include intake answers for medical history
                          allergies: intakeAnswers.allergies,
                          allergiesDetails: intakeAnswers.allergiesDetails,
                          surgeries: intakeAnswers.surgeries,
                          surgeriesDetails: intakeAnswers.surgeriesDetails,
                          medicalIssues: intakeAnswers.medicalIssues,
                          medicalIssuesDetails: intakeAnswers.medicalIssuesDetails,
                          medications: intakeAnswers.medications,
                          medicationsDetails: intakeAnswers.medicationsDetails,
                        };
                        
                        console.log('💾 [INTAKE] Saving intake form data to sessionStorage:', {
                          allergies: dataToSave.allergies,
                          allergiesDetails: dataToSave.allergiesDetails,
                          surgeries: dataToSave.surgeries,
                          surgeriesDetails: dataToSave.surgeriesDetails,
                          medicalIssues: dataToSave.medicalIssues,
                          medicalIssuesDetails: dataToSave.medicalIssuesDetails,
                          medications: dataToSave.medications,
                          medicationsDetails: dataToSave.medicationsDetails,
                        });
                        
                        sessionStorage.setItem('appointmentData', JSON.stringify(dataToSave));
                        setStep(2);
                      }}
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
                  <div className="text-center">
                    <span className="text-primary-orange font-semibold text-sm md:text-base">Confirm Appointment Request:</span><br />
                    <span className="text-white font-bold text-xl md:text-3xl">{formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime)}</span>
                  </div>

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
                        onSuccess={handlePaymentSuccess}
                        onPrevious={() => setStep(1)}
                      />
                    </Elements>
                  )}
                </div>
              )}
            </div>
          )}

          {paymentComplete && !intakeComplete && (
            <div id="intake-form-section" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
              <div className="bg-[#0d1218] border border-white/10 rounded-xl p-3 md:p-4">
                <div className="text-primary-teal font-bold text-base md:text-lg mb-2">Appointment Confirmed</div>
                <div className="text-gray-300 text-xs md:text-sm">
                  {appointmentData.appointmentDate && appointmentData.appointmentTime && (
                    <div className="font-semibold mb-1">
                      Date & Time: {formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime)}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0d1218] border border-white/10 rounded-xl p-3 md:p-4 space-y-3 md:space-y-4">
                <div className="text-center">
                  <div className="text-red-500 font-bold text-xs md:text-sm mb-2">REQUIRED BEFORE VISIT</div>
                  <div className="text-white font-bold text-base md:text-xl mb-3">Complete Your Intake</div>
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
                        onClick={() => setIntakeAnswers((prev) => ({ ...prev, medicalIssues: true }))}
                        className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                          intakeAnswers.medicalIssues === true
                            ? "bg-primary-teal text-black border-primary-teal"
                            : "border-white/20 text-white hover:border-primary-teal/50"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setIntakeAnswers((prev) => ({ ...prev, medicalIssues: false, medicalIssuesDetails: "" }))}
                        className={`py-3 md:py-4 rounded-lg font-bold border transition-all ${
                          intakeAnswers.medicalIssues === false
                            ? "bg-primary-teal text-black border-primary-teal"
                            : "border-white/20 text-white hover:border-primary-teal/50"
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {intakeAnswers.medicalIssues === true && (
                      <input
                        value={intakeAnswers.medicalIssuesDetails}
                        onChange={(e) => setIntakeAnswers((prev) => ({ ...prev, medicalIssuesDetails: e.target.value }))}
                        placeholder="List ongoing medical issues..."
                        className="w-full mt-2 bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal"
                      />
                    )}
                  </div>

                  <div>
                    <div className="text-white font-semibold text-sm md:text-base mb-2">Current Medications?</div>
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
                        placeholder="List current medications..."
                        className="w-full mt-2 bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-[16px] focus:outline-none focus:border-primary-teal"
                      />
                    )}
                  </div>
                  
    <div>
                    <div className="text-white font-semibold text-sm md:text-base mb-2">Preferred Pharmacy</div>
                      <PharmacySelector
                        value={appointmentData.pharmacy}
                        onChange={(value) => setAppointmentData((prev) => ({ ...prev, pharmacy: value }))}
                        onPlaceSelect={(place) => {
                          const fullAddress = place.formatted_address 
                            ? `${place.name}, ${place.formatted_address}`
                            : place.name;
                          setAppointmentData((prev) => ({
                            ...prev,
                            pharmacy: fullAddress,
                            pharmacyAddress: place.formatted_address || "",
                          }));
                        }}
                        placeholder="Pharmacy name (City or ZIP)"
                        className="w-full bg-[#11161c] border border-white/10 rounded-lg px-3 py-2.5 md:py-3 text-white text-xs md:text-sm focus:outline-none focus:border-primary-teal"
                      />
                      {appointmentData.pharmacyAddress && (
                        <div className="text-gray-500 text-[10px] md:text-xs mt-1">{appointmentData.pharmacyAddress}</div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleIntakeSubmit}
                    disabled={isLoading}
                    className={`w-full bg-gray-600 text-white font-bold py-3 md:py-4 rounded-lg text-sm md:text-base transition-all ${
                      isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-500"
                    }`}
                  >
                    {isLoading ? "SUBMITTING..." : "SUBMIT INTAKE"}
                  </button>
              </div>
            </div>
          )}
        </div>

        {/* Reason Dialog */}
        {reasonDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
            <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-6 w-full max-w-lg space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-white font-bold text-base md:text-lg">Select Reason for Visit</div>
                <button 
                  onClick={() => {
                    setReasonDialogOpen(false);
                    setReasonInputFocused(false);
                  }} 
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <input
                  value={reasonQuery}
                  onChange={(e) => setReasonQuery(e.target.value)}
                  onFocus={() => setReasonInputFocused(true)}
                  onBlur={() => setReasonInputFocused(false)}
                  placeholder="Search symptoms..."
                  className="w-full bg-[#11161c] border border-white/10 rounded px-3 py-2 pr-40 text-[16px] text-white focus:outline-none focus:border-primary-teal"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-red-400 text-[10px] md:text-xs font-semibold uppercase whitespace-nowrap">
                  Select From List
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto border border-white/5 rounded-lg">
                {/* "Something else" option - shown when focused or when something is typed */}
                {(reasonInputFocused || reasonQuery.trim()) && (
                  <div 
                    className="px-3 py-2 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-xs border-b border-white/5 font-semibold"
                    onClick={() => {
                      setAppointmentData((prev) => ({ ...prev, symptoms: "Something Else" }));
                      setReasonDialogOpen(false);
                      setReasonQuery("");
                      setReasonInputFocused(false);
                      setChiefComplaintDialogOpen(true);
                    }}
                  >
                    Something else
                  </div>
                )}
                {filteredReasons.map((item) => (
                  <div 
                    key={item.name}
                    className="px-3 py-2 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-xs border-b border-white/5 last:border-0"
                    onClick={() => {
                      setAppointmentData((prev) => ({ ...prev, symptoms: item.name }));
                      setReasonDialogOpen(false);
                      setReasonQuery("");
                      setReasonInputFocused(false);
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

        {/* Chief Complaint Dialog */}
              {chiefComplaintDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
                  <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-5 w-full max-w-lg space-y-3 md:space-y-4">
                    <div className="flex justify-center items-center">
                      <div className="text-white font-bold text-base md:text-lg">Describe symptoms</div>
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={appointmentData.chief_complaint}
                        onChange={(e) => setAppointmentData((prev) => ({ ...prev, chief_complaint: e.target.value }))}
                        placeholder="Describe symptoms"
                        rows={2}
                        className={`w-full bg-[#11161c] border rounded-lg px-3 py-3 text-white text-[16px] focus:outline-none min-h-[60px] transition-all ${
                          highlightedField === "chief_complaint"
                            ? "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                            : isChiefComplaintValid(appointmentData.chief_complaint)
                            ? "border-primary-teal"
                            : "border-white/10"
                        }`}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setChiefComplaintDialogOpen(false)}
                        disabled={!isChiefComplaintValid(appointmentData.chief_complaint)}
                        className={`bg-primary-teal text-black font-bold px-4 py-2 rounded-lg text-sm md:text-base ${
                          isChiefComplaintValid(appointmentData.chief_complaint)
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

        {/* Visit Type Dialog */}
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

        {/* Date/Time Dialog */}
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
      </div>
    </div>
  );
}

