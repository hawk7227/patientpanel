"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Video, Phone, Edit2, Loader2, Clock, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import AppointmentCalendar from "@/components/AppointmentCalendar";

const GooglePlacesAutocomplete = dynamic(
  () => import("@/components/GooglePlacesAutocomplete"),
  { ssr: false }
);

type FormData = {
  // Patient details
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Medical history
  symptoms: string;
  patientOwnWords: string;
  allergies: boolean | null;
  allergiesDetails: string;
  surgeries: boolean | null;
  surgeriesDetails: string;
  medicalIssues: boolean | null;
  medicalIssuesDetails: string;
  // Appointment details
  visitType: string;
  appointmentDate: string;
  appointmentTime: string;
  pharmacy: string;
  pharmacyAddress: string;
  dateOfBirth: string;
  streetAddress: string;
};

const STEPS = [
  { 
    id: 0, 
    key: 'patientOwnWords', 
    title: 'Now Tell us whats going on in your own words', 
    detailKey: null,
    placeholder: "Patient types here...(symptoms and when it started)"
  },
  { 
    id: 1, 
    key: 'allergies', 
    title: 'Any Drug Allergies?', 
    detailKey: 'allergiesDetails',
    placeholder: "List any known drug allergies..."
  },
  { 
    id: 2, 
    key: 'surgeries', 
    title: 'Any Recent Surgeries or Procedures?', 
    detailKey: 'surgeriesDetails',
    placeholder: "List recent surgeries..."
  },
  { 
    id: 3, 
    key: 'medicalIssues', 
    title: 'Any Ongoing Medical Issues?', 
    detailKey: 'medicalIssuesDetails',
    placeholder: "List ongoing medical issues..."
  },
  { 
    id: 4, 
    key: 'visitType', 
    title: 'Select Visit Type & Appointment', 
    detailKey: null 
  },
  { 
    id: 5, 
    key: 'pharmacy', 
    title: 'Pharmacy Details', 
    detailKey: null 
  }
];

function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [previousStep, setPreviousStep] = useState<number | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    symptoms: "",
    patientOwnWords: "",
    allergies: null,
    allergiesDetails: "",
    surgeries: null,
    surgeriesDetails: "",
    medicalIssues: null,
    medicalIssuesDetails: "",
    visitType: "",
    appointmentDate: "",
    appointmentTime: "",
    pharmacy: "",
    pharmacyAddress: "",
    dateOfBirth: "",
    streetAddress: "",
  });
  const [doctorInfo, setDoctorInfo] = useState<{
    id: string;
    name: string;
    credentials: string;
    specialty: string;
  } | null>(null);

  useEffect(() => {
    const symptomParam = searchParams.get("symptom");
    const emailParam = searchParams.get("email");
    const skipIntake = searchParams.get("skipIntake") === "true";
    
    // Check sessionStorage for chief complaint (combined symptom + patient's own words)
    const storedData = sessionStorage.getItem('appointmentData');
    let chiefComplaint = symptomParam || "";
    
    if (storedData) {
      try {
        const appointmentData = JSON.parse(storedData);
        if (appointmentData.chiefComplaint) {
          chiefComplaint = appointmentData.chiefComplaint;
        } else if (appointmentData.symptom) {
          chiefComplaint = appointmentData.symptom;
          if (appointmentData.patientOwnWords) {
            chiefComplaint = `${appointmentData.symptom} / ${appointmentData.patientOwnWords}`;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    if (chiefComplaint) {
      setFormData(prev => ({ ...prev, symptoms: chiefComplaint }));
    }
    
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }

    // If skipIntake is true, check sessionStorage for patient data and skip to step 3
    if (skipIntake) {
      const storedData = sessionStorage.getItem('appointmentData');
      if (storedData) {
        try {
          const appointmentData = JSON.parse(storedData);
          if (appointmentData.patientId) {
            // Fetch patient data and pre-fill form
            const fetchPatientData = async () => {
              try {
                const response = await fetch(`/api/get-patient?patientId=${appointmentData.patientId}`);
                if (response.ok) {
                  const result = await response.json();
                  if (result.patient) {
                    const patient = result.patient;
                    
                    // Convert date from YYYY-MM-DD to MM/DD/YYYY format
                    let formattedDateOfBirth = "";
                    if (patient.date_of_birth) {
                      const dateParts = patient.date_of_birth.split('-');
                      if (dateParts.length === 3) {
                        formattedDateOfBirth = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
                      }
                    }
                    
                    setFormData(prev => ({
                      ...prev,
                      email: patient.email || emailParam || prev.email,
                      firstName: patient.first_name || prev.firstName,
                      lastName: patient.last_name || prev.lastName,
                      phone: patient.phone || prev.phone,
                      dateOfBirth: formattedDateOfBirth || prev.dateOfBirth,
                      streetAddress: patient.location || prev.streetAddress,
                      pharmacy: patient.preferred_pharmacy || prev.pharmacy,
                      pharmacyAddress: patient.pharmacy_address || prev.pharmacyAddress,
                      symptoms: symptomParam || prev.symptoms,
                    }));
                  }
                }
              } catch (error) {
                console.error("Error fetching patient data:", error);
              }
            };
            fetchPatientData();
            
            // Skip directly to step 4 (appointment booking)
            setStep(4);
          }
        } catch (error) {
          console.error("Error parsing stored appointment data:", error);
        }
      }
    }
  }, [searchParams]);

  // Fetch doctor info when step 4 is active
  useEffect(() => {
    if (step === 4) {
      const fetchDoctorInfo = async () => {
        try {
          const response = await fetch('/api/get-doctor-availability?date=2025-01-01&doctorId=1fd1af57-5529-4d00-a301-e653b4829efc');
          if (response.ok) {
            const data = await response.json();
            if (data.doctor) {
              setDoctorInfo({
                id: data.doctor.id,
                name: data.doctor.name,
                credentials: "MSN, APRN, FNP-C", // You can fetch this from database if available
                specialty: data.doctor.specialty || "A Private Practice Provider",
              });
            }
          }
        } catch (error) {
          console.error("Error fetching doctor info:", error);
          // Set default doctor info
          setDoctorInfo({
            id: "1fd1af57-5529-4d00-a301-e653b4829efc",
            name: "LaMonica A. Hodges",
            credentials: "MSN, APRN, FNP-C",
            specialty: "A Private Practice Provider",
          });
        }
      };
      fetchDoctorInfo();
    }
  }, [step]);

  const handleBooleanSelection = (key: keyof FormData, value: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (value === false) {
      // Auto-advance with a slight delay for visual feedback
      setTimeout(() => {
        setStep((prev) => prev + 1);
      }, 250);
    }
  };

  const handleVisitTypeSelection = (type: string) => {
    setFormData((prev) => {
      // Reset date/time when changing visit type
      if (prev.visitType !== type) {
        return { ...prev, visitType: type, appointmentDate: "", appointmentTime: "" };
      }
      return { ...prev, visitType: type };
    });
  };

  const handleDateOfBirthChange = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 8 digits (MMDDYYYY)
    const limitedNumbers = numbers.substring(0, 8);
    
    // Format as MM/DD/YYYY
    let formatted = '';
    if (limitedNumbers.length > 0) {
      formatted = limitedNumbers.substring(0, 2);
      if (limitedNumbers.length > 2) {
        formatted += '/' + limitedNumbers.substring(2, 4);
      }
      if (limitedNumbers.length > 4) {
        formatted += '/' + limitedNumbers.substring(4, 8);
      }
    }
    
    setFormData((prev) => ({ ...prev, dateOfBirth: formatted }));
  };

  const convertDateToISO = (dateStr: string): string => {
    // Convert MM/DD/YYYY to YYYY-MM-DD
    if (dateStr && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        // Return in ISO format: YYYY-MM-DD
        return `${year}-${month}-${day}`;
      }
    }
    // If already in ISO format (YYYY-MM-DD), return as is
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    // If invalid format, return empty string
    return '';
  };

  const isStepValid = (stepId: number) => {
    if (stepId === 0) return formData.patientOwnWords.trim() !== "";
    if (stepId === 1) return formData.allergies !== null && (formData.allergies === false || formData.allergiesDetails.trim() !== "");
    if (stepId === 2) return formData.surgeries !== null && (formData.surgeries === false || formData.surgeriesDetails.trim() !== "");
    if (stepId === 3) return formData.medicalIssues !== null && (formData.medicalIssues === false || formData.medicalIssuesDetails.trim() !== "");
    if (stepId === 4) return formData.visitType !== "" && formData.appointmentDate !== "" && formData.appointmentTime !== "";
    if (stepId === 5) {
      return formData.pharmacy.trim() !== "";
    }
    return false;
  };

  const nextStep = () => {
    if (isStepValid(step)) {
      // If we were editing a previous step, return to where we were
      if (previousStep !== null) {
        setStep(previousStep);
        setPreviousStep(null);
      } else {
        setStep(prev => prev + 1);
      }
    }
  };

  const jumpToStep = (stepId: number) => {
    // Save current position before jumping to edit
    setPreviousStep(step);
    setStep(stepId);
  };

  const getStepSummary = (stepId: number) => {
    if (stepId === 0) return formData.patientOwnWords ? formData.patientOwnWords.substring(0, 50) + (formData.patientOwnWords.length > 50 ? "..." : "") : "Not provided";
    if (stepId === 1) return formData.allergies ? `Yes: ${formData.allergiesDetails}` : "No Allergies";
    if (stepId === 2) return formData.surgeries ? `Yes: ${formData.surgeriesDetails}` : "No Surgeries";
    if (stepId === 3) return formData.medicalIssues ? `Yes: ${formData.medicalIssuesDetails}` : "No Medical Issues";
    if (stepId === 4) return `${formData.visitType} - ${formData.appointmentDate} at ${formData.appointmentTime}`;
    if (stepId === 5) {
      const pharmacyInfo = formData.pharmacyAddress 
        ? `${formData.pharmacy} - ${formData.pharmacyAddress}`
        : formData.pharmacy;
      return pharmacyInfo;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="absolute top-4 sm:top-6 w-full flex justify-between px-4 sm:px-6 z-10">
         <div className="w-full text-center text-white font-bold text-sm sm:text-lg tracking-wide">
            Medazon Health <span className="text-primary-orange">+</span> Concierge
         </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-start pt-14 sm:pt-20 p-2 sm:p-4 w-full mx-auto z-0 gap-2 sm:gap-4 ${
        step === 4 ? "max-w-5xl" : "max-w-2xl"
      }`}>
        
        {/* Render Steps */}
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isPast = step > s.id;
          
          // If this step is in the future (step < s.id), we don't render it unless we want a "stack" effect from bottom.
          // But usually we only show active and past.
          // For step 4, hide past steps to make it look like a separate page
          if (step < s.id) return null;
          if (step === 4 && s.id < 4) return null;

          return (
            <div 
              key={s.id}
              className={`w-full transition-all duration-500 ease-in-out ${
                isActive 
                  ? "animate-in slide-in-from-right-8 fade-in opacity-100 translate-x-0" 
                  : "opacity-60 scale-95"
              }`}
            >
              {/* Minimized / Past State */}
              {isPast ? (
                <div 
                  onClick={() => jumpToStep(s.id)}
                  className="bg-[#0d1218] border border-white/10 rounded-xl p-3 sm:p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-gray-400 text-xs sm:text-sm font-medium truncate">{s.title}</h3>
                    <p className="text-primary-teal font-bold text-xs sm:text-sm truncate">{getStepSummary(s.id)}</p>
                  </div>
                  <Edit2 size={16} className="text-gray-500 group-hover:text-white transition-colors shrink-0" />
                </div>
              ) : (
                /* Active State */
                <div className="bg-[#0d1218] border border-white/5 rounded-xl p-4 sm:p-6 lg:p-8 shadow-2xl">
                  <h2 className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-6">{s.title}</h2>
                  
                  
                  {/* Patient's Own Words (Step 0) */}
                  {s.id === 0 && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-primary-teal font-bold text-lg">YES</span>
                      </div>
                      <textarea
                        value={formData.patientOwnWords}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientOwnWords: e.target.value }))}
                        placeholder={s.placeholder}
                        className="w-full bg-[#11161c] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all min-h-[80px] sm:min-h-[100px] resize-y mb-3 sm:mb-4 text-sm sm:text-base"
                        autoFocus
                      />
                      <button 
                        onClick={nextStep}
                        disabled={!isStepValid(s.id)}
                        className={`w-full font-bold py-2.5 sm:py-3 rounded-lg transition-colors shadow-lg text-sm sm:text-base ${
                          !isStepValid(s.id)
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                            : "bg-white text-black hover:bg-gray-200"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Boolean Selection (Steps 1-3) */}
                  {(s.id === 1 || s.id === 2 || s.id === 3) && (
                    <>
                      <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <button
                          onClick={() => handleBooleanSelection(s.key as keyof FormData, true)}
                          className={`flex-1 py-2.5 sm:py-3 rounded-lg font-bold border transition-all text-sm sm:text-base ${
                            formData[s.key as keyof FormData] === true 
                              ? "bg-primary-teal text-black border-primary-teal shadow-[0_0_15px_rgba(0,203,169,0.3)]" 
                              : "border-white/20 text-white hover:border-white/40 hover:bg-white/5"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleBooleanSelection(s.key as keyof FormData, false)}
                          className={`flex-1 py-2.5 sm:py-3 rounded-lg font-bold border transition-all text-sm sm:text-base ${
                            formData[s.key as keyof FormData] === false 
                              ? "bg-primary-teal text-black border-primary-teal shadow-[0_0_15px_rgba(0,203,169,0.3)]" 
                              : "border-white/20 text-white hover:border-white/40 hover:bg-white/5"
                          }`}
                        >
                          No
                        </button>
                      </div>

                      {/* Conditional Input */}
                      {formData[s.key as keyof FormData] === true && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <input
                            type="text"
                            value={String(formData[s.detailKey as keyof FormData] || "")}
                            onChange={(e) => setFormData(prev => ({ ...prev, [s.detailKey as string]: e.target.value }))}
                            placeholder={s.placeholder}
                            className="w-full bg-[#11161c] border border-white/20 rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all mb-4"
                            autoFocus
                          />
                          <button 
                            onClick={nextStep}
                            disabled={!isStepValid(s.id)}
                            className={`w-full font-bold py-2.5 sm:py-3 rounded-lg transition-colors shadow-lg text-sm sm:text-base ${
                              !isStepValid(s.id)
                                ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                                : "bg-white text-black hover:bg-gray-200"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Visit Type Selection (Step 4) - Compact View */}
                  {s.id === 4 && (
                    <div className="w-full max-w-4xl mx-auto">
                      
                      {!formData.visitType ? (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                          {/* Doctor Profile Section - Horizontal & Compact */}
                          <div className="flex items-center gap-3 py-1.5 border-b border-white/10 mb-3">
                            {doctorInfo ? (
                              <>
                                {/* Doctor Avatar */}
                                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-white/10">
                                  <Image
                                    src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                                    alt={doctorInfo.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    priority
                                  />
                                </div>
                                
                                {/* Doctor Name & Credentials */}
                                <div className="flex-1 min-w-0 text-left">
                                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                                    {doctorInfo.name}
                                  </h3>
                                  <p className="text-[10px] sm:text-xs font-semibold text-gray-300">
                                    {doctorInfo.credentials}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] sm:text-xs text-gray-400 truncate">{doctorInfo.specialty}</span>
                                    <span className="text-gray-600 text-[10px]">•</span>
                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-400">
                                      <Clock size={10} />
                                      <span>30 min</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="animate-pulse flex items-center gap-3 w-full">
                                <div className="w-12 h-12 rounded-full bg-[#11161c]"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-24 bg-[#11161c] rounded"></div>
                                    <div className="h-2 w-16 bg-[#11161c] rounded"></div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Visit Type Selection - Compact */}
                          <div className="mb-3">
                            <h3 className="text-xs sm:text-sm font-semibold text-white mb-1.5">Select Visit Type</h3>
                            <div className="grid grid-cols-2 gap-2">
                              {["Video", "Phone"].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => handleVisitTypeSelection(type)}
                                  className={`border rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all text-center group ${
                                    formData.visitType === type 
                                      ? "border-primary-teal bg-primary-teal/10" 
                                      : "border-white/20 hover:border-primary-teal/50 hover:bg-white/5"
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                    formData.visitType === type 
                                      ? "bg-primary-teal text-black" 
                                      : "bg-white/5 text-primary-teal group-hover:bg-primary-teal/20 group-hover:text-primary-teal"
                                  }`}>
                                    {type === "Video" && <Video size={14} />}
                                    {type === "Phone" && <Phone size={14} />}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-white text-xs sm:text-sm">{type === "Video" ? "Video Call" : "Phone Call"}</h4>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                           {/* Back Button & Selected Type Header */}
                           <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                              <button 
                                onClick={() => setFormData(prev => ({ ...prev, visitType: "", appointmentDate: "", appointmentTime: "" }))}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                              >
                                <ArrowLeft size={16} />
                                <span>Change Visit Type</span>
                              </button>
                              <div className="flex items-center gap-2 bg-primary-teal/10 px-3 py-1 rounded-full border border-primary-teal/20">
                                {formData.visitType === "Video" ? <Video size={14} className="text-primary-teal" /> : <Phone size={14} className="text-primary-teal" />}
                                <span className="text-xs font-bold text-primary-teal">{formData.visitType} Call</span>
                              </div>
                           </div>

                             {/* Calendar & Time Selection - Compact */}
                             <div className="mb-4">
                                <div className="bg-[#11161c]/50 rounded-lg p-2 border border-white/5">
                                    <AppointmentCalendar
                                      selectedDate={formData.appointmentDate || null}
                                      selectedTime={formData.appointmentTime || null}
                                      onDateSelect={(date) => setFormData(prev => ({ ...prev, appointmentDate: date }))}
                                      onTimeSelect={(time) => setFormData(prev => ({ ...prev, appointmentTime: time }))}
                                      doctorId="1fd1af57-5529-4d00-a301-e653b4829efc"
                                    />
                                </div>
                             </div>

                            {/* Confirm Button */}
                            <div className="mt-2">
                              <button 
                                onClick={nextStep}
                                disabled={!isStepValid(s.id)}
                                className={`w-full font-bold py-3 rounded-lg transition-colors shadow-lg text-sm ${
                                  !isStepValid(s.id)
                                    ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                                    : "bg-primary-teal text-black hover:bg-primary-teal/90"
                                }`}
                              >
                                Confirm Appointment
                              </button>
                            </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pharmacy Details (Step 5) */}
                  {s.id === 5 && (
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-white mb-2">Preferred Pharmacy *</label>
                        <GooglePlacesAutocomplete
                          value={formData.pharmacy}
                          onChange={(value) => setFormData(prev => ({ ...prev, pharmacy: value }))}
                          onPlaceSelect={(place) => {
                            if (place.name) {
                              setFormData(prev => ({ 
                                ...prev, 
                                pharmacy: place.name || "",
                                pharmacyAddress: place.formatted_address || ""
                              }));
                            }
                          }}
                          placeholder="Pharmacy name (City or ZIP)"
                          types={["pharmacy", "drugstore"]}
                          componentRestrictions={{ country: "us" }}
                          className="w-full bg-[#11161c] border border-white/20 rounded-lg py-2.5 sm:py-3 px-3 sm:px-4 text-sm sm:text-base text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                          
                        />
                        {formData.pharmacyAddress && (
                          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 ml-1 break-words">{formData.pharmacyAddress}</p>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Your provider may send prescriptions to your selected pharmacy. These details are securely shared only for that purpose.
                      </p>

                      <button 
                        onClick={() => {
                          if (!isStepValid(s.id)) return;
                          
                          // Save pharmacy data to sessionStorage
                          const storedData = sessionStorage.getItem('appointmentData');
                          let appointmentData = formData;
                          
                          if (storedData) {
                            try {
                              const existingData = JSON.parse(storedData);
                              appointmentData = { ...existingData, ...formData };
                            } catch {
                              // Ignore parse errors
                            }
                          }
                          
                          sessionStorage.setItem('appointmentData', JSON.stringify(appointmentData));
                          router.push('/payment');
                        }}
                        disabled={!isStepValid(s.id)}
                        className={`w-full font-bold py-2.5 sm:py-3 rounded-lg transition-colors shadow-lg text-sm sm:text-base ${
                          !isStepValid(s.id)
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                            : "bg-white text-black hover:bg-gray-200"
                        }`}
                      >
                        Continue to Payment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Success State (Step 6) */}
        {step === 6 && (
          <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500 mt-6 sm:mt-10 px-4">
             <div className="bg-[#0d1218] border border-white/5 rounded-xl p-6 sm:p-8 shadow-2xl text-center">
               <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-teal flex items-center justify-center mx-auto mb-4 sm:mb-6 text-black shadow-[0_0_30px_rgba(0,203,169,0.4)]">
                  <Check size={32} className="sm:w-10 sm:h-10" />
               </div>
               <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">You&apos;re All Set!</h2>
               <p className="text-sm sm:text-base text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto">
                 We&apos;ve received your intake information. A provider will review your case shortly.
               </p>
               
               <Link href="/" className="inline-block bg-white text-black font-bold py-2.5 sm:py-3 px-8 sm:px-12 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base">
                 Return Home
               </Link>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IntakeForm />
    </Suspense>
  );
}
