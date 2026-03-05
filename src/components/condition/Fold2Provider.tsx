"use client";

import React from "react";

interface ProviderProps {
  providerImage: string;         // example: "/providers/lamonica.jpg"
  providerName: string;          // "LaMonica A. Hodges, MSN, APRN, FNP-C"
  providerCredentials: string;   // "Board-Certified Family Nurse Practitioner"
  providerExperience: string;    // "10+ Years Experience"
  serviceAreaText: string;       // "Serving Miami, Orlando & Tampa"
  badges?: string[];             // ["HIPAA Secure", "Stripe Encrypted", "State Licensed"]
}

export default function Fold2Provider({
  providerImage,
  providerName,
  providerCredentials,
  providerExperience,
  serviceAreaText,
  badges = []
}: ProviderProps) {
  return (
    <section
      className="
        w-full py-20 px-6 bg-gradient-to-b from-[#0B0F12] to-[#141B1E]
        flex justify-center
      "
    >
      <div
        className="
          max-w-3xl w-full text-center
          bg-black/40 backdrop-blur-xl rounded-2xl 
          border border-white/10 shadow-[0_0_40px_rgba(0,221,176,0.35)]
          px-10 py-12
        "
      >
        {/* Provider Photo */}
        <img
          src={providerImage}
          alt={providerName}
          className="
            w-40 h-40 rounded-full object-cover mx-auto mb-6
            border-4 border-[#00ddb0]
            shadow-[0_0_25px_rgba(0,221,176,0.45)]
          "
        />

        {/* Provider Name */}
        <h2
          className="
            text-white text-xl font-bold mb-2
            drop-shadow-[0_0_10px_rgba(0,221,176,0.4)]
          "
        >
          {providerName}
        </h2>

        {/* Credentials */}
        <p className="text-white/80 text-base mb-1">
          {providerCredentials}
        </p>

        {/* Experience */}
        <p className="text-white/60 text-sm mb-3">
          {providerExperience}
        </p>

        {/* Service Area */}
        <p
          className="
            text-[#00ddb0] font-medium tracking-wide mb-6
          "
        >
          {serviceAreaText}
        </p>

        {/* Badges */}
        <div
          className="
            flex flex-wrap justify-center gap-3
            mb-4
          "
        >
          {badges.map((badge, i) => (
            <span
              key={i}
              className="
                px-4 py-2 text-sm text-white rounded-full
                bg-white/10 border border-white/20
                shadow-[0_0_12px_rgba(0,221,176,0.35)]
              "
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
