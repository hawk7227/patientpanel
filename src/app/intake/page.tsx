"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Edit2, Loader2 } from "lucide-react";

type FormData = {
  email: string;
  // Medical history
  allergies: boolean | null;
  allergiesDetails: string;
  surgeries: boolean | null;
  surgeriesDetails: string;
  medicalIssues: boolean | null;
  medicalIssuesDetails: string;
  medications: boolean | null;
  medicationsDetails: string;
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
    placeholder: "Describe recent surgeries or procedures..."
  },
  { 
    id: 2, 
    key: 'medicalIssues', 
    title: 'Any Ongoing Medical Issues?', 
    detailKey: 'medicalIssuesDetails',
    placeholder: "Describe ongoing medical issues..."
  },
  { 
    id: 3, 
    key: 'medications', 
    title: 'Currently Taking Any Medications?', 
    detailKey: 'medicationsDetails',
    placeholder: "List current medications..."
  }
];

function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [previousStep, setPreviousStep] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    allergies: null,
    allergiesDetails: "",
    surgeries: null,
    surgeriesDetails: "",
    medicalIssues: null,
    medicalIssuesDetails: "",
    medications: null,
    medicationsDetails: "",
  });

  // Get accessToken and email from URL params or sessionStorage
  useEffect(() => {
    const tokenParam = searchParams.get("accessToken");
    const emailParam = searchParams.get("email");
    
    if (tokenParam) {
      setAccessToken(tokenParam);
    }
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(emailParam) }));
    }

    // Also check sessionStorage as fallback
    const storedData = sessionStorage.getItem('appointmentData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        if (!tokenParam && data.accessToken) {
          setAccessToken(data.accessToken);
        }
        if (!emailParam && data.email) {
          setFormData(prev => ({ ...prev, email: data.email }));
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [searchParams]);

  const handleBooleanSelection = (key: keyof FormData, value: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (value === false) {
      // Auto-advance with a slight delay for visual feedback
      // Clear the details field when selecting "No"
      const detailKey = STEPS.find(s => s.key === key)?.detailKey;
      if (detailKey) {
        setFormData((prev) => ({ ...prev, [detailKey]: "" }));
      }
      setTimeout(() => {
        setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      }, 250);
    }
  };

  const isStepValid = (stepId: number) => {
    const stepConfig = STEPS[stepId];
    if (!stepConfig) return false;
    
    const key = stepConfig.key as keyof FormData;
    const detailKey = stepConfig.detailKey as keyof FormData | null;
    
    const value = formData[key];
    if (value === null) return false;
    if (value === true && detailKey) {
      return (formData[detailKey] as string).trim() !== "";
    }
    return true;
  };

  const isFormComplete = () => {
    return STEPS.every((_, idx) => isStepValid(idx));
  };

  const nextStep = () => {
    if (isStepValid(step)) {
      // If we were editing a previous step, return to where we were
      if (previousStep !== null) {
        setStep(previousStep);
        setPreviousStep(null);
      } else if (step < STEPS.length - 1) {
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
    const stepConfig = STEPS[stepId];
    if (!stepConfig) return "";
    
    const key = stepConfig.key as keyof FormData;
    const detailKey = stepConfig.detailKey as keyof FormData | null;
    const value = formData[key];
    
    if (value === true && detailKey) {
      const details = formData[detailKey] as string;
      return `Yes: ${details.substring(0, 40)}${details.length > 40 ? '...' : ''}`;
    }
    if (value === false) {
      return "No";
    }
    return "Not answered";
  };

  const handleSubmit = async () => {
    if (!isFormComplete()) {
      alert("Please answer all questions");
      return;
    }

    if (!accessToken || !formData.email) {
      alert("Missing appointment information. Please try booking again.");
      router.push('/appointment');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📤 [INTAKE SUBMIT] Submitting intake:', {
        email: formData.email,
        accessToken,
      });

      // Update patient record using email - saves to patient chart
      const updatePatientResponse = await fetch("/api/update-intake-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          has_drug_allergies: formData.allergies,
          drug_allergies_details: formData.allergiesDetails,
          has_recent_surgeries: formData.surgeries,
          recent_surgeries_details: formData.surgeriesDetails,
          has_ongoing_medical_issues: formData.medicalIssues,
          ongoing_medical_issues_details: formData.medicalIssuesDetails,
          has_current_medications: formData.medications,
          current_medications_details: formData.medicationsDetails,
        }),
      });

      if (!updatePatientResponse.ok) {
        const result = await updatePatientResponse.json();
        console.error("Failed to update patient:", result);
        // Continue anyway - appointment update is more important
      } else {
        console.log("✅ [INTAKE] Patient chart updated successfully");
      }

      // Update appointment intake data - saves to appointment notes
      const updateAppointmentResponse = await fetch("/api/update-appointment-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken,
          intakeData: {
            allergies: formData.allergies,
            allergiesDetails: formData.allergiesDetails,
            surgeries: formData.surgeries,
            surgeriesDetails: formData.surgeriesDetails,
            medicalIssues: formData.medicalIssues,
            medicalIssuesDetails: formData.medicalIssuesDetails,
            medications: formData.medications,
            medicationsDetails: formData.medicationsDetails,
          },
        }),
      });

      if (!updateAppointmentResponse.ok) {
        const result = await updateAppointmentResponse.json();
        console.error("Failed to update appointment intake:", result);
      } else {
        console.log("✅ [INTAKE] Appointment intake notes updated successfully");
      }

      // Update sessionStorage
      const storedData = sessionStorage.getItem('appointmentData');
      if (storedData) {
        const data = JSON.parse(storedData);
        sessionStorage.setItem('appointmentData', JSON.stringify({
          ...data,
          allergies: formData.allergies,
          allergiesDetails: formData.allergiesDetails,
          surgeries: formData.surgeries,
          surgeriesDetails: formData.surgeriesDetails,
          medicalIssues: formData.medicalIssues,
          medicalIssuesDetails: formData.medicalIssuesDetails,
          medications: formData.medications,
          medicationsDetails: formData.medicationsDetails,
          intakeComplete: true,
        }));
      }

      console.log('✅ [INTAKE] Complete, redirecting to confirmation');
      
      // Redirect to confirmation page
      router.push(`/appointment/${accessToken}`);

    } catch (error) {
      console.error("Error submitting intake:", error);
      alert("Failed to submit intake. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-foreground flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="absolute top-4 sm:top-6 w-full flex justify-between px-4 sm:px-6 z-10">
         <div className="w-full text-center text-white font-bold text-sm sm:text-lg tracking-wide">
            MEDAZON<span className="text-primary-teal">HEALTH</span>
         </div>
      </div>

      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-teal/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-orange/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-14 sm:pt-20 p-2 sm:p-4 w-full mx-auto z-0 gap-2 sm:gap-4 max-w-2xl">
        
        {/* Payment Confirmed Badge */}
        <div className="mb-2">
          <div className="inline-flex items-center gap-2 bg-primary-teal/10 border border-primary-teal/30 rounded-full px-4 py-2">
            <Check size={16} className="text-primary-teal" />
            <span className="text-primary-teal font-semibold text-sm">Payment Confirmed</span>
          </div>
        </div>

        {/* Required Notice */}
        <div className="w-full bg-[#0d1218] border border-primary-orange/30 rounded-xl p-3 sm:p-4 mb-2">
          <div className="text-center">
            <div className="text-red-500 font-bold text-xs sm:text-sm mb-1 uppercase tracking-wider">
              Required Before Visit
            </div>
            <div className="text-white font-bold text-base sm:text-lg">
              Complete Your Medical Intake
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Provide these details so we can prepare the provider before your visit
            </p>
          </div>
        </div>
        
        {/* Render Steps */}
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isPast = step > s.id;
          
          // If this step is in the future, don't render it
          if (step < s.id) return null;

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
                  
                  {/* Boolean Selection */}
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

                  {/* Conditional Input for "Yes" */}
                  {formData[s.key as keyof FormData] === true && s.detailKey && (
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
                        {step === STEPS.length - 1 ? "Continue" : "Next"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Complete Booking Button - shown when all steps are done */}
        {step === STEPS.length - 1 && isStepValid(step) && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-2">
            <div className="bg-[#0d1218] border border-white/5 rounded-xl p-4 sm:p-6 shadow-2xl">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 text-primary-teal mb-2">
                  <Check size={20} />
                  <span className="font-semibold">All Questions Answered</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Your medical information will be securely shared with your provider.
                </p>
              </div>
              
              <button 
                onClick={handleSubmit}
                disabled={!isFormComplete() || isSubmitting}
                className={`w-full font-bold py-3 sm:py-4 rounded-lg transition-colors shadow-lg text-sm sm:text-base ${
                  !isFormComplete() || isSubmitting
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                    : "bg-primary-orange text-white hover:bg-orange-600"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Complete Booking"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="w-full max-w-xs mx-auto mt-4">
          <div className="flex justify-center gap-2">
            {STEPS.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx <= step 
                    ? "bg-primary-teal w-8" 
                    : "bg-white/20 w-4"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-gray-500 text-xs mt-2">
            Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}
          </p>
        </div>

      </div>
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-teal" />
      </div>
    }>
      <IntakeForm />
    </Suspense>
  );
}

