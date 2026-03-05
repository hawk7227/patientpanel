"use client";

import React from "react";

interface Step {
  icon: string;        // path to icon image (SVG or PNG)
  title: string;
  description: string;
}

interface Fold4Props {
  steps?: Step[];      // optional override
}

export default function Fold4HowItWorks({ steps }: Fold4Props) {
  const defaultSteps: Step[] = [
    {
      icon: "/icons/describe.svg",
      title: "Describe Your Symptoms",
      description:
        "Submit a brief, secure description of what you're experiencing. This helps the clinician understand timing and context."
    },
    {
      icon: "/icons/review.svg",
      title: "Clinician Review",
      description:
        "A licensed clinician reviews your submission privately. They may request follow-up details if helpful."
    },
    {
      icon: "/icons/guidance.svg",
      title: "Guidance & Next Steps",
      description:
        "Based on your description, general educational guidance is provided. If in-person evaluation is appropriate, that will be communicated."
    }
  ];

  const activeSteps = steps || defaultSteps;

  return (
    <section
      className="
        w-full py-20 px-6 
        bg-gradient-to-b from-[#0B0F12] to-[#141B1E]
        flex justify-center
      "
    >
      <div className="w-full max-w-6xl">
        {/* Title */}
        <h2
          className="
            text-center text-white text-3xl font-bold mb-10
            drop-shadow-[0_0_12px_rgba(0,221,176,0.45)]
          "
        >
          How It Works
        </h2>

        {/* Step Grid */}
        <div
          className="
            grid gap-8 
            grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          "
        >
          {activeSteps.map((step, idx) => (
            <div
              key={idx}
              className="
                bg-white/5 backdrop-blur-xl rounded-2xl 
                border border-white/10
                p-6 text-center
                shadow-[0_0_25px_rgba(0,221,176,0.35)]
                hover:shadow-[0_0_35px_rgba(0,221,176,0.55)]
                transition-all duration-300
              "
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <img
                  src={step.icon}
                  alt={step.title}
                  className="
                    w-14 h-14 object-contain 
                    drop-shadow-[0_0_10px_rgba(0,221,176,0.45)]
                  "
                />
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>

              {/* Description */}
              <p className="text-white/70 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
