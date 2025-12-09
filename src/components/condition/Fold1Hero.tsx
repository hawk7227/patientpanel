"use client";

import React from "react";

interface Fold1HeroProps {
  title: string;          // condition name ("UTI & STD Treatment", "Migraine Care", etc.)
  subtitle: string;       // usually "Private [State] Telehealth"
  onStartVisit?: () => void;
  onBookVisit?: () => void;
}

export default function Fold1Hero({
  title,
  subtitle,
  onStartVisit,
  onBookVisit
}: Fold1HeroProps) {
  return (
    <section
      className="
        relative min-h-[90vh] flex flex-col justify-center items-center
        px-6 py-20 text-center overflow-hidden
        bg-[url('/assets/hero.webp')] bg-cover bg-center
      "
    >
      {/* Overlay */}
      <div
        className="
          absolute inset-0 bg-black/60 backdrop-blur-xl
          shadow-[0_0_80px_rgba(0,221,176,0.25)]
        "
      />

      {/* Content */}
      <div
        className="
          relative z-10 max-w-3xl mx-auto 
          bg-black/40 backdrop-blur-2xl rounded-2xl
          border border-white/10
          shadow-[0_0_40px_rgba(0,221,176,0.3)]
          px-10 py-12
        "
      >
        {/* Subtitle */}
        <p
          className="
            text-white font-semibold tracking-wide mb-2
            drop-shadow-[0_0_6px_rgba(0,221,176,0.4)]
          "
        >
          {subtitle}
        </p>

        {/* Title */}
        <h1
          className="
            text-white text-4xl md:text-5xl font-bold
            mb-4 leading-snug
            drop-shadow-[0_0_12px_rgba(0,221,176,0.5)]
          "
        >
          {title}
        </h1>

        {/* Description */}
        <p
          className="
            text-white/80 text-lg max-w-xl mx-auto
            leading-relaxed mb-8
          "
        >
          Describe your symptoms privately and securely. A licensed clinician
          reviews your submission and provides next-step guidance based on your description.
        </p>

        {/* CTA Buttons */}
        <div
          className="
            flex flex-wrap justify-center gap-4 mb-6
          "
        >
          <button
            onClick={onStartVisit}
            className="
              px-6 py-3 rounded-xl font-bold text-white 
              bg-gradient-to-r from-[#006f5f] to-[#00ddb0]
              border border-[#00ddb0]
              shadow-[0_0_20px_rgba(0,221,176,0.4)]
              hover:shadow-[0_0_26px_rgba(0,221,176,0.65)]
              hover:translate-y-[-2px] transition-all
            "
          >
            Start an Instant Visit →
          </button>

          <button
            onClick={onBookVisit}
            className="
              px-6 py-3 rounded-xl font-semibold
              text-white bg-white/10 border border-white/40
              hover:border-[#00ddb0] hover:text-[#00ddb0]
              hover:translate-y-[-2px]
              transition-all
            "
          >
            Book Appointment →
          </button>
        </div>

        {/* Availability */}
        <div
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-white/10 backdrop-blur-xl
            border border-white/20 rounded-full
            text-[#00ddb0] font-semibold text-sm
            shadow-[0_0_12px_rgba(0,221,176,0.5)]
          "
        >
          <span className="w-3 h-3 bg-[#00ddb0] rounded-full animate-pulse" />
          Provider Available Now
        </div>
      </div>
    </section>
  );
}
