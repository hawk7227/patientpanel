"use client";

import React from "react";
import { CityEntry } from "@/config/city-config";

interface Fold8CitiesProps {
  cities: CityEntry[];
  stateSlug: string; // ex: "florida"
  title?: string;
  subtitle?: string;
}

export default function Fold8Cities({
  cities,
  stateSlug,
  title = "Cities We Serve",
  subtitle = "Adults across the state can access private, secure telehealth. These local pages help individuals find educational information relevant to their region."
}: Fold8CitiesProps) {
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
          w-full max-w-4xl text-center
          bg-white/5 backdrop-blur-xl rounded-2xl
          border border-white/10
          shadow-[0_0_30px_rgba(0,221,176,0.35)]
          px-8 py-12
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

        {/* Cities Grid */}
        <div
          className="
            grid gap-4
            grid-cols-1 sm:grid-cols-2 md:grid-cols-3
          "
        >
          {cities.map((city, idx) => (
            <a
              key={idx}
              href={`/urgent-care/${stateSlug}/${city.slug}`}
              className="
                block px-5 py-4 
                bg-white/10 border border-white/10 rounded-xl
                shadow-[0_0_16px_rgba(0,221,176,0.3)]
                text-[#00ddb0] font-semibold
                hover:bg-white/20 hover:shadow-[0_0_22px_rgba(0,221,176,0.5)]
                transition-all
              "
            >
              {city.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
