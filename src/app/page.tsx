"use client";

import { useState, useRef, useEffect } from "react";
import StateGate, { StateBadge } from "@/components/free-assessment/StateGate";
import ChatWidget from "@/components/free-assessment/ChatWidget";
import { 
  FAQFold, PrivacyFold, ProviderFold, CitiesFold, WhyUsFold, 
  AvailabilityFold, CoverageFold, AboutClinicianFold, ZipCodesFold 
} from "@/components/free-assessment/InfoFolds";
import { 
  ArrowRight, Clock, Video, UserCheck, Zap, Lightbulb, Heart, 
  BarChart2, Shield, Image as ImageIcon, MessageCircle, Check, Lock, Users, RotateCcw, RefreshCw, Star, EyeOff, User
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


function PairedCTABlock() {
  const [returningEmail, setReturningEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Collect browser/device info for the provider
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const lang = navigator.language;
    const platform = navigator.platform || "unknown";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const connectionType = (navigator as any).connection?.effectiveType || "unknown";
    return { userAgent: ua, screen, language: lang, platform, timezone, touchSupport, connectionType, timestamp: new Date().toISOString() };
  };

  const handleExpressBook = async () => {
    const email = returningEmail.trim();
    if (!email) return;
    setSearching(true);
    setSearchError(null);

    // Store browser info in sessionStorage
    try { sessionStorage.setItem("browserInfo", JSON.stringify(getBrowserInfo())); } catch {}

    try {
      // Search for existing patient by email
      const res = await fetch("/api/express-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lookupOnly: true }),
      });
      const data = await res.json();

      if (res.ok && data.found && data.patient) {
        // FOUND — store full patient info in sessionStorage
        sessionStorage.setItem("expressPatient", JSON.stringify({
          id: data.patient.id || null,
        firstName: data.patient.firstName || "",
        lastName: data.patient.lastName || "",
         email: email,
         phone: data.patient.phone || "",
         dateOfBirth: data.patient.dateOfBirth || "",
         address: data.patient.address || "",
         source: data.source || "returning",
         pharmacy: data.patient.pharmacy || "",
         }));
      } else {
        // NOT FOUND — store email-only stub, express checkout shows "Welcome!"
        sessionStorage.setItem("expressPatient", JSON.stringify({
          id: null,
          firstName: "",
          lastName: "",
          email: email,
          phone: "",
          dateOfBirth: "",
          address: "",
          source: "new",
          pharmacy: "",
        }));
      }

      // Navigate to express checkout — clear stale answers so Step 1 starts fresh
      try { localStorage.removeItem("medazon_express_answers"); } catch {}
      window.location.href = "/express-checkout";
    } catch (err) {
      console.error("Patient lookup error:", err);
      // On error, still send them through as new patient
      sessionStorage.setItem("expressPatient", JSON.stringify({
        id: null, firstName: "", lastName: "", email: email,
        phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "",
      }));
      try { localStorage.removeItem("medazon_express_answers"); } catch {}
      window.location.href = "/express-checkout";
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <Link href="/express-checkout" onClick={() => { try { localStorage.removeItem("medazon_express_answers"); sessionStorage.setItem("browserInfo", JSON.stringify(getBrowserInfo())); sessionStorage.setItem("expressPatient", JSON.stringify({ id: null, firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "" })); } catch {} }} className="bg-orange-500 text-white font-bold px-8 py-3.5 rounded-xl text-base md:text-xl md:px-10 md:py-5 hover:bg-orange-400 transition-all flex items-center gap-2 w-full sm:w-auto justify-center whitespace-nowrap">
        Book My 1st Visit — $1.89 Reserve Fee <ArrowRight size={20} />
      </Link>
      <div className="w-full max-w-lg">
        <div className="text-center mb-3">
          <span className="text-sm font-bold text-orange-400 flex items-center justify-center gap-1.5">
            <Zap size={14} /> BOOK IN 30 SECONDS
          </span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleExpressBook(); }} className="flex gap-2 sm:gap-3 w-full" autoComplete="on">
          <input type="email" id="returning-email" name="email" autoComplete="email" inputMode="email" enterKeyHint="go" value={returningEmail} onChange={(e) => setReturningEmail(e.target.value)} placeholder="Email" disabled={searching} className="flex-1 min-w-0 bg-white text-black border border-gray-300 rounded-xl px-4 sm:px-5 py-3.5 placeholder-gray-400 focus:outline-none focus:border-teal-400 transition-all text-base font-medium disabled:opacity-50" />
          <button type="submit" disabled={searching} className="bg-[#0d3d2a] text-white font-bold px-4 sm:px-6 py-3.5 rounded-xl hover:bg-[#0f4d35] transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base flex-shrink-0 disabled:opacity-50">
            {searching ? (
              <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin flex-shrink-0" /> Searching...</>
            ) : (
              <><ArrowRight size={16} className="rotate-180 flex-shrink-0" /><span className="leading-tight text-center">Return<br className="sm:hidden" /> Patient</span></>
            )}
          </button>
        </form>
        {searchError && <p className="text-red-400 text-xs mt-2 text-center">{searchError}</p>}
      </div>
    </div>
  );
}

export default function AssessmentPageContent() {
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queuePosition, setQueuePosition] = useState(() => {
    try {
      const stored = sessionStorage.getItem('landing_queue_pos');
      if (stored) return parseInt(stored);
      const pos = Math.floor(Math.random() * 3) + 2;
      sessionStorage.setItem('landing_queue_pos', String(pos));
      return pos;
    } catch { return 3; }
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Set all autoplay attributes imperatively — iOS Safari requires this
    v.muted = true;
    (v as HTMLVideoElement & { defaultMuted?: boolean }).defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.loop = true;
    const tryPlay = () => { v.play().catch(() => {}); };
    tryPlay();
    // Retry on first touch/click — covers browsers blocking before user gesture
    const onInteract = () => { tryPlay(); };
    document.addEventListener("touchstart", onInteract, { once: true, passive: true });
    document.addEventListener("click", onInteract, { once: true });
    // Retry when tab becomes visible again
    const onVisible = () => { if (!document.hidden) tryPlay(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => {
    if (queuePosition <= 1) return;
    const delay = 18000 + Math.random() * 14000;
    const t = setTimeout(() => {
      setQueuePosition(p => {
        const next = Math.max(1, p - 1);
        try { sessionStorage.setItem('landing_queue_pos', String(next)); } catch {}
        return next;
      });
    }, delay);
    return () => clearTimeout(t);
  }, [queuePosition]);

  const handleConditionClick = (condition: string) => {
    window.dispatchEvent(new CustomEvent('medazon-start-chat', { detail: condition }));
  };

  return (
    <main className="min-h-screen bg-[#040807] text-white font-sans selection:bg-teal-500/30">
      <StateGate />
      <ChatWidget />

      {/* SECTION 3: HERO */}
      <section className="relative px-4 overflow-hidden" style={{ paddingTop: "clamp(12px, 3vw, 32px)", paddingBottom: "clamp(24px, 5vw, 64px)" }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.12),transparent_60%)]" />
        <div className="max-w-lg mx-auto relative z-10 text-center">

          {/* Compact logo row — mobile only, replaces announcement bar + nav */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            {/* Hamburger left */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white p-1 transition-colors">
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
            {/* Logo center */}
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <div className="w-7 h-7 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 font-bold text-sm">M</div>
              <span className="text-base font-bold">Medazon<span className="text-teal-400">Health</span></span>
            </div>
            {/* StateBadge right */}
            <StateBadge />
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#040807] border border-white/5 rounded-xl px-4 py-4 mb-4 text-left">
              <div className="flex flex-col gap-3">
                <a href="#" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">Home</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">How It Works</a>
                <a href="#provider" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">About Your Provider</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">FAQ</a>
                <Link href="/express-checkout" onClick={() => { try { localStorage.removeItem("medazon_express_answers"); sessionStorage.setItem("expressPatient", JSON.stringify({ id: null, firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "" })); } catch {} }} className="bg-orange-500 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-orange-400 transition-all flex items-center justify-center gap-2 mt-1 w-full whitespace-nowrap">
                  Book My 1st Visit — $1.89 Reserve Fee <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          {/* Desktop nav — shown only md+ */}
          <nav className="hidden md:flex sticky top-0 z-50 bg-[#040807]/95 backdrop-blur-md border-b border-white/5 items-center justify-between px-8 py-3 mb-6 -mx-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 font-bold">M</div>
              <span className="text-lg font-bold">Medazon<span className="text-teal-400">Health</span></span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Home</a>
              <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a>
              <a href="#provider" className="text-sm text-gray-400 hover:text-white transition-colors">About Your Provider</a>
              <a href="#faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</a>
              <StateBadge />
            </div>
          </nav>

          {/* H1 — mobile: 310px cap / desktop: max-w-4xl matches panel width */}
          <h1 className="font-bold leading-tight font-serif mb-2 mx-auto max-w-[310px] md:max-w-4xl" style={{ fontSize: "clamp(28px, 7.5vw, 52px)" }}>
            Instant Private Medical Visits
          </h1>

          {/* Subtitle — explicit 2-line split, no orphan */}
          <p className="text-gray-400 mb-4 mx-auto" style={{ fontSize: "clamp(13px, 3.5vw, 16px)", maxWidth: "280px" }}>
            <span style={{ display: "block" }}>See a Provider in minutes, not days.</span>
            <span style={{ display: "block" }}>No appointments. No waiting rooms.</span>
          </p>

          {/* Laptop frame */}
          <div className="relative mb-4" style={{ borderRadius: 20, border: "1.5px solid rgba(45,212,191,0.35)", background: "#080e0c", boxShadow: "0 0 40px rgba(45,212,191,0.12), 0 0 80px rgba(45,212,191,0.06)" }}>

            {/* I'M ONLINE bar */}
            <div className="flex items-center justify-center gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: "#4ade80" }}>I&apos;M ONLINE</span>
            </div>

            {/* Video area */}
            <div className="relative w-full overflow-hidden" style={{ height: "clamp(180px, 42vw, 240px)" }}>
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                onCanPlay={(e) => { const v = e.currentTarget; v.muted = true; v.play().catch(() => {}); }}
                onLoadedData={(e) => { const v = e.currentTarget; v.muted = true; v.play().catch(() => {}); }}
                className="absolute inset-0 w-full h-full object-cover"
                webkit-playsinline="true"
                x5-playsinline="true"
                preload="auto"
              >
                <source src="/assets/doctor-instant-visit.mp4" type="video/mp4" />
              </video>
              {/* dark overlay */}
              <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.28)" }} />

              {/* Doctor info overlay — top 80% zone, stars clear of patient pill */}
              <div className="absolute left-0 right-0 top-0 flex flex-col items-center justify-center gap-1 z-10" style={{ height: "80%" }}>

                <h3 className="text-white font-black drop-shadow-lg" style={{ fontSize: "clamp(13px,3.5vw,18px)" }}>LaMonica A. Hodges, MSN, APRN, FNP-C</h3>
                <p className="text-gray-300 drop-shadow-lg" style={{ fontSize: "clamp(10px,2.5vw,13px)" }}>Board-Certified Family Nurse Practitioner</p>
                <div className="flex items-center gap-1">
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <Star size={11} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-gray-300 drop-shadow-lg" style={{ fontSize: "clamp(9px,2.5vw,11px)" }}>4.9 / 12,398 reviews</span>
                </div>
              </div>

              {/* Currently with a patient pill — bottom 20% zone */}
              <div className="absolute left-0 right-0 bottom-0 flex items-center justify-center z-10" style={{ height: "20%" }}>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                  <span className="text-white font-semibold whitespace-nowrap" style={{ fontSize: "clamp(11px,3vw,14px)" }}>Currently with a patient</span>
                </div>
              </div>
            </div>
          </div>

                    {/* Queue Bar */}
          <div className="flex items-center justify-center gap-3 px-3 py-2 mb-3 mx-auto" style={{ background: "rgba(45,245,198,0.05)", border: "1px solid rgba(45,212,160,0.15)", borderRadius: "12px", maxWidth: "320px" }}>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2df5c6" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <span className="text-xl font-black" style={{ color: "#2df5c6" }}>{queuePosition}</span>
              <span className="text-sm font-semibold text-white">in Queue</span>
            </div>
            <div className="w-px h-6" style={{ background: "rgba(45,245,198,0.3)" }} />
            {queuePosition === 1
              ? <span className="text-sm font-bold" style={{ color: "#2df5c6" }}>🎉 You&apos;re Up Next!</span>
              : <span className="text-sm font-semibold" style={{ color: "#9ca3af" }}>Spots filling fast</span>
            }
          </div>

                    {/* Hero Condition Pills */}
          <div className="hero-condition-pills w-full mb-3">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              <button onClick={() => handleConditionClick('uti')} className="flex-shrink-0 bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">UTIs</button>
              <button onClick={() => handleConditionClick('weight-loss')} className="flex-shrink-0 bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Weight Loss</button>
              <button onClick={() => handleConditionClick('anxiety')} className="flex-shrink-0 bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Anxiety</button>
              <button onClick={() => handleConditionClick('depression')} className="flex-shrink-0 bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Depression</button>
              <button onClick={() => handleConditionClick('cold-flu')} className="flex-shrink-0 bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Cold &amp; Flu</button>
              <button onClick={() => handleConditionClick('skin')} className="flex-shrink-0 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Skin Issues</button>
              <button onClick={() => handleConditionClick('std')} className="flex-shrink-0 bg-pink-500/10 border border-pink-500/30 text-pink-300 hover:bg-pink-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">STD Testing</button>
              <button onClick={() => handleConditionClick('erectile-dysfunction')} className="flex-shrink-0 bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Erectile Dysfunction</button>
              <button onClick={() => handleConditionClick('birth-control')} className="flex-shrink-0 bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Birth Control</button>
              <button onClick={() => handleConditionClick('hair-loss')} className="flex-shrink-0 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Hair Loss</button>
              <button onClick={() => handleConditionClick('allergies')} className="flex-shrink-0 bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Allergies</button>
              <button onClick={() => handleConditionClick('sinus')} className="flex-shrink-0 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Sinus Infections</button>
              <button onClick={() => handleConditionClick('adhd')} className="flex-shrink-0 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">ADHD</button>
              <button onClick={() => handleConditionClick('rx-refill')} className="flex-shrink-0 bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">Rx Refills</button>
              <button onClick={() => handleConditionClick('other')} className="flex-shrink-0 bg-white/5 border border-white/20 text-gray-300 hover:bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all">+ 40 more</button>
            </div>
          </div>

          {/* CTA + Email + Return Patient */}
          <div className="mb-4">
            <PairedCTABlock />
          </div>

          {/* Trust bar */}
          <div className="flex items-center justify-center text-gray-400" style={{ fontSize: "clamp(11px,3vw,13px)" }}>
            <span className="flex items-center gap-1.5"><Users size={13} className="text-teal-400 flex-shrink-0" /> Same Provider Every Visit</span>
          </div>

        </div>
      </section>

      {/* SECTION 4+: STATS + CONDITIONS + REST */}
      <section className="relative px-4 pb-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">

           {/* Stats Bar */}
           <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
             <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center">
               <p className="text-teal-400 font-black text-lg">2 min</p>
               <p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Avg. Intake</p>
             </div>
             <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center">
               <p className="text-orange-400 font-black text-lg">1-2 hr</p>
               <p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Rx to Pharmacy</p>
             </div>
             <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center">
               <p className="text-white font-black text-lg">$0</p>
               <p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Hidden Fees</p>
             </div>
           </div>

           {/* SECTION 4: CONDITIONS — EXACT SAME 8-grid */}
           <div className="relative max-w-4xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/20 to-teal-500/5 rounded-[35px] blur-lg opacity-60" />
              <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-6 md:p-10 shadow-2xl">
                 <h3 className="text-xl md:text-2xl font-bold mb-6 font-serif text-center">
                   What We Treat — <span className="text-teal-400">Privately and Discreetly</span>
                 </h3>
                 {/* 6-GRID — top conditions */}
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    <button onClick={() => handleConditionClick('uti')} className="group flex flex-col items-center justify-center gap-2 bg-red-500/10 hover:bg-white/5 border border-red-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Zap className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center"><div className="text-white font-semibold text-sm">UTI Symptoms</div><div className="text-[10px] text-gray-500 mt-1">Burning, frequent urination</div></div>
                    </button>
                    <button onClick={() => handleConditionClick('adhd')} className="group flex flex-col items-center justify-center gap-2 bg-indigo-500/10 hover:bg-white/5 border border-indigo-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Lightbulb className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center"><div className="text-white font-semibold text-sm">ADHD</div><div className="text-[10px] text-gray-500 mt-1">Focus, attention</div></div>
                    </button>
                    <button onClick={() => handleConditionClick('anxiety')} className="group flex flex-col items-center justify-center gap-2 bg-purple-500/10 hover:bg-white/5 border border-purple-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Heart className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center"><div className="text-white font-semibold text-sm">Anxiety & Stress</div><div className="text-[10px] text-gray-500 mt-1">Racing thoughts, worry</div></div>
                    </button>
                    <button onClick={() => handleConditionClick('cold-flu')} className="group flex flex-col items-center justify-center gap-2 bg-blue-500/10 hover:bg-white/5 border border-blue-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <BarChart2 className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform rotate-90" />
                      <div className="text-center"><div className="text-white font-semibold text-sm">Cold & Flu</div><div className="text-[10px] text-gray-500 mt-1">Fever, cough, congestion</div></div>
                    </button>
                    <button onClick={() => handleConditionClick('weight-loss')} className="group flex flex-col items-center justify-center gap-2 bg-teal-500/10 hover:bg-white/5 border border-teal-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Zap className="w-6 h-6 text-teal-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center"><div className="text-white font-semibold text-sm">Weight Management</div><div className="text-[10px] text-gray-500 mt-1">Semaglutide, tirzepatide</div></div>
                    </button>
                    <button onClick={() => handleConditionClick('std')} className="group flex flex-col items-center justify-center gap-2 bg-pink-500/10 hover:bg-white/5 border border-pink-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                      <Shield className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                      <div className="text-center"><div className="text-white font-semibold text-sm">STD Concerns</div><div className="text-[10px] text-gray-500 mt-1">Discreet, judgment-free</div></div>
                    </button>
                 </div>

                 {/* Something Else? + horizontal scrolling pills */}
                 <h4 className="text-xl font-bold font-serif text-center mb-4">Something Else?</h4>
                 <div className="relative">
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                     {/* These pills are DIFFERENT conditions — no duplicates from the 6 cards above */}
                     <button onClick={() => handleConditionClick('skin')} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Skin Issues</button>
                     <button onClick={() => handleConditionClick('erectile-dysfunction')} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Erectile Dysfunction</button>
                     <button onClick={() => handleConditionClick('depression')} className="bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Depression</button>
                     <button onClick={() => handleConditionClick('birth-control')} className="bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Birth Control</button>
                     <button onClick={() => handleConditionClick('hair-loss')} className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Hair Loss</button>
                     <button onClick={() => handleConditionClick('allergies')} className="bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Allergies</button>
                     <button onClick={() => handleConditionClick('sinus')} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Sinus Infections</button>
                     <button onClick={() => handleConditionClick('rx-refill')} className="bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Rx Refills</button>
                     <button onClick={() => handleConditionClick('insomnia')} className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Insomnia</button>
                     <button onClick={() => handleConditionClick('yeast-infection')} className="bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Yeast Infection</button>
                     <button onClick={() => handleConditionClick('bv')} className="bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">BV Treatment</button>
                     <button onClick={() => handleConditionClick('acid-reflux')} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Acid Reflux</button>
                     <button onClick={() => handleConditionClick('high-blood-pressure')} className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">High Blood Pressure</button>
                     <button onClick={() => handleConditionClick('thyroid')} className="bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Thyroid Issues</button>
                     <button onClick={() => handleConditionClick('diabetes')} className="bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Diabetes Management</button>
                     <button onClick={() => handleConditionClick('migraine')} className="bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Migraines</button>
                     <button onClick={() => handleConditionClick('eczema')} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Eczema</button>
                     <button onClick={() => handleConditionClick('asthma')} className="bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Asthma</button>
                     <button onClick={() => handleConditionClick('ear-infection')} className="bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Ear Infections</button>
                     <button onClick={() => handleConditionClick('pink-eye')} className="bg-pink-500/10 border border-pink-500/30 text-pink-300 hover:bg-pink-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Pink Eye</button>
                     <button onClick={() => handleConditionClick('bronchitis')} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Bronchitis</button>
                     <button onClick={() => handleConditionClick('gout')} className="bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Gout</button>
                     <button onClick={() => handleConditionClick('strep-throat')} className="bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Strep Throat</button>
                     <button onClick={() => handleConditionClick('smoking-cessation')} className="bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Smoking Cessation</button>
                     <button onClick={() => handleConditionClick('herpes')} className="bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Herpes Treatment</button>
                     <button onClick={() => handleConditionClick('trichomoniasis')} className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Trichomoniasis</button>
                     <button onClick={() => handleConditionClick('perimenopause')} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Perimenopause</button>
                     <button onClick={() => handleConditionClick('hpv')} className="bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">HPV</button>
                     <button onClick={() => handleConditionClick('cholesterol')} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">High Cholesterol</button>
                     <button onClick={() => handleConditionClick('nausea')} className="bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Nausea & Vomiting</button>
                     <button onClick={() => handleConditionClick('other')} className="bg-gray-500/10 border border-gray-500/30 text-gray-300 hover:bg-gray-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Other</button>
                     {/* Scroll arrow indicator */}
                     <div className="flex items-center shrink-0 pl-1">
                       <ArrowRight size={18} className="text-gray-500" />
                     </div>
                   </div>
                 </div>
                 <p className="text-center text-sm text-gray-500 mb-6">Treated from home. Prescription to your pharmacy. No one has to know.</p>
                 <PairedCTABlock />
              </div>
           </div>

           {/* Badges */}
           <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-gray-400">
              <span className="flex items-center gap-2"><Shield size={14} className="text-teal-400"/> HIPAA Compliant</span>
              <span className="flex items-center gap-2"><Lock size={14} className="text-blue-400"/> 256-bit Encryption</span>
              <span className="flex items-center gap-2"><Users size={14} className="text-purple-400"/> 12,398 Patients</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-green-400"/> Board-Certified</span>
              <span className="flex items-center gap-2"><RefreshCw size={14} className="text-teal-400"/> Same Provider Every Visit</span>
           </div>
        </div>
      </section>

      {/* VISIT TYPES — image cards from services grid style */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 font-serif text-center">
            Choose How You Want to <span className="text-teal-400">Be Treated</span>
          </h2>
          <p className="text-center text-sm text-gray-500 mb-10">Every visit type is handled by your provider. Same person. Every time.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Get Seen Without Being Seen */}
            <div onClick={() => handleConditionClick('instant')} className="relative h-48 md:h-56 rounded-2xl overflow-hidden border border-teal-500/30 group cursor-pointer">
              <img src="/assets/service_uti.jpg" alt="Instant Visit" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors" />
              <div className="absolute top-3 left-3">
                <span className="bg-teal-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Fastest</span>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <p className="text-2xl mb-1">💬</p>
                <h3 className="text-white font-bold text-sm mb-1 drop-shadow-md">Get Seen <span className="text-teal-400">Without Being Seen</span></h3>
                <p className="text-gray-300 text-[10px] drop-shadow-md">No video. No phone. Just results.</p>
              </div>
            </div>
            {/* Quick Rx Refill */}
            <div onClick={() => handleConditionClick('rx-refill')} className="relative h-48 md:h-56 rounded-2xl overflow-hidden border border-amber-500/30 group cursor-pointer">
              <img src="/assets/service_general.jpg" alt="Rx Refill" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors" />
              <div className="absolute top-3 left-3">
                <span className="bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Fast</span>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <p className="text-2xl mb-1">💊</p>
                <h3 className="text-white font-bold text-sm mb-1 drop-shadow-md">Quick Rx Refill — <span className="text-amber-400">Skip the Wait</span></h3>
                <p className="text-gray-300 text-[10px] drop-shadow-md">Select meds. Provider approves. Done.</p>
              </div>
            </div>
            {/* Live Video Visit */}
            <div onClick={() => handleConditionClick('video')} className="relative h-48 md:h-56 rounded-2xl overflow-hidden border border-blue-500/30 group cursor-pointer">
              <img src="/assets/service_anxiety.jpg" alt="Video Visit" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <p className="text-2xl mb-1">📹</p>
                <h3 className="text-white font-bold text-sm mb-1 drop-shadow-md">Live <span className="text-blue-400">Video Visit</span></h3>
                <p className="text-gray-300 text-[10px] drop-shadow-md">Face-to-face with your provider.</p>
              </div>
            </div>
            {/* Phone Visit */}
            <div onClick={() => handleConditionClick('phone')} className="relative h-48 md:h-56 rounded-2xl overflow-hidden border border-purple-500/30 group cursor-pointer">
              <img src="/assets/service_cold_flu.jpg" alt="Phone Visit" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <p className="text-2xl mb-1">📞</p>
                <h3 className="text-white font-bold text-sm mb-1 drop-shadow-md">Phone <span className="text-purple-400">Visit</span></h3>
                <p className="text-gray-300 text-[10px] drop-shadow-md">Talk to your provider. No camera needed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 font-serif text-center">How It <span className="text-teal-400">Works</span></h2>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-black border border-teal-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)] mx-auto">
                <img src="/assets/download_(3).svg" alt="Step 1" width={24} height={24} />
              </div>
              <h3 className="text-white font-bold text-lg mb-3">Book for $1.89</h3>
              <p className="text-gray-400 text-sm">Your $1.89 booking fee gets your information in front of a private practice provider immediately. Not a call center. Not a random doctor rotation.</p>
            </div>
            <div className="bg-[#0a0f0d] border border-blue-500/20 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-black border border-teal-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)] mx-auto">
                <img src="/assets/download_(2).svg" alt="Step 2" width={24} height={24} />
              </div>
              <h3 className="text-white font-bold text-lg mb-3">Your Provider Personally Reviews Your Case</h3>
              <p className="text-gray-400 text-sm">A board-certified provider evaluates your history, your symptoms, and decides if they&apos;re the right fit for your care. Not every patient is accepted. Not every case qualifies.</p>
            </div>
            <div className="bg-[#0a0f0d] border border-green-500/20 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-black border border-teal-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,203,169,0.3)] mx-auto">
                <img src="/assets/download_(1).svg" alt="Step 3" width={24} height={24} />
              </div>
              <h3 className="text-white font-bold text-lg mb-3">Accepted? You&apos;re Treated.</h3>
              <p className="text-gray-400 text-sm">Your provider treats your case and sends your prescription to your pharmacy. You&apos;re only billed after your visit is complete or your treatment has been delivered.</p>
            </div>
          </div>
          <div className="flex justify-center"><PairedCTABlock /></div>
        </div>
      </section>

      {/* "What's Bothering You?" — EXACT SAME, ZERO CHANGES */}
      <section className="py-16 px-4">
         <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 font-serif">What&apos;s <span className="text-teal-400">Bothering You?</span></h2>
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

      {/* SECTION 7: PRIVACY & DISCRETION — $189 lives here ONCE */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/10 to-teal-500/5 rounded-[35px] blur-lg opacity-40" />
            <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-8 md:p-12 shadow-2xl text-center">
              <EyeOff size={32} className="text-teal-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-6 font-serif">
                Built for <span className="text-teal-400">Privacy and Discretion</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed text-base">
                Your private practice provider puts your privacy and discretion before everything else. They personally review your case and only accept patients they can genuinely help. If accepted, and only after your visit is complete or your treatment has been delivered, a $189 flat visit fee is billed — no hidden costs, no insurance games, no surprises.
              </p>
              <p className="text-gray-500 mt-6 text-sm">
                No waiting rooms. No judgment. No one has to know.<br />
                <span className="text-teal-400 font-medium">Your case is between you and your provider.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: COMPARISON TABLE — replaces BetterThanGoogling */}
      <section className="py-16 px-4 bg-[#050a08]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 font-serif text-center">
            There are two kinds of <span className="text-teal-400">telehealth.</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0a0f0d] border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-red-400 font-bold text-lg mb-4 text-center">Volume-Driven Telehealth</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>Whoever&apos;s available</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>See as many patients as possible</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>Auto-approved, rubber stamped</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>Shared systems, corporate data</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>Hidden copays, surprise bills</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>A waiting room with WiFi</span></div>
              </div>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/40 rounded-2xl p-6">
              <h3 className="text-teal-400 font-bold text-lg mb-4 text-center">Medazon Health</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>Your provider. Always.</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>Accept only patients we can help</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>Personally reviewed, selectively accepted</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>Discretion and privacy first</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>One flat fee. Only if accepted.</span></div>
                <div className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>Your own private practice</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: TESTIMONIALS */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 font-serif text-center">
            What Our Patients <span className="text-teal-400">Say</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">&ldquo;I was tired of explaining my history to a new doctor every time. With Medazon, my provider already knows me.&rdquo;</p>
              <p className="text-teal-400 text-xs font-medium">— M.R., Florida</p>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">&ldquo;My provider actually read my file before responding. That&apos;s never happened on any other telehealth app.&rdquo;</p>
              <p className="text-teal-400 text-xs font-medium">— K.T., Florida</p>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">&ldquo;Nobody knew I was being treated. That&apos;s exactly what I wanted.&rdquo;</p>
              <p className="text-gray-500 text-xs font-medium">— Anonymous</p>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">&ldquo;One flat fee. No insurance nightmare. My provider sent the prescription to my pharmacy the same day.&rdquo;</p>
              <p className="text-teal-400 text-xs font-medium">— J.L., Florida</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            4.9 average from 12,398 patient reviews
          </p>
        </div>
      </section>

      {/* SECTION 11: FINAL CTA */}
      <section className="pb-16 px-4 bg-[#050a08]">
         <div className="max-w-4xl mx-auto">
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(20,184,166,0.1)] text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
               <h2 className="text-3xl font-bold mb-4 font-serif text-white">
                 Medazon puts <span className="text-teal-400">care first.</span>
               </h2>
               <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                 Private practice providers who put your privacy and discretion before everything else. Only charged if your provider accepts and treats your case.
               </p>
               <div className="mb-8"><PairedCTABlock /></div>
               <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                  <span className="flex items-center gap-2"><Lock size={16} className="text-teal-400" /> HIPAA Compliant</span>
                  <span className="flex items-center gap-2"><Shield size={16} className="text-teal-400" /> 256-bit Encrypted</span>
                  <span className="flex items-center gap-2"><Check size={16} className="text-green-400" /> Board-Certified</span>
                  <span className="flex items-center gap-2"><Users size={16} className="text-teal-400" /> Private Practice</span>
                  <span className="flex items-center gap-2"><RefreshCw size={16} className="text-teal-400" /> Same Provider Every Visit</span>
               </div>
            </div>
         </div>
      </section>

      {/* SECTION 10: FAQ + ALL 9 INFO FOLDS */}
      <div id="faq"></div>
      <FAQFold />
      <div id="provider"></div>
      <ProviderFold />
      <CitiesFold />
      <PrivacyFold />
      <WhyUsFold />
      <CoverageFold />
      <AvailabilityFold />
      <AboutClinicianFold />
      <ZipCodesFold />

      {/* SECTION 12: FOOTER */}
      <footer className="py-12 px-4 border-t border-teal-500/10 bg-[#040807]">
         <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="text-center md:text-left">
               <p className="font-bold text-white text-lg">Medazon Health</p>
               <p className="text-xs text-gray-500 mt-1">Private Practice Telehealth</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
               <Link href="#" className="hover:text-teal-400 transition-colors">Home</Link>
               <Link href="#how-it-works" className="hover:text-teal-400 transition-colors">How It Works</Link>
               <Link href="#provider" className="hover:text-teal-400 transition-colors">About Your Provider</Link>
               <Link href="#faq" className="hover:text-teal-400 transition-colors">FAQ</Link>
               <Link href="#" className="hover:text-teal-400 transition-colors">Terms of Service</Link>
               <Link href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</Link>
               <Link href="#" className="hover:text-teal-400 transition-colors">Cancellation Policy</Link>
            </div>
         </div>
         <div className="max-w-5xl mx-auto text-center border-t border-white/5 pt-8">
            <p className="text-xs text-gray-500 mb-4">Medazon puts care first. Only charged if your provider accepts and treats your case.</p>
            <p className="text-[10px] text-gray-600">© 2026 Medazon Health. All rights reserved. HIPAA Compliant · Board-Certified Providers · Florida</p>
         </div>
      </footer>
    </main>
  );
}






