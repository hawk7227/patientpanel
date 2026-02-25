"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ChevronDown,
  Mail,
  User,
  MapPin,
  Pill,
  Heart,
  ArrowLeft,
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
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
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
  const [clientSecret, setClientSecret] = useState("");
  const [highlightedField, setHighlightedField] = useState<string | null>("symptoms");
  const [dateTimeMode, setDateTimeMode] = useState<"date" | "time">("date");
  const [chiefComplaintDialogOpen, setChiefComplaintDialogOpen] = useState(false);
  const prefillHighlight = emailExists && appointmentData.appointmentDate && appointmentData.appointmentTime;
  
  // Ref for auto-focus on active input
  const activeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus active input when highlighted field changes
  useEffect(() => {
    if (highlightedField && activeInputRef.current) {
      // Small delay to let animation settle
      const t = setTimeout(() => activeInputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [highlightedField]);

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

  const getPhoneCursorPosition = (digitCount: number): number => {
    if (digitCount === 0) return 1;
    if (digitCount <= 3) return digitCount + 1;
    if (digitCount <= 6) return digitCount + 3;
    return digitCount + 4;
  };

  const getDobCursorPosition = (digitCount: number): number => {
    if (digitCount <= 2) return digitCount;
    if (digitCount <= 4) return digitCount + 1;
    return digitCount + 2;
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
    return trimmed.length >= 2 && /^[A-Za-z][A-Za-z\s'\-]*$/.test(trimmed) && !/\d/.test(trimmed);
  }, []);

  const isEmailValid = useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
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

  // ═══════════════════════════════════════════════════════════════
  // Check email in database
  // ═══════════════════════════════════════════════════════════════
  const checkEmailInDatabase = useCallback(async (emailToCheck: string) => {
    if (!isEmailValid(emailToCheck)) {
      setEmailExists(false);
      setEmailChecked(false);
      return;
    }

    setIsCheckingEmail(true);
    
    try {
      const response = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToCheck.trim().toLowerCase() }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmailChecked(true);
        
        console.log('📧 [EMAIL CHECK] Response:', data);
        
        const isReturningPatient = data.exists && data.patientId;
        setEmailExists(isReturningPatient);
        
        if (data.user) {
          let formattedDateOfBirth = "";
          if (data.user.date_of_birth) {
            const dateParts = data.user.date_of_birth.split("-");
            if (dateParts.length === 3 && dateParts[0].length === 4) {
              formattedDateOfBirth = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
            }
          }
          
          const phoneDigits = (data.user.mobile_phone || "").replace(/\D/g, "");
          const phoneFormatted = phoneDigits.length === 10 ? formatPhone(phoneDigits).formatted : "";
          
          setAppointmentData((prev) => ({
            ...prev,
            firstName: data.user.first_name || prev.firstName,
            lastName: data.user.last_name || prev.lastName,
            phone: phoneFormatted || prev.phone,
            dateOfBirth: formattedDateOfBirth || prev.dateOfBirth,
            streetAddress: data.user.address || prev.streetAddress,
            placeId: data.user.address ? "api-prefill-address" : prev.placeId,
          }));
        }
        
        sessionStorage.setItem('appointmentData', JSON.stringify({
          email: emailToCheck.trim().toLowerCase(),
          skipIntake: isReturningPatient,
        }));
      } else {
        setEmailChecked(true);
        setEmailExists(false);
        sessionStorage.setItem('appointmentData', JSON.stringify({
          email: emailToCheck.trim().toLowerCase(),
          skipIntake: false,
        }));
      }
    } catch (error) {
      console.error("📧 [EMAIL CHECK] Error:", error);
      setEmailExists(false);
      setEmailChecked(true);
      sessionStorage.setItem('appointmentData', JSON.stringify({
        email: emailToCheck.trim().toLowerCase(),
        skipIntake: false,
      }));
    } finally {
      setIsCheckingEmail(false);
    }
  }, [isEmailValid]);

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

  // ═══════════════════════════════════════════════════════════════
  // Load saved patient data
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const savedPatient = localStorage.getItem('medazon_patient_info');
      if (savedPatient) {
        const patient = JSON.parse(savedPatient);
        console.log('📋 [PREFILL] Loading saved patient data from localStorage');
        
        if (patient.email) setEmail(patient.email);
        
        setAppointmentData((prev) => ({
          ...prev,
          firstName: patient.firstName || prev.firstName,
          lastName: patient.lastName || prev.lastName,
          phone: patient.phone || prev.phone,
          dateOfBirth: patient.dateOfBirth || prev.dateOfBirth,
          streetAddress: patient.streetAddress || prev.streetAddress,
          placeId: patient.placeId || prev.placeId,
          postalCode: patient.postalCode || prev.postalCode,
          pharmacy: patient.pharmacy || prev.pharmacy,
          pharmacyAddress: patient.pharmacyAddress || prev.pharmacyAddress,
        }));
        
        if (patient.email) {
          checkEmailInDatabase(patient.email);
        }
      }
    } catch (error) {
      console.error('Error loading saved patient data:', error);
    }
    
    const emailCheckData = sessionStorage.getItem('emailCheckResponse');
    if (emailCheckData) {
      try {
        const data = JSON.parse(emailCheckData);
        if (data.email) {
          setEmail(data.email);
          checkEmailInDatabase(data.email);
        }
      } catch (error) {
        console.error('Error parsing email check data:', error);
      }
    }
  }, [checkEmailInDatabase]);

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

  // ═══════════════════════════════════════════════════════════════
  // FIELD SEQUENCE — determines which question shows next
  // ═══════════════════════════════════════════════════════════════
  const FIELD_SEQUENCE = [
    'symptoms',
    'chief_complaint',
    'visitType',
    'dateTime',
    'email',
    'firstName',
    'lastName',
    'phone',
    'dateOfBirth',
    'streetAddress',
    'pharmacy',
  ] as const;

  type FieldKey = typeof FIELD_SEQUENCE[number];

  // Check if a specific field is complete
  const isFieldComplete = useCallback((fieldName: string): boolean => {
    switch (fieldName) {
      case 'symptoms': return !!appointmentData.symptoms;
      case 'chief_complaint': return isChiefComplaintValid(appointmentData.chief_complaint);
      case 'visitType': return !!appointmentData.visitType;
      case 'dateTime': return !!appointmentData.appointmentDate && !!appointmentData.appointmentTime;
      case 'email': return isEmailValid(email);
      case 'firstName': return isNameValid(appointmentData.firstName);
      case 'lastName': return isNameValid(appointmentData.lastName);
      case 'phone': return isPhoneValid(appointmentData.phone);
      case 'dateOfBirth': return isDobValid(appointmentData.dateOfBirth);
      case 'streetAddress': return !!appointmentData.streetAddress.trim() && !!appointmentData.placeId.trim();
      case 'pharmacy': return !!appointmentData.pharmacy.trim();
      default: return false;
    }
  }, [appointmentData, email, isEmailValid, isPhoneValid, isDobValid, isChiefComplaintValid, isNameValid]);

  // Get display value for completed fields
  const getFieldDisplay = useCallback((fieldName: string): { label: string; value: string; icon: React.ReactNode } => {
    switch (fieldName) {
      case 'symptoms': return { label: 'Reason', value: appointmentData.symptoms, icon: <Heart size={12} /> };
      case 'chief_complaint': return { label: 'Symptoms', value: appointmentData.chief_complaint.length > 40 ? appointmentData.chief_complaint.slice(0, 40) + '...' : appointmentData.chief_complaint, icon: <Heart size={12} /> };
      case 'visitType': return { label: 'Visit', value: appointmentData.visitType + ' Call', icon: appointmentData.visitType === 'Video' ? <Video size={12} /> : <Phone size={12} /> };
      case 'dateTime': return { label: 'When', value: formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime, false), icon: <Calendar size={12} /> };
      case 'email': return { label: 'Email', value: email, icon: <Mail size={12} /> };
      case 'firstName': return { label: 'First', value: appointmentData.firstName, icon: <User size={12} /> };
      case 'lastName': return { label: 'Last', value: appointmentData.lastName, icon: <User size={12} /> };
      case 'phone': return { label: 'Phone', value: appointmentData.phone, icon: <Phone size={12} /> };
      case 'dateOfBirth': return { label: 'DOB', value: appointmentData.dateOfBirth, icon: <Calendar size={12} /> };
      case 'streetAddress': return { label: 'Address', value: appointmentData.streetAddress.length > 30 ? appointmentData.streetAddress.slice(0, 30) + '...' : appointmentData.streetAddress, icon: <MapPin size={12} /> };
      case 'pharmacy': return { label: 'Pharmacy', value: appointmentData.pharmacy.length > 30 ? appointmentData.pharmacy.slice(0, 30) + '...' : appointmentData.pharmacy, icon: <Pill size={12} /> };
      default: return { label: '', value: '', icon: null };
    }
  }, [appointmentData, email]);

  // Field highlighting — find the FIRST incomplete field
  useEffect(() => {
    if (step === 1) {
      for (const field of FIELD_SEQUENCE) {
        if (!isFieldComplete(field)) {
          setHighlightedField(field);
          return;
        }
      }
      // All complete
      setHighlightedField(null);
    }
  }, [step, email, appointmentData, isFieldComplete]);

  // Filtered reasons for symptom search
  const filteredReasons = useMemo(() => {
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

  // personalDetailsValid — all fields complete
  const personalDetailsValid = useMemo(() => {
    return FIELD_SEQUENCE.every(field => isFieldComplete(field));
  }, [isFieldComplete]);

  const totalStepFields = FIELD_SEQUENCE.length;
  const completedFields = useMemo(() => {
    return FIELD_SEQUENCE.filter(field => isFieldComplete(field)).length;
  }, [isFieldComplete]);

  // ═══════════════════════════════════════════════════════════════
  // Handle payment success
  // ═══════════════════════════════════════════════════════════════
  const handlePaymentSuccess = async () => {
    setIsLoading(true);
    
    try {
      const storedData = sessionStorage.getItem("appointmentData");
      const data = storedData ? JSON.parse(storedData) : {};
      
      if (data.accessToken) {
        router.push(`/appointment/${data.accessToken}`);
        return;
      }
      
      const patientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const patientEmail = email.trim().toLowerCase();
      
      const completeAppointmentData = {
        ...data,
        ...appointmentData,
        dateOfBirth: convertDateToISO(appointmentData.dateOfBirth),
        email: patientEmail,
        patientTimezone: patientTZ,
        skipIntake: emailExists,
      };
      
      console.log('📤 [PAYMENT SUCCESS] Creating appointment:', {
        email: patientEmail,
        skipIntake: completeAppointmentData.skipIntake,
        isReturningPatient: emailExists,
      });
      
      const createAppointmentResponse = await fetch("/api/create-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_intent_id: data.payment_intent_id,
          appointmentData: completeAppointmentData,
        }),
      });
      
      const createAppointmentResult = await createAppointmentResponse.json();
      
      if (!createAppointmentResponse.ok) {
        throw new Error(createAppointmentResult.error || "Failed to create appointment");
      }
      
      console.log('✅ [APPOINTMENT CREATED] Result:', createAppointmentResult);
      
      try {
        localStorage.setItem('medazon_patient_info', JSON.stringify({
          email: patientEmail,
          firstName: appointmentData.firstName,
          lastName: appointmentData.lastName,
          phone: appointmentData.phone,
          dateOfBirth: appointmentData.dateOfBirth,
          streetAddress: appointmentData.streetAddress,
          placeId: appointmentData.placeId,
          postalCode: appointmentData.postalCode,
          pharmacy: appointmentData.pharmacy,
          pharmacyAddress: appointmentData.pharmacyAddress,
          savedAt: new Date().toISOString(),
        }));
        console.log('💾 [AUTOFILL] Patient info saved to localStorage for future visits');
      } catch (e) {
        console.warn('Could not save patient info to localStorage:', e);
      }
      
      const updatedData = {
        ...data,
        ...completeAppointmentData,
        appointmentId: createAppointmentResult.appointmentId,
        accessToken: createAppointmentResult.accessToken,
      };
      sessionStorage.setItem('appointmentData', JSON.stringify(updatedData));
      
      if (emailExists) {
        console.log('✅ [RETURNING PATIENT] Skipping intake, redirecting to confirmation');
        router.push(`/appointment/${createAppointmentResult.accessToken}`);
        return;
      }
      
      console.log('📝 [NEW PATIENT] Redirecting to intake page');
      router.push(`/intake?accessToken=${createAppointmentResult.accessToken}&email=${encodeURIComponent(patientEmail)}`);
      
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert(error instanceof Error ? error.message : "Failed to create appointment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Proceed handler — check email + save + go to step 2
  // ═══════════════════════════════════════════════════════════════
  const handleProceed = async () => {
    // Check email first if not already checked
    if (!emailChecked && isEmailValid(email)) {
      setIsCheckingEmail(true);
      try {
        const response = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        if (response.ok) {
          const data = await response.json();
          setEmailChecked(true);
          console.log('📧 [EMAIL CHECK] Response:', data);
          const isReturningPatient = data.exists && data.patientId;
          setEmailExists(isReturningPatient);
          
          if (data.user) {
            let formattedDateOfBirth = "";
            if (data.user.date_of_birth) {
              const dateParts = data.user.date_of_birth.split("-");
              if (dateParts.length === 3 && dateParts[0].length === 4) {
                formattedDateOfBirth = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
              }
            }
            const phoneDigits = (data.user.mobile_phone || "").replace(/\D/g, "");
            const phoneFormatted = phoneDigits.length === 10 ? formatPhone(phoneDigits).formatted : "";
            setAppointmentData((prev) => ({
              ...prev,
              firstName: data.user.first_name || prev.firstName,
              lastName: data.user.last_name || prev.lastName,
              phone: phoneFormatted || prev.phone,
              dateOfBirth: formattedDateOfBirth || prev.dateOfBirth,
              streetAddress: data.user.address || prev.streetAddress,
              placeId: data.user.address ? "api-prefill-address" : prev.placeId,
            }));
          }
          
          sessionStorage.setItem('appointmentData', JSON.stringify({
            email: email.trim().toLowerCase(),
            skipIntake: isReturningPatient,
          }));
        } else {
          setEmailChecked(true);
          setEmailExists(false);
          sessionStorage.setItem('appointmentData', JSON.stringify({
            email: email.trim().toLowerCase(),
            skipIntake: false,
          }));
        }
      } catch (error) {
        console.error("📧 [EMAIL CHECK] Error:", error);
        setEmailChecked(true);
        setEmailExists(false);
        sessionStorage.setItem('appointmentData', JSON.stringify({
          email: email.trim().toLowerCase(),
          skipIntake: false,
        }));
      } finally {
        setIsCheckingEmail(false);
      }
    }
    
    const currentSessionData = sessionStorage.getItem('appointmentData');
    const existingData = currentSessionData ? JSON.parse(currentSessionData) : {};
    const dataToSave = {
      ...existingData,
      email: email.trim().toLowerCase(),
      skipIntake: existingData.skipIntake ?? false,
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
    };
    
    console.log('💾 [PROCEED] Saving data:', {
      email: dataToSave.email,
      skipIntake: dataToSave.skipIntake,
    });
    
    sessionStorage.setItem('appointmentData', JSON.stringify(dataToSave));
    setStep(2);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#050b14] p-3 md:p-8">
      {/* Autofill CSS + animations */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #11161c inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        input::placeholder { color: #6b7280 !important; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(0, 203, 169, 0.3); }
          50% { box-shadow: 0 0 20px rgba(0, 203, 169, 0.5); }
        }
        .question-enter { animation: fadeSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .active-glow { animation: pulseGlow 2s ease-in-out infinite; }
      `}</style>
      
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-primary-teal">
            <span className="text-white">Medazon Health</span> Express Booking
          </h2>
          {step === 2 && <div className="text-center text-primary-teal font-bold text-lg md:text-xl mb-2">{`"When Your Privacy Matters"`}</div>}
        </div>

        <div className="space-y-3">
          <div className="font-bold text-sm text-primary-orange text-center">{STEPS[step - 1].title}</div>

          {/* Doctor card — show once visit type selected */}
          {step !== 2 && doctorInfo && appointmentData.visitType && (
            <div className="border border-white/10 rounded-xl p-2.5 flex items-center gap-2 bg-[#0d1218]">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-teal/40 flex-shrink-0">
                <Image
                  src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                  alt={doctorInfo.name}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-white font-semibold text-xs truncate">{doctorInfo.name}</div>
                <div className="text-gray-400 text-[10px]">{doctorInfo.credentials}</div>
                <div className="text-primary-teal text-[10px] truncate">{doctorInfo.specialty}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="text-gray-400 text-[9px]">Visit Type</div>
                <div className="bg-primary-teal/10 text-primary-teal text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {appointmentData.visitType}
                </div>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {step === 1 && (
            <div className="bg-[#0d1218] border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-white font-semibold text-[11px]">Progress</div>
                <div className="text-primary-teal text-[11px] font-bold">{completedFields}/{totalStepFields}</div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: totalStepFields }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      idx < completedFields ? "bg-primary-teal" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP 1 — ONE QUESTION AT A TIME */}
          {/* ═══════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-2">
              {/* ── Completed fields as tappable summary pills ── */}
              {FIELD_SEQUENCE.map((field) => {
                if (!isFieldComplete(field)) return null;
                // Don't show completed pills for fields AFTER the current highlighted one
                const fieldIdx = FIELD_SEQUENCE.indexOf(field);
                const highlightIdx = highlightedField ? FIELD_SEQUENCE.indexOf(highlightedField as FieldKey) : FIELD_SEQUENCE.length;
                if (fieldIdx >= highlightIdx) return null;

                const { label, value, icon } = getFieldDisplay(field);
                return (
                  <button
                    key={field}
                    onClick={() => {
                      // Allow tapping to re-edit: open the appropriate dialog or clear the field
                      if (field === 'symptoms') { setReasonDialogOpen(true); setReasonInputFocused(true); }
                      else if (field === 'chief_complaint') setChiefComplaintDialogOpen(true);
                      else if (field === 'visitType') setVisitTypeDialogOpen(true);
                      else if (field === 'dateTime') { setDateTimeMode("date"); setDateTimeDialogOpen(true); }
                      // For text input fields, we clear so it becomes the active question again
                      else if (field === 'email') { setEmail(''); setEmailChecked(false); setEmailExists(false); }
                      else if (field === 'firstName') setAppointmentData(prev => ({ ...prev, firstName: '' }));
                      else if (field === 'lastName') setAppointmentData(prev => ({ ...prev, lastName: '' }));
                      else if (field === 'phone') setAppointmentData(prev => ({ ...prev, phone: '' }));
                      else if (field === 'dateOfBirth') setAppointmentData(prev => ({ ...prev, dateOfBirth: '' }));
                      else if (field === 'streetAddress') setAppointmentData(prev => ({ ...prev, streetAddress: '', placeId: '' }));
                      else if (field === 'pharmacy') setAppointmentData(prev => ({ ...prev, pharmacy: '', pharmacyAddress: '' }));
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d1218] border border-primary-teal/30 hover:border-primary-teal/60 transition-all group"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary-teal/20 flex items-center justify-center text-primary-teal flex-shrink-0">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider">{label}</span>
                      <span className="text-white text-xs block truncate">{value}</span>
                    </div>
                    <span className="text-gray-600 text-[9px] font-semibold group-hover:text-primary-teal transition-colors flex-shrink-0">TAP TO EDIT</span>
                  </button>
                );
              })}

              {/* ── ACTIVE QUESTION CARD ── */}
              {highlightedField && (
                <div className="question-enter">
                  {/* ── SYMPTOMS (dialog trigger) ── */}
                  {highlightedField === 'symptoms' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">What brings you in today?</div>
                      <button
                        onClick={() => { setReasonDialogOpen(true); setReasonInputFocused(true); }}
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-left text-gray-400 flex items-center justify-between hover:border-primary-orange/70 transition-all"
                      >
                        <span>{appointmentData.symptoms || "Select a reason..."}</span>
                        <ChevronRight size={18} className="text-primary-orange" />
                      </button>
                    </div>
                  )}

                  {/* ── CHIEF COMPLAINT (dialog trigger) ── */}
                  {highlightedField === 'chief_complaint' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">Describe your symptoms</div>
                      <button
                        onClick={() => setChiefComplaintDialogOpen(true)}
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-left text-gray-400 flex items-center justify-between hover:border-primary-orange/70 transition-all"
                      >
                        <span>{appointmentData.chief_complaint || "Tap to describe..."}</span>
                        <ChevronRight size={18} className="text-primary-orange" />
                      </button>
                    </div>
                  )}

                  {/* ── VISIT TYPE (dialog trigger) ── */}
                  {highlightedField === 'visitType' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">How would you like to be seen?</div>
                      <div className="grid grid-cols-2 gap-3">
                        {["Video", "Audio"].map((type) => (
                          <button
                            key={type}
                            onClick={() => setAppointmentData((prev) => ({ ...prev, visitType: type }))}
                            className={`border-2 rounded-xl p-4 flex flex-col items-center gap-2 text-white font-semibold transition-all ${
                              appointmentData.visitType === type
                                ? "border-primary-teal bg-primary-teal/10"
                                : "border-white/10 hover:border-primary-teal/50"
                            }`}
                          >
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                              {type === "Video" ? <Video size={22} /> : <Phone size={22} />}
                            </div>
                            <span className="text-sm">{type} Call</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── DATE/TIME (dialog trigger) ── */}
                  {highlightedField === 'dateTime' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">When would you like your appointment?</div>
                      <button
                        onClick={() => { setDateTimeMode("date"); setDateTimeDialogOpen(true); }}
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-left text-gray-400 flex items-center justify-between hover:border-primary-orange/70 transition-all"
                      >
                        <span>
                          {appointmentData.appointmentDate && appointmentData.appointmentTime
                            ? formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime, false)
                            : "Select date & time..."}
                        </span>
                        <Calendar size={18} className="text-primary-orange" />
                      </button>
                    </div>
                  )}

                  {/* ── EMAIL ── */}
                  {highlightedField === 'email' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">What&apos;s your email?</div>
                      <div className="relative">
                        <input
                          ref={activeInputRef}
                          type="email"
                          name="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (emailChecked) { setEmailChecked(false); setEmailExists(false); }
                          }}
                          onBlur={() => { if (isEmailValid(email)) checkEmailInDatabase(email); }}
                          placeholder="your@email.com"
                          autoComplete="email"
                          className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all pr-24"
                        />
                        {isCheckingEmail && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-teal"></div>
                          </div>
                        )}
                        {emailChecked && emailExists && !isCheckingEmail && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-primary-teal">
                            <Check size={16} />
                            <span className="text-[10px] font-semibold whitespace-nowrap">Welcome back!</span>
                          </div>
                        )}
                        {emailChecked && !emailExists && !isCheckingEmail && isEmailValid(email) && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-primary-teal">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                      <p className="text-gray-500 text-[10px] mt-2 text-center">We&apos;ll send appointment details here</p>
                    </div>
                  )}

                  {/* ── FIRST NAME ── */}
                  {highlightedField === 'firstName' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">What&apos;s your first name?</div>
                      <input
                        ref={activeInputRef}
                        name="given-name"
                        value={appointmentData.firstName}
                        onChange={(e) => setAppointmentData((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="First Name"
                        autoComplete="given-name"
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all"
                      />
                    </div>
                  )}

                  {/* ── LAST NAME ── */}
                  {highlightedField === 'lastName' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">And your last name?</div>
                      <input
                        ref={activeInputRef}
                        name="family-name"
                        value={appointmentData.lastName}
                        onChange={(e) => setAppointmentData((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Last Name"
                        autoComplete="family-name"
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all"
                      />
                    </div>
                  )}

                  {/* ── PHONE ── */}
                  {highlightedField === 'phone' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">Phone number?</div>
                      <input
                        ref={activeInputRef}
                        name="tel"
                        value={appointmentData.phone}
                        onChange={(e) => {
                          const input = e.target;
                          const newValue = e.target.value;
                          const newDigits = formatPhone(newValue).digits.length;
                          const { formatted } = formatPhone(newValue);
                          setAppointmentData((prev) => ({ ...prev, phone: formatted }));
                          requestAnimationFrame(() => {
                            const newCursorPos = getPhoneCursorPosition(newDigits);
                            input.setSelectionRange(newCursorPos, newCursorPos);
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            const input = e.target as HTMLInputElement;
                            const { digits } = formatPhone(appointmentData.phone);
                            if (digits.length > 0) {
                              const newDigits = digits.slice(0, -1);
                              const { formatted } = formatPhone(newDigits);
                              setAppointmentData((prev) => ({ ...prev, phone: formatted }));
                              requestAnimationFrame(() => {
                                const newCursorPos = getPhoneCursorPosition(newDigits.length);
                                input.setSelectionRange(newCursorPos, newCursorPos);
                              });
                              e.preventDefault();
                            }
                          }
                        }}
                        onFocus={(e) => {
                          if (!appointmentData.phone.trim() || appointmentData.phone === "(___)___-____") {
                            const { formatted } = formatPhone("");
                            setAppointmentData((prev) => ({ ...prev, phone: formatted }));
                            requestAnimationFrame(() => { e.target.setSelectionRange(1, 1); });
                          }
                        }}
                        onBlur={(e) => {
                          const digits = formatPhone(e.target.value).digits;
                          if (!digits.length) setAppointmentData((prev) => ({ ...prev, phone: "" }));
                        }}
                        placeholder="Phone Number"
                        inputMode="numeric"
                        autoComplete="tel"
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all"
                      />
                      <p className="text-gray-500 text-[10px] mt-2 text-center">For appointment reminders only</p>
                    </div>
                  )}

                  {/* ── DATE OF BIRTH ── */}
                  {highlightedField === 'dateOfBirth' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">Date of birth?</div>
                      <input
                        ref={activeInputRef}
                        name="bday"
                        value={appointmentData.dateOfBirth}
                        onChange={(e) => {
                          const input = e.target;
                          const newValue = e.target.value;
                          const newDigits = formatDob(newValue).digits.length;
                          const { formatted } = formatDob(newValue);
                          setAppointmentData((prev) => ({ ...prev, dateOfBirth: formatted }));
                          requestAnimationFrame(() => {
                            const newCursorPos = getDobCursorPosition(newDigits);
                            input.setSelectionRange(newCursorPos, newCursorPos);
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            const input = e.target as HTMLInputElement;
                            const { digits } = formatDob(appointmentData.dateOfBirth);
                            if (digits.length > 0) {
                              const newDigits = digits.slice(0, -1);
                              const { formatted } = formatDob(newDigits);
                              setAppointmentData((prev) => ({ ...prev, dateOfBirth: formatted }));
                              requestAnimationFrame(() => {
                                const newCursorPos = getDobCursorPosition(newDigits.length);
                                input.setSelectionRange(newCursorPos, newCursorPos);
                              });
                              e.preventDefault();
                            }
                          }
                        }}
                        onFocus={(e) => {
                          if (!appointmentData.dateOfBirth.trim() || appointmentData.dateOfBirth === "__/__/____") {
                            const { formatted } = formatDob("");
                            setAppointmentData((prev) => ({ ...prev, dateOfBirth: formatted }));
                            requestAnimationFrame(() => { e.target.setSelectionRange(0, 0); });
                          }
                        }}
                        onBlur={(e) => {
                          const { digits } = formatDob(e.target.value);
                          if (!digits.length) {
                            setAppointmentData((prev) => ({ ...prev, dateOfBirth: "" }));
                            return;
                          }
                          if (digits.length === 8 && !isDobValid(e.target.value)) {
                            alert("Date of birth can't be in the future or invalid.");
                            setAppointmentData((prev) => ({ ...prev, dateOfBirth: "" }));
                          }
                        }}
                        placeholder="MM/DD/YYYY"
                        inputMode="numeric"
                        autoComplete="bday"
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all"
                      />
                    </div>
                  )}

                  {/* ── STREET ADDRESS ── */}
                  {highlightedField === 'streetAddress' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">Your home address?</div>
                      <GooglePlacesAutocomplete
                        value={appointmentData.streetAddress}
                        onChange={(value) => {
                          setAppointmentData((prev) => ({ 
                            ...prev, 
                            streetAddress: value,
                            placeId: "",
                            postalCode: ""
                          }));
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
                          }
                        }}
                        placeholder="Start typing your address..."
                        types={["address"]}
                        componentRestrictions={{ country: "us" }}
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all"
                      />
                      <p className="text-gray-500 text-[10px] mt-2 text-center">Required for prescriptions & telehealth compliance</p>
                    </div>
                  )}

                  {/* ── PHARMACY ── */}
                  {highlightedField === 'pharmacy' && (
                    <div className="bg-[#0d1218] border-2 border-primary-orange rounded-xl p-4 active-glow" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.15)' }}>
                      <div className="text-primary-orange font-bold text-sm mb-3 text-center">Preferred pharmacy?</div>
                      <PharmacySelector
                        value={appointmentData.pharmacy}
                        onChange={(value) => {
                          setAppointmentData((prev) => ({ ...prev, pharmacy: value }));
                        }}
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
                        placeholder="Search for a pharmacy..."
                        highlighted={true}
                        className="w-full bg-[#11161c] border-2 border-primary-orange/40 rounded-lg px-4 py-3.5 text-white text-[16px] focus:outline-none focus:border-primary-teal transition-all"
                      />
                      <p className="text-gray-500 text-[10px] mt-2 text-center">Where to send your prescriptions</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ALL COMPLETE — Proceed button ── */}
              {!highlightedField && personalDetailsValid && (
                <div className="question-enter">
                  <div className="bg-[#0d1218] border-2 border-primary-teal rounded-xl p-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 text-primary-teal">
                      <Check size={20} strokeWidth={3} />
                      <span className="font-bold text-sm">All set! Ready to book.</span>
                    </div>
                    <button 
                      onClick={handleProceed}
                      disabled={isCheckingEmail}
                      className="w-full bg-primary-orange text-white px-6 py-3.5 rounded-xl font-bold text-base shadow-lg hover:bg-orange-600 transition-all active:scale-[0.98]"
                    >
                      {isCheckingEmail ? "Checking..." : "Proceed to Payment →"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP 2 — PAYMENT */}
          {/* ═══════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-3 md:space-y-4">
              <div className="text-center">
                <span className="text-primary-orange font-semibold text-sm">Confirm Appointment Request:</span><br />
                <span className="text-white font-bold text-xl md:text-3xl">{formatDateTime(appointmentData.appointmentDate, appointmentData.appointmentTime)}</span>
              </div>
              
              {/* Back button */}
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-gray-500 text-xs hover:text-white transition-colors">
                <ArrowLeft size={14} />
                <span>← Edit details</span>
              </button>

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

        {/* ═══════════════════════════════════════════════ */}
        {/* DIALOGS (same as original) */}
        {/* ═══════════════════════════════════════════════ */}

        {/* Reason Dialog */}
        {reasonDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-4">
            <div className="bg-[#0d1218] border border-white/10 rounded-xl p-4 md:p-5 w-full max-w-lg space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-white font-bold text-base md:text-lg">Reason For Visit</div>
                <button 
                  onClick={() => { setReasonDialogOpen(false); setReasonInputFocused(false); }} 
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
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-red-400 text-[10px] md:text-xs font-semibold uppercase whitespace-nowrap">
                  Select From List
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto border border-white/5 rounded-lg">
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
                  autoFocus
                  className={`w-full bg-[#11161c] border rounded-lg px-3 py-3 text-white text-[16px] focus:outline-none min-h-[60px] transition-all ${
                    isChiefComplaintValid(appointmentData.chief_complaint)
                      ? "border-primary-teal"
                      : "border-white/10"
                  }`}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setChiefComplaintDialogOpen(false)}
                  disabled={!isChiefComplaintValid(appointmentData.chief_complaint)}
                  className={`bg-primary-teal text-black font-bold px-4 py-2 rounded-lg text-sm ${
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









































































