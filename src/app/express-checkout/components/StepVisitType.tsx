"use client";
import { Zap, Pill, Video, Phone, Check, Lock, X } from "lucide-react";
import { isControlledSubstance, type VisitType } from "@/lib/pricing";
import type { MedicationItem } from "../types";

interface Props {
  visitTypePopup: VisitType | null;
  visitTypeConfirmed: boolean;
  visitType: VisitType;
  isActive: boolean;
  // Refill-specific
  medications: MedicationItem[];
  selectedMeds: string[];
  medsLoading: boolean;
  symptomsText: string;
  // Handlers
  onTileClick: (type: VisitType) => void;
  onConfirm: () => void;
  onClose: () => void;
  onToggleMed: (name: string) => void;
  onSymptomsChange: (text: string) => void;
  onReset: () => void;
}

const VISIT_TILES = [
  { key: "instant" as VisitType, label: "Treat Me\nNow", icon: Zap, color: "#2dd4a0", badge: "✨ NEW" },
  { key: "refill" as VisitType, label: "Rx\nRefill", icon: Pill, color: "#f59e0b", badge: "⚡ FAST" },
  { key: "video" as VisitType, label: "Video\nVisit", icon: Video, color: "#3b82f6", badge: null },
  { key: "phone" as VisitType, label: "Phone\n/ SMS", icon: Phone, color: "#a855f7", badge: null },
];

const POPUP_CONTENT: Record<string, { title: string; subtitle: string; desc: string; checks: string[]; note: string; color: string }> = {
  instant: { title: "Get Seen Without Being Seen", subtitle: "Instant Care · No Appointment", desc: "Your provider reviews your case privately and sends treatment + Rx to your pharmacy.", checks: ["100% private — no face-to-face", "Treatment in 1–2 hours", "Rx sent to your pharmacy"], note: "UTIs, cold & flu, skin, allergies", color: "#2dd4a0" },
  video: { title: "Face-to-Face, From Anywhere", subtitle: "Video Visit · Live Consultation", desc: "See your provider live on video — just like an in-office visit.", checks: ["Real-time conversation", "Private & encrypted — HIPAA", "Pick a time that works"], note: "ADHD evals, anxiety, complex conditions", color: "#3b82f6" },
  phone: { title: "Talk, Text, or Both", subtitle: "Phone / SMS · No Camera", desc: "Connect by phone call or secure text — same quality care.", checks: ["No video, no downloads", "Flexible scheduling", "Great for follow-ups"], note: "Medication adjustments, follow-ups", color: "#a855f7" },
};

export default function StepVisitType({
  visitTypePopup, visitTypeConfirmed, visitType, isActive,
  medications, selectedMeds, medsLoading, symptomsText,
  onTileClick, onConfirm, onClose, onToggleMed, onSymptomsChange, onReset,
}: Props) {
  const activeOrangeBorder = "border-[3px] border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.5)]";

  // ── Completed pill view ──
  if (visitTypeConfirmed) {
    if (visitType === "refill") {
      return (
        <button onClick={onReset} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-[#2dd4a0]/20 hover:bg-white/[0.05] transition-all opacity-80 hover:opacity-100" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
          <div className="w-7 h-7 rounded-full bg-[#2dd4a0] flex items-center justify-center flex-shrink-0"><Check size={16} className="text-black" strokeWidth={3} /></div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-gray-300 text-[12px] font-semibold block">Rx Refill</span>
            {selectedMeds.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{selectedMeds.map(m => (<span key={m} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${isControlledSubstance(m) ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20"}`}>{m} {isControlledSubstance(m) ? "⚠️" : "✓"}</span>))}</div>}
          </div>
          <span className="text-gray-500 text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
        </button>
      );
    }
    const label = visitType === "instant" ? "Instant Care" : visitType === "video" ? "Video Visit" : "Phone / SMS";
    return (
      <button onClick={onReset} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-[#2dd4a0]/20 hover:bg-white/[0.05] transition-all opacity-80 hover:opacity-100" style={{ animation: "fadeInPill 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
        <div className="w-7 h-7 rounded-full bg-[#2dd4a0] flex items-center justify-center flex-shrink-0"><Check size={16} className="text-black" strokeWidth={3} /></div>
        <span className="text-gray-300 text-[12px] font-semibold truncate flex-1 text-left">{label}</span>
        <span className="text-gray-500 text-[10px] font-semibold flex-shrink-0">Tap to<br/>change</span>
      </button>
    );
  }

  // ── Active selection view ──
  return (
    <>
      {/* Tile grid */}
      <div className={`rounded-xl bg-[#11161c] p-4 space-y-3 transition-all ${isActive ? activeOrangeBorder : "border border-white/10"}`} style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">3</span>
          <span className="text-white text-[10px] font-semibold uppercase tracking-wider">Select Visit Type</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {VISIT_TILES.map((vt) => {
            const Icon = vt.icon;
            const isActive = visitTypePopup === vt.key;
            const borderClass = isActive
              ? "border-[3px] border-[#2dd4a0] shadow-[0_0_16px_rgba(45,212,160,0.4)]"
              : "border-2 border-white/10 hover:border-white/20";
            return (
              <button key={vt.key} onClick={() => onTileClick(vt.key)} className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl bg-[#11161c]/80 transition-all ${borderClass}`} style={{ minHeight: "72px" }}>
                {vt.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: vt.color, color: "#000" }}>{vt.badge}</span>}
                <Icon size={18} style={{ color: isActive ? vt.color : "#6b7280" }} />
                <span className={`text-[9px] font-bold mt-1 text-center leading-tight whitespace-pre-line ${isActive ? "text-white" : "text-gray-400"}`}>{vt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Popup (shortened, confirm button inside) ── */}
      {visitTypePopup && (
        <div className="rounded-xl overflow-hidden" style={{ animation: "fadeInStep 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
          <div className="p-3 space-y-2.5 relative bg-[#11161c] border border-white/10 rounded-xl">
            <button onClick={onClose} className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors z-10"><X size={16} /></button>

            {/* Standard visit types */}
            {visitTypePopup !== "refill" && POPUP_CONTENT[visitTypePopup] && (() => {
              const c = POPUP_CONTENT[visitTypePopup];
              return (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}15` }}>
                      {visitTypePopup === "instant" ? <Zap size={16} style={{ color: c.color }} /> : visitTypePopup === "video" ? <Video size={16} style={{ color: c.color }} /> : <Phone size={16} style={{ color: c.color }} />}
                    </div>
                    <div>
                      <h3 className="text-white font-black text-[13px] leading-tight">{c.title}</h3>
                      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.color }}>{c.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{c.desc}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {c.checks.map((ck, i) => (
                      <div key={i} className="flex items-center gap-1"><Check size={11} style={{ color: c.color }} /><span className="text-white text-[10px]">{ck}</span></div>
                    ))}
                  </div>
                  <button onClick={onConfirm} className="w-full py-3 rounded-xl font-bold text-[13px]" style={{ background: c.color, color: "#000" }}>
                    Choose {visitTypePopup === "instant" ? "Instant Care" : visitTypePopup === "video" ? "Video Visit" : "Phone/SMS"} →
                  </button>
                </>
              );
            })()}

            {/* Refill popup with medication list */}
            {visitTypePopup === "refill" && (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#f59e0b]/15 flex items-center justify-center flex-shrink-0"><Pill size={16} className="text-[#f59e0b]" /></div>
                  <div>
                    <h3 className="text-white font-black text-[13px] leading-tight">Rx Refill — No Appointment</h3>
                    <p className="text-[#f59e0b] text-[9px] font-bold uppercase tracking-wider">Same-day pharmacy pickup</p>
                  </div>
                </div>
                <div className="rounded-xl bg-[#0d1218] border border-white/10 p-2.5 space-y-1.5">
                  <p className="text-white text-[10px] font-semibold">Select Medications to Refill</p>
                  {medsLoading ? (
                    <div className="flex items-center justify-center py-2"><div className="animate-spin w-3 h-3 border-2 border-[#f59e0b] border-t-transparent rounded-full" /><span className="ml-2 text-gray-400 text-[10px]">Loading...</span></div>
                  ) : medications.length > 0 ? (
                    <div className="space-y-0.5 max-h-36 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                      {medications.map((med) => {
                        const ic = isControlledSubstance(med.name);
                        const ck = selectedMeds.includes(med.name);
                        return (
                          <label key={med.name} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] transition-all ${ck ? "bg-[#f59e0b]/10 border border-[#f59e0b]/30" : "hover:bg-white/5 border border-transparent"} ${ic ? "border-red-500/30" : ""}`}>
                            <input type="checkbox" checked={ck} onChange={() => onToggleMed(med.name)} className="w-3.5 h-3.5 rounded border-white/20 bg-[#0d1218] text-[#f59e0b] focus:ring-[#f59e0b] flex-shrink-0" />
                            <span className={`flex-1 ${ic ? "text-red-400" : "text-white"}`}>{med.name} {med.dosage ? `(${med.dosage})` : ""}</span>
                            {ic && <span className="text-[7px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded font-bold flex-shrink-0">CTRL</span>}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-[10px] py-1">No medications found on file.</p>
                  )}
                  <textarea value={symptomsText} onChange={(e) => onSymptomsChange(e.target.value)} placeholder="Additional medications or notes..." rows={1} className="w-full bg-[#11161c] border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#f59e0b] resize-none placeholder:text-gray-600" />
                </div>
                <button onClick={onConfirm} className="w-full py-3 rounded-xl font-bold text-[13px] bg-[#f59e0b] text-black">
                  Choose Rx Refill →
                </button>
              </>
            )}

            <div className="flex items-center gap-1.5 opacity-50"><Lock size={9} className="text-gray-500" /><span className="text-gray-500 text-[8px]">Full anonymity · Your identity stays private</span></div>
          </div>
        </div>
      )}
    </>
  );
}
