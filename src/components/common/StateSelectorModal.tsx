"use client";

import React, { useEffect } from "react";
import { states } from "@/config/state-config";

interface StateModalProps {
  open: boolean;
  onClose: () => void;
  condition?: string; // optional – if provided, route to condition page
}

export default function StateSelectorModal({ open, onClose, condition }: StateModalProps) {

  // Disable scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  // Close on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/70 backdrop-blur-xl
        animate-fadeIn
      "
      onClick={onClose}
    >
      {/* Modal container */}
      <div
        className="
          bg-white/10 backdrop-blur-2xl border border-white/20
          shadow-[0_0_30px_rgba(0,221,176,0.35)]
          rounded-2xl p-8 w-full max-w-lg mx-4
          animate-scaleIn
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="text-white text-2xl font-bold text-center mb-4
                       drop-shadow-[0_0_10px_rgba(0,221,176,0.45)]">
          Select Your State
        </h2>

        <p className="text-white/70 text-center text-sm mb-6 max-w-xs mx-auto">
          To provide state-appropriate educational telehealth information, please select your location.
        </p>

        {/* State List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
          {Object.keys(states).map((slug) => (
            <a
              key={slug}
              href={
                condition
                  ? `/urgent-care/${slug}/${condition}`
                  : `/urgent-care/${slug}`
              }
              className="
                block p-3 rounded-xl
                bg-white/10 border border-white/10
                shadow-[0_0_12px_rgba(0,221,176,0.25)]
                hover:bg-white/20 hover:shadow-[0_0_18px_rgba(0,221,176,0.45)]
                transition-all text-left
              "
            >
              <span className="text-[#00ddb0] font-semibold">
                {states[slug].displayName}
              </span>
            </a>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="
            mt-8 w-full py-3 rounded-xl font-semibold
            bg-[#00ddb0] text-black
            shadow-[0_0_12px_rgba(0,221,176,0.6)]
            hover:bg-[#00f7c8] transition-all
          "
        >
          Cancel
        </button>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }

        .animate-fadeIn { animation: fadeIn .3s ease forwards; }
        .animate-scaleIn { animation: scaleIn .25s ease forwards; }
      `}</style>
    </div>
  );
}
