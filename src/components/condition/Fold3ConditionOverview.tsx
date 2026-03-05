"use client";

import React from "react";

interface OverviewCard {
  title: string;
  description: string;
  image: string;
}

interface Fold3Props {
  cards: OverviewCard[]; // mapped from condition-config.ts
}

export default function Fold3ConditionOverview({ cards }: Fold3Props) {
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
          w-full max-w-6xl 
        "
      >
        {/* Title */}
        <h2
          className="
            text-center text-white text-3xl font-bold mb-10
            drop-shadow-[0_0_12px_rgba(0,221,176,0.45)]
          "
        >
          What We Cover
        </h2>

        {/* Grid */}
        <div
          className="
            grid 
            gap-8 
            grid-cols-1 
            md:grid-cols-2 
            lg:grid-cols-3
          "
        >
          {cards.map((card, i) => (
            <div
              key={i}
              className="
                bg-white/5 backdrop-blur-xl 
                rounded-2xl border border-white/10
                shadow-[0_0_25px_rgba(0,221,176,0.35)]
                p-6 flex flex-col
                hover:shadow-[0_0_35px_rgba(0,221,176,0.55)]
                transition-all duration-300
              "
            >
              {/* Image */}
              <img
                src={card.image}
                alt={card.title}
                loading="lazy"
                className="
                  w-full h-52 object-cover rounded-xl mb-4
                  bg-white/10
                "
              />

              {/* Card Title */}
              <h3
                className="
                  text-center text-white font-bold text-lg mb-2
                "
              >
                {card.title}
              </h3>

              {/* Card Description */}
              <p
                className="
                  text-center text-white/70 text-sm leading-relaxed
                "
              >
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
