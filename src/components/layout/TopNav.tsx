"use client";

import React, { useState } from "react";
import { states } from "@/config/state-config";
import StateSelectorModal from "@/components/common/StateSelectorModal";

export default function TopNav() {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      {/* ================================
          TOP NAV BAR
      ================================== */}
      <nav
        className="
          w-full sticky top-0 z-40
          bg-[#0B0F12]/80 backdrop-blur-xl
          border-b border-white/10
          shadow-[0_0_20px_rgba(0,221,176,0.25)]
        "
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">

          {/* ---------- LOGO ---------- */}
          <a href="/" className="flex items-center gap-2">
            <img
              src="/logo-medazon.png"
              alt="Medazon Health"
              className="w-9 h-9 rounded-lg shadow-[0_0_10px_rgba(0,221,176,0.5)]"
            />
            <span className="text-white font-bold text-lg tracking-wide">
              Medazon Health
            </span>
          </a>

          {/* ---------- DESKTOP NAV ---------- */}
          <div className="hidden md:flex items-center gap-6">

            <a
              href="/urgent-care"
              className="text-white/80 hover:text-[#00ddb0] transition-all font-medium"
            >
              Urgent Care
            </a>

            <a
              href="/conditions"
              className="text-white/80 hover:text-[#00ddb0] transition-all font-medium"
            >
              Conditions
            </a>

            {/* Select State Button */}
            <button
              onClick={() => setOpenModal(true)}
              className="
                py-2 px-4 rounded-lg font-semibold
                bg-[#00ddb0] text-black
                hover:bg-[#00f7c8] transition-all
                shadow-[0_0_12px_rgba(0,221,176,0.6)]
              "
            >
              Select State
            </button>
          </div>

          {/* ---------- MOBILE HAMBURGER ---------- */}
          <div className="md:hidden">
            <button
              onClick={() => setOpenModal(true)}
              className="
                py-2 px-3 rounded-lg font-semibold
                bg-[#00ddb0] text-black
                shadow-[0_0_12px_rgba(0,221,176,0.6)]
                hover:bg-[#00f7c8] transition-all
              "
            >
              State
            </button>
          </div>
        </div>
      </nav>

      {/* ---------- STATE SELECTOR MODAL ---------- */}
      <StateSelectorModal
        open={openModal}
        onClose={() => setOpenModal(false)}
      />
    </>
  );
}
