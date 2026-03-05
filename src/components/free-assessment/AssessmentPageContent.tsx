"use client";

import { useState } from "react";
import StateGate, { StateBadge } from "@/components/free-assessment/StateGate";
import ChatWidget from "@/components/free-assessment/ChatWidget";
import BetterThanGoogling from "@/components/free-assessment/BetterThanGoogling";
import { 
  FAQFold, PrivacyFold, ProviderFold, CitiesFold, WhyUsFold, 
  AvailabilityFold, CoverageFold, AboutClinicianFold, ZipCodesFold 
} from "@/components/free-assessment/InfoFolds";
import { 
  ArrowRight, Clock, Video, UserCheck, Zap, Lightbulb, Heart, 
  BarChart2, Shield, Image as ImageIcon, MessageCircle, Check, Lock, Users, RotateCcw,RefreshCw
} from "lucide-react";
import Link from "next/link";
import { CONDITIONS_LIST, EXPANDED_CONDITIONS } from "@/lib/assessment-data";

const getPillColorClass = (color: string) => {
  const map: Record<string, string> = {
    red: 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20 hover:border-red-400/50',
    teal: 'bg-teal-500/10 border-teal-500/30 text-teal-300 hover:bg-teal-500/20 hover:border-teal-400/50',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/50',
    indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-400/50',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400/50',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 hover:border-yellow-400/50',
    pink: 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20 hover:border-pink-400/50',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400/50',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400/50',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/50',
    green: 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-400/50',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400/50',
  };
  return map[color] || map['teal'];
};

export default function AssessmentPageContent() {
  const [heroInput, setHeroInput] = useState("");
  const [showMore, setShowMore] = useState(false);

  const handleStart = () => {
    if (!heroInput.trim()) return;
    window.dispatchEvent(new CustomEvent('medazon-start-chat', { detail: heroInput }));
  };

  const handleConditionClick = (condition: string) => {
    window.dispatchEvent(new CustomEvent('medazon-start-chat', { detail: condition }));
  };

  const scrollToInput = () => {
    const el = document.getElementById('symptom-input');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
    }
  };

  return (
    <main className="min-h-screen bg-[#040807] text-white font-sans selection:bg-teal-500/30">
      <StateGate />
      <ChatWidget />

      {/* Top Bar */}
      <div className="bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-orange-500/20 border-b border-orange-500/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
             <span className="bg-orange-500/20 border border-orange-500/40 rounded-full px-3 py-1 text-xs font-semibold text-orange-400">RETURNING PATIENT?</span>
             <span className="text-sm text-gray-300">Skip the assessment & book directly</span>
          </div>
         
            <Link href="/appointment/follow-up" className="bg-orange-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-orange-400 transition-all flex items-center gap-2">
            <RefreshCw size={20} className="stroke-[2.5]" /> Returning? Book Follow-Up
            </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.15),transparent_60%)]" />
        
        <div className="max-w-5xl mx-auto relative z-10 text-center">
           <div className="mb-4 flex flex-col items-center justify-center gap-3">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 font-bold">M</div>
                <span className="text-xl font-bold">Medazon<span className="text-teal-400">Health</span></span>
             </div>
             <StateBadge />
           </div>

           <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight font-serif mt-6">
             Free Health Assessment
             <span className="block text-teal-400 mt-2" style={{ textShadow: '0 0 30px rgba(20,184,166,0.4)' }}>That Actually Listens</span>
           </h1>

           {/* Hero Card 1 */}
           <div className="relative max-w-4xl mx-auto mt-10 mb-8">
              <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/20 to-teal-500/5 rounded-[35px] blur-lg opacity-60" />
              <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-8 md:p-12 shadow-2xl">
                 <h2 className="text-2xl md:text-4xl font-bold mb-4 font-serif">
                   From Symptoms to Treatment <span className="text-teal-400">in 2 Minutes</span>
                 </h2>
                 <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                   Unlike other symptom checkers that just tell you to "see a doctor," we connect you directly to licensed providers who can diagnose, treat, and prescribe – all the same day.
                 </p>

                 <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                    <button 
                      onClick={scrollToInput}
                      className="bg-teal-500 text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-teal-400 transition-all flex items-center gap-2"
                    >
                      Start Free Assessment <ArrowRight size={20} />
                    </button>
                  
                <Link href="/appointment/follow-up" className="bg-orange-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-orange-400 transition-all flex items-center gap-2">
                <RefreshCw size={20} className="stroke-[2.5]" /> Returning? Book Follow-Up
                </Link>
                 </div>

                 <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-gray-400 font-medium">
                    <span className="flex items-center gap-2"><Check size={16} className="text-teal-400" /> No insurance needed</span>
                    <span className="flex items-center gap-2"><Check size={16} className="text-teal-400" /> Same-day treatment</span>
                    <span className="flex items-center gap-2"><Check size={16} className="text-teal-400" /> Prescriptions sent to pharmacy</span>
                 </div>
              </div>
           </div>

           {/* Steps */}
           <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 text-sm text-gray-400 mb-8">
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/5">
                 <span className="w-5 h-5 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                 Chat symptoms
              </div>
              <span className="text-gray-600 hidden md:block">›</span>
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/5">
                 <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                 Get personalized guidance
              </div>
              <span className="text-gray-600 hidden md:block">›</span>
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/5">
                 <span className="w-5 h-5 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                 Get treated if needed
              </div>
           </div>

           {/* Hero Card 2 */}
           <div className="relative max-w-4xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/20 to-teal-500/5 rounded-[35px] blur-lg opacity-60" />
              
              <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-6 md:p-10 shadow-2xl">
                 <div className="text-left mb-2 pl-1 text-sm text-gray-400">What's bothering you today?</div>
                 
                 <div className="flex gap-3 mb-8">
                    <input 
                      id="symptom-input"
                      type="text"
                      value={heroInput}
                      onChange={(e) => setHeroInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                      placeholder="Describe your symptoms in your own words..."
                      className="flex-1 bg-teal-500/10 border-2 border-teal-500/50 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:bg-teal-500/15 transition-all text-base"
                    />
                    <button 
                      onClick={handleStart}
                      className="bg-orange-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-orange-400 transition-all flex items-center gap-2"
                    >
                      Start <ArrowRight size={18} />
                    </button>
                 </div>

                 <div className="text-gray-500 text-sm mb-6">Or select what you're experiencing:</div>

                 {/* 8-GRID */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <button onClick={() => handleConditionClick('uti')} className="group flex flex-col items-center justify-center gap-2 bg-red-500/10 hover:bg-white/5 border border-red-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Zap className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">UTI Symptoms</div>
                        <div className="text-[10px] text-gray-500 mt-1">Burning, frequent urination</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('adhd')} className="group flex flex-col items-center justify-center gap-2 bg-indigo-500/10 hover:bg-white/5 border border-indigo-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Lightbulb className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">ADHD</div>
                        <div className="text-[10px] text-gray-500 mt-1">Focus, attention</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('anxiety')} className="group flex flex-col items-center justify-center gap-2 bg-purple-500/10 hover:bg-white/5 border border-purple-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Heart className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">Anxiety & Stress</div>
                        <div className="text-[10px] text-gray-500 mt-1">Racing thoughts, worry</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('cold-flu')} className="group flex flex-col items-center justify-center gap-2 bg-blue-500/10 hover:bg-white/5 border border-blue-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <BarChart2 className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform rotate-90" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">Cold & Flu</div>
                        <div className="text-[10px] text-gray-500 mt-1">Fever, cough, congestion</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('weight-loss')} className="group flex flex-col items-center justify-center gap-2 bg-teal-500/10 hover:bg-white/5 border border-teal-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Zap className="w-6 h-6 text-teal-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">Weight Management</div>
                        <div className="text-[10px] text-gray-500 mt-1">Semaglutide, tirzepatide</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('std')} className="group flex flex-col items-center justify-center gap-2 bg-pink-500/10 hover:bg-white/5 border border-pink-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Shield className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">STD Concerns</div>
                        <div className="text-[10px] text-gray-500 mt-1">Discreet, judgment-free</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('skin')} className="group flex flex-col items-center justify-center gap-2 bg-yellow-500/10 hover:bg-white/5 border border-yellow-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <ImageIcon className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">Skin Issues</div>
                        <div className="text-[10px] text-gray-500 mt-1">Rash, acne, irritation</div>
                      </div>
                    </button>
                    <button onClick={() => handleConditionClick('other')} className="group flex flex-col items-center justify-center gap-2 bg-gray-500/10 hover:bg-white/5 border border-gray-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <MessageCircle className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center">
                        <div className="text-white font-semibold text-sm">Something Else</div>
                        <div className="text-[10px] text-gray-500 mt-1">We treat 50+ conditions</div>
                      </div>
                    </button>
                 </div>

                 {/* Returning Patient Footer */}
                 <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                          <Clock size={20} />
                       </div>
                       <div className="text-left">
                          <div className="text-white font-semibold text-sm">Been here before?</div>
                          <div className="text-xs text-gray-400">Skip the chat and book your follow-up directly</div>
                       </div>
                    </div>
                    <Link href="/appointment/follow-up" className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap">
                       Book Follow-Up
                    </Link>
                 </div>
              </div>
           </div>

           {/* Badges */}
           <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-gray-400">
              <span className="flex items-center gap-2"><Shield size={14} className="text-teal-400"/> HIPAA Compliant</span>
              <span className="flex items-center gap-2"><Lock size={14} className="text-blue-400"/> 256-bit Encryption</span>
              <span className="flex items-center gap-2"><Users size={14} className="text-purple-400"/> 10,000+ Helped</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-green-400"/> Licensed Providers</span>
           </div>
        </div>
      </section>

      {/* "What's Bothering You?" */}
      <section className="py-16 px-4">
         <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 font-serif">What's <span className="text-teal-400">Bothering You?</span></h2>
            <div className="flex flex-wrap justify-center gap-3">
               {CONDITIONS_LIST.map((c) => (
                  <button 
                    key={c.id}
                    onClick={() => handleConditionClick(c.id)}
                    className={`${getPillColorClass(c.color)} border rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer hover:scale-105`}
                  >
                    {c.label}
                  </button>
               ))}
               {showMore && EXPANDED_CONDITIONS.map((c) => (
                  <button 
                    key={c.id}
                    onClick={() => handleConditionClick(c.id)}
                    className={`${getPillColorClass(c.color)} border rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-300 hover:scale-105`}
                  >
                    {c.label}
                  </button>
               ))}
               <button 
                 onClick={() => setShowMore(!showMore)} 
                 className="bg-white/10 border border-white/30 rounded-full px-4 py-2 text-sm text-white font-medium hover:bg-white/20 transition-all flex items-center gap-1"
               >
                 {showMore ? 'Show Less' : '+ 40 more'}
               </button>
            </div>
         </div>
      </section>

      {/* Better Than Googling */}
      <BetterThanGoogling />

      {/* CTA Card */}
      <section className="pb-16 px-4 bg-[#050a08]">
         <div className="max-w-4xl mx-auto">
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(20,184,166,0.1)] text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
               <h2 className="text-3xl font-bold mb-4 font-serif text-white">
                 Better Than Googling <span className="text-teal-400">Your Symptoms</span>
               </h2>
               <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                 Get personalized guidance in 2 minutes – and if you need care, we'll help you get treated the same day.
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <button 
                    onClick={scrollToInput}
                    className="bg-teal-500 text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-teal-400 transition-all flex items-center gap-2"
                  >
                    Start Free Assessment <ArrowRight size={20} />
                  </button>
                  <Link href="/appointment/follow-up" className="bg-orange-500 text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-orange-400 transition-all flex items-center gap-2">
                    <RotateCcw size={18} /> Returning? Book Follow-Up
                  </Link>
               </div>
               <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                  <span className="flex items-center gap-2"><Check size={16} className="text-green-400" /> No insurance needed</span>
                  <span className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Same-day treatment</span>
                  <span className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Prescriptions sent to pharmacy</span>
               </div>
            </div>
         </div>
      </section>

      {/* ALL 9 INFO FOLDS (Including the 3 missing ones) */}
      <FAQFold />
      <ProviderFold />
      <CitiesFold />
      <PrivacyFold />
      <WhyUsFold />
      <CoverageFold />
      <AvailabilityFold />
      <AboutClinicianFold />
      <ZipCodesFold />

      {/* FOOTER (Matched to Screenshot) */}
      <footer className="py-12 px-4 border-t border-teal-500/10 bg-[#040807]">
         <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="text-center md:text-left">
               <p className="font-bold text-white text-lg">Medazon Health</p>
               <p className="text-xs text-gray-500 mt-1">Secure · Convenient · Private Medical Care</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
               <Link href="#" className="hover:text-teal-400 transition-colors">Book a Visit</Link>
               <Link href="#" className="hover:text-teal-400 transition-colors">Follow-Up Appointment</Link>
               <Link href="#" className="hover:text-teal-400 transition-colors">Wellness Products</Link>
               <Link href="#" className="hover:text-teal-400 transition-colors">Privacy</Link>
            </div>
         </div>
         
         <div className="max-w-5xl mx-auto text-center border-t border-white/5 pt-8">
            <p className="text-[10px] text-gray-600">
               © 2025 Medazon Health. This assessment is for informational purposes only and does not constitute medical advice. Always consult with a healthcare provider for medical decisions.
            </p>
         </div>
      </footer>
    </main>
  );
}