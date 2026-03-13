"use client";

import { useState, useRef, useEffect } from "react";
import StateGate, { StateBadge } from "@/components/free-assessment/StateGate";
import ChatWidget from "@/components/free-assessment/ChatWidget";
import {
  FAQFold, PrivacyFold, ProviderFold, CitiesFold, WhyUsFold,
  AvailabilityFold, CoverageFold, AboutClinicianFold, ZipCodesFold
} from "@/components/free-assessment/InfoFolds";
import {
  ArrowRight, Zap, Lightbulb, Heart,
  BarChart2, Shield, Check, Lock, Users, RefreshCw, Star, EyeOff
} from "lucide-react";
import Link from "next/link";

function CareHandsLogo() {
  return (
    <div className="relative h-[52px] w-[64px] sm:h-[62px] sm:w-[76px] flex-shrink-0">
      <svg viewBox="0 0 140 110" className="h-full w-full" style={{filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.4))"}}>
        <defs>
          <linearGradient id="cf-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="cf-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="cf-badge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <path d="M18 72 C10 58 12 42 24 36 C32 32 42 34 50 40 L80 40 C92 40 98 52 90 62 L72 88 C66 96 56 100 46 100 L26 100 C16 100 10 90 18 72Z" fill="url(#cf-blue)" />
        <path d="M56 38 C62 22 76 14 90 12 C106 10 116 22 108 36 L88 66 C82 76 70 82 58 82 L44 82 C50 72 54 60 56 38Z" fill="url(#cf-green)" />
        <circle cx="42" cy="28" r="20" fill="url(#cf-badge)" />
        <circle cx="42" cy="28" r="18" fill="#1d4ed8" />
        <rect x="36" y="20" width="12" height="16" rx="2" fill="white" />
        <rect x="33" y="24" width="18" height="8" rx="2" fill="white" />
      </svg>
    </div>
  );
}

function PairedCTABlock() {
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
    try { sessionStorage.setItem("browserInfo", JSON.stringify(getBrowserInfo())); } catch {}
    try {
      const res = await fetch("/api/express-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lookupOnly: true }),
      });
      const data = await res.json();
      if (res.ok && data.found && data.patient) {
        sessionStorage.setItem("expressPatient", JSON.stringify({
          id: data.patient.id || null,
          firstName: data.patient.firstName || "",
          lastName: data.patient.lastName || "",
          email, phone: data.patient.phone || "",
          dateOfBirth: data.patient.dateOfBirth || "",
          address: data.patient.address || "",
          source: data.source || "returning",
          pharmacy: data.patient.pharmacy || "",
        }));
      } else {
        sessionStorage.setItem("expressPatient", JSON.stringify({
          id: null, firstName: "", lastName: "", email,
          phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "",
        }));
      }
      try { localStorage.removeItem("medazon_express_answers"); } catch {}
      window.location.href = "/express-checkout";
    } catch {
      sessionStorage.setItem("expressPatient", JSON.stringify({
        id: null, firstName: "", lastName: "", email,
        phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "",
      }));
      try { localStorage.removeItem("medazon_express_answers"); } catch {}
      window.location.href = "/express-checkout";
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <Link
        href="/express-checkout"
        onClick={() => {
          try {
            localStorage.removeItem("medazon_express_answers");
            sessionStorage.setItem("browserInfo", JSON.stringify(getBrowserInfo()));
            sessionStorage.setItem("expressPatient", JSON.stringify({
              id: null, firstName: "", lastName: "", email: "",
              phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "",
            }));
          } catch {}
        }}
        className="group relative w-full max-w-[720px] mx-auto block rounded-[20px] bg-[#ff6a00] px-3 py-3 sm:px-5 sm:py-3.5 shadow-[0_10px_30px_rgba(255,106,0,0.32)] transition-all duration-200 hover:scale-[1.01] hover:bg-[#ff7614]"
      >
        <div className="relative flex items-center justify-between gap-2 sm:gap-3 min-h-[66px] sm:min-h-[74px]">
          <div className="flex items-center justify-center pl-1 sm:pl-2">
            <CareHandsLogo />
          </div>
          <div className="flex-1 min-w-0 text-center leading-none">
            <div className="text-white font-black tracking-widest text-[13px] sm:text-[16px] md:text-[18px] mb-0.5 sm:mb-1" style={{textShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>
              BOOK A
            </div>
            <div className="flex items-center justify-center leading-none">
              <span className="text-white font-black tracking-[-0.02em] text-[30px] sm:text-[44px] md:text-[52px] leading-none" style={{textShadow:"0 2px 4px rgba(0,0,0,0.25)"}}>
                CARE
              </span>
              <span className="font-black tracking-[-0.02em] text-[30px] sm:text-[44px] md:text-[52px] leading-none" style={{
                background:"linear-gradient(180deg,#4ade80 0%,#16a34a 50%,#14532d 100%)",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                backgroundClip:"text",
                filter:"drop-shadow(0 2px 3px rgba(0,0,0,0.35))"
              }}>
                FIRST
              </span>
              <span className="text-white font-black tracking-tight text-[16px] sm:text-[26px] md:text-[32px] leading-none ml-2 sm:ml-3" style={{textShadow:"0 2px 4px rgba(0,0,0,0.25)"}}>
                VISIT
              </span>
            </div>
          </div>
          <div className="pr-1 sm:pr-2 flex-shrink-0">
            <ArrowRight size={28} className="text-white transition-transform duration-200 group-hover:translate-x-1 sm:w-9 sm:h-9" />
          </div>
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-[10px] px-5 py-2 sm:px-8 sm:py-2.5 text-white font-black tracking-wider text-[12px] sm:text-[14px] whitespace-nowrap border border-[#0f5c2d]" style={{background:"linear-gradient(180deg,#166534 0%,#14532d 100%)",boxShadow:"0 6px 20px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.1)"}}>
              BOOK NOW, PAY LATER
            </div>
          </div>
        </div>
      </Link>
      <div className="w-full max-w-lg">
        <div className="text-center mb-3">
          <span className="text-sm font-bold text-orange-400 flex items-center justify-center gap-1.5">
            <Zap size={14} /> BOOK IN 30 SECONDS
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Returning patient? Enter your email"
            value={returningEmail}
            onChange={(e) => setReturningEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExpressBook()}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          />
          <button
            onClick={handleExpressBook}
            disabled={searching || !returningEmail.trim()}
            className="rounded-xl bg-teal-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-teal-400 disabled:opacity-40"
          >
            {searching ? "..." : "Go"}
          </button>
        </div>
        {searchError && <p className="mt-2 text-xs text-red-400 text-center">{searchError}</p>}
      </div>
    </div>
  );
}

export default function TestPage() {
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    return () => { document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const handleConditionClick = (condition: string) => {
    window.dispatchEvent(new CustomEvent("medazon-start-chat", { detail: condition }));
  };

  return (
    <main className="min-h-screen bg-[#040807] text-white font-sans selection:bg-teal-500/30">
      <StateGate />
      <ChatWidget />

      {/* HERO */}
      <section className="relative overflow-hidden px-4" style={{ paddingTop: "clamp(12px, 3vw, 32px)", paddingBottom: "clamp(32px, 6vw, 72px)" }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.14),transparent_60%)]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white p-1 transition-colors">
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
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
                <Link href="/express-checkout" onClick={() => { try { localStorage.removeItem("medazon_express_answers"); sessionStorage.setItem("expressPatient", JSON.stringify({ id: null, firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", address: "", source: "new", pharmacy: "" })); } catch {} }} className="bg-orange-500 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-orange-400 transition-all flex items-center justify-center gap-2 mt-1 w-full whitespace-nowrap">
                  BOOK A CARE FIRST VISIT <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          <nav className="hidden md:flex sticky top-0 z-50 bg-[#040807]/95 backdrop-blur-md border-b border-white/5 items-center justify-between px-8 py-3 mb-8">
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

          <div className="grid lg:grid-cols-[1fr_1.02fr] gap-8 lg:gap-10 items-center">
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center rounded-full border border-teal-400/20 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-teal-300">Care First Review</div>
              <h1 className="font-bold leading-[1.02] font-serif mt-5 mx-auto lg:mx-0 max-w-[320px] sm:max-w-2xl lg:max-w-none" style={{ fontSize: "clamp(34px, 8vw, 64px)" }}>
                Private Medical Care
                <span className="block text-teal-400">Without the Appointment</span>
              </h1>
              <p className="text-gray-300 mt-5 mx-auto lg:mx-0 max-w-xl leading-7" style={{ fontSize: "clamp(15px, 3.8vw, 18px)" }}>
                Answer a few questions. Your provider reviews your case. Prescription sent to your pharmacy.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">Same Provider Every Visit</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">Private Practice</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">Sent to Your Pharmacy</span>
              </div>
              <div className="mt-7"><PairedCTABlock /></div>
              <div className="mt-10 max-w-xl mx-auto lg:mx-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left shadow-2xl backdrop-blur">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">Why Care First?</div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-gray-300 sm:text-[15px]">
                  <p>• Patients should not have to pay for treatment before experiencing it.</p>
                  <p>• The small $1.89 Care First reserve confirms your request so your provider can personally review your case in private.</p>
                  <p>• Most reviews happen within minutes.</p>
                </div>
                <p className="mt-4 text-sm font-semibold text-white sm:text-[15px]">Care comes first. You only pay after your care is complete.</p>
              </div>
              <div className="mt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500 text-center lg:text-left">Care options</div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">💬 Secure Text</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">📞 Phone Call</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">🎥 Video Visit</span>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 max-w-xl mx-auto w-full">
              <div className="overflow-hidden rounded-[28px] border border-teal-500/30 bg-[#08110f] shadow-[0_0_40px_rgba(20,184,166,0.12)]">
                <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5">
                  <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-green-300">I&apos;m Online</span>
                </div>
                <div className="relative w-full overflow-hidden" style={{ height: "clamp(240px, 48vw, 360px)" }}>
                  <video ref={videoRef} autoPlay loop muted playsInline onCanPlay={(e) => { const v = e.currentTarget; v.muted = true; v.play().catch(() => {}); }} onLoadedData={(e) => { const v = e.currentTarget; v.muted = true; v.play().catch(() => {}); }} className="absolute inset-0 w-full h-full object-cover" preload="auto">
                    <source src="/assets/doctor-instant-visit.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute left-0 right-0 top-0 flex flex-col items-center justify-center gap-1 px-4 text-center z-10" style={{ height: "78%" }}>
                    <h3 className="text-white font-black drop-shadow-lg" style={{ fontSize: "clamp(14px,3.5vw,22px)" }}>LaMonica A. Hodges, MSN, APRN, FNP-C</h3>
                    <p className="text-gray-200 drop-shadow-lg" style={{ fontSize: "clamp(11px,2.6vw,14px)" }}>Licensed • Board-Certified • Private Practice</p>
                    <div className="mt-1 flex items-center gap-1 text-yellow-400">
                      {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-yellow-400" />)}
                      <span className="ml-2 text-[11px] text-gray-200 sm:text-xs">4.9 / 12,398 reviews</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center px-4 z-10" style={{ height: "22%" }}>
                    <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur">Currently reviewing patient cases</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center"><p className="text-teal-400 font-black text-lg">2 min</p><p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Avg. Intake</p></div>
            <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center"><p className="text-orange-400 font-black text-lg">Minutes</p><p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Most Reviews</p></div>
            <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center"><p className="text-white font-black text-lg">$1.89</p><p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Reserve</p></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold font-serif tracking-tight">How It <span className="text-teal-400">Works</span></h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-400">Built to feel faster, quieter, and more personal than a traditional telehealth appointment.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { img: "service_uti.jpg", badge: "2 min", step: "Step 1", title: "Describe Your Symptoms", desc: "Answer a few quick questions from your phone." },
              { img: "service_general.jpg", badge: "Private review", step: "Step 2", title: "Your Provider Reviews Your Case", desc: "Your information is personally reviewed in private." },
              { img: "service_anxiety.jpg", badge: "Same day", step: "Step 3", title: "Treatment Sent if Appropriate", desc: "Prescriptions can be sent directly to your pharmacy." },
              { img: "service_cold_flu.jpg", badge: "Care First", step: "Bonus", title: "Private and Simple", desc: "No waiting room. No video required unless needed." },
            ].map((card) => (
              <div key={card.step} className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0f0d] shadow-2xl">
                <div className="relative h-[260px] sm:h-[300px]">
                  <img src={`/assets/${card.img}`} alt={card.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/80" />
                  <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">{card.badge}</div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">{card.step}</div>
                    <h3 className="mt-2 text-2xl font-black leading-tight text-white">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-gray-200">{card.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE TREAT */}
      <section className="relative px-4 pb-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/20 to-teal-500/5 rounded-[35px] blur-lg opacity-60" />
            <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-6 md:p-10 shadow-2xl">
              <h3 className="text-xl md:text-2xl font-bold mb-6 font-serif text-center">What We Treat — <span className="text-teal-400">Privately and Discreetly</span></h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {[
                  { cond: "uti", color: "red", Icon: Zap, label: "UTI Symptoms", sub: "Burning, frequent urination" },
                  { cond: "adhd", color: "indigo", Icon: Lightbulb, label: "ADHD", sub: "Focus, attention" },
                  { cond: "anxiety", color: "purple", Icon: Heart, label: "Anxiety & Stress", sub: "Racing thoughts, worry" },
                  { cond: "cold-flu", color: "blue", Icon: BarChart2, label: "Cold & Flu", sub: "Fever, cough, congestion" },
                  { cond: "weight-loss", color: "teal", Icon: Zap, label: "Weight Management", sub: "Semaglutide, tirzepatide" },
                  { cond: "std", color: "pink", Icon: Shield, label: "STD Concerns", sub: "Discreet, judgment-free" },
                ].map(({ cond, color, Icon, label, sub }) => (
                  <button key={cond} onClick={() => handleConditionClick(cond)} className={`group flex flex-col items-center justify-center gap-2 bg-${color}-500/10 hover:bg-white/5 border border-${color}-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all`}>
                    <Icon className={`w-6 h-6 text-${color}-400 group-hover:scale-110 transition-transform`} />
                    <div className="text-center"><div className="text-white font-semibold text-sm">{label}</div><div className="text-[10px] text-gray-500 mt-1">{sub}</div></div>
                  </button>
                ))}
              </div>
              <h4 className="text-xl font-bold font-serif text-center mb-4">Something Else?</h4>
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {[
                    { cond: "skin", color: "yellow", label: "Skin Issues" },
                    { cond: "erectile-dysfunction", color: "rose", label: "Erectile Dysfunction" },
                    { cond: "depression", color: "violet", label: "Depression" },
                    { cond: "birth-control", color: "pink", label: "Birth Control" },
                    { cond: "hair-loss", color: "amber", label: "Hair Loss" },
                    { cond: "allergies", color: "green", label: "Allergies" },
                    { cond: "sinus", color: "cyan", label: "Sinus Infections" },
                    { cond: "rx-refill", color: "orange", label: "Rx Refills" },
                    { cond: "other", color: "gray", label: "Other" },
                  ].map(({ cond, color, label }) => (
                    <button key={cond} onClick={() => handleConditionClick(cond)} className={`bg-${color}-500/10 border border-${color}-500/30 text-${color}-300 hover:bg-${color}-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0`}>{label}</button>
                  ))}
                  <div className="flex items-center shrink-0 pl-1"><ArrowRight size={18} className="text-gray-500" /></div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Care options</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">💬 Secure Text</span>
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">📞 Phone Call</span>
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">🎥 Video Visit</span>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-6">Treated from home. Prescription to your pharmacy. No one has to know.</p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-16 px-4 bg-[#050a08]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 font-serif text-center">There are two kinds of <span className="text-teal-400">telehealth.</span></h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0a0f0d] border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-red-400 font-bold text-lg mb-4 text-center">Volume-Driven Telehealth</h3>
              <div className="space-y-3">
                {["Whoever's available","See as many patients as possible","Auto-approved, rubber stamped","Shared systems, corporate data","Hidden copays, surprise bills","A waiting room with WiFi"].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-sm text-gray-400"><span className="text-red-400 mt-0.5 shrink-0">✕</span><span>{t}</span></div>
                ))}
              </div>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/40 rounded-2xl p-6">
              <h3 className="text-teal-400 font-bold text-lg mb-4 text-center">Medazon Health</h3>
              <div className="space-y-3">
                {["Your provider. Always.","Accept only patients we can help","Personally reviewed, selectively accepted","Discretion and privacy first","Care comes first","Your own private practice"].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-sm text-gray-300"><Check size={16} className="text-teal-400 mt-0.5 shrink-0" /><span>{t}</span></div>
                ))}
              </div>
            </div>
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
              <h2 className="text-3xl font-bold mb-6 font-serif">Built for <span className="text-teal-400">Privacy and Discretion</span></h2>
              <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed text-base">Your private practice provider puts your privacy and discretion before everything else. They personally review your case and only accept patients they can genuinely help. If accepted, and only after your visit is complete or your treatment has been delivered, a $189 flat visit fee is billed — no hidden costs, no insurance games, no surprises.</p>
              <p className="text-gray-500 mt-6 text-sm">No waiting rooms. No judgment. No one has to know.<br /><span className="text-teal-400 font-medium">Your case is between you and your provider.</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 font-serif text-center">What Our Patients <span className="text-teal-400">Say</span></h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              { q: "I was tired of explaining my history to a new doctor every time. With Medazon, my provider already knows me.", by: "— M.R., Florida" },
              { q: "My provider actually read my file before responding. That's never happened on any other telehealth app.", by: "— K.T., Florida" },
              { q: "Nobody knew I was being treated. That's exactly what I wanted.", by: "— Anonymous" },
              { q: "One flat fee. No insurance nightmare. My provider sent the prescription to my pharmacy the same day.", by: "— J.L., Florida" },
            ].map((t, i) => (
              <div key={i} className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
                <p className="text-gray-300 text-sm italic mb-4">&ldquo;{t.q}&rdquo;</p>
                <p className="text-teal-400 text-xs font-medium">{t.by}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400">
            {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400 inline" />)} 4.9 average from 12,398 patient reviews
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="pb-16 px-4 bg-[#050a08]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(20,184,166,0.1)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
            <h2 className="text-3xl font-bold mb-4 font-serif text-white">Medazon puts <span className="text-teal-400">care first.</span></h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Private practice providers who put your privacy and discretion before everything else. Only charged if your provider accepts and treats your case.</p>
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

      <div id="faq"></div><FAQFold />
      <div id="provider"></div><ProviderFold />
      <CitiesFold /><PrivacyFold /><WhyUsFold /><CoverageFold /><AvailabilityFold /><AboutClinicianFold /><ZipCodesFold />

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
