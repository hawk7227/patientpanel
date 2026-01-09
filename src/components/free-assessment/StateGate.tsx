"use client";

import { useState, useEffect } from "react";
import { MedazonAnalytics } from "@/lib/medazonAnalytics";
import { STATE_CONFIG } from "@/lib/assessment-data";
import { MapPin, ChevronDown } from "lucide-react";

// --- 1. THE STATE BADGE (To place under logo) ---
export function StateBadge() {
  const [stateName, setStateName] = useState<string>("Florida");

  useEffect(() => {
    const handleStateUpdate = () => {
      const saved = localStorage.getItem('userStateName');
      if (saved) setStateName(saved);
    };

    // Initial check
    handleStateUpdate();

    // Listen for updates
    window.addEventListener('medazon-state-updated', handleStateUpdate);
    return () => window.removeEventListener('medazon-state-updated', handleStateUpdate);
  }, []);

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('medazon-open-state-selector'))}
      className="flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/40 rounded-full text-teal-400 text-s font-bold hover:bg-teal-500/20 transition-all cursor-pointer animate-in fade-in"
    >
      <MapPin size={15} />
      <span>{stateName}</span>
    </button>
  );
}

// --- 2. THE MAIN GATE & POPUP LOGIC ---
export default function StateGate() {
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showAllStates, setShowAllStates] = useState(false);

  // States list processing
  const stateKeys = Object.keys(STATE_CONFIG);
  const visibleStates = showAllStates ? stateKeys : stateKeys.slice(0, 5); // Show first 5 initially

  useEffect(() => {
    // Listener for manual open from badge
    const handleOpen = () => setShowSelectModal(true);
    window.addEventListener('medazon-open-state-selector', handleOpen);

    // Initial Load Logic
    const checkState = async () => {
      const saved = localStorage.getItem('userConfirmedState');
      if (saved) {
        setIsConfirmed(true);
        return;
      }

      try {
        // CALL YOUR NEW API
        const res = await fetch('/api/geolocate');
        const data = await res.json();

        if (data.state) {
          // Normalize state name (e.g., "Florida" -> "florida")
          const stateKey = data.state.toLowerCase();

          // Only set if we support this state
          if (STATE_CONFIG[stateKey]) {
            setDetectedState(stateKey);
            setShowBlockerModal(true);
            document.body.style.overflow = 'hidden';
            MedazonAnalytics.trackStateDetected(stateKey, 'ip_api');
          }
        }
      } catch (e) {
        console.error("Geo check failed");
      }
    };

    checkState();

    return () => window.removeEventListener('medazon-open-state-selector', handleOpen);
  }, []);

  const selectState = (stateKey: string) => {
    const config = STATE_CONFIG[stateKey];
    localStorage.setItem('userConfirmedState', stateKey);
    localStorage.setItem('userStateName', config.name);

    // Update State
    setIsConfirmed(true);
    setShowSelectModal(false);
    setShowBlockerModal(false);
    document.body.style.overflow = ''; // Restore scroll

    // Broadcast change to Badge and other components
    window.dispatchEvent(new Event('medazon-state-updated'));
    MedazonAnalytics.trackStateConfirmed(stateKey, false);
  };

  // --- RENDER ---

  return (
    <>
      {/* Background Overlay (Shared) */}
      {(showBlockerModal || showSelectModal) && (
        <div className="fixed inset-0 bg-[#040807]/90 backdrop-blur-sm z-[9998]" />
      )}

      {/* 1. INITIAL BLOCKER MODAL ("WAIT!!!") */}
      {showBlockerModal && !showSelectModal && detectedState && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-10 duration-500">
          <div className="bg-[#0a0f0d] border-2 border-yellow-500/70 rounded-2xl px-6 py-4 text-center shadow-[0_0_30px_rgba(234,179,8,0.3)] min-w-[280px]">
            <p className="text-red-500 text-xl font-bold mb-1 animate-pulse">WAIT!!!</p>
            <p className="text-gray-400 text-sm mb-3">confirm your state</p>

            <button
              onClick={() => selectState(detectedState)}
              className="flex items-center justify-center gap-2 mx-auto bg-[#0d1411] border-2 border-yellow-500/70 rounded-lg px-5 py-3 text-yellow-400 font-semibold hover:bg-yellow-500/20 transition-all mb-3 w-full"
            >
              <MapPin size={18} />
              <span>{STATE_CONFIG[detectedState]?.name}</span>
            </button>

            <button
              onClick={() => { setShowBlockerModal(false); setShowSelectModal(true); }}
              className="text-yellow-400/80 text-xs hover:text-yellow-300 underline"
            >
              change state
            </button>
          </div>
        </div>
      )}

      {/* 2. STATE SELECTION MODAL (The one from your screenshot) */}
      {showSelectModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="bg-[#0a0f0d] border border-teal-500/50 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(20,184,166,0.2)] animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="text-teal-400" size={24} />
                <h2 className="text-2xl font-serif text-white">Select <span className="italic">Your State</span></h2>
              </div>
              <p className="text-teal-400/70 text-xs uppercase tracking-widest font-semibold">For licensed telehealth care</p>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {visibleStates.map((key) => (
                <button
                  key={key}
                  onClick={() => selectState(key)}
                  className="w-full p-4 bg-teal-500/10 border-2 border-teal-500 rounded-xl text-white font-medium hover:bg-teal-500/20 hover:scale-[1.02] transition-all text-center"
                >
                  {STATE_CONFIG[key].name}
                </button>
              ))}
            </div>

            {/* See More Button */}
            <button
              onClick={() => setShowAllStates(!showAllStates)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-dashed border-teal-500/30 rounded-xl text-teal-400 text-xs hover:bg-teal-500/5 transition-all"
            >
              <span>{showAllStates ? "Show Less" : "See More States"}</span>
              <ChevronDown size={14} className={showAllStates ? "rotate-180" : ""} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}