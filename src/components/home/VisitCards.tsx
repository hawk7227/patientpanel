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
  href: string;
  colorClasses: {
    bg: string;
    border: string;
    text: string;
    check: string;
    badge: string;
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
    href: "/express-checkout?type=async",
    colorClasses: {
      bg: "bg-pink-500/10",
      border: "border-pink-500/30",
      text: "text-pink-400",
      check: "text-pink-400",
      badge: "bg-pink-500 text-black",
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
    href: "/express-checkout?type=sms",
    colorClasses: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      check: "text-purple-400",
      badge: "bg-purple-500 text-black",
    },
  },
  {
    title: "Live",
    accent: "Video Visit",
    accentClass: "text-blue-400",
    subtext: "Face-to-Face Care, Instantly",
    checks: [],
    sections: [
      { icon: "⚡", label: "Same-Day Appointments", items: ["Personalized Diagnosis"] },
      { icon: "💊", label: "Immediate Treatment", items: ["Prescriptions sent during your visit", "No follow-up needed"] },
    ],
    img: "/assets/cards/resized_800X600/smsvisitladyoncouch.png",
    alt: "Video Visit",
    href: "/express-checkout?type=video",
    colorClasses: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      check: "text-blue-400",
      badge: "bg-blue-500 text-black",
    },
  },
  {
    title: "Phone",
    accent: "Visit",
    accentClass: "text-purple-400",
    subtext: "Talk to your provider. No camera needed.",
    checks: ["Schedule a call", "Provider calls you directly", "Rx sent if appropriate"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_01_29 PM.png",
    alt: "Phone Visit",
    href: "/express-checkout?type=phone",
    colorClasses: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      check: "text-purple-400",
      badge: "bg-purple-500 text-black",
    },
  },
  {
    title: "Instant",
    accent: "Visit",
    accentClass: "text-orange-400",
    subtext: "First available provider. No appointment needed.",
    checks: ["Wait in the online queue", "Quick treatment — no call", "First available provider"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_11_15 PM.png",
    alt: "Instant Visit",
    badge: "FASTEST",
    href: "/express-checkout?type=instant",
    colorClasses: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      check: "text-orange-400",
      badge: "bg-orange-500 text-black",
    },
  },
  {
    title: "Rx",
    accent: "Refill",
    accentClass: "text-green-400",
    subtext: "Faster Care, Same Quality",
    checks: [],
    sections: [
      { icon: "⚡", label: "Faster Care, Same Quality", items: ["Reviewed in minutes, not hours", "No waiting rooms, no scheduling"] },
      { icon: "💊", label: "Easy Prescription Renewal", items: ["Refill or adjust your medication quickly", "Sent directly to your pharmacy"] },
      { icon: "🔒", label: "Do It From Anywhere", items: ["Phone, tablet, or desktop", "Takes under 60 seconds to submit"] },
    ],
    img: "/assets/cards/resized_800X600/refilvisit2.png",
    alt: "Rx Refill",
    badge: "FAST",
    href: "/express-checkout?type=rx-refill",
    colorClasses: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      text: "text-green-400",
      check: "text-green-400",
      badge: "bg-green-500 text-black",
    },
  },
];

function VisitCard({ card, onClick }: { card: CardDef; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      {/* Card — exact same panel style as condition cards: bg-color-10 border border-color-30 rounded-xl */}
      <button
        onClick={onClick}
        className={`group flex flex-col text-left w-full rounded-xl border transition-all
          ${card.colorClasses.bg} ${card.colorClasses.border}
          hover:bg-white/5 hover:border-white/20`}
      >
        {/* Zone 1 — Title */}
        <div className="px-4 pt-4 pb-2 text-center w-full">
          <span className="text-white font-semibold text-sm">
            {card.title}{" "}
            <span className={card.accentClass}>{card.accent}</span>
          </span>
        </div>

        {/* Zone 2 — Image */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
          {card.badge && (
            <div className={`absolute top-2 left-2 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${card.colorClasses.badge}`}>
              {card.badge}
            </div>
          )}
          <img
            src={card.img}
            alt={card.alt}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>

        {/* Zone 3 — Content */}
        <div className="px-4 py-4 w-full">
          <p className="text-white font-semibold text-xs text-center mb-3 leading-snug">
            {card.subtext}
          </p>
          {card.sections ? (
            <div className="flex flex-col gap-3">
              {card.sections.map((s) => (
                <div key={s.label}>
                  <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold ${card.colorClasses.text}`}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                  <div className="flex flex-col gap-1 pl-1">
                    {s.items.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <span className={`font-bold text-sm flex-shrink-0 ${card.colorClasses.check}`}>✓</span>
                        <span className="text-gray-300 text-[11px] font-medium">{item}</span>
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
                  <span className={`font-bold text-sm flex-shrink-0 ${card.colorClasses.check}`}>✓</span>
                  <span className="text-gray-300 text-[11px] font-medium">{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* CTA — separated below card, same glass style */}
      <button
        onClick={onClick}
        className={`w-full py-3 rounded-full text-xs font-bold transition-all
          border ${card.colorClasses.border} ${card.colorClasses.text}
          ${card.colorClasses.bg} hover:bg-white/5`}
      >
        Get Started →
      </button>
    </div>
  );
}

export default function VisitCards({ onCardClick }: { onCardClick: (type: string) => void }) {
  const go = (href: string) => onCardClick(href.split("type=")[1] || "async");

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 font-serif text-center">
          Choose How You Want to <span className="text-teal-400">Be Treated</span>
        </h2>
        <p className="text-center text-sm text-gray-500 mb-10">
          Every visit type is handled by your provider. Same person. Every time.
        </p>

        {/* Row 1 — 3 columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          {CARDS.slice(0, 3).map((card) => (
            <VisitCard key={card.alt} card={card} onClick={() => go(card.href)} />
          ))}
        </div>

        {/* Row 2 — 2 centered */}
        <div className="grid grid-cols-2 gap-3 max-w-[66%] mx-auto">
          {CARDS.slice(3, 5).map((card) => (
            <VisitCard key={card.alt} card={card} onClick={() => go(card.href)} />
          ))}
        </div>

      </div>
    </section>
  );
}
