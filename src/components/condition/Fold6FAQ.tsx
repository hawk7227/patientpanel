"use client";

import React, { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface Fold5FAQProps {
  faqs: FAQItem[];
  title?: string; 
  subtitle?: string;
}

export default function Fold5FAQ({
  faqs,
  title = "Frequently Asked Questions",
  subtitle = "Educational answers to common questions about this concern."
}: Fold5FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

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
          w-full max-w-3xl
          bg-white/5 backdrop-blur-xl rounded-2xl
          border border-white/10
          shadow-[0_0_35px_rgba(0,221,176,0.35)]
          px-8 py-12
        "
      >
        {/* Title */}
        <h2
          className="
            text-center text-white text-3xl font-bold mb-4
            drop-shadow-[0_0_12px_rgba(0,221,176,0.45)]
          "
        >
          {title}
        </h2>

        {/* Subtitle */}
        <p
          className="
            text-center text-white/70 text-base mb-10
            max-w-xl mx-auto
          "
        >
          {subtitle}
        </p>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="
                  border-b border-white/10 pb-3
                "
              >
                {/* Question Button */}
                <button
                  onClick={() => toggle(idx)}
                  className="
                    w-full flex justify-between items-center text-left
                    text-[#00ddb0] font-semibold text-base
                    hover:text-white transition-colors
                    py-2
                  "
                >
                  <span>{faq.question}</span>

                  <span
                    className={`
                      text-white text-lg transition-transform duration-300
                      ${isOpen ? "rotate-45" : ""}
                    `}
                  >
                    +
                  </span>
                </button>

                {/* Answer Block */}
                <div
                  className={`
                    overflow-hidden transition-all duration-300
                    ${isOpen ? "max-h-40 opacity-100 mt-2" : "max-h-0 opacity-0"}
                  `}
                >
                  <p className="text-white/70 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
