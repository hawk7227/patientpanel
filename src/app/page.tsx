"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import symptomSuggestions from "@/data/symptom-suggestions.json";
import { 
  Search, 
  Video, 
  Calendar, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  Droplets,
  Smile,
  AlertCircle,
  ShieldAlert,
  Wind,
  Eye,
  Ear,
  Stethoscope,
  ArrowRight,
  Loader2,
} from "lucide-react";
import UrgentCollapse from "@/components/home/UrgentCollapse";
function SymptomSearch() {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [patientOwnWords, setPatientOwnWords] = useState("");
  const [email, setEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPatientWordsSection, setShowPatientWordsSection] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);

  // Smart search function - matches against name and smart_search array
  const filteredSuggestions = useMemo(() => {
    if (!symptom.trim()) return [];
    
    const searchTerm = symptom.toLowerCase().trim();
    
    // For single character, show suggestions that start with that letter or have keywords starting with it
    if (searchTerm.length === 1) {
      return symptomSuggestions.filter(item => {
        // Check if name starts with the letter
        const nameStartsWith = item.name.toLowerCase().startsWith(searchTerm);
        
        // Check if any keyword starts with the letter
        const keywordStartsWith = item.smart_search.some(keyword => 
          keyword.toLowerCase().startsWith(searchTerm)
        );
        
        return nameStartsWith || keywordStartsWith;
      }).slice(0, 10);
    }
    
    // For multiple characters, use full search
    return symptomSuggestions.filter(item => {
      // Check if search term matches the name
      const nameMatch = item.name.toLowerCase().includes(searchTerm);
      
      // Check if search term matches any smart_search keywords
      const smartMatch = item.smart_search.some(keyword => 
        keyword.toLowerCase().includes(searchTerm) || 
        searchTerm.includes(keyword.toLowerCase())
      );
      
      return nameMatch || smartMatch;
    }).slice(0, 10); // Limit to 10 results for performance
  }, [symptom]);

  // Show patient's own words section when symptom is entered
  const handleSymptomChange = (value: string) => {
    setSymptom(value);
    // Always show dropdown if there's text - filteredSuggestions will handle the actual filtering
    setShowDropdown(value.length > 0);
    setShowPatientWordsSection(value.trim().length > 0);
  };
  
  // Update dropdown visibility when filteredSuggestions changes
  useEffect(() => {
    if (symptom.length > 0) {
      setShowDropdown(filteredSuggestions.length > 0);
    }
  }, [filteredSuggestions, symptom.length]);

  // Handle suggestion selection - just set the text, don't navigate
  const handleSuggestionClick = (suggestionName: string) => {
    setSymptom(suggestionName);
    setShowDropdown(false);
    setShowPatientWordsSection(true);
  };

  // Show email field when patient's own words are entered (or if they skip it)
  const handlePatientWordsChange = (value: string) => {
    setPatientOwnWords(value);
    setShowEmailField(true); // Show email field once they start typing or section is visible
  };

  const handleBookAppointment = async () => {
    if (!symptom.trim()) {
      alert("Please enter or select a symptom to continue.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter your email address to continue.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Combine selected symptom and patient's own words for chief complaint
      const chiefComplaint = patientOwnWords.trim() 
        ? `${symptom} / ${patientOwnWords.trim()}`
        : symptom;

      // Check if user exists
      const response = await fetch('/api/check-user-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check user');
      }

      if (result.exists && result.patientId) {
        // User exists - skip to appointment booking
        // Save symptom, patient's own words, and patient info to sessionStorage
        sessionStorage.setItem('appointmentData', JSON.stringify({
          symptom: symptom,
          patientOwnWords: patientOwnWords.trim(),
          chiefComplaint: chiefComplaint,
          email: email.trim(),
          patientId: result.patientId,
          skipIntake: true, // Flag to skip intake questions
        }));
        
        // Navigate directly to appointment booking (step 3 in intake flow)
        router.push(`/intake?symptom=${encodeURIComponent(symptom)}&email=${encodeURIComponent(email.trim())}&skipIntake=true`);
      } else {
        // User doesn't exist - go to full intake flow
        // Pass the combined chief complaint
        router.push(`/intake?symptom=${encodeURIComponent(chiefComplaint)}&email=${encodeURIComponent(email.trim())}`);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      alert(error instanceof Error ? error.message : 'Failed to process request. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#050b14] p-8 rounded-2xl border border-white/10 shadow-2xl relative">
      <label className="block text-left text-white font-bold mb-3 text-sm ml-1">What brings you in today?</label>
      
      <div className="relative">
         <input 
            type="text" 
            value={symptom}
            placeholder="Type your symptoms here..."
            className="w-full bg-[#11161c] border border-white/10 rounded-lg py-4 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
            onChange={(e) => handleSymptomChange(e.target.value)}
            onFocus={() => {
               if (symptom.length > 0) {
                 setShowDropdown(true);
               }
            }}
            onBlur={() => {
               // Delay hiding dropdown to allow clicks
               setTimeout(() => setShowDropdown(false), 200);
            }}
         />
         
         {/* Auto-suggestion Dropdown */}
         {showDropdown && filteredSuggestions.length > 0 && (
           <div className="absolute top-full left-0 w-full bg-[#0d1218] border border-primary-teal/30 rounded-b-lg shadow-2xl z-50 overflow-hidden mt-1 max-h-[300px] overflow-y-auto">
              {filteredSuggestions.map((item) => (
                 <div 
                    key={item.name}
                    className="px-4 py-3 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-left border-b border-white/5 last:border-0 transition-colors font-medium"
                    onMouseDown={(e) => {
                       // Prevent blur event
                       e.preventDefault();
                    }}
                    onClick={() => handleSuggestionClick(item.name)}
                 >
                    {item.name}
                 </div>
              ))}
           </div>
         )}
      </div>

      {/* Patient's Own Words Section - shown after symptom is entered */}
      {showPatientWordsSection && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-primary-teal font-bold text-lg">YES</span>
            <span className="text-white font-semibold text-sm">Now Tell us what's going on in your own words</span>
          </div>
          <textarea
            value={patientOwnWords}
            placeholder="Patient types here...(symptoms and when it started)"
            className="w-full bg-[#11161c] border border-white/10 rounded-lg py-4 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all min-h-[100px] resize-y"
            onChange={(e) => handlePatientWordsChange(e.target.value)}
            onFocus={() => setShowEmailField(true)}
          />
        </div>
      )}

      {/* Email field - shown when patient's own words section is visible */}
      {showEmailField && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-left text-white font-bold mb-3 text-sm ml-1">EMAIL:</label>
          <input 
            type="email" 
            value={email}
            placeholder="your.email@example.com"
            className="w-full bg-[#11161c] border border-white/10 rounded-lg py-4 px-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal transition-all"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && symptom.trim() && email.trim()) {
                handleBookAppointment();
              }
            }}
          />
        </div>
      )}

      {/* Book Appointment button - shown when email field is visible */}
      {showEmailField && (
        <div className="flex justify-center gap-4 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <button 
            onClick={handleBookAppointment}
            disabled={!symptom.trim() || !email.trim() || isLoading}
            className={`bg-primary-orange text-white px-8 py-3 rounded-lg transition-all text-sm font-bold shadow-lg shadow-orange-900/20 flex items-center gap-2 ${
               !symptom.trim() || !email.trim() || isLoading
               ? "opacity-50 cursor-not-allowed grayscale" 
               : "hover:bg-orange-600"
            }`}
         >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {!isLoading && <Calendar size={18} />}
            Book My Appointment
         </button>
      </div>
      )}
    </div>
  );
}

export default function Home() {
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
              <button 
                onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary-teal hover:bg-teal-500 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
              >
                Start an Instant Visit <Video size={18} />
              </button>
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
      <section id="symptoms-section" className="bg-[#11161c] py-20 border-y border-white/5">
         <div className="container mx-auto px-4 text-center max-w-2xl">
           <h2 className="text-3xl md:text-4xl font-bold text-primary-teal mb-2">
              Tell Us Your Symptoms
           </h2>
           <p className="text-gray-400 mb-8 text-sm uppercase tracking-wider">
              OUR AI ASSISTANT HELPS FIND THE RIGHT CARE QUICKLY
           </p>

           <SymptomSearch />
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
{/* =====================================================
   FOLD X — FULL LONG-FORM URGENT CARE CONTENT (ZONE 3)
   WITH COLLAPSIBLE "SEE MORE" BUTTON — 100% COMPLETE VERSION
   SEO-SAFE · FULL MEDICAL DEPTH · FLORIDA-SPECIFIC
===================================================== */}

<section className="bg-[#11161c] py-20 border-t border-white/5">
  <div className="container mx-auto px-4 max-w-3xl">

    {/* SEE MORE BUTTON */}
    <div className="text-center mb-6">
      <button
        id="urgentCareToggle"
        className="
          bg-primary-teal text-black font-bold px-8 py-3 rounded-full 
          hover:bg-teal-400 transition-all shadow-lg shadow-primary-teal/20
        "
      >
        Learn More About Urgent Care
      </button>
    </div>

    {/* COLLAPSIBLE CONTENT */}
    <div
      id="urgentCareContent"
      style={{ maxHeight: "0", overflow: "hidden", transition: "max-height .45s ease" }}
      className="rounded-2xl border border-white/10 bg-[#0d1218]/70 backdrop-blur-sm shadow-2xl p-8 mt-4"
    >

      {/************* BEGIN FULL LONG-FORM URGENT CARE CONTENT *************/}

      <h2 className="text-3xl font-bold text-primary-teal mb-6 text-center">
        Florida Virtual Urgent Care — Complete Patient Guide
      </h2>

      <p className="text-gray-300 leading-relaxed mb-5">
        Florida residents often turn to virtual urgent care for fast, private support when experiencing
        mild symptoms that require timely attention but do not require emergency medical treatment.
        Telehealth offers the convenience of immediate clinician review from anywhere in Florida,
        whether you are at home, traveling, or unable to reach an urgent care center in person.
      </p>
{/* =====================================================
   SMART SEARCH — SEO CRAWLABLE KEYWORD INDEX (FOLD 7)
   For long-form educational section · Fully DOM-visible
===================================================== */}

<div className="mt-10 mb-8 text-center">
  <h3 className="text-primary-teal font-semibold text-xl mb-3">
    Smart Search Symptom Helper
  </h3>
  <p className="text-gray-400 text-sm leading-relaxed max-w-2xl mx-auto mb-4">
    Our Smart Search tool helps guide your urgent care visit by matching common symptoms, 
    concerns, and reasons for care. The list below is visible to help search engines 
    understand what types of concerns are typically entered during virtual urgent care visits.
  </p>

  {/* Crawlable Keyword Index */}
  <div className="
    flex flex-wrap justify-center gap-2 
    text-gray-300 text-xs leading-relaxed 
    max-w-3xl mx-auto
  ">
    {[
      "UTI",
      "Urinary discomfort",
      "Burning urination",
      "Frequent urination",
      "Possible STD symptoms",
      "Exposure concern",
      "Private / sensitive issue",
      "Discharge",
      "Pelvic discomfort",
      "Rash or irritation",
      "Cold / flu symptoms",
      "Sinus infection",
      "Migraine",
      "Nausea",
      "Back pain",
      "Medication refill",
      "Follow-up visit",
      "Birth control",
      "Asthma / inhaler",
      "Hair loss",
      "Anxiety or stress",
    ].map((keyword) => (
      <span
        key={keyword}
        className="
          bg-white/5 border border-white/10 
          px-3 py-1 rounded-full 
          text-primary-teal/80 font-medium
        "
      >
        {keyword}
      </span>
    ))}
  </div>
</div>

      <p className="text-gray-300 leading-relaxed mb-5">
        This guide provides a detailed overview of what virtual urgent care can help with, what symptoms
        clinicians commonly evaluate, what limitations exist, and how the Florida telehealth medical system
        operates under state law. The purpose of this guide is to educate patients and help them understand
        when virtual urgent care is helpful and when in-person or emergency care is required.
      </p>

      {/* ============================================= */}
      {/* WHAT URGENT CARE TELEHEALTH CAN HELP WITH */}
      {/* ============================================= */}
      <h3 className="text-primary-teal font-semibold text-2xl mt-12 mb-4">
        What Virtual Urgent Care Can Help With
      </h3>

      <p className="text-gray-300 leading-relaxed mb-5">
        Clinicians commonly evaluate the following urgent but non-emergency concerns through telehealth.
        These issues typically involve mild-to-moderate symptoms that can be safely discussed through virtual evaluation:
      </p>

      <ul className="list-disc ml-6 text-gray-300 space-y-2 leading-relaxed">
        <li>Mild urinary symptoms or possible urinary tract infection (UTI)</li>
        <li>STD/STI exposure concerns or mild symptoms</li>
        <li>Sore throat, cough, or upper respiratory symptoms</li>
        <li>Common cold, flu-like symptoms, or fever</li>
        <li>Pink eye, mild eye irritation, tearing, redness</li>
        <li>Rashes, insect bites, hives, irritation, or skin reactions</li>
        <li>Sinus congestion, sinus pressure, or allergy flare-ups</li>
        <li>Mild ear discomfort, ear fullness, or allergy-related symptoms</li>
        <li>Nausea, vomiting, or stomach irritation</li>
        <li>Minor headaches or tension headaches</li>
        <li>Mild anxiety flare-ups or stress-related symptoms</li>
        <li>Medication refills for stable, ongoing conditions when appropriate</li>
        <li>Mild musculoskeletal strains or discomfort</li>
      </ul>

      <p className="text-gray-300 leading-relaxed mt-4 mb-6">
        These concerns are commonly handled through virtual urgent care because they tend to present with
        recognizable patterns that allow clinicians to determine whether a patient requires supportive care,
        an in-person evaluation, or further testing.
      </p>

      {/* ============================================= */}
      {/* SYMPTOM EXPLANATIONS */}
      {/* ============================================= */}
      <h3 className="text-primary-teal font-semibold text-2xl mt-12 mb-4">
        Common Symptoms Evaluated Through Telehealth
      </h3>

      <p className="text-gray-300 leading-relaxed mb-5">
        Florida patients frequently seek virtual urgent care for the following mild symptoms:
      </p>

      <ul className="list-disc ml-6 text-gray-300 space-y-2">
        <li>Burning urination or urinary frequency</li>
        <li>Sore throat, nasal congestion, or cough</li>
        <li>Eye redness or discharge (pink eye)</li>
        <li>Skin irritation, itching, or mild allergic reactions</li>
        <li>Nausea or stomach discomfort</li>
        <li>Mild shortness of breath related to allergies</li>
        <li>Mild ear pressure or “popping” sensation</li>
        <li>General fatigue or flu-like symptoms</li>
      </ul>

      <p className="text-gray-300 leading-relaxed mt-4 mb-8">
        These symptoms can often be evaluated safely through virtual visits when accompanied by a short
        patient history to rule out more serious causes.
      </p>

      {/* ============================================= */}
      {/* CONDITIONS NOT APPROPRIATE FOR TELEHEALTH */}
      {/* ============================================= */}
      <h3 className="text-primary-teal font-semibold text-2xl mt-12 mb-4 text-red-400">
        When Virtual Urgent Care Is Not Appropriate
      </h3>

      <p className="text-gray-300 leading-relaxed mb-5">
        Telehealth urgent care cannot evaluate life-threatening or rapidly worsening symptoms. Patients
        should visit an emergency room or call 911 for:
      </p>

      <ul className="list-disc ml-6 text-red-400 space-y-2">
        <li>Severe chest pain or difficulty breathing</li>
        <li>Signs of stroke (slurred speech, weakness, facial drooping)</li>
        <li>Severe abdominal pain or bleeding</li>
        <li>Head trauma or loss of consciousness</li>
        <li>Severe allergic reactions or swelling of the throat</li>
        <li>Uncontrolled vomiting or dehydration</li>
        <li>High fever that does not improve</li>
        <li>Any condition causing confusion, dizziness, or disorientation</li>
      </ul>

      <p className="text-gray-300 leading-relaxed mt-4 mb-6">
        Telehealth clinicians will direct patients to in-person care if symptoms exceed safe remote-evaluation thresholds.
      </p>

      {/* ============================================= */}
      {/* FLORIDA-SPECIFIC URGENT CARE CONTEXT */}
      {/* ============================================= */}
      <h3 className="text-primary-teal font-semibold text-2xl mt-12 mb-4">
        Florida-Specific Telehealth Urgent Care Information
      </h3>

      <p className="text-gray-300 leading-relaxed mb-5">
        Telehealth in Florida operates under Florida Statute §456.47, which authorizes Florida-licensed
        clinicians to evaluate patients virtually. This includes secure video or messaging-based assessments
        for mild, non-emergent symptoms.
      </p>

      <h4 className="text-primary-teal font-semibold text-xl mt-8 mb-3">
        Benefits for Florida Residents
      </h4>

      <ul className="list-disc ml-6 text-gray-300 space-y-2">
        <li>Statewide access from any Florida county</li>
        <li>Convenient for rural areas with fewer urgent care centers</li>
        <li>No commute or wait times</li>
        <li>Private evaluation for sensitive symptoms</li>
        <li>Extended hours depending on clinician availability</li>
      </ul>

      <h4 className="text-primary-teal font-semibold text-xl mt-8 mb-3">
        Common Florida Regions Using Telehealth
      </h4>

      <ul className="list-disc ml-6 text-gray-300 space-y-2">
        <li>South Florida: Miami-Dade, Broward, Palm Beach</li>
        <li>Central Florida: Orlando, Polk, Seminole</li>
        <li>Tampa Bay: Hillsborough, Pinellas, Pasco</li>
        <li>North Florida: Jacksonville, St. Johns, Alachua</li>
        <li>Panhandle: Escambia, Santa Rosa, Bay</li>
      </ul>

      {/* ============================================= */}
      {/* PHARMACY PICKUP & WHAT TO EXPECT */}
      {/* ============================================= */}
      <h3 className="text-primary-teal font-semibold text-2xl mt-12 mb-4">
        Pharmacy Pickup & What to Expect After a Virtual Visit
      </h3>

      <p className="text-gray-300 leading-relaxed mb-5">
        If a clinician determines that medications are appropriate, prescriptions may be electronically
        sent to most major Florida pharmacies, including:
      </p>

      <ul className="list-disc ml-6 text-gray-300 space-y-2">
        <li>Publix Pharmacy</li>
        <li>CVS</li>
        <li>Walgreens</li>
        <li>Walmart</li>
        <li>Local independent pharmacies</li>
      </ul>

      <p className="text-gray-300 leading-relaxed mt-4 mb-8">
        Pharmacy processing varies by location. Telehealth clinicians cannot guarantee medication availability
        or same-day pickup, but many patients experience quick processing depending on the pharmacy.
      </p>

      {/* ============================================= */}
      {/* PRIVACY & SECURITY */}
      {/* ============================================= */}
      <h3 className="text-primary-teal font-semibold text-2xl mt-12 mb-4">
        Privacy, Security & Confidentiality
      </h3>

      <p className="text-gray-300 leading-relaxed mb-5">
        All intake information, messages, and communication are encrypted and stored securely. Private health
        details are not shared externally without patient consent. Telehealth platforms use secured servers
        and meet common privacy standards for virtual care.
      </p>

      <p className="text-gray-400 italic text-center mt-10">
        *This educational content does not replace medical evaluation. Patients should seek emergency care when appropriate.*
      </p>

      {/************* END FULL LONG-FORM URGENT CARE CONTENT *************/}

    </div>
  </div>
</section>


</section>
</div>

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
