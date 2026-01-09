"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";
import UrgentCollapse from "@/components/home/UrgentCollapse";

function SubmitEmailForExpressBooking({ show, focus = false }: { show: boolean, focus: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      // Small delay ensures DOM is painted (prevents race conditions)
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [show]);

  const isValidEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(trimmed);
  };

  const handleEmailSubmission = async () => {
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address to continue.");
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

      // Save email check response to sessionStorage
      sessionStorage.setItem('emailCheckResponse', JSON.stringify({
          email: email.trim(),
        exists: result.exists,
        user: result.user,
          patientId: result.patientId,
      }));

      // Navigate to appointment page
      router.push('/appointment');
    } catch (error) {
      console.error('Error checking user:', error);
      alert(error instanceof Error ? error.message : 'Failed to process request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      // <div className="bg-[#050b14] p-3 md:p-8 rounded-2xl border border-white/10 shadow-2xl relative w-full">
    <div className="mt-10">
      <style jsx>{`
        @keyframes fastPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .animate-fast-pulse {
          animation: fastPulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="mt-1 md:mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <input 
            ref={focus ? inputRef : null}
            type="email" 
            value={email}
            placeholder="your.email@example.com"
            autoComplete="email"
            className={`w-full bg-[#11161c] border rounded-lg py-4 px-4 text-white placeholder:text-gray-600 focus:outline-none transition-all text-[16px] ${
              isValidEmail(email)
                ? "border-primary-teal focus:ring-1 focus:ring-primary-teal"
                : "border-primary-orange animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"
            }`}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
            if (e.key === "Enter" && isValidEmail(email) && !isLoading) {
              handleEmailSubmission();
              }
            }}
          />
        <div className="flex justify-center gap-4 mt-4 md:mt-6 animate-in fade-in-from-top-2 duration-300">
          <button 
            onClick={handleEmailSubmission}
            disabled={!isValidEmail(email) || isLoading}
            suppressHydrationWarning
            className={`text-white px-8 py-3 rounded-lg transition-all text-sm font-bold shadow-lg flex items-center gap-2 ${
              !isValidEmail(email)
               ? "bg-primary-orange cursor-not-allowed opacity-75" 
                : isLoading
                ? "bg-primary-teal cursor-not-allowed opacity-75"
                : "bg-primary-teal hover:bg-primary-teal/90 animate-fast-pulse shadow-primary-teal/20"
            }`}
         >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Check Availability
                <ArrowRight size={18} />
              </>
            )}
         </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
   const [showEmailForExpressBooking, setShowEmailForExpressBooking] = useState(true);
   
   // Scroll to top on page load and prevent hash scrolling
   useEffect(() => {
     // Remove hash from URL if present
     if (window.location.hash) {
       window.history.replaceState(null, '', window.location.pathname);
     }
     
     // Scroll to top immediately
     window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
     
     // Prevent scroll only once after a delay, to avoid interfering with focus
     const timer = setTimeout(() => {
       // Only prevent scroll if we're at the top (not if user scrolled)
       if (window.scrollY > 10) {
         window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
       }
     }, 50);
     
     return () => clearTimeout(timer);
   }, []);
   
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      <UrgentCollapse />
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-20 pb-12 md:px-4 px-2 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary-teal/10 blur-[120px] rounded-full -z-10" />
        
        <div className="border border-white/10 bg-card-bg/50 backdrop-blur-sm rounded-3xl md:p-8 py-8 px-2 max-w-3xl w-full shadow-2xl shadow-primary-teal/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-teal to-transparent opacity-50"></div>
            <p className="text-xs md:text-sm text-gray-400 mb-2 uppercase tracking-wider font-semibold">Online Telehealth Services</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">
              Instant Private Medical Visits
            </h1>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm md:text-base">
              Get medical advice, prescriptions, and sick notes from the comfort of your home.
            </p>
            {showEmailForExpressBooking && <h2 className="text-xl md:text-4xl font-bold text-primary-teal mb-2">
              <span className="text-white">Medazon Health</span> Express Booking
           </h2>}
            {showEmailForExpressBooking && <div className="mb-2 md:mb-4 w-full"><SubmitEmailForExpressBooking show={showEmailForExpressBooking} focus={true} /></div>}
            {!showEmailForExpressBooking && <div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button 
                  onClick={() => setShowEmailForExpressBooking(true)}
                className="bg-primary-orange hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
                suppressHydrationWarning
              >
                Book My Appointment <Calendar size={18} />
              </button>
            </div>

            <div className="text-xs text-primary-teal mb-6">
               $59 per visit — Traditional Insurances Accepted
            </div>
            </div>}
            
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
                  image: "/assets/service_uti.jpg",
                  href: "/private/uti-std/florida"
               },
               { 
                  title: "Cold / Flu", 
                  subtitle: "Fast Relief", 
                  image: "/assets/service_cold_flu.jpg",
                  href: null
               },
               { 
                  title: "Anxiety / Depression", 
                  subtitle: "Private Care", 
                  image: "/assets/service_anxiety.jpg",
                  href: null
               },
               { 
                  title: "Weight Care/Injections", 
                  subtitle: "Clinician Guided", 
                  image: "/assets/service_weight.jpg",
                  href: null
               },
               { 
                  title: "ADHD Initial /Follow-Up", 
                  subtitle: "Same Provider", 
                  image: "/assets/service_adhd.jpg",
                  href: null
               },
               { 
                  title: "Men / Women's Health", 
                  subtitle: "Dermatology", 
                  image: "/assets/service_general.jpg",
                  href: null
               },
            ].map((service, index) => {
               const content = (
                  <>
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
                  </>
               );
               
               return service.href ? (
                  <Link 
                     key={index} 
                     href={service.href}
                     className="relative h-48 rounded-2xl overflow-hidden border border-white/20 group cursor-pointer block"
                  >
                     {content}
                  </Link>
               ) : (
                  <div 
                     key={index} 
                     className="relative h-48 rounded-2xl overflow-hidden border border-white/20 group cursor-pointer"
                     onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                     {content}
               </div>
               );
            })}
         </div>
      </section>

      {/* Symptoms Input Section */}
      <section id="symptoms-section" className="bg-[#11161c] py-6 md:py-20 border-y border-white/5">
         <div className="container mx-auto px-4 text-center max-w-4xl flex flex-col items-center justify-center">
           <h2 className="text-xl md:text-4xl font-bold text-primary-teal mb-2">
              <span className="text-white">Medazon Health</span> Express Booking
           </h2>
           {showEmailForExpressBooking && <div className="mb-2 md:mb-4 w-full"><SubmitEmailForExpressBooking show={showEmailForExpressBooking} focus={false} /></div>}
           
            {!showEmailForExpressBooking && <button 
               onClick={() => setShowEmailForExpressBooking(true)}
               className="bg-primary-orange hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm"
               suppressHydrationWarning
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
                  <Link 
                     href="/instant-visit"
                     className="bg-primary-teal text-black px-8 py-2.5 rounded-full font-bold hover:bg-white transition-colors text-sm inline-block"
                  >
                     Talk to a Doctor Now →
                  </Link>
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
                     suppressHydrationWarning
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
            <Link 
               href="/instant-visit"
               className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all whitespace-nowrap"
            >
               Talk to a Doctor Now <ArrowRight size={16} />
            </Link>
            <button 
               className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
               suppressHydrationWarning
            >
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
            <Link 
               href="/instant-visit"
               className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all whitespace-nowrap"
            >
               Talk to a Doctor Now <ArrowRight size={16} />
            </Link>
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
               suppressHydrationWarning
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
