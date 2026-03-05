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
            className={`bg-primary-orange text-white px-8 py-3 rounded-lg transition-all text-sm font-bold shadow-lg shadow-orange-900/20 flex items-center gap-2 ${
              !isValidEmail(email) || isLoading 
               ? "opacity-50 cursor-not-allowed grayscale" 
                : "hover:bg-orange-600 animate-fast-pulse"
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

export default function VirtualUrgentCarePage() {
   const [showEmailForExpressBooking, setShowEmailForExpressBooking] = useState(true);
   const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
   const [showAllFaqs, setShowAllFaqs] = useState(false);
   const [showProviderBio, setShowProviderBio] = useState(false);
   const [showEducationalGuide, setShowEducationalGuide] = useState(false);
   const [showWhyChoose, setShowWhyChoose] = useState(false);
   const [showAboutClinician, setShowAboutClinician] = useState(false);
   const [showCoverageAreas, setShowCoverageAreas] = useState(false);
   
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

   const toggleFaq = (index: number) => {
     setExpandedFaq(expandedFaq === index ? null : index);
   };

   // FAQ data for Virtual Urgent Care
   const faqData = [
     {
       question: "What conditions can be treated via virtual urgent care?",
       answer: "Our virtual urgent care treats common conditions including UTIs, sinus infections, cold/flu symptoms, allergies, minor skin conditions, pink eye, ear infections, migraines, nausea, and more. If your condition requires in-person evaluation, we'll let you know and help guide you to appropriate care."
     },
     {
       question: "How quickly can I see a provider?",
       answer: "Most patients are connected with a licensed provider within minutes for instant visits. If you prefer to schedule an appointment, you can choose a time that works best for you."
     },
     {
       question: "What happens during a virtual urgent care visit?",
       answer: "You'll complete a brief intake form describing your symptoms and medical history. A licensed provider reviews your information, may ask follow-up questions via secure messaging or video, and determines the appropriate treatment plan."
     },
     {
       question: "Can prescriptions be sent to my pharmacy?",
       answer: "Yes, if our provider determines medication is appropriate for your condition, prescriptions can be sent electronically to your preferred pharmacy for same-day pickup in most cases."
     },
     {
       question: "Is virtual urgent care covered by insurance?",
       answer: "We offer affordable self-pay rates at $59 per visit. We also accept traditional insurance plans. Contact us for specific coverage questions."
     },
     {
       question: "What if my condition is too serious for telehealth?",
       answer: "Our providers are trained to recognize when in-person care is needed. If your symptoms suggest a condition requiring physical examination or emergency care, we'll advise you accordingly and help coordinate next steps."
     },
     {
       question: "Is my information kept private?",
       answer: "Absolutely. We are fully HIPAA compliant and use bank-level encryption to protect your health information. Your records are never shared without your consent."
     },
     {
       question: "Can I get a sick note or work excuse?",
       answer: "Yes, our providers can issue sick notes and work/school excuses as part of your visit when medically appropriate."
     },
     {
       question: "What states are your providers licensed in?",
       answer: "Our providers are licensed in multiple states including AL, AZ, CO, DE, FL, GA, ID, IL, MI, MS, NV, NM, ND, OH, OR, UT, VA, WA, and DC."
     },
     {
       question: "How do I prepare for my virtual visit?",
       answer: "Have your ID ready, know your current medications and allergies, and be in a private location with good internet connection. Have your pharmacy information handy if you may need a prescription."
     }
   ];

   // Coverage regions data
   const coverageRegions = [
     { name: "Southeast", states: ["Florida", "Georgia", "Alabama", "Mississippi"] },
     { name: "Midwest", states: ["Ohio", "Michigan", "Illinois", "North Dakota"] },
     { name: "Southwest", states: ["Arizona", "Colorado", "Nevada", "New Mexico", "Utah"] },
     { name: "Pacific Northwest", states: ["Oregon", "Washington"] },
     { name: "Mid-Atlantic", states: ["Delaware", "Virginia", "Washington DC"] },
     { name: "Mountain", states: ["Idaho", "Colorado", "Utah"] }
   ];

   // Why Choose reasons
   const whyChooseReasons = [
     { title: "No Waiting Rooms", description: "Skip the crowded urgent care. Get seen from home within minutes on your schedule." },
     { title: "Board-Certified Providers", description: "All our clinicians are licensed, board-certified healthcare professionals with years of experience." },
     { title: "Same-Day Prescriptions", description: "When medically appropriate, prescriptions are sent directly to your pharmacy for immediate pickup." },
     { title: "HIPAA Compliant & Secure", description: "Your health information is protected with enterprise-grade security and strict privacy protocols." },
     { title: "Transparent Pricing", description: "Know your cost upfront. $59 per visit with no hidden fees or surprise bills." },
     { title: "Follow-Up Support", description: "Questions after your visit? Our care team is available to help you through your recovery." }
   ];
   
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      <UrgentCollapse />
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-20 pb-12 md:px-4 px-2 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-primary-teal/10 blur-[120px] rounded-full -z-10" />
        
        <div className="border border-white/10 bg-card-bg/50 backdrop-blur-sm rounded-3xl md:p-8 py-8 px-2 max-w-3xl w-full shadow-2xl shadow-primary-teal/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-teal to-transparent opacity-50"></div>
            <p className="text-xs md:text-sm text-gray-400 mb-2 uppercase tracking-wider font-semibold">Virtual Urgent Care Services</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">
              Virtual Urgent Care — Online
            </h1>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm md:text-base">
              Get urgent medical care from licensed providers — prescriptions, sick notes, and treatment from the comfort of your home.
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
               Board-Certified Family Medicine · 10+ Years Experience · Private Practice
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
               Virtual Urgent Care Services
            </h2>
            <p className="text-gray-400 text-sm">
               No waiting rooms · No insurance required · Private & secure.
            </p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
               { 
                  title: "UTI/STD Treatment", 
                  subtitle: "Start in 5 Minutes", 
                  image: "/assets/service_uti.jpg",
                  href: "/private/uti-std/florida"
               },
               { 
                  title: "Cold / Flu / Sinus", 
                  subtitle: "Fast Relief", 
                  image: "/assets/service_cold_flu.jpg",
                  href: null
               },
               { 
                  title: "Allergies & Skin", 
                  subtitle: "Same-Day Treatment", 
                  image: "/assets/service_anxiety.jpg",
                  href: null
               },
               { 
                  title: "Migraines & Pain", 
                  subtitle: "Provider Guided", 
                  image: "/assets/service_weight.jpg",
                  href: null
               },
               { 
                  title: "Ear & Eye Infections", 
                  subtitle: "Quick Diagnosis", 
                  image: "/assets/service_adhd.jpg",
                  href: null
               },
               { 
                  title: "General Urgent Care", 
                  subtitle: "All Common Conditions", 
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
            >
               Book My Appointment <Calendar size={18} />
            </button>}
         </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-transparent">
         <h2 className="text-2xl font-bold text-center text-primary-teal mb-12">How Virtual Urgent Care Works</h2>
         
         <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary-teal/30 to-transparent -z-10"></div>

            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-black border border-primary-teal/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)]">
                  <Image src="/assets/download_(3).svg" alt="Step 1" width={24} height={24} className="text-primary-teal" />
               </div>
               <h3 className="font-bold mb-2 text-white text-sm">Describe Your Symptoms</h3>
               <p className="text-xs text-gray-400 max-w-[200px]">Tell us what's bothering you — our secure intake takes just 2 minutes.</p>
            </div>
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-black border border-primary-teal/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)]">
                  <Image src="/assets/download_(2).svg" alt="Step 2" width={24} height={24} />
               </div>
               <h3 className="font-bold mb-2 text-white text-sm">Provider Reviews Your Case</h3>
               <p className="text-xs text-gray-400 max-w-[200px]">A licensed clinician reviews your symptoms, history, and determines the best care plan.</p>
            </div>
            <div className="flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-black border border-primary-teal/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)]">
                  <Image src="/assets/download_(1).svg" alt="Step 3" width={24} height={24} />
               </div>
               <h3 className="font-bold mb-2 text-white text-sm">Get Treatment & Prescriptions</h3>
               <p className="text-xs text-gray-400 max-w-[200px]">Receive your treatment plan — prescriptions sent to your local pharmacy for same-day pickup.</p>
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
                  <p className="text-primary-teal mb-6 text-sm font-medium">Schedule for Later</p>
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

      {/* FAQ Section */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
         <h2 className="text-2xl font-bold text-center text-primary-teal mb-4">Virtual Urgent Care FAQ</h2>
         <p className="text-center text-gray-400 text-xs mb-8 max-w-lg mx-auto">
            Common questions about our virtual urgent care services.
         </p>

         <div className="space-y-2">
            {faqData.map((faq, idx) => {
              if (!showAllFaqs && idx >= 6) return null;
              return (
                <div key={idx} className={`border-b border-white/5 py-4 cursor-pointer hover:bg-white/5 px-2 rounded transition-colors`}>
                   <button 
                     onClick={() => toggleFaq(idx)}
                     className="w-full flex justify-between items-center text-left"
                   >
                     <span className="text-primary-teal font-medium text-sm hover:text-white transition-colors">{faq.question}</span>
                     <ChevronRight size={16} className={`text-primary-teal transition-transform ${expandedFaq === idx ? 'rotate-90' : ''}`} />
                   </button>
                   <div className={`overflow-hidden transition-all duration-300 ${expandedFaq === idx ? 'max-h-[300px] mt-3' : 'max-h-0'}`}>
                     <p className="text-gray-400 text-sm leading-relaxed">{faq.answer}</p>
                   </div>
                </div>
              );
            })}
         </div>

         {faqData.length > 6 && (
           <div className="text-center mt-6">
             <button 
               onClick={() => setShowAllFaqs(!showAllFaqs)}
               className="bg-primary-teal/20 border border-primary-teal/50 text-primary-teal font-bold py-2 px-6 rounded-lg cursor-pointer transition-all hover:bg-primary-teal/30"
             >
               {showAllFaqs ? 'See Less' : 'See More FAQs'}
             </button>
           </div>
         )}
         
         <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all whitespace-nowrap"
            >
               Start Your Visit Now <ArrowRight size={16} />
            </button>
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
               Book for Later <ArrowRight size={16} />
            </button>
         </div>
      </section>

      {/* ===== PROVIDER E-E-A-T SECTION (Collapsible) ===== */}
      <section className="py-16 px-4 bg-[#11161c] border-y border-white/5">
        <div className="max-w-4xl mx-auto bg-black/30 border border-white/10 backdrop-blur-sm rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-primary-teal mb-6">About Our Provider</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowProviderBio(!showProviderBio)}
              className="bg-primary-teal/20 border border-primary-teal/50 text-primary-teal font-bold py-2 px-6 rounded-lg cursor-pointer transition-all hover:bg-primary-teal/30"
            >
              {showProviderBio ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showProviderBio ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <div className="max-w-3xl mx-auto text-left leading-relaxed text-sm">
              <p className="mb-6 text-gray-300">
                This section provides general educational background about the licensed clinician who reviews symptoms submitted by adults during private virtual urgent care visits.
              </p>
              
              <h3 className="text-primary-teal text-lg font-semibold mb-3">LaMonica A. Hodges, MSN, APRN, FNP-C</h3>
              <p className="mb-5 text-gray-300">
                LaMonica A. Hodges is a board-certified Family Nurse Practitioner with over 10 years of clinical experience spanning family medicine, urgent care, and telehealth. She earned her Master of Science in Nursing from an accredited program and maintains active licensure across 19 states. Her approach to patient care emphasizes thorough evaluation, clear communication, and patient-centered treatment planning.
              </p>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Education & Credentials</h4>
              <ul className="ml-5 leading-relaxed text-gray-300 list-disc">
                <li>Master of Science in Nursing (MSN)</li>
                <li>Board Certified Family Nurse Practitioner (FNP-C)</li>
                <li>Advanced Practice Registered Nurse (APRN)</li>
                <li>Licensed in 19+ States</li>
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Clinical Focus Areas</h4>
              <ul className="ml-5 leading-relaxed text-gray-300 list-disc">
                <li>Acute Illness Evaluation (Cold, Flu, Sinus, UTI)</li>
                <li>Chronic Condition Management</li>
                <li>Preventive Health & Wellness</li>
                <li>Women's & Men's Health</li>
                <li>Telehealth & Virtual Care</li>
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Approach to Telehealth</h4>
              <p className="leading-relaxed text-gray-300">
                Virtual urgent care allows patients to receive timely medical evaluation without the delays and exposure risks of traditional urgent care settings. Our provider uses evidence-based protocols to assess symptoms, determine appropriate treatment, and identify when in-person care is necessary.
              </p>
              
              <p className="text-primary-teal font-semibold mt-6 text-center border-t border-white/10 pt-6">
                *This section is for general educational purposes and does not replace medical evaluation.*
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== EDUCATIONAL GUIDE SECTION ===== */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-black/30 border border-white/10 backdrop-blur-sm rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-primary-teal mb-4">Educational Guide: Understanding Virtual Urgent Care</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowEducationalGuide(!showEducationalGuide)}
              className="bg-primary-teal/20 border border-primary-teal/50 text-primary-teal font-bold py-2 px-6 rounded-lg cursor-pointer transition-all hover:bg-primary-teal/30"
            >
              {showEducationalGuide ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showEducationalGuide ? 'max-h-[10000px]' : 'max-h-0'}`}>
            <div className="text-gray-300 text-sm leading-relaxed">
              <p className="mb-6">
                This educational guide explains common urgent care conditions that can be evaluated virtually, what typically happens during a telehealth visit, when in-person care may be recommended, and how licensed clinicians review your concerns. This information is not a diagnosis or treatment plan; it is meant to help patients understand the telehealth process and when online care may be appropriate.
              </p>
              
              {/* Crawlable keyword index */}
              <div className="text-center mb-8 text-gray-500 text-xs">
                <span className="inline-block mx-2">UTI</span>
                <span className="inline-block mx-2">Urinary discomfort</span>
                <span className="inline-block mx-2">Cold symptoms</span>
                <span className="inline-block mx-2">Flu symptoms</span>
                <span className="inline-block mx-2">Sinus infection</span>
                <span className="inline-block mx-2">Allergies</span>
                <span className="inline-block mx-2">Pink eye</span>
                <span className="inline-block mx-2">Ear infection</span>
                <span className="inline-block mx-2">Migraine</span>
                <span className="inline-block mx-2">Nausea</span>
                <span className="inline-block mx-2">Skin rash</span>
                <span className="inline-block mx-2">Medication refill</span>
                <span className="inline-block mx-2">Sick note</span>
                <span className="inline-block mx-2">Work excuse</span>
              </div>

              {/* Common Conditions */}
              <h3 className="text-primary-teal text-lg font-semibold mb-3 mt-6">What Is Virtual Urgent Care?</h3>
              <p className="mb-4">
                Virtual urgent care provides on-demand access to licensed healthcare providers for non-emergency medical conditions. Through secure video or messaging, patients can receive evaluation, diagnosis, treatment plans, and prescriptions without visiting a physical urgent care facility. This model is ideal for common conditions that don't require physical examination or lab tests.
              </p>

              <h4 className="text-white font-semibold mt-5 mb-2">Conditions Commonly Treated via Virtual Urgent Care</h4>
              <ul className="ml-5 list-disc mb-4">
                <li>Urinary Tract Infections (UTIs)</li>
                <li>Upper Respiratory Infections (Cold, Flu, Sinus)</li>
                <li>Allergies and Allergic Reactions (mild)</li>
                <li>Skin Conditions (Rashes, Minor Infections)</li>
                <li>Pink Eye (Conjunctivitis)</li>
                <li>Ear Infections</li>
                <li>Migraines and Headaches</li>
                <li>Nausea and Digestive Issues</li>
                <li>Minor Injuries (Sprains, Strains)</li>
                <li>Medication Refills</li>
              </ul>

              {/* How Telehealth Works */}
              <h3 className="text-primary-teal text-lg font-semibold mb-3 mt-8">How Virtual Urgent Care Works</h3>
              <p className="mb-4">
                Licensed clinicians evaluate symptoms submitted through our secure intake. They may ask questions about timing, severity, allergies, previous conditions, and medication history. Based on this information, the clinician decides whether telehealth is appropriate or whether in-person care is recommended.
              </p>

              <h4 className="text-white font-semibold mt-5 mb-2">What Clinicians Commonly Review</h4>
              <ul className="ml-5 list-disc mb-4">
                <li>Duration and progression of symptoms</li>
                <li>Severity and impact on daily activities</li>
                <li>Allergy and medication history</li>
                <li>Current medications and supplements</li>
                <li>Previous conditions or surgeries</li>
                <li>Pregnancy status (when applicable)</li>
                <li>Recent travel or exposures</li>
              </ul>

              <h4 className="text-white font-semibold mt-5 mb-2">Treatment Expectations</h4>
              <p className="mb-4">
                If a clinician determines that treatment is suitable, they may electronically send medication to your preferred pharmacy. Medication choices depend on allergies, symptoms, medication history, and clinical judgment. You'll receive clear instructions for your treatment plan and follow-up guidance.
              </p>

              {/* When Telehealth Is Not Appropriate */}
              <h3 className="text-primary-teal text-lg font-semibold mb-3 mt-8">When Virtual Care May Not Be Appropriate</h3>
              <p className="mb-4">
                Some symptoms require in-person evaluation. Our clinicians may redirect patients to in-person care if symptoms fall outside the scope of remote evaluation.
              </p>

              <ul className="ml-5 list-disc mb-4">
                <li>High fever (over 103°F)</li>
                <li>Severe abdominal or chest pain</li>
                <li>Difficulty breathing</li>
                <li>Signs of stroke or heart attack</li>
                <li>Severe allergic reactions (anaphylaxis)</li>
                <li>Deep wounds requiring stitches</li>
                <li>Broken bones or severe injuries</li>
                <li>Pregnancy complications</li>
              </ul>

              <p className="mb-4 text-yellow-400/80">
                If you are experiencing a medical emergency, please call 911 or visit your nearest emergency room immediately.
              </p>

              {/* Benefits */}
              <h3 className="text-primary-teal text-lg font-semibold mb-3 mt-8">Benefits of Virtual Urgent Care</h3>
              <ul className="ml-5 list-disc mb-4">
                <li><strong>Convenience:</strong> Get care from home, work, or anywhere with internet access</li>
                <li><strong>Speed:</strong> Skip the waiting room — most visits completed in under 30 minutes</li>
                <li><strong>Privacy:</strong> Confidential visits without exposure to other sick patients</li>
                <li><strong>Accessibility:</strong> Available evenings and weekends when your doctor's office is closed</li>
                <li><strong>Cost-effective:</strong> Often lower cost than urgent care or ER visits</li>
              </ul>

              {/* Related Services */}
              <h3 className="text-primary-teal text-lg font-semibold mb-3 mt-8">Related Services</h3>
              <ul className="ml-5 list-disc mb-4">
                <li><a href="/private/uti-std/florida" className="text-primary-teal hover:underline">UTI/STD Treatment</a></li>
                <li><a href="#" className="text-primary-teal hover:underline">Cold & Flu Treatment</a></li>
                <li><a href="#" className="text-primary-teal hover:underline">Sinus Infection Treatment</a></li>
                <li><a href="#" className="text-primary-teal hover:underline">Allergy Treatment</a></li>
                <li><a href="#" className="text-primary-teal hover:underline">Medication Refills</a></li>
                <li><a href="#" className="text-primary-teal hover:underline">Sick Notes & Work Excuses</a></li>
              </ul>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button 
                  onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all"
                >
                  Start Your Visit Now <ArrowRight size={16} />
                </button>
                <button 
                  onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all"
                >
                  Book for Later <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE SECTION ===== */}
      <section className="py-16 px-4 bg-[#11161c] border-y border-white/5">
        <div className="max-w-4xl mx-auto bg-black/30 border border-white/10 backdrop-blur-sm rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-primary-teal mb-6">Why Choose Medazon Virtual Urgent Care</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowWhyChoose(!showWhyChoose)}
              className="bg-primary-teal/20 border border-primary-teal/50 text-primary-teal font-bold py-2 px-6 rounded-lg cursor-pointer transition-all hover:bg-primary-teal/30"
            >
              {showWhyChoose ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showWhyChoose ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-gray-300 text-sm leading-relaxed text-center max-w-2xl mx-auto mb-8">
              We built Medazon Health to provide fast, private, high-quality medical care without the hassle of traditional urgent care. Here's what sets us apart.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {whyChooseReasons.map((reason, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-primary-teal text-base font-semibold mb-2">{reason.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{reason.description}</p>
                </div>
              ))}
            </div>
            
            <p className="text-primary-teal font-semibold mt-8 text-center text-sm">*This information is for general educational purposes.*</p>
          </div>
        </div>
      </section>

      {/* ===== COVERAGE AREAS SECTION ===== */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto bg-black/30 border border-white/10 backdrop-blur-sm rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-primary-teal mb-6">Coverage Areas</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowCoverageAreas(!showCoverageAreas)}
              className="bg-primary-teal/20 border border-primary-teal/50 text-primary-teal font-bold py-2 px-6 rounded-lg cursor-pointer transition-all hover:bg-primary-teal/30"
            >
              {showCoverageAreas ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showCoverageAreas ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-gray-300 text-sm leading-relaxed text-center max-w-2xl mx-auto mb-8">
              Our providers are licensed to practice telehealth across multiple states. Virtual urgent care is available to residents in the following regions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {coverageRegions.map((region, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <h3 className="text-primary-teal text-base font-semibold mb-3">{region.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {region.states.map((state, sIdx) => (
                      <span key={sIdx}>{state}{sIdx < region.states.length - 1 && <br />}</span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Availability Note */}
            <div className="text-center">
              <h3 className="text-primary-teal text-lg mb-3">Telehealth Availability</h3>
              <p className="max-w-2xl mx-auto text-gray-400 text-sm leading-relaxed">
                Virtual urgent care is available 7 days a week. Prescriptions can be sent to any pharmacy in states where our providers are licensed. New states are added regularly — check back or contact us if your state isn't listed.
              </p>
            </div>
            
            <p className="text-primary-teal font-semibold mt-8 text-center text-sm">*This section is for general educational and informational use.*</p>
          </div>
        </div>
      </section>

      {/* ===== ABOUT CLINICIAN SECTION ===== */}
      <section className="py-16 px-4 bg-[#11161c] border-y border-white/5">
        <div className="max-w-4xl mx-auto bg-black/30 border border-white/10 backdrop-blur-sm rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-primary-teal mb-6">About Our Clinician</h2>
          
          {/* See More Button */}
          <div className="text-center mb-5">
            <button 
              onClick={() => setShowAboutClinician(!showAboutClinician)}
              className="bg-primary-teal/20 border border-primary-teal/50 text-primary-teal font-bold py-2 px-6 rounded-lg cursor-pointer transition-all hover:bg-primary-teal/30"
            >
              {showAboutClinician ? 'See Less' : 'See More'}
            </button>
          </div>
          
          {/* Collapsible Content */}
          <div className={`overflow-hidden transition-all duration-[450ms] ${showAboutClinician ? 'max-h-[3000px]' : 'max-h-0'}`}>
            <p className="text-gray-300 text-sm leading-relaxed text-center max-w-2xl mx-auto mb-8">
              This section provides general educational background about the licensed clinician who reviews symptoms submitted by adults during private virtual urgent care visits.
            </p>
            
            <div className="max-w-2xl mx-auto text-left leading-relaxed text-sm">
              <h3 className="text-primary-teal text-lg font-semibold mb-3">
                LaMonica A. Hodges, MSN, APRN, FNP-C
              </h3>
              <p className="mb-5 text-gray-300">
                LaMonica brings over a decade of clinical experience to Medazon Health's virtual urgent care platform. Her background spans emergency medicine, primary care, and telehealth, giving her a comprehensive understanding of when virtual care is appropriate and when patients should seek in-person evaluation. She is committed to providing thorough, compassionate care to every patient.
              </p>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Education & Training</h4>
              <ul className="ml-5 leading-relaxed text-gray-300 list-disc">
                <li>Master of Science in Nursing from accredited program</li>
                <li>National Board Certification in Family Medicine</li>
                <li>Advanced training in telehealth delivery</li>
                <li>Ongoing continuing education in urgent care protocols</li>
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Areas of Focus</h4>
              <ul className="ml-5 leading-relaxed text-gray-300 list-disc">
                <li>Acute illness evaluation and treatment</li>
                <li>Infection management (UTI, URI, skin)</li>
                <li>Chronic disease management</li>
                <li>Preventive health counseling</li>
                <li>Patient education and empowerment</li>
              </ul>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Telehealth Philosophy</h4>
              <p className="mb-4 text-gray-300">
                "Virtual care should never feel impersonal. I take the time to understand each patient's unique situation, explain my clinical reasoning, and ensure they feel confident in their treatment plan. Technology allows us to provide excellent care more conveniently — but the human connection remains at the heart of medicine."
              </p>
              
              <h4 className="text-white font-semibold mt-5 mb-2">Patient Safety Commitment</h4>
              <p className="mb-4 text-gray-300">
                Patient safety is paramount. Our provider follows evidence-based guidelines and maintains clear protocols for when to recommend in-person evaluation. Every visit includes appropriate safety netting and clear instructions for when to seek emergency care.
              </p>
              
              <p className="text-primary-teal font-semibold mt-6 text-center border-t border-white/10 pt-6">
                *This section is for general educational purposes and does not replace medical evaluation.*
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary-teal mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8 text-sm">
            Skip the waiting room. Get the care you need from the comfort of home.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="bg-primary-teal text-black px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-400 transition-all whitespace-nowrap"
            >
               Start Your Visit Now <ArrowRight size={16} />
            </button>
            <button 
               onClick={() => document.getElementById('symptoms-section')?.scrollIntoView({ behavior: 'smooth' })}
               className="border border-white/20 text-white px-8 py-3 rounded-lg hover:bg-white/5 text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
               Book for Later <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-500 text-xs bg-black">
         <h3 className="text-lg font-bold text-white mb-1">Medazon Health</h3>
         <p className="mb-6 text-[10px] uppercase tracking-widest text-primary-teal">Virtual Urgent Care · Secure · Convenient · Private</p>
         
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
         
         {/* SEO Footer */}
         <p className="text-gray-600 text-[10px] max-w-2xl mx-auto leading-relaxed mb-4">
           Medazon Health offers private virtual urgent care services for residents across 19 states. Get treatment for UTIs, cold/flu, sinus infections, allergies, migraines, and more with same-day telehealth appointments and prescriptions.
         </p>
         
         <p className="text-[10px] text-gray-600">© 2024 Medazon Health. All rights reserved. <br/> Medazon Health is a private telehealth service.</p>
      </footer>

    </div>
  );
}
