"use client";

import { useState, useEffect } from "react";
import { MedazonAnalytics } from "@/lib/medazonAnalytics";
import { STATE_CONFIG } from "@/lib/assessment-data";
import { MapPin, ChevronDown, X } from "lucide-react";

// ═══════════════════════════════════════════════════════
// 1. THE STATE BADGE (Revised Behavior)
// Default: HIDDEN. No state shown.
// Browser detects location: Badge appears with state + "change" link.
// "Change" click: Opens state selector with ONLY licensed states.
// State selected: Badge updates + all InfoFolds update.
// ═══════════════════════════════════════════════════════
export function StateBadge() {
  const [stateName, setStateName] = useState<string | null>(null);

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

  // HIDDEN by default — only render when we have a confirmed state
  if (!stateName) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 animate-in fade-in">
      <MapPin size={12} className="text-teal-400" />
      <span className="text-white font-medium">{stateName}</span>
      <button
        onClick={() => window.dispatchEvent(new Event('medazon-open-state-selector'))}
        className="text-teal-400 hover:text-teal-300 underline underline-offset-2 ml-0.5 text-xs transition-colors"
      >
        change
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 2. THE MAIN GATE & POPUP LOGIC
// StateGate wraps children transparently — doesn't block content.
// Modals overlay when state needs confirmation.
// ═══════════════════════════════════════════════════════
export default function StateGate({ children }: { children?: React.ReactNode }) {
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [detectedState, setDetectedState] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // All licensed state keys from STATE_CONFIG — ONLY these show in dropdown
  const stateKeys = Object.keys(STATE_CONFIG);

  useEffect(() => {
    // Listener for manual open from badge "change" link
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
        const res = await fetch('/api/geolocate');
        const data = await res.json();

        if (data.state) {
          const stateKey = data.state.toLowerCase();

          // Only show if we support this state
          if (STATE_CONFIG[stateKey]) {
            setDetectedState(stateKey);
            setShowBlockerModal(true);
            document.body.style.overflow = 'hidden';
            MedazonAnalytics.trackStateDetected(stateKey, 'ip_api');
          }
          // If unlicensed state detected — badge stays hidden, no blocker
        }
      } catch (e) {
        console.error("Geo check failed");
        // Geolocation failed — badge stays hidden, page still fully works
      }
    };

    checkState();

    return () => window.removeEventListener('medazon-open-state-selector', handleOpen);
  }, []);

  const selectState = (stateKey: string) => {
    const config = STATE_CONFIG[stateKey];
    if (!config) return;

    localStorage.setItem('userConfirmedState', stateKey);
    localStorage.setItem('userStateName', config.name);

    setIsConfirmed(true);
    setShowSelectModal(false);
    setShowBlockerModal(false);
    document.body.style.overflow = '';

    // Broadcast change to StateBadge and all InfoFolds
    window.dispatchEvent(new Event('medazon-state-updated'));
    MedazonAnalytics.trackStateConfirmed(stateKey, false);
  };

  return (
    <>
      {/* Render children always — StateGate is transparent, never blocks page content */}
      {children}

      {/* Background Overlay (Shared) */}
      {(showBlockerModal || showSelectModal) && (
        <div className="fixed inset-0 bg-[#040807]/90 backdrop-blur-sm z-[9998]" />
      )}

      {/* 1. INITIAL BLOCKER MODAL ("Confirm your state") */}
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

      {/* 2. STATE SELECTION MODAL — shows ALL licensed states from STATE_CONFIG, no unlicensed */}
      {showSelectModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="bg-[#0a0f0d] border border-teal-500/50 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(20,184,166,0.2)] animate-in zoom-in-95 duration-200 relative">

            {/* Close button */}
            <button
              onClick={() => { setShowSelectModal(false); document.body.style.overflow = ''; }}
              className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MapPin className="text-teal-400" size={24} />
                <h2 className="text-2xl font-serif text-white">Select <span className="italic">Your State</span></h2>
              </div>
              <p className="text-teal-400/70 text-xs uppercase tracking-widest font-semibold">Licensed states only</p>
            </div>

            {/* Full list — all licensed states shown, no "see more" toggle needed */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {stateKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => selectState(key)}
                  className="w-full p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-white font-medium hover:bg-teal-500/20 hover:border-teal-500/60 hover:scale-[1.01] transition-all text-center text-sm"
                >
                  {STATE_CONFIG[key].name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

