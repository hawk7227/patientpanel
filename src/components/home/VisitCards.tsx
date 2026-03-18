"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface VisitCardProps {
  title: string;
  accentTitle?: string;
  accentColor: string;
  subtext: string;
  checks: string[];
  imageSrc: string;
  imageAlt: string;
  badge?: string;
  badgeColor?: string;
  ctaHref: string;
  checkColor: string;
  borderColor: string;
  btnBorderColor: string;
  btnTextColor: string;
  btnGlow: string;
}

const CARDS: VisitCardProps[] = [
  {
    title: "Get Seen ",
    accentTitle: "Without Being Seen",
    accentColor: "#00e0c0",
    subtext: "No video. No phone. Just results.",
    checks: ["Tell us about your symptoms", "Provider reviews in queue", "Rx sent if appropriate"],
    imageSrc: "/assets/cards/card-01-white-monitor.png",
    imageAlt: "Async Visit",
    badge: "FASTEST",
    badgeColor: "#00e0c0",
    ctaHref: "/express-checkout?type=async",
    checkColor: "#00e0c0",
    borderColor: "rgba(0,224,192,0.3)",
    btnBorderColor: "#00e0c0",
    btnTextColor: "#00e0c0",
    btnGlow: "0 0 16px rgba(0,224,192,0.25)",
  },
  {
    title: "Live ",
    accentTitle: "Video Visit",
    accentColor: "#00e0c0",
    subtext: "Face-to-face with your provider.",
    checks: ["Book a time slot", "Join from your phone", "Get care in minutes"],
    imageSrc: "/assets/cards/card-03-video-ui-alt.png",
    imageAlt: "Video Visit",
    ctaHref: "/express-checkout?type=video",
    checkColor: "#00e0c0",
    borderColor: "rgba(0,224,192,0.2)",
    btnBorderColor: "#00e0c0",
    btnTextColor: "#00e0c0",
    btnGlow: "0 0 16px rgba(0,224,192,0.25)",
  },
  {
    title: "Phone ",
    accentTitle: "Visit",
    accentColor: "#c084fc",
    subtext: "Talk to your provider. No camera needed.",
    checks: ["Schedule a call", "Provider calls you directly", "Rx sent if appropriate"],
    imageSrc: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_01_29 PM.png",
    imageAlt: "Phone Visit",
    ctaHref: "/express-checkout?type=phone",
    checkColor: "#c084fc",
    borderColor: "rgba(168,85,247,0.2)",
    btnBorderColor: "#a855f7",
    btnTextColor: "#c084fc",
    btnGlow: "0 0 16px rgba(168,85,247,0.25)",
  },
  {
    title: "Join the provider ",
    accentTitle: "queue instantly",
    accentColor: "#f59e0b",
    subtext: "First available provider. No appointment needed.",
    checks: ["Wait in the online queue", "Quick treatment — no call", "First available provider"],
    imageSrc: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_11_15 PM.png",
    imageAlt: "Instant Visit",
    badge: "FASTEST",
    badgeColor: "#f59e0b",
    ctaHref: "/express-checkout?type=instant",
    checkColor: "#f59e0b",
    borderColor: "rgba(245,158,11,0.2)",
    btnBorderColor: "#f59e0b",
    btnTextColor: "#f59e0b",
    btnGlow: "0 0 16px rgba(245,158,11,0.25)",
  },
  {
    title: "Quick Rx Refill — ",
    accentTitle: "Skip the Wait",
    accentColor: "#f59e0b",
    subtext: "Select meds. Provider approves. Done.",
    checks: ["Select your medication", "Provider reviews & approves", "Sent to your pharmacy"],
    imageSrc: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_02_36 PM.png",
    imageAlt: "Rx Refill",
    badge: "FAST",
    badgeColor: "#f59e0b",
    ctaHref: "/express-checkout?type=rx-refill",
    checkColor: "#f59e0b",
    borderColor: "rgba(245,158,11,0.2)",
    btnBorderColor: "#f59e0b",
    btnTextColor: "#f59e0b",
    btnGlow: "0 0 16px rgba(245,158,11,0.25)",
  },
];

const SMS_CARD: VisitCardProps = {
  title: "Text Your Way to ",
  accentTitle: "Better Health",
  accentColor: "#00e0c0",
  subtext: "No app. No wait. Just text.",
  checks: ["Send symptoms via SMS", "Provider replies directly", "Rx sent if appropriate"],
  imageSrc: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_06_36 PM.png",
  imageAlt: "SMS Visit",
  badge: "FAST",
  badgeColor: "#00e0c0",
  ctaHref: "/express-checkout?type=sms",
  checkColor: "#00e0c0",
  borderColor: "rgba(0,224,192,0.3)",
  btnBorderColor: "#00e0c0",
  btnTextColor: "#00e0c0",
  btnGlow: "0 0 16px rgba(0,224,192,0.25)",
};

function ParallaxCard({ card, onClick }: { card: VisitCardProps; onClick: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    if (imgRef.current) imgRef.current.style.transform = `scale(1.06) translate(${x * -8}px, ${y * -8}px)`;
    if (contentRef.current) contentRef.current.style.transform = `translate(${x * 6}px, ${y * 6}px)`;
    if (badgeRef.current) badgeRef.current.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (imgRef.current) imgRef.current.style.transform = "";
    if (contentRef.current) contentRef.current.style.transform = "";
    if (badgeRef.current) badgeRef.current.style.transform = "";
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        aspectRatio: "3/4",
        border: `1.5px solid ${card.borderColor}`,
        background: "#111118",
      }}
    >
      <img
        ref={imgRef}
        src={card.imageSrc}
        alt={card.imageAlt}
        className="absolute inset-0 w-full h-full object-cover object-top"
        style={{ transition: "transform 220ms ease-out", willChange: "transform" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.05) 100%)" }}
      />
      {card.badge && (
        <div
          ref={badgeRef}
          className="absolute top-3 left-3 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider z-10"
          style={{
            background: card.badgeColor,
            color: "#0a0a0a",
            willChange: "transform",
            transition: "transform 200ms ease-out",
          }}
        >
          {card.badge}
        </div>
      )}
      <div
        ref={contentRef}
        className="absolute bottom-0 left-0 right-0 p-3 z-10"
        style={{ willChange: "transform", transition: "transform 200ms ease-out" }}
      >
        <h3 className="font-black text-white leading-tight mb-1" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
          {card.title}
          <span style={{ color: card.accentColor }}>{card.accentTitle}</span>
        </h3>
        <p className="text-gray-400 mb-2" style={{ fontSize: "clamp(9px, 1.2vw, 11px)" }}>{card.subtext}</p>
        <div className="flex flex-col gap-1">
          {card.checks.map((c) => (
            <div key={c} className="flex items-start gap-1.5" style={{ fontSize: "clamp(8px, 1.1vw, 10px)" }}>
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center"
                style={{ width: 12, height: 12, background: `${card.checkColor}22`, color: card.checkColor, fontSize: 7, marginTop: 1 }}
              >✓</div>
              <span className="text-gray-300 font-semibold">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CarouselSlot({ cards, onCtaClick }: { cards: VisitCardProps[]; onCtaClick: (href: string) => void }) {
  const [current, setCurrent] = useState(0);
  const [auto, setAuto] = useState(true);
  const touchStartX = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!auto) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % cards.length);
    }, 2500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [auto, cards.length]);

  const stopAuto = () => {
    setAuto(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const goTo = (n: number) => setCurrent(((n % cards.length) + cards.length) % cards.length);

  const card = cards[current];

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={stopAuto}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          stopAuto();
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 30) goTo(current + (diff > 0 ? 1 : -1));
        }}
        className="relative rounded-2xl overflow-hidden cursor-pointer"
        style={{ aspectRatio: "3/4", border: `1.5px solid ${card.borderColor}`, background: "#111118" }}
      >
        <img
          src={card.imageSrc}
          alt={card.imageAlt}
          className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.05) 100%)" }} />
        {card.badge && (
          <div className="absolute top-3 left-3 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider z-10"
            style={{ background: card.badgeColor, color: "#0a0a0a" }}>
            {card.badge}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <h3 className="font-black text-white leading-tight mb-1" style={{ fontSize: "clamp(12px, 2vw, 16px)" }}>
            {card.title}<span style={{ color: card.accentColor }}>{card.accentTitle}</span>
          </h3>
          <p className="text-gray-400 mb-2" style={{ fontSize: "clamp(9px, 1.2vw, 11px)" }}>{card.subtext}</p>
          <div className="flex flex-col gap-1">
            {card.checks.map((c) => (
              <div key={c} className="flex items-start gap-1.5" style={{ fontSize: "clamp(8px, 1.1vw, 10px)" }}>
                <div className="flex-shrink-0 rounded-full flex items-center justify-center"
                  style={{ width: 12, height: 12, background: `${card.checkColor}22`, color: card.checkColor, fontSize: 7, marginTop: 1 }}>✓</div>
                <span className="text-gray-300 font-semibold">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-1.5">
        {cards.map((_, i) => (
          <button key={i} onClick={() => { stopAuto(); goTo(i); }}
            className="rounded-full transition-all duration-200"
            style={{ width: 6, height: 6, background: i === current ? card.checkColor : "rgba(255,255,255,0.2)", transform: i === current ? "scale(1.3)" : "scale(1)" }}
          />
        ))}
      </div>
      <button
        onClick={() => onCtaClick(card.ctaHref)}
        className="w-full py-3 rounded-full font-black text-sm transition-all duration-180 hover:opacity-85 hover:-translate-y-px active:scale-[0.98]"
        style={{ border: `1.5px solid ${card.btnBorderColor}`, color: card.btnTextColor, background: "transparent", boxShadow: card.btnGlow }}
      >
        Get Started →
      </button>
    </div>
  );
}

export default function VisitCards({ onCardClick }: { onCardClick: (type: string) => void }) {
  const getType = (href: string) => href.split("type=")[1] || "async";

  return (
    <section className="py-16 px-4" style={{ background: "#0a0a0f" }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center font-black mb-3" style={{ fontSize: "clamp(22px, 4vw, 34px)", color: "#fff" }}>
          Choose How You Want to <span style={{ color: "#00e0c0" }}>Be Treated</span>
        </h2>
        <p className="text-center text-sm text-gray-500 mb-8">
          Every visit type is handled by your provider. Same person. Every time.
        </p>

        {/* Row 1: carousel + video + phone */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <CarouselSlot
            cards={[CARDS[0], SMS_CARD]}
            onCtaClick={(href) => onCardClick(getType(href))}
          />
          <div className="flex flex-col gap-2">
            <ParallaxCard card={CARDS[1]} onClick={() => onCardClick(getType(CARDS[1].ctaHref))} />
            <button
              onClick={() => onCardClick(getType(CARDS[1].ctaHref))}
              className="w-full py-3 rounded-full font-black text-sm transition-all duration-180 hover:opacity-85 hover:-translate-y-px"
              style={{ border: `1.5px solid ${CARDS[1].btnBorderColor}`, color: CARDS[1].btnTextColor, background: "transparent", boxShadow: CARDS[1].btnGlow }}
            >
              Get Started →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <ParallaxCard card={CARDS[2]} onClick={() => onCardClick(getType(CARDS[2].ctaHref))} />
            <button
              onClick={() => onCardClick(getType(CARDS[2].ctaHref))}
              className="w-full py-3 rounded-full font-black text-sm transition-all duration-180 hover:opacity-85 hover:-translate-y-px"
              style={{ border: `1.5px solid ${CARDS[2].btnBorderColor}`, color: CARDS[2].btnTextColor, background: "transparent", boxShadow: CARDS[2].btnGlow }}
            >
              Get Started →
            </button>
          </div>
        </div>

        {/* Row 2: instant + rx — centered */}
        <div className="grid grid-cols-2 gap-3 max-w-[66%] mx-auto">
          {[CARDS[3], CARDS[4]].map((card) => (
            <div key={card.imageAlt} className="flex flex-col gap-2">
              <ParallaxCard card={card} onClick={() => onCardClick(getType(card.ctaHref))} />
              <button
                onClick={() => onCardClick(getType(card.ctaHref))}
                className="w-full py-3 rounded-full font-black text-sm transition-all duration-180 hover:opacity-85 hover:-translate-y-px"
                style={{ border: `1.5px solid ${card.btnBorderColor}`, color: card.btnTextColor, background: "transparent", boxShadow: card.btnGlow }}
              >
                Get Started →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
