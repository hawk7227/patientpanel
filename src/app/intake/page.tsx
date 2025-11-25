"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Video, Phone, Edit2, Loader2, Clock } from "lucide-react";
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
    key: 'allergies', 
    title: 'Any Drug Allergies?', 
    detailKey: 'allergiesDetails',
    placeholder: "List any known drug allergies..."
  },
  { 
    id: 1, 
    key: 'surgeries', 
    title: 'Any Recent Surgeries or Procedures?', 
    detailKey: 'surgeriesDetails',
    placeholder: "List recent surgeries..."
  },
  { 
    id: 2, 
    key: 'medicalIssues', 
    title: 'Any Ongoing Medical Issues?', 
    detailKey: 'medicalIssuesDetails',
    placeholder: "List ongoing medical issues..."
  },
  { 
    id: 3, 
    key: 'visitType', 
    title: 'Select Visit Type & Appointment', 
    detailKey: null 
  },
  { 
    id: 4, 
    key: 'pharmacy', 
    title: 'Patient Information & Pharmacy', 
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
    if (symptomParam) {
      setFormData(prev => ({ ...prev, symptoms: symptomParam }));
    }
  }, [searchParams]);

  // Fetch doctor info when step 3 is active
  useEffect(() => {
    if (step === 3) {
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

  const isStepValid = (stepId: number) => {
    if (stepId === 0) return formData.allergies !== null && (formData.allergies === false || formData.allergiesDetails.trim() !== "");
    if (stepId === 1) return formData.surgeries !== null && (formData.surgeries === false || formData.surgeriesDetails.trim() !== "");
    if (stepId === 2) return formData.medicalIssues !== null && (formData.medicalIssues === false || formData.medicalIssuesDetails.trim() !== "");
    if (stepId === 3) return formData.visitType !== "" && formData.appointmentDate !== "" && formData.appointmentTime !== "";
    if (stepId === 4) return formData.email.trim() !== "" && formData.firstName.trim() !== "" && formData.lastName.trim() !== "" && formData.phone.trim() !== "" && formData.pharmacy.trim() !== "" && formData.dateOfBirth.trim() !== "" && formData.streetAddress.trim() !== "";
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
    if (stepId === 0) return formData.allergies ? `Yes: ${formData.allergiesDetails}` : "No Allergies";
    if (stepId === 1) return formData.surgeries ? `Yes: ${formData.surgeriesDetails}` : "No Surgeries";
    if (stepId === 2) return formData.medicalIssues ? `Yes: ${formData.medicalIssuesDetails}` : "No Medical Issues";
    if (stepId === 3) return `${formData.visitType} - ${formData.appointmentDate} at ${formData.appointmentTime}`;
    if (stepId === 4) {
      const pharmacyInfo = formData.pharmacyAddress 
        ? `${formData.pharmacy} - ${formData.pharmacyAddress}`
        : formData.pharmacy;
      return `${formData.firstName} ${formData.lastName} - ${pharmacyInfo}`;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="absolute top-6 w-full flex justify-between px-6 z-10">
         <div className="w-full text-center text-white font-bold text-lg tracking-wide">
            Medazon Health <span className="text-primary-orange">+</span> Concierge
         </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-start pt-24 p-4 w-full mx-auto z-0 gap-4 ${
        step === 3 ? "max-w-5xl" : "max-w-2xl"
      }`}>
        
        {/* Render Steps */}
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isPast = step > s.id;
          
          // If this step is in the future (step < s.id), we don't render it unless we want a "stack" effect from bottom.
          // But usually we only show active and past.
          // For step 3, hide past steps to make it look like a separate page
          if (step < s.id) return null;
          if (step === 3 && s.id < 3) return null;

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
                  className="bg-[#0d1218] border border-white/10 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  <div>
                    <h3 className="text-gray-400 text-sm font-medium">{s.title}</h3>
                    <p className="text-primary-teal font-bold">{getStepSummary(s.id)}</p>
                  </div>
                  <Edit2 size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                </div>
              ) : (
                /* Active State */
                <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl">
                  <h2 className="text-xl font-bold text-white mb-6">{s.title}</h2>
                  
                  {/* Boolean Selection (Steps 0-2) */}
                  {(s.id === 0 || s.id === 1 || s.id === 2) && (
                    <>
                      <div className="flex gap-4 mb-6">
                        <button
                          onClick={() => handleBooleanSelection(s.key as keyof FormData, true)}
                          className={`flex-1 py-3 rounded-lg font-bold border transition-all ${
                            formData[s.key as keyof FormData] === true 
                              ? "bg-primary-teal text-black border-primary-teal shadow-[0_0_15px_rgba(0,203,169,0.3)]" 
                              : "border-white/20 text-white hover:border-white/40 hover:bg-white/5"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleBooleanSelection(s.key as keyof FormData, false)}
                          className={`flex-1 py-3 rounded-lg font-bold border transition-all ${
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
                            className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all mb-4"
                            autoFocus
                          />
                          <button 
                            onClick={nextStep}
                            disabled={!isStepValid(s.id)}
                            className={`w-full font-bold py-3 rounded-lg transition-colors shadow-lg ${
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

                  {/* Visit Type Selection (Step 3) - Separate Page View */}
                  {s.id === 3 && (
                    <div className="w-full max-w-4xl mx-auto bg-[#0d1218] border border-white/5 rounded-xl shadow-2xl overflow-hidden">
                      {/* Condition Information Header */}
                      <div className="bg-[#11161c] border-b border-white/10 px-8 py-6">
                        <h2 className="text-2xl font-bold text-white">Condition Information</h2>
                      </div>

                      {/* Doctor Profile Section */}
                      <div className="px-8 py-8 flex flex-col items-center border-b border-white/10">
                        {doctorInfo ? (
                          <>
                            {/* Doctor Avatar */}
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 shadow-lg ring-4 ring-white/10">
                              <Image
                                src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
                                alt={doctorInfo.name}
                                width={96}
                                height={96}
                                className="w-full h-full object-cover"
                                priority
                              />
                            </div>
                            
                            {/* Doctor Name & Credentials */}
                            <h3 className="text-xl font-bold text-white mb-1">
                              {doctorInfo.name}
                            </h3>
                            <p className="text-sm font-semibold text-gray-300 mb-1">
                              {doctorInfo.credentials}
                            </p>
                            <p className="text-sm text-gray-400 mb-3">
                              {doctorInfo.specialty}
                            </p>
                            
                            {/* Appointment Duration */}
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock size={16} />
                              <span>30 min</span>
                            </div>
                          </>
                        ) : (
                          <div className="animate-pulse">
                            <div className="w-24 h-24 rounded-full bg-[#11161c] mb-4"></div>
                            <div className="h-6 w-48 bg-[#11161c] rounded mb-2"></div>
                            <div className="h-4 w-32 bg-[#11161c] rounded"></div>
                          </div>
                        )}
                      </div>

                      {/* Visit Type Selection */}
                      <div className="px-8 py-6 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Select Visit Type</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {["Video", "Phone"].map((type) => (
                            <button
                              key={type}
                              onClick={() => handleVisitTypeSelection(type)}
                              className={`border-2 rounded-xl p-4 flex items-center gap-4 transition-all text-left group ${
                                formData.visitType === type 
                                  ? "border-primary-teal bg-primary-teal/10" 
                                  : "border-white/20 hover:border-primary-teal/50 hover:bg-white/5"
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                                formData.visitType === type 
                                  ? "bg-primary-teal text-black" 
                                  : "bg-white/5 text-primary-teal group-hover:bg-primary-teal/20 group-hover:text-primary-teal"
                              }`}>
                                {type === "Video" && <Video size={20} />}
                                {type === "Phone" && <Phone size={20} />}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{type === "Video" ? "Video Call" : "Phone Call"}</h4>
                                <p className="text-xs text-gray-400">
                                  {type === "Video" ? "Face-to-face video consultation." : "Audio-only consultation."}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Calendar & Time Selection */}
                      {formData.visitType && (
                        <div className="px-8 py-6 animate-in fade-in slide-in-from-top-2 duration-300">
                          <h3 className="text-lg font-semibold text-white mb-6">Select a Date & Time</h3>
                          <AppointmentCalendar
                            selectedDate={formData.appointmentDate || null}
                            selectedTime={formData.appointmentTime || null}
                            onDateSelect={(date) => setFormData(prev => ({ ...prev, appointmentDate: date }))}
                            onTimeSelect={(time) => setFormData(prev => ({ ...prev, appointmentTime: time }))}
                            doctorId="1fd1af57-5529-4d00-a301-e653b4829efc"
                          />
                        </div>
                      )}

                      {/* Confirm Button */}
                      {formData.visitType && (
                        <div className="px-8 py-6 bg-[#11161c] border-t border-white/10">
                          <button 
                            onClick={nextStep}
                            disabled={!isStepValid(s.id)}
                            className={`w-full font-bold py-4 rounded-lg transition-colors shadow-lg ${
                              !isStepValid(s.id)
                                ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                                : "bg-primary-teal text-black hover:bg-primary-teal/90"
                            }`}
                          >
                            Confirm Appointment
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Patient Information & Pharmacy (Step 4) */}
                  {s.id === 4 && (
                    <div className="space-y-4">
                      {/* Basic Patient Information */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Email Address *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="your.email@example.com"
                          className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">First Name *</label>
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="John"
                            className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Last Name *</label>
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Doe"
                            className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Phone Number *</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                          className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Date of Birth *</label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          onClick={(e) => {
                            const input = e.currentTarget as HTMLInputElement;
                            if (input.showPicker) {
                              input.showPicker();
                            }
                          }}
                          onFocus={(e) => {
                            const input = e.currentTarget as HTMLInputElement;
                            if (input.showPicker) {
                              input.showPicker();
                            }
                          }}
                          className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Street Address *</label>
                        <GooglePlacesAutocomplete
                          value={formData.streetAddress}
                          onChange={(value) => setFormData(prev => ({ ...prev, streetAddress: value }))}
                          onPlaceSelect={(place) => {
                            if (place.formatted_address) {
                              setFormData(prev => ({ ...prev, streetAddress: place.formatted_address || "" }));
                            }
                          }}
                          placeholder="Your street address"
                          types={["address"]}
                          componentRestrictions={{ country: "us" }}
                          className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">Preferred Pharmacy *</label>
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
                          className="w-full bg-[#11161c] border border-white/20 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
                        />
                        {formData.pharmacyAddress && (
                          <p className="text-[10px] text-gray-500 mt-1 ml-1">{formData.pharmacyAddress}</p>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Your provider may send prescriptions to your selected pharmacy. These details are securely shared only for that purpose.
                      </p>

                      <button 
                        onClick={async () => {
                          if (!isStepValid(s.id) || isProcessingPayment) return;
                          
                          setIsProcessingPayment(true);
                          try {
                            // Check/create patient before proceeding to payment
                            const response = await fetch('/api/check-create-patient', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                email: formData.email,
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                phone: formData.phone,
                                dateOfBirth: formData.dateOfBirth,
                                address: formData.streetAddress,
                              }),
                            });

                            const result = await response.json();

                            if (!response.ok) {
                              throw new Error(result.error || 'Failed to process patient information');
                            }

                            // Save form data and patient ID to sessionStorage
                            sessionStorage.setItem('appointmentData', JSON.stringify({
                              ...formData,
                              patientId: result.patientId,
                            }));
                            
                            router.push('/payment');
                          } catch (error) {
                            console.error('Error creating patient:', error);
                            alert(error instanceof Error ? error.message : 'Failed to process patient information. Please try again.');
                            setIsProcessingPayment(false);
                          }
                        }}
                        disabled={!isStepValid(s.id) || isProcessingPayment}
                        className={`w-full font-bold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2 ${
                          !isStepValid(s.id) || isProcessingPayment
                            ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                            : "bg-white text-black hover:bg-gray-200"
                        }`}
                      >
                        {isProcessingPayment && (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        )}
                        {isProcessingPayment ? "Processing..." : "Proceed to Payment"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Success State (Step 5) */}
        {step === 5 && (
          <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500 mt-10">
             <div className="bg-[#0d1218] border border-white/5 rounded-xl p-8 shadow-2xl text-center">
               <div className="w-20 h-20 rounded-full bg-primary-teal flex items-center justify-center mx-auto mb-6 text-black shadow-[0_0_30px_rgba(0,203,169,0.4)]">
                  <Check size={40} />
               </div>
               <h2 className="text-2xl font-bold text-white mb-4">You&apos;re All Set!</h2>
               <p className="text-gray-400 mb-8 max-w-md mx-auto">
                 We&apos;ve received your intake information. A provider will review your case shortly.
               </p>
               
               <Link href="/" className="inline-block bg-white text-black font-bold py-3 px-12 rounded-lg hover:bg-gray-200 transition-colors">
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
