"use client";

import React from "react";

interface WhyItem {
  title: string;
  description: string;
}

interface Fold10Props {
  items?: WhyItem[];
  title?: string;
  subtitle?: string;
}

export default function Fold10WhyUs({
  items = [
    {
      title: "Private & Secure Communication",
      description:
        "All interactions occur through encrypted channels designed to protect personal information."
    },
    {
      title: "Licensed Clinicians",
      description:
        "A licensed clinician reviews every submission and provides general educational guidance."
    },
    {
      title: "No Waiting Rooms",
      description:
        "Adults can describe symptoms privately without sitting in a clinic waiting area."
    },
    {
      title: "Convenient Online Access",
      description:
        "Submit symptoms from any location within the state during available hours."
    },
    {
      title: "Clear Next-Step Guidance",
      description:
        "Telehealth provides information about when in-person care may be appropriate."
    }
  ],
  title = "Why Adults Use This Service",
  subtitle = "A private, secure way to describe symptoms and receive general educational guidance."
}: Fold10Props) {
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
          w-full max-w-6xl text-center
          bg-white/5 backdrop-blur-xl rounded-2xl
          border border-white/10
          shadow-[0_0_30px_rgba(0,221,176,0.35)]
          px-10 py-14
        "
      >
        {/* Title */}
        <h2
          className="
            text-white text-3xl font-bold mb-4
            drop-shadow-[0_0_10px_rgba(0,221,176,0.45)]
          "
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p
          className="
            text-white/70 text-base mb-10 leading-relaxed
            max-w-xl mx-auto
          "
        >
          {subtitle}
        </p>

        {/* Grid */}
        <div
          className="
            grid gap-8
            grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          "
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className="
                bg-white/10 border border-white/10 rounded-2xl 
                shadow-[0_0_18px_rgba(0,221,176,0.35)]
                hover:shadow-[0_0_24px_rgba(0,221,176,0.55)]
                transition-all
                p-6 text-left
              "
            >
              <h3
                className="
                  text-[#00ddb0] font-bold text-lg mb-2
                "
              >
                {item.title}
              </h3>

              <p
                className="
                  text-white/70 text-sm leading-relaxed
                "
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <p
          className="
            text-[#00ddb0] font-semibold text-center mt-12 text-sm
          "
        >
          *This information is for general educational purposes.*
        </p>
      </div>
    </section>
  );
}
