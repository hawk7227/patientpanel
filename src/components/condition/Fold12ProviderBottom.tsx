"use client";

import React from "react";

interface Fold12Props {
  providerImage: string;
  providerName: string;
  providerCredentials: string;
  providerExperience: string;
  educationalBio: string[]; // general educational paragraphs
}

export default function Fold12ProviderBottom({
  providerImage,
  providerName,
  providerCredentials,
  providerExperience,
  educationalBio
}: Fold12Props) {
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
          w-full max-w-4xl text-left
          bg-white/5 backdrop-blur-xl rounded-2xl
          border border-white/10
          shadow-[0_0_30px_rgba(0,221,176,0.35)]
          px-10 py-14
        "
      >
        {/* Provider Header */}
        <div className="flex flex-col items-center mb-10">
          <img
            src={providerImage}
            alt={providerName}
            className="
              w-32 h-32 rounded-full object-cover mb-4
              border-4 border-[#00ddb0]
              shadow-[0_0_25px_rgba(0,221,176,0.45)]
            "
          />
          <h2
            className="
              text-white text-xl font-bold mb-1
              drop-shadow-[0_0_10px_rgba(0,221,176,0.4)]
            "
          >
            {providerName}
          </h2>

          <p className="text-white/70 text-sm">{providerCredentials}</p>
          <p className="text-white/60 text-xs mt-1">{providerExperience}</p>
        </div>

        {/* Educational Bio */}
        <h3
          className="
            text-white text-2xl font-bold mb-4 text-center
            drop-shadow-[0_0_10px_rgba(0,221,176,0.4)]
          "
        >
          About Your Clinician
        </h3>

        <div className="space-y-4 text-white/80 text-sm leading-relaxed">
          {educationalBio.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        {/* Disclaimer */}
        <p
          className="
            text-[#00ddb0] font-semibold text-center mt-10 text-sm
          "
        >
          *This section is for general educational and informational purposes.*
        </p>
      </div>
    </section>
  );
}
