"use client";

interface CardDef {
  title: string;
  accent: string;
  accentClass: string;
  subtext: string;
  checks: string[];
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
    title: "Async", accent: "Visit", accentClass: "text-pink-400",
    subtext: "Submit symptoms for provider review",
    checks: ["Tell us about your symptoms", "Provider reviews in queue", "Rx sent if appropriate"],
    img: "/assets/asyncvisitdocoroncomputer2.png", alt: "Async Visit", badge: "FASTEST",
    cta: "Send Symptoms Now", href: "/express-checkout?type=async",
    colorClasses: { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400", check: "text-pink-400", badge: "bg-pink-500 text-black", ctaBg: "bg-pink-500" },
  },
  {
    title: "SMS", accent: "Visit", accentClass: "text-purple-400",
    subtext: "Text or call without a busy schedule.",
    checks: ["Quick, back-and-forth chat", "Calls without the wait", "Response in 1-2 hours"],
    img: "/assets/cards/resized_800X600/smsvisit.png", alt: "SMS Visit", badge: "FAST",
    cta: "Start Chat Now", href: "/express-checkout?type=sms",
    colorClasses: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", check: "text-purple-400", badge: "bg-purple-500 text-black", ctaBg: "bg-purple-500" },
  },
  {
    title: "Rx", accent: "Refill", accentClass: "text-green-400",
    subtext: "Faster Care, Same Quality",
    checks: ["Reviewed in minutes, not hours", "Refill or adjust your medication quickly", "Sent directly to your pharmacy"],
    img: "/assets/cards/resized_800X600/refilvisit2.png", alt: "Rx Refill", badge: "FAST",
    cta: "Send Refill Request", href: "/express-checkout?type=rx-refill",
    colorClasses: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", check: "text-green-400", badge: "bg-green-500 text-black", ctaBg: "bg-green-500" },
  },
  {
    title: "Live", accent: "Video Visit", accentClass: "text-blue-400",
    subtext: "Face-to-Face Care",
    checks: ["Same-Day Appointments", "Personalized Diagnosis", "Prescriptions sent during your visit"],
    img: "/assets/cards/resized_800X600/smsvisitladyoncouch.png", alt: "Video Visit",
    cta: "Start My Visit", href: "/express-checkout?type=video",
    colorClasses: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", check: "text-blue-400", badge: "bg-blue-500 text-black", ctaBg: "bg-blue-500" },
  },
  {
    title: "Phone", accent: "Visit", accentClass: "text-cyan-400",
    subtext: "Talk to your provider. No camera needed.",
    checks: ["Schedule a call", "Provider calls you directly", "Rx sent if appropriate"],
    img: "/assets/cards/resized_800X600/phonevisit.png", alt: "Phone Visit",
    cta: "Schedule My Call", href: "/express-checkout?type=phone",
    colorClasses: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", check: "text-cyan-400", badge: "bg-cyan-500 text-black", ctaBg: "bg-cyan-500" },
  },
  {
    title: "Instant", accent: "Visit", accentClass: "text-orange-400",
    subtext: "First available provider. No wait.",
    checks: ["Wait in the online queue", "Quick treatment — no call", "First available provider"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_01_29 PM.png", alt: "Instant Visit",
    cta: "Take Next Spot", href: "/express-checkout?type=instant",
    colorClasses: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", check: "text-orange-400", badge: "bg-orange-500 text-black", ctaBg: "bg-orange-500" },
  },
];

/* ── Individual card column content (shared by both layouts) ── */
function CardInner({ card, onClick, roundLeft, roundRight }: {
  card: CardDef;
  onClick: () => void;
  roundLeft?: boolean;
  roundRight?: boolean;
}) {
  const radius = roundLeft && roundRight ? "rounded-xl"
    : roundLeft ? "rounded-l-xl rounded-r-none"
    : roundRight ? "rounded-r-xl rounded-l-none"
    : "rounded-xl";

  const ctaRadius = roundLeft && roundRight ? "rounded-full"
    : roundLeft ? "rounded-bl-xl rounded-br-none rounded-t-none"
    : roundRight ? "rounded-br-xl rounded-bl-none rounded-t-none"
    : "rounded-full";

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onClick}
        className={`group flex flex-col text-left w-full border transition-all duration-200 cursor-pointer flex-1
          ${card.colorClasses.bg} ${card.colorClasses.border} ${radius}
          hover:bg-white/5 hover:border-white/20 active:scale-[0.98] active:bg-white/5`}
      >
        <div className="px-3 pt-3 pb-1.5 text-center w-full">
          <span className="text-white font-semibold text-sm">
            {card.title} <span className={card.accentClass}>{card.accent}</span>
          </span>
        </div>
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
          {card.badge && (
            <div className={`absolute top-2 left-2 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full group-hover:scale-110 group-active:scale-110 transition-transform duration-200 ${card.colorClasses.badge}`}>
              {card.badge}
            </div>
          )}
          <img src={card.img} alt={card.alt} className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105 group-active:scale-105" />
        </div>
        <div className="px-3 py-3 w-full">
          {card.subtext && (
            <p className="text-white font-semibold text-center mb-2 leading-snug" style={{ fontSize: "clamp(9px,1.5vw,12px)" }}>
              {card.subtext}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {card.checks.map((c) => (
              <div key={c} className="flex items-start gap-1.5">
                <span className={`font-bold flex-shrink-0 ${card.colorClasses.check}`} style={{ fontSize: "clamp(10px,1.5vw,12px)" }}>✓</span>
                <span className="text-gray-300 font-medium leading-snug" style={{ fontSize: "clamp(9px,1.4vw,11px)" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </button>
      <button
        onClick={onClick}
        className={`w-full py-2.5 font-black transition-all duration-200 cursor-pointer mt-1.5 ${card.colorClasses.ctaBg} ${ctaRadius} hover:opacity-90 active:scale-[0.97]`}
        style={{ fontSize: "clamp(10px,1.6vw,13px)", color: "#fff", textShadow: "0 0 10px rgba(255,255,255,0.6)", border: "none" }}
      >
        {card.cta} →
      </button>
    </div>
  );
}

/* ── Desktop standalone card (rounded all sides) ── */
function DesktopCard({ card, onClick }: { card: CardDef; onClick: () => void }) {
  return <CardInner card={card} onClick={onClick} roundLeft roundRight />;
}

/* ── Mobile unified pair (two cols touching, shared outer radius) ── */
function MobilePair({ left, right, onLeft, onRight }: {
  left: CardDef; right: CardDef;
  onLeft: () => void; onRight: () => void;
}) {
  return (
    <div className="flex w-full">
      <div className="flex-1 min-w-0">
        <CardInner card={left} onClick={onLeft} roundLeft />
      </div>
      {/* Single shared divider */}
      <div className={`w-px self-stretch border-l ${left.colorClasses.border} opacity-60`} />
      <div className="flex-1 min-w-0">
        <CardInner card={right} onClick={onRight} roundRight />
      </div>
    </div>
  );
}

export default function VisitCards({ onCardClick }: { onCardClick: (type: string) => void }) {
  const go = (href: string) => onCardClick(href.split("type=")[1] || "async");

  return (
    <>
      {/* ── MOBILE: 3 unified pair rows ── */}
      <div className="flex flex-col gap-2 md:hidden">
        <MobilePair left={CARDS[0]} right={CARDS[1]} onLeft={() => go(CARDS[0].href)} onRight={() => go(CARDS[1].href)} />
        <MobilePair left={CARDS[2]} right={CARDS[3]} onLeft={() => go(CARDS[2].href)} onRight={() => go(CARDS[3].href)} />
        <MobilePair left={CARDS[4]} right={CARDS[5]} onLeft={() => go(CARDS[4].href)} onRight={() => go(CARDS[5].href)} />
      </div>

      {/* ── DESKTOP: 3-col grid, all 6 separate cards ── */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {CARDS.map((card) => (
          <div key={card.alt}>
            <DesktopCard card={card} onClick={() => go(card.href)} />
          </div>
        ))}
      </div>
    </>
  );
}
