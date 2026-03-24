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
  BarChart2, Shield, Image as ImageIcon, MessageCircle, Check, Lock, Users, RotateCcw, RefreshCw, Star, EyeOff, User, ChevronLeft
} from "lucide-react";
import Link from "next/link";
import VisitCards from "@/components/home/VisitCards";
import BookingOverlay from "@/components/BookingOverlay";
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


function PairedCTABlock({
  showSteps,
  onBookClick,
  onOpenOverlay,
}: {
  showSteps: boolean;
  onBookClick: () => void;
  onOpenOverlay?: (email: string, patient: object | null) => void;
}) {
  const [returningEmail, setReturningEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

    try {
      const res = await fetch("/api/express-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lookupOnly: true }),
      });
      const data = await res.json();

      let patient = null;
      if (res.ok && data.found && data.patient) {
        patient = {
          id: data.patient.id || null,
          firstName: data.patient.firstName || "",
          lastName: data.patient.lastName || "",
          email,
          phone: data.patient.phone || "",
          dateOfBirth: data.patient.dateOfBirth || "",
          address: data.patient.address || "",
          source: data.source || "local",
          pharmacy: data.patient.pharmacy || "",
        };
      }
      // Open overlay — it handles patient detection from step 0
      onOpenOverlay?.(email, patient);
    } catch {
      onOpenOverlay?.(email, null);
    } finally {
      setSearching(false);
    }
  };

  // CTA click — opens overlay
  const handleCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!showSteps) { onBookClick(); }
    onOpenOverlay?.("", null);
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <button
        onClick={handleCTAClick}
        className="bg-orange-500 text-white font-bold px-6 py-4 rounded-xl hover:bg-orange-400 transition-all flex items-center gap-2 w-full justify-center text-center leading-tight"
        style={{ fontSize: 'clamp(15px, 4.2vw, 20px)', letterSpacing: '-0.01em' }}
      >
        {showSteps ? "Book Now — $1.89 Reserve Fee →" : "Book My 1st Visit — $1.89 Reserve Fee →"} <ArrowRight size={20} className="flex-shrink-0" />
      </button>
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
  const [showSteps, setShowSteps] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayVisitType, setOverlayVisitType] = useState("async");
  const pillsRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselRow, setCarouselRow] = useState(0);
  const lastCarouselRow = useRef(0);
  const visitCardsRef = useRef<HTMLDivElement>(null);
  const [visitCardsRow, setVisitCardsRow] = useState(0);
  const lastVisitCardsRow = useRef(0);
  const audioCtxRef = useRef<AudioContext|null>(null);

  // Unlock AudioContext on first touch — iOS Safari requires user gesture
  const unlockAudio = () => {
    if (audioCtxRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      // Play silent buffer to unlock
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      audioCtxRef.current = ctx;
    } catch {}
  };

  const playSnapSound = () => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  const triggerHaptic = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch {}
  };
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

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

  // Measure pills height after mount so container stays locked on transition
  useEffect(() => {
    if (pillsRef.current && !showSteps) {
      const h = pillsRef.current.offsetHeight;
      if (h > 0) setContainerHeight(h);
    }
  }, [showSteps]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    (v as HTMLVideoElement & { defaultMuted?: boolean }).defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.loop = true;
    const tryPlay = () => { v.play().catch(() => {}); };
    tryPlay();
    const onInteract = () => { tryPlay(); };
    document.addEventListener("touchstart", onInteract, { once: true, passive: true });
    document.addEventListener("click", onInteract, { once: true });
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

  // Carousel scroll tracking + snap sound + haptic
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const handleScroll = () => {
      const rowHeight = el.scrollHeight / 4;
      const row = Math.round(el.scrollTop / rowHeight);
      const clamped = Math.min(3, Math.max(0, row));
      if (clamped !== lastCarouselRow.current) {
        lastCarouselRow.current = clamped;
        setCarouselRow(clamped);
        playSnapSound();
        triggerHaptic();
      }
    };
    // Unlock audio on first touchstart on the carousel
    el.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Visit cards scroll tracking + snap sound + haptic
  useEffect(() => {
    const el = document.getElementById("visit-cards-scroll") as HTMLDivElement | null;
    if (!el) return;
    // Store ref for indicator
    (visitCardsRef as { current: HTMLDivElement|null }).current = el;
    const handleScroll = () => {
      const rowHeight = el.scrollHeight / 3;
      const row = Math.round(el.scrollTop / rowHeight);
      const clamped = Math.min(2, Math.max(0, row));
      if (clamped !== lastVisitCardsRow.current) {
        lastVisitCardsRow.current = clamped;
        setVisitCardsRow(clamped);
        playSnapSound();
        triggerHaptic();
      }
    };
    el.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const handleConditionClick = (condition: string) => {
    // Map condition/visit-type to canonical visitType key
    const typeMap: Record<string,string> = {
      async:"async", sms:"sms", refill:"refill", "rx-refill":"refill",
      video:"video", phone:"phone", instant:"instant",
    };
    const vt = typeMap[condition] || "async";
    setOverlayVisitType(vt);
    setOverlayOpen(true);
  };

  // Called from PairedCTABlock — email already looked up, open overlay with context
  const handleOverlayOpen = (email: string, patient: object | null) => {
    if (patient) {
      try { sessionStorage.setItem("expressPatient", JSON.stringify(patient)); } catch {}
    } else if (email) {
      // New patient — store email only, overlay will detect as new
      try { sessionStorage.setItem("expressPatient", JSON.stringify({
        id: null, firstName: "", lastName: "", email,
        phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "",
      })); } catch {}
    }
    setOverlayVisitType("async");
    setOverlayOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#040807] text-white font-sans selection:bg-teal-500/30">
      <StateGate />
      <ChatWidget />

      {/* SECTION 3: HERO */}
      <section className="relative px-4 overflow-hidden" style={{ paddingTop: "clamp(12px, 3vw, 32px)", paddingBottom: "clamp(24px, 5vw, 64px)" }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.12),transparent_60%)]" />
        <div className="max-w-lg md:max-w-4xl mx-auto relative z-10 text-center">

          {/* Mobile header */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white p-1 transition-colors">
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <div className="w-7 h-7 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 font-bold text-sm">M</div>
              <span className="text-base font-bold">Medazon<span className="text-teal-400">Health</span></span>
            </div>
            <StateBadge />
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden bg-[#040807] border border-white/5 rounded-xl px-4 py-4 mb-4 text-left">
              <div className="flex flex-col gap-3">
                <a href="#" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">Home</a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">How It Works</a>
                <a href="#provider" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">About Your Provider</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">FAQ</a>
                <button onClick={() => { setMobileMenuOpen(false); setOverlayOpen(true); }} className="bg-orange-500 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-orange-400 transition-all flex items-center justify-center gap-2 mt-1 w-full whitespace-nowrap">
                  Book My 1st Visit — $1.89 Reserve Fee <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Desktop nav */}
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

          <h1 className="font-bold leading-tight font-serif mb-2 mx-auto max-w-[310px] md:max-w-4xl" style={{ fontSize: "clamp(28px, 7.5vw, 52px)" }}>
            Instant Private Medical Visits
          </h1>


          {/* SINGLE OUTER WRAPPER — red/teal glow frame matching instant-visit */}
          <div className="relative w-full mb-3" style={{ isolation: 'isolate' }}>
            {/* Outer glow blur — behind everything */}
            <div className="absolute pointer-events-none" style={{ inset: '-8px', background: 'linear-gradient(180deg, rgba(239,68,68,0.25) 0%, rgba(20,184,166,0.15) 100%)', filter: 'blur(20px)', borderRadius: '28px', zIndex: -1 }} />
            {/* Inner card — video + cards together */}
            <div className="relative overflow-hidden" style={{ borderRadius: '20px', background: 'linear-gradient(180deg, rgba(5,11,20,0.95) 0%, rgba(13,18,24,0.98) 100%)', border: '1px solid rgba(45,245,198,0.2)', boxShadow: '0 0 40px rgba(45,245,198,0.15), 0 0 80px rgba(45,245,198,0.08)' }}>

              {/* I'M ONLINE bar */}
              <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(45,245,198,0.08)', borderBottom: '1px solid rgba(45,245,198,0.15)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                  <span className="text-xs font-bold tracking-widest" style={{ color: '#4ade80' }}>I&apos;M ONLINE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <span className="text-sm font-black" style={{ color: '#4ade80' }}>{queuePosition}</span>
                  <span className="text-xs font-semibold text-white">in Queue</span>
                  <span className="text-xs font-bold ml-1" style={{ color: '#4ade80' }}>
                    {queuePosition === 1 ? "🎉 You're Up Next!" : "· Spots filling fast"}
                  </span>
                </div>
              </div>

              {/* Video */}
              <div className="relative w-full overflow-hidden" style={{ height: 'clamp(180px,42vw,240px)' }}>
                <video
                  ref={videoRef}
                  autoPlay loop muted playsInline
                  onCanPlay={(e) => { const v = e.currentTarget; v.muted = true; v.play().catch(() => {}); }}
                  onLoadedData={(e) => { const v = e.currentTarget; v.muted = true; v.play().catch(() => {}); }}
                  className="absolute inset-0 w-full h-full object-cover"
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  preload="auto"
                >
                  <source src="/assets/doctor-instant-visit.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />
                <div className="absolute left-0 right-0 top-0 flex flex-col items-center justify-center gap-1 z-10" style={{ height: '80%' }}>
                  <h3 className="text-white font-black drop-shadow-lg" style={{ fontSize: 'clamp(13px,3.5vw,18px)' }}>LaMonica A. Hodges, MSN, APRN, FNP-C</h3>
                  <p className="text-gray-300 drop-shadow-lg" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>Board-Certified Family Nurse Practitioner</p>
                  <div className="flex items-center gap-1">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-gray-300 drop-shadow-lg" style={{ fontSize: 'clamp(9px,2.5vw,11px)' }}>4.9 / 12,398 reviews</span>
                  </div>
                </div>
                <div className="absolute left-0 right-0 bottom-0 flex items-center justify-center z-10" style={{ height: '20%' }}>
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    <span className="text-white font-semibold whitespace-nowrap" style={{ fontSize: 'clamp(11px,3vw,14px)' }}>Currently with a patient</span>
                  </div>
                </div>
              </div>

              {/* VISIT TYPE CARDS — primary entry point, above fold */}
              <div className="p-4">
                <div style={{ position: "relative" }}>
                  <VisitCards onCardClick={(type) => handleConditionClick(type)} />
                  {/* Vertical indicator — right side, 3 segments */}
                  <div className="md:hidden" style={{
                    position: "absolute",
                    right: -10,
                    top: 4,
                    bottom: 4,
                    width: 3,
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    pointerEvents: "none",
                  }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        flex: 1,
                        borderRadius: 99,
                        background: i===visitCardsRow ? "#2dd4a0" : "rgba(255,255,255,0.15)",
                        transition: "background .2s",
                      }} />
                    ))}
                  </div>
                </div>
                {overlayOpen && (
                  <BookingOverlay
                    visitType={overlayVisitType}
                    onClose={() => setOverlayOpen(false)}
                  />
                )}
              </div>

              {/* WHAT WE TREAT — moved above visit cards */}
              <div className="px-4 pb-4 pt-5">
           <div className="relative max-w-4xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/20 to-teal-500/5 rounded-[35px] blur-lg opacity-60" />
              <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-6 md:p-10 shadow-2xl">
                 <h3 className="text-xl md:text-2xl font-bold mb-4 font-serif text-center">
                   What We Treat — <span className="text-teal-400">Privately and Discreetly</span>
                 </h3>

                 {/* Carousel with vertical scroll indicator on right */}
                 <div style={{ position: "relative", marginBottom: 16 }}>
                   <div ref={carouselRef} style={{
                     height: "calc(var(--row-h, 148px) + 20px)",
                     overflowY: "scroll",
                     overflowX: "hidden",
                     scrollSnapType: "y mandatory",
                     scrollbarWidth: "none",
                     WebkitOverflowScrolling: "touch",
                     borderRadius: 12,
                   }}>
                   <style>{`
                     :root { --row-h: 148px; }
                     @media (max-width: 380px) { :root { --row-h: 134px; } }
                   `}</style>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, scrollSnapAlign: "start", paddingBottom: 8, marginTop: -30 }}>
                     <button onClick={() => handleConditionClick('cold-flu')} className="group flex flex-col items-center justify-start bg-blue-500/10 hover:bg-white/5 border border-blue-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <BarChart2 className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">General Illness</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Just not feeling well</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Fatigue</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Body aches</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('weight-loss')} className="group flex flex-col items-center justify-start bg-teal-500/10 hover:bg-white/5 border border-teal-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Zap className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Weight Management</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Semaglutide</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Tirzepatide</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('anxiety')} className="group flex flex-col items-center justify-start bg-purple-500/10 hover:bg-white/5 border border-purple-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Heart className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Mental Health</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>ADHD</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Anxiety</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Stress</span></div>
                       </div>
                     </button>
                   </div>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, scrollSnapAlign: "start", paddingBottom: 8, }}>
                     <button onClick={() => handleConditionClick('uti')} className="group flex flex-col items-center justify-start bg-red-500/10 hover:bg-white/5 border border-red-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Zap className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">UTI & Urinary Care</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>UTI</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Bladder infection</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Frequent urination</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('std')} className="group flex flex-col items-center justify-start bg-pink-500/10 hover:bg-white/5 border border-pink-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Heart className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Women&apos;s Intimate Health</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>BV</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Yeast infection</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Vaginal concerns</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('std')} className="group flex flex-col items-center justify-start bg-rose-500/10 hover:bg-white/5 border border-rose-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Shield className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">STD Testing & Treatment</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>All STD-related concerns</span></div>
                       </div>
                     </button>
                   </div>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, scrollSnapAlign: "start", paddingBottom: 8, }}>
                     <button onClick={() => handleConditionClick('skin')} className="group flex flex-col items-center justify-start bg-orange-500/10 hover:bg-white/5 border border-orange-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Zap className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Skin & Dermatology</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Acne</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Rashes</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Irritation</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('mens-health')} className="group flex flex-col items-center justify-start bg-cyan-500/10 hover:bg-white/5 border border-cyan-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Men&apos;s Health</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>ED</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Hair loss</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('refill')} className="group flex flex-col items-center justify-start bg-green-500/10 hover:bg-white/5 border border-green-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Lightbulb className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Prescription & Refills</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Rx refill</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Medication continuation</span></div>
                       </div>
                     </button>
                   </div>
                   <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, scrollSnapAlign: "start",  }}>
                     <button onClick={() => handleConditionClick('cold-flu')} className="group flex flex-col items-center justify-start bg-sky-500/10 hover:bg-white/5 border border-sky-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <BarChart2 className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0 rotate-90" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Respiratory</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Cough</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Sore throat</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Congestion</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Sinus pressure</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('other')} className="group flex flex-col items-center justify-start bg-violet-500/10 hover:bg-white/5 border border-violet-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Lightbulb className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Not Sure?</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Uncertainty</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Symptom confusion</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Anxiety-driven</span></div>
                       </div>
                     </button>
                     <button onClick={() => handleConditionClick('followup')} className="group flex flex-col items-center justify-start bg-indigo-500/10 hover:bg-white/5 border border-indigo-500/30 hover:border-white/20 rounded-xl px-2 py-2.5 transition-all text-center w-full overflow-hidden">
                       <Heart className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                       <div className="text-white font-bold text-[10px] leading-tight mt-1 mb-1 text-center w-full">Follow-Up Care</div>
                       <div className="text-[8px] text-gray-300 font-semibold leading-tight flex flex-col gap-[2px] items-start w-full">
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Ongoing symptoms</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Previous visit</span></div>
                         <div className="flex items-start gap-0.5 text-left justify-start"><span className="text-teal-400 font-black text-[8px] flex-shrink-0 mt-[2px]">✦</span><span>Treatment adjustments</span></div>
                       </div>
                     </button>
                   </div>
                 </div>
                   {/* Vertical scroll indicator — right side */}
                   <div style={{
                     position: "absolute",
                     right: -10,
                     top: 4,
                     bottom: 4,
                     width: 3,
                     borderRadius: 99,
                     background: "rgba(255,255,255,0.08)",
                     display: "flex",
                     flexDirection: "column",
                     gap: 3,
                   }}>
                     {[0,1,2,3].map(i => (
                       <div key={i} style={{
                         flex: 1,
                         borderRadius: 99,
                         background: i===carouselRow ? "#2dd4a0" : "rgba(255,255,255,0.15)",
                         transition: "background .2s",
                       }} />
                     ))}
                   </div>
                 </div>

                 <PairedCTABlock showSteps={showSteps} onBookClick={() => setShowSteps(true)} onOpenOverlay={handleOverlayOpen} />
              </div>
              </div>
              </div>

            </div>
          </div>

          {/* CTA + Email + Return Patient */}
          <div className="mb-4">
            <PairedCTABlock showSteps={showSteps} onBookClick={() => setShowSteps(true)} onOpenOverlay={handleOverlayOpen} />
          </div>

          {/* Trust bar */}
          <div className="flex items-center justify-center text-gray-400" style={{ fontSize: "clamp(11px,3vw,13px)" }}>
            <span className="flex items-center gap-1.5"><Users size={13} className="text-teal-400 flex-shrink-0" /> Same Provider Every Visit</span>
          </div>

        </div>
      </section>

      {/* SECTION 4+: STATS + CONDITIONS + REST — unchanged from original */}
      <section className="relative px-4 pb-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">

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

           <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-gray-400">
              <span className="flex items-center gap-2"><Shield size={14} className="text-teal-400"/> HIPAA Compliant</span>
              <span className="flex items-center gap-2"><Lock size={14} className="text-blue-400"/> 256-bit Encryption</span>
              <span className="flex items-center gap-2"><Users size={14} className="text-purple-400"/> 12,398 Patients</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-green-400"/> Board-Certified</span>
              <span className="flex items-center gap-2"><RefreshCw size={14} className="text-teal-400"/> Same Provider Every Visit</span>
           </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
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
          <div className="flex justify-center"><PairedCTABlock showSteps={showSteps} onBookClick={() => setShowSteps(true)} onOpenOverlay={handleOverlayOpen} /></div>
        </div>
      </section>

      {/* WHAT'S BOTHERING YOU */}
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

      {/* PRIVACY */}
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

      {/* COMPARISON */}
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

      {/* TESTIMONIALS */}
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

      {/* FINAL CTA */}
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
               <div className="mb-8"><PairedCTABlock showSteps={showSteps} onBookClick={() => setShowSteps(true)} onOpenOverlay={handleOverlayOpen} /></div>
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

      {/* FOLDS */}
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

      {/* FOOTER */}
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















































































