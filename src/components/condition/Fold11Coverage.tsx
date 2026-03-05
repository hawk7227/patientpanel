"use client";

import React from "react";
import { CoverageRegion } from "@/config/coverage-config";

interface Fold11CoverageProps {
  coverage: CoverageRegion[];
  title?: string;
  subtitle?: string;
}

export default function Fold11Coverage({
  coverage,
  title = "State Coverage Areas",
  subtitle = "These educational region groupings reflect common geographic areas where adults may seek telehealth information."
}: Fold11CoverageProps) {
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
          w-full max-w-5xl text-center
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

        {/* Coverage Grid */}
        <div
          className="
            grid gap-6
            grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          "
        >
          {coverage.map((region, idx) => (
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
              <h3 className="text-[#00ddb0] font-semibold text-lg mb-2">
                {region.region}
              </h3>

              <ul className="list-disc ml-5 text-white/70 leading-relaxed text-sm">
                {region.counties.map((county, cIdx) => (
                  <li key={cIdx}>{county}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p
          className="
            text-[#00ddb0] font-semibold text-center mt-12 text-sm
          "
        >
          *This section is for general educational and informational purposes.*
        </p>
      </div>
    </section>
  );
}
