"use client";

interface CardSection {
  icon: string;
  label: string;
  items: string[];
}

interface CardDef {
  title: string;
  accent: string;
  accentClass: string;
  subtext: string;
  checks: string[];
  sections?: CardSection[];
  img: string;
  alt: string;
  badge?: string;
  cta: string;
  href: string;
  colorClasses: {
    bg: string;
    border: string;
    text: string;
    check: string;
    badge: string;
    ctaBg: string;
  };
}

const CARDS: CardDef[] = [
  {
    title: "Async",
    accent: "Visit",
    accentClass: "text-pink-400",
    subtext: "Submit symptoms for provider review",
    checks: ["Tell us about your symptoms", "Provider reviews in queue", "Rx sent if appropriate"],
    img: "/assets/asyncvisitdocoroncomputer2.png",
    alt: "Async Visit",
    badge: "FASTEST",
    cta: "Send Symptoms Now",
    href: "/express-checkout?type=async",
    colorClasses: {
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      text: "text-pink-400",
      check: "text-pink-400",
      badge: "bg-pink-500 text-black",
      ctaBg: "bg-pink-500",
    },
  },
  {
    title: "SMS",
    accent: "Visit",
    accentClass: "text-purple-400",
    subtext: "Text or call without a busy schedule.",
    checks: ["Quick, back-and-forth chat", "Calls without the wait", "Response in 1-2 hours"],
    img: "/assets/cards/resized_800X600/smsvisit.png",
    alt: "SMS Visit",
    badge: "FAST",
    cta: "Start Chat Now",
    href: "/express-checkout?type=sms",
    colorClasses: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      check: "text-purple-400",
      badge: "bg-purple-500 text-black",
      ctaBg: "bg-purple-500",
    },
  },
  {
    title: "Rx",
    accent: "Refill",
    accentClass: "text-green-400",
    subtext: "Faster Care, Same Quality",
    checks: ["Reviewed in minutes, not hours", "Refill or adjust your medication quickly", "Sent directly to your pharmacy"],
    img: "/assets/cards/resized_800X600/refilvisit2.png",
    alt: "Rx Refill",
    badge: "FAST",
    cta: "Send Refill Request",
    href: "/express-checkout?type=rx-refill",
    colorClasses: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      text: "text-green-400",
      check: "text-green-400",
      badge: "bg-green-500 text-black",
      ctaBg: "bg-green-500",
    },
  },
  {
    title: "Live",
    accent: "Video Visit",
    accentClass: "text-blue-400",
    subtext: "Face-to-Face Care, Instantly",
    checks: ["Same-Day Appointments", "Personalized Diagnosis", "Prescriptions sent during your visit"],
    img: "/assets/cards/resized_800X600/smsvisitladyoncouch.png",
    alt: "Video Visit",
    cta: "Start My Visit",
    href: "/express-checkout?type=video",
    colorClasses: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      check: "text-blue-400",
      badge: "bg-blue-500 text-black",
      ctaBg: "bg-blue-500",
    },
  },
  {
    title: "Phone",
    accent: "Visit",
    accentClass: "text-cyan-400",
    subtext: "Talk to your provider. No camera needed.",
    checks: ["Schedule a call", "Provider calls you directly", "Rx sent if appropriate"],
    img: "/assets/cards/resized_800X600/phonevisit.png",
    alt: "Phone Visit",
    cta: "Schedule My Call",
    href: "/express-checkout?type=phone",
    colorClasses: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      check: "text-cyan-400",
      badge: "bg-cyan-500 text-black",
      ctaBg: "bg-cyan-500",
    },
  },
  {
    title: "Instant",
    accent: "Visit",
    accentClass: "text-orange-400",
    subtext: "First available provider. No wait.",
    checks: ["Wait in the online queue", "Quick treatment — no call", "First available provider"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_01_29 PM.png",
    alt: "Instant Visit",
    cta: "Take Next Spot",
    href: "/express-checkout?type=instant",
    colorClasses: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      check: "text-orange-400",
      badge: "bg-orange-500 text-black",
      ctaBg: "bg-orange-500",
    },
  },
];

function VisitCard({ card, onClick }: { card: CardDef; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        className={`group flex flex-col text-left w-full rounded-xl border transition-all duration-200 cursor-pointer
          ${card.colorClasses.bg} ${card.colorClasses.border}
          hover:bg-white/5 hover:border-white/20 hover:scale-[1.01]
          active:scale-[0.98] active:bg-white/5 active:border-white/20`}
      >
        {/* Zone 1 — Title */}
        <div className="px-4 pt-4 pb-2 text-center w-full">
          <span className="text-white font-semibold text-sm">
            {card.title}{" "}
            <span className={card.accentClass}>{card.accent}</span>
          </span>
        </div>

        {/* Zone 2 — Image with hover+active zoom, badge scale */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
          {card.badge && (
            <div className={`absolute top-2 left-2 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition-transform duration-200 group-hover:scale-110 group-active:scale-110 ${card.colorClasses.badge}`}>
              {card.badge}
            </div>
          )}
          <img
            src={card.img}
            alt={card.alt}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105 group-active:scale-105"
          />
        </div>

        {/* Zone 3 — Content */}
        <div className="px-4 py-4 w-full">
          {card.subtext && (
            <p className="text-white font-semibold text-center mb-3 leading-snug" style={{ fontSize: "clamp(10px, 1.6vw, 12px)" }}>
              {card.subtext}
            </p>
          )}
          {card.sections ? (
            <div className="flex flex-col gap-3">
              {card.sections.map((s) => (
                <div key={s.label}>
                  <div className={`flex items-center gap-1.5 mb-1 font-bold ${card.colorClasses.text}`} style={{ fontSize: "clamp(10px, 1.4vw, 11px)" }}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                  <div className="flex flex-col gap-1 pl-1">
                    {s.items.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <span className={`font-bold flex-shrink-0 ${card.colorClasses.check}`} style={{ fontSize: "clamp(11px, 1.6vw, 13px)" }}>✓</span>
                        <span className="text-gray-300 font-medium leading-snug" style={{ fontSize: "clamp(11px, 1.5vw, 13px)" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {card.checks.map((c) => (
                <div key={c} className="flex items-start gap-2">
                  <span className={`font-bold flex-shrink-0 ${card.colorClasses.check}`} style={{ fontSize: "clamp(11px, 1.6vw, 13px)" }}>✓</span>
                  <span className="text-gray-300 font-medium leading-snug" style={{ fontSize: "clamp(11px, 1.5vw, 13px)" }}>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* CTA — badge color bg, white bold text, glow */}
      <button
        onClick={onClick}
        className={`w-full py-3 rounded-full font-black transition-all duration-200 cursor-pointer
          ${card.colorClasses.ctaBg}
          hover:opacity-90 active:scale-[0.97] active:opacity-90`}
        style={{
          fontSize: "clamp(11px, 1.8vw, 14px)",
          color: "#ffffff",
          textShadow: "0 0 10px rgba(255,255,255,0.6)",
          boxShadow: "0 0 14px rgba(255,255,255,0.1)",
          border: "none",
        }}
      >
        {card.cta} →
      </button>
    </div>
  );
}

export default function VisitCards({ onCardClick }: { onCardClick: (type: string) => void }) {
  const go = (href: string) => onCardClick(href.split("type=")[1] || "async");

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="order-1 md:order-1"><VisitCard card={CARDS[0]} onClick={() => go(CARDS[0].href)} /></div>
      <div className="order-2 md:order-2"><VisitCard card={CARDS[1]} onClick={() => go(CARDS[1].href)} /></div>
      <div className="order-3 md:order-3"><VisitCard card={CARDS[2]} onClick={() => go(CARDS[2].href)} /></div>
      <div className="order-5 md:order-4"><VisitCard card={CARDS[3]} onClick={() => go(CARDS[3].href)} /></div>
      <div className="order-6 md:order-5"><VisitCard card={CARDS[4]} onClick={() => go(CARDS[4].href)} /></div>
      <div className="order-4 md:order-6"><VisitCard card={CARDS[5]} onClick={() => go(CARDS[5].href)} /></div>
    </div>
  );
}
