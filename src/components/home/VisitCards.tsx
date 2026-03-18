"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CardDef {
  title: string;
  accent: string;
  accentColor: string;
  subtext: string;
  checks: string[];
  img: string;
  alt: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  color: string;
  btnBorder: string;
  btnText: string;
  glow: string;
}

const C = "#00e0c0";
const P = "#c084fc";
const O = "#f59e0b";

const CARDS: CardDef[] = [
  {
    title: "Get Seen ",
    accent: "Without Being Seen",
    accentColor: C,
    subtext: "No video. No phone. Just results.",
    checks: ["Tell us about your symptoms", "Provider reviews in queue", "Rx sent if appropriate"],
    img: "/assets/cards/card-01-white-monitor.png",
    alt: "Async Visit",
    badge: "FASTEST",
    badgeColor: C,
    href: "/express-checkout?type=async",
    color: C, btnBorder: C, btnText: C,
    glow: "0 0 14px rgba(0,224,192,0.25)",
  },
  {
    title: "Text Your Way to ",
    accent: "Better Health",
    accentColor: C,
    subtext: "No app. No wait. Just text.",
    checks: ["Send symptoms via SMS", "Provider replies directly", "Rx sent if appropriate"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_06_36 PM.png",
    alt: "SMS Visit",
    badge: "FAST",
    badgeColor: C,
    href: "/express-checkout?type=sms",
    color: C, btnBorder: C, btnText: C,
    glow: "0 0 14px rgba(0,224,192,0.25)",
  },
  {
    title: "Live ",
    accent: "Video Visit",
    accentColor: C,
    subtext: "Face-to-face with your provider.",
    checks: ["Book a time slot", "Join from your phone", "Get care in minutes"],
    img: "/assets/cards/card-03-video-ui-alt.png",
    alt: "Video Visit",
    href: "/express-checkout?type=video",
    color: C, btnBorder: C, btnText: C,
    glow: "0 0 14px rgba(0,224,192,0.25)",
  },
  {
    title: "Phone ",
    accent: "Visit",
    accentColor: P,
    subtext: "Talk to your provider. No camera needed.",
    checks: ["Schedule a call", "Provider calls you directly", "Rx sent if appropriate"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_01_29 PM.png",
    alt: "Phone Visit",
    href: "/express-checkout?type=phone",
    color: P, btnBorder: "#a855f7", btnText: P,
    glow: "0 0 14px rgba(168,85,247,0.25)",
  },
  {
    title: "Join the provider ",
    accent: "queue instantly",
    accentColor: O,
    subtext: "First available provider. No appointment needed.",
    checks: ["Wait in the online queue", "Quick treatment — no call", "First available provider"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_11_15 PM.png",
    alt: "Instant Visit",
    badge: "FASTEST",
    badgeColor: O,
    href: "/express-checkout?type=instant",
    color: O, btnBorder: O, btnText: O,
    glow: "0 0 14px rgba(245,158,11,0.25)",
  },
  {
    title: "Quick Rx Refill — ",
    accent: "Skip the Wait",
    accentColor: O,
    subtext: "Select meds. Provider approves. Done.",
    checks: ["Select your medication", "Provider reviews & approves", "Sent to your pharmacy"],
    img: "/assets/cards/ChatGPT Image Mar 18, 2026, 04_02_36 PM.png",
    alt: "Rx Refill",
    badge: "FAST",
    badgeColor: O,
    href: "/express-checkout?type=rx-refill",
    color: O, btnBorder: O, btnText: O,
    glow: "0 0 14px rgba(245,158,11,0.25)",
  },
];

function CardContent({ card }: { card: CardDef }) {
  return (
    <>
      <img src={card.img} alt={card.alt} className="card-img" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "top center",
        transition: "transform 220ms ease-out", willChange: "transform",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.3) 55%,transparent 100%)",
      }} />
      {card.badge && (
        <div className="card-badge" style={{
          position: "absolute", top: 10, left: 10,
          background: card.badgeColor, color: "#0a0a0a",
          fontSize: 9, fontWeight: 900, letterSpacing: "0.05em",
          textTransform: "uppercase", padding: "3px 10px",
          borderRadius: 999, zIndex: 3,
          willChange: "transform", transition: "transform 200ms ease-out",
        }}>{card.badge}</div>
      )}
      <div className="card-content" style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 12, zIndex: 3,
        willChange: "transform", transition: "transform 200ms ease-out",
      }}>
        <h3 style={{ color: "#fff", fontWeight: 900, lineHeight: 1.25, marginBottom: 4, fontSize: "clamp(11px, 1.8vw, 15px)" }}>
          {card.title}<span style={{ color: card.accentColor }}>{card.accent}</span>
        </h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(9px,1.1vw,11px)", marginBottom: 6 }}>{card.subtext}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {card.checks.map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: "clamp(8px,1vw,10px)" }}>
              <div style={{
                flexShrink: 0, width: 11, height: 11, borderRadius: "50%",
                background: `${card.color}22`, color: card.color,
                fontSize: 7, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
              }}>✓</div>
              <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ParallaxCard({ card, onClick }: { card: CardDef; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    const img = ref.current.querySelector<HTMLElement>(".card-img");
    const content = ref.current.querySelector<HTMLElement>(".card-content");
    const badge = ref.current.querySelector<HTMLElement>(".card-badge");
    if (img) img.style.transform = `scale(1.06) translate(${x * -8}px,${y * -8}px)`;
    if (content) content.style.transform = `translate(${x * 6}px,${y * 6}px)`;
    if (badge) badge.style.transform = `translate(${x * 10}px,${y * 10}px)`;
  }, []);

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ["card-img", "card-content", "card-badge"].forEach((cls) => {
      const el = ref.current!.querySelector<HTMLElement>(`.${cls}`);
      if (el) el.style.transform = "";
    });
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      style={{
        position: "relative", width: "100%", aspectRatio: "3/4",
        borderRadius: 16, overflow: "hidden", cursor: "pointer",
        border: `1.5px solid ${card.color}44`, background: "#111118",
      }}>
      <CardContent card={card} />
    </div>
  );
}

function Btn({ card, onClick }: { card: CardDef; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "11px 0", borderRadius: 999,
      border: `1.5px solid ${card.btnBorder}`, color: card.btnText,
      background: "transparent", boxShadow: card.glow,
      fontWeight: 900, fontSize: 13, cursor: "pointer",
      transition: "opacity 180ms",
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >Get Started →</button>
  );
}

function Carousel({ cards, onCta }: { cards: CardDef[]; onCta: (href: string) => void }) {
  const [cur, setCur] = useState(0);
  const [autoOn, setAutoOn] = useState(true);
  const txRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!autoOn) return;
    timerRef.current = setInterval(() => setCur((c) => (c + 1) % cards.length), 2500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoOn, cards.length]);

  const stop = () => { setAutoOn(false); if (timerRef.current) clearInterval(timerRef.current); };
  const go = (n: number) => setCur(((n % cards.length) + cards.length) % cards.length);
  const card = cards[cur];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div onClick={stop}
        onTouchStart={(e) => { txRef.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { stop(); const d = txRef.current - e.changedTouches[0].clientX; if (Math.abs(d) > 30) go(cur + (d > 0 ? 1 : -1)); }}
        style={{
          position: "relative", width: "100%", aspectRatio: "3/4",
          borderRadius: 16, overflow: "hidden", cursor: "pointer",
          border: `1.5px solid ${card.color}55`, background: "#111118",
        }}>
        <CardContent card={card} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {cards.map((_, i) => (
          <button key={i} onClick={() => { stop(); go(i); }} style={{
            width: 6, height: 6, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
            background: i === cur ? card.color : "rgba(255,255,255,0.2)",
            transform: i === cur ? "scale(1.3)" : "scale(1)",
            transition: "all 200ms",
          }} />
        ))}
      </div>
      <Btn card={card} onClick={() => onCta(card.href)} />
    </div>
  );
}

function Slot({ card, onClick }: { card: CardDef; onClick: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ParallaxCard card={card} onClick={onClick} />
      <Btn card={card} onClick={onClick} />
    </div>
  );
}

export default function VisitCards({ onCardClick }: { onCardClick: (type: string) => void }) {
  const go = (href: string) => onCardClick(href.split("type=")[1] || "async");

  return (
    <section style={{ background: "#0a0a0f", padding: "64px 16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{
          textAlign: "center", color: "#fff", fontWeight: 900,
          marginBottom: 12, fontSize: "clamp(22px,4vw,34px)",
        }}>
          Choose How You Want to{" "}
          <span style={{ color: "#00e0c0" }}>Be Treated</span>
        </h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 32 }}>
          Every visit type is handled by your provider. Same person. Every time.
        </p>

        {/* Row 1 — 3 equal columns, minmax(0) prevents blowout */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12, marginBottom: 12,
        }}>
          <Carousel cards={[CARDS[0], CARDS[1]]} onCta={go} />
          <Slot card={CARDS[2]} onClick={() => go(CARDS[2].href)} />
          <Slot card={CARDS[3]} onClick={() => go(CARDS[3].href)} />
        </div>

        {/* Row 2 — 2 columns, centered at 66% of row 1 width */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
          maxWidth: "66.666%",
          margin: "0 auto",
        }}>
          <Slot card={CARDS[4]} onClick={() => go(CARDS[4].href)} />
          <Slot card={CARDS[5]} onClick={() => go(CARDS[5].href)} />
        </div>
      </div>
    </section>
  );
}
