"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, CheckCircle, Calendar, Heart, X, Check } from "lucide-react";

export default function BetterThanGoogling() {
  const [isOpen, setIsOpen] = useState(false);

  const cards = [
    {
      icon: Clock,
      bad: "Hours of searching",
      good: "Answers in 2 minutes"
    },
    {
      icon: CheckCircle,
      bad: "100 scary possibilities",
      good: "Personalized guidance"
    },
    {
      icon: Calendar,
      bad: "\"See a doctor\" (but where?)",
      good: "Same-day treatment"
    },
    {
      icon: Heart,
      bad: "Still anxious and confused",
      good: "Feel heard with a plan"
    }
  ];

  return (
    <section className="py-16 px-4 bg-[#050a08]">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4 font-serif text-white">
          Better Than <span className="text-teal-400">Googling</span>
        </h2>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors mb-12 text-sm"
        >
          {isOpen ? "Hide" : "See the difference"}
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {cards.map((card, i) => (
              <div key={i} className="bg-[#0a0f0d] border border-white/10 rounded-2xl p-6 text-left hover:border-teal-500/30 transition-all">
                <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center mb-6 text-teal-400">
                  <card.icon size={20} />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-gray-500">
                    <X size={14} className="text-red-400 mt-1 shrink-0" />
                    <span className="line-through decoration-red-400/50">{card.bad}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm font-medium text-white">
                    <Check size={14} className="text-teal-400 mt-1 shrink-0" />
                    <span>{card.good}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}