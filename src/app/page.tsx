"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

function SymptomSearch() {
  const router = useRouter();
  const [symptom, setSymptom] = useState("");
  const [patientOwnWords, setPatientOwnWords] = useState("");
  const [email, setEmail] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPatientWordsSection, setShowPatientWordsSection] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);

  // Show patient's own words section when symptom is entered
  const handleSymptomChange = (value: string) => {
    setSymptom(value);
    setShowDropdown(value.length > 0);
    setShowPatientWordsSection(value.trim().length > 0);
  };

  // Handle suggestion selection - just set the text, don't navigate
  const handleSuggestionClick = (suggestion: string) => {
    setSymptom(suggestion);
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
               if (symptom.length > 0) setShowDropdown(true);
            }}
            onBlur={() => {
               // Delay hiding dropdown to allow clicks
               setTimeout(() => setShowDropdown(false), 200);
            }}
         />
         
         {/* Auto-suggestion Dropdown */}
         {showDropdown && (
           <div className="absolute top-full left-0 w-full bg-[#0d1218] border border-primary-teal/30 rounded-b-lg shadow-2xl z-50 overflow-hidden mt-1">
              {[
                 "Anxiety / Depression",
                 "ADHD Evaluation / Focus Issues",
                 "Gastroenteritis / Food Poisoning",
                 "Rash / Allergic Reaction",
                 "Migraine / Headache",
                 "Abdominal Pain / Indigestion",
                 "Back Pain / Muscle Strain",
                 "Private / Sensitive Concern"
              ].filter(s => s.toLowerCase().includes(symptom.toLowerCase())).map((s) => (
                 <div 
                    key={s}
                    className="px-4 py-3 text-white hover:bg-primary-teal hover:text-black cursor-pointer text-left border-b border-white/5 last:border-0 transition-colors font-medium"
                    onMouseDown={(e) => {
                       // Prevent blur event
                       e.preventDefault();
                    }}
                    onClick={() => handleSuggestionClick(s)}
                 >
                    {s}
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
