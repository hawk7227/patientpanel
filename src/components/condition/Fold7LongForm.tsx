"use client";

import React from "react";
import { LongformCondition } from "@/config/longform-config";

interface Fold7Props {
  data: LongformCondition;
  keywordIndex?: string[]; // optional override for tags
}

export default function Fold7LongForm({ data, keywordIndex = [] }: Fold7Props) {
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
          w-full max-w-4xl
          bg-white/5 backdrop-blur-xl rounded-2xl
          border border-white/10
          shadow-[0_0_35px_rgba(0,221,176,0.35)]
          px-8 py-12
        "
      >
        {/* Title */}
        <h2
          className="
            text-center text-white text-3xl font-bold mb-6
            drop-shadow-[0_0_12px_rgba(0,221,176,0.45)]
          "
        >
          Educational Guide
        </h2>

        {/* Intro Paragraphs */}
        {data.intro.map((p, idx) => (
          <p
            key={idx}
            className="text-white/80 text-base leading-relaxed mb-4"
          >
            {p}
          </p>
        ))}

        {/* =============================== */}
        {/* Smart Search SEO Explanation Block */}
        {/* =============================== */}
        <div className="mt-12 mb-10">
          <h3
            className="
              text-white text-xl font-semibold mb-3
              drop-shadow-[0_0_8px_rgba(0,221,176,0.4)]
              text-center
            "
          >
            Smart Search
          </h3>

          <p
            className="
              text-white/70 text-sm text-center mb-6
              max-w-xl mx-auto leading-relaxed
            "
          >
            This interactive search field helps adults describe symptoms using everyday
            language. Below are tags that represent common terms people use. These tags
            help the search engine better understand your concern.
          </p>

          {/* Tag Cloud */}
          {keywordIndex.length > 0 && (
            <div
              className="
                flex flex-wrap justify-center gap-2 mb-6
                text-white/70 text-xs
              "
            >
              {keywordIndex.map((tag, idx) => (
                <span
                  key={idx}
                  className="
                    px-3 py-1 rounded-full bg-white/10 border border-white/10
                    shadow-[0_0_10px_rgba(0,221,176,0.25)]
                  "
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Disabled Search Input (UX only — behavior handled globally) */}
          <div className="flex justify-center">
            <div className="relative max-w-md w-full">
              <input
                type="text"
                placeholder="Type your symptom…"
                disabled
                className="
                  w-full px-4 py-3 rounded-xl bg-white/10 text-white
                  border border-white/20
                  backdrop-blur-xl
                  placeholder-white/50
                  shadow-[0_0_12px_rgba(0,221,176,0.25)]
                "
              />
              <ul id="suggestions" className="absolute w-full mt-1 z-50"></ul>
            </div>
          </div>
        </div>

        {/* =============================== */}
        {/* Symptom List */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mt-10 mb-3">Common Symptoms</h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed mb-6">
          {data.symptoms.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>

        {/* =============================== */}
        {/* Causes */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mb-3">Possible Causes</h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed mb-6">
          {data.causes.map((c, idx) => (
            <li key={idx}>{c}</li>
          ))}
        </ul>

        {/* =============================== */}
        {/* Risk Factors */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mb-3">General Risk Factors</h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed mb-6">
          {data.riskFactors.map((r, idx) => (
            <li key={idx}>{r}</li>
          ))}
        </ul>

        {/* =============================== */}
        {/* Telehealth Process */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mb-3">How Telehealth Helps</h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed mb-6">
          {data.telehealthProcess.map((t, idx) => (
            <li key={idx}>{t}</li>
          ))}
        </ul>

        {/* =============================== */}
        {/* Safety Notes */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mb-3">Safety Notes</h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed mb-6">
          {data.safetyNotes.map((n, idx) => (
            <li key={idx}>{n}</li>
          ))}
        </ul>

        {/* =============================== */}
        {/* Prevention */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mb-3">General Prevention Tips</h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed mb-6">
          {data.prevention.map((p, idx) => (
            <li key={idx}>{p}</li>
          ))}
        </ul>

        {/* =============================== */}
        {/* State-Specific Notes */}
        {/* =============================== */}
        <h3 className="text-white text-xl font-semibold mb-3">
          State Telehealth Notes
        </h3>
        <ul className="list-disc ml-6 text-white/80 leading-relaxed">
          {data.stateNotes.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>

      </div>
    </section>
  );
}
