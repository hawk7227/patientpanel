"use client";

import React from "react";
import { ZipEntry } from "@/config/zip-config";

interface Fold9Props {
  zips: ZipEntry[];
  title?: string;
  subtitle?: string;
}

export default function Fold9ZIPCodes({
  zips,
  title = "ZIP Codes We Support",
  subtitle = "These ZIP clusters reflect regions where adults commonly seek educational information related to their symptoms."
}: Fold9Props) {
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

        {/* ZIP Grid */}
        <div
          className="
            grid gap-6
            grid-cols-1 sm:grid-cols-2 md:grid-cols-3
          "
        >
          {zips.map((entry, idx) => (
            <div
              key={idx}
              className="
                bg-white/10 border border-white/10 
                rounded-xl p-5 text-center
                shadow-[0_0_16px_rgba(0,221,176,0.3)]
                hover:shadow-[0_0_22px_rgba(0,221,176,0.5)]
                transition-all
              "
            >
              <h4
                className="
                  text-[#00ddb0] font-semibold text-lg mb-2
                "
              >
                {entry.city}
              </h4>

              <p
                className="
                  text-white/70 text-sm leading-relaxed whitespace-pre-line
                "
              >
                {entry.zips.join("\n")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
