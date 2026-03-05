"use client";

import React from "react";

interface Fold6TestimonialProps {
  quote?: string;
  location?: string;      // e.g. "Tampa, FL"
  label?: string;         // e.g. "Verified Patient"
}

export default function Fold6Testimonial({
  quote = "“The process was private, quick, and very easy. I felt comfortable describing my symptoms and appreciated the fast review.”",
  location = "Verified Visit",
  label = "Verified Patient"
}: Fold6TestimonialProps) {
  return (
    <section
      className="
        w-full py-20 px-6 
        bg-gradient-to-b from-[#0B0F12] to-[#141B1E]
        flex justify-center
      "
    >
      <div
        className="
          w-full max-w-3xl text-center
          bg-white/5 backdrop-blur-xl rounded-2xl
          border border-white/10
          shadow-[0_0_35px_rgba(0,221,176,0.35)]
          px-10 py-14
        "
      >
        {/* Quote */}
        <p
          className="
            text-white text-xl md:text-2xl font-serif italic leading-relaxed
            mb-6
            drop-shadow-[0_0_12px_rgba(0,221,176,0.3)]
          "
        >
          {quote}
        </p>

        {/* Meta */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[#00ddb0] font-semibold text-sm tracking-wide">
            — {location}
          </span>

          <span className="text-white/60 text-xs">
            {label}
          </span>
        </div>
      </div>
    </section>
  );
}
