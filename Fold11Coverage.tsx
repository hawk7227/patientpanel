"use client";
import { ChevronDown, Search, X } from "lucide-react";
import symptomSuggestions from "@/data/symptom-suggestions.json";
import { useMemo } from "react";

interface Props {
  reason: string;
  chiefComplaint: string;
  reasonDialogOpen: boolean;
  reasonQuery: string;
  isActive: boolean;
  onReasonSelect: (r: string) => void;
  onSymptomsChange: (text: string) => void;
  onOpenDialog: () => void;
  onCloseDialog: () => void;
  onQueryChange: (q: string) => void;
}

export default function StepReason({
  reason, chiefComplaint, reasonDialogOpen, reasonQuery, isActive,
  onReasonSelect, onSymptomsChange, onOpenDialog, onCloseDialog, onQueryChange,
}: Props) {
  const activeOrangeBorder = "border-[3px] border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.5)]";

  const filteredReasons = useMemo(() => {
    if (!reasonQuery.trim()) return symptomSuggestions;
    const q = reasonQuery.toLowerCase();
    return symptomSuggestions.filter((s: { name: string; smart_search?: string[] }) =>
      s.name.toLowerCase().includes(q) || s.smart_search?.some((kw: string) => kw.toLowerCase().includes(q)));
  }, [reasonQuery]);

  return (
    <>
      <div
        className={`rounded-xl bg-[#11161c] p-4 space-y-3 transition-all ${isActive ? activeOrangeBorder : "border border-white/10"}`}
        style={{ animation: "fadeInStep 0.7s cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black text-[#f97316] bg-[#f97316]/15 w-6 h-6 rounded-full flex items-center justify-center">1</span>
          <span className="text-white text-[10px] font-semibold uppercase tracking-wider">What Brings You In?</span>
        </div>

        {/* Reason selector */}
        <button
          onClick={onOpenDialog}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${reason ? "border-[#2dd4a0] bg-[#2dd4a0]/5" : "border-white/10 bg-[#0d1218] hover:border-white/20"}`}
        >
          <span className={`text-sm ${reason ? "text-white font-medium" : "text-gray-500"}`}>
            {reason || "Select a reason..."}
          </span>
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {/* Symptoms textarea — appears after reason selected */}
        {reason && (
          <div className="space-y-1.5" style={{ animation: "fadeInStep 0.4s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
            <p className="text-gray-400 text-[10px]">Tell us more so your provider can prepare</p>
            <textarea
              value={chiefComplaint}
              onChange={(e) => onSymptomsChange(e.target.value)}
              placeholder="e.g., Burning during urination for 3 days..."
              rows={2}
              className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f97316] resize-none placeholder:text-gray-600"
            />
            {chiefComplaint.length > 0 && chiefComplaint.length < 10 && (
              <p className="text-gray-600 text-[9px]">{10 - chiefComplaint.length} more characters needed</p>
            )}
            {chiefComplaint.length >= 10 && (
              <p className="text-[#2dd4a0] text-[9px] font-semibold">✓ Good — next step unlocked</p>
            )}
          </div>
        )}
      </div>

      {/* ═══ FULLSCREEN REASON DIALOG ═══ */}
      {reasonDialogOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0d1218" }}>
          <div className="flex justify-between items-center px-4 pt-4 pb-3 flex-shrink-0">
            <span className="text-white font-bold text-lg">Reason For Visit</span>
            <button onClick={onCloseDialog} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={reasonQuery} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search symptoms..." autoFocus className="w-full bg-[#11161c] border border-white/10 rounded-xl pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-[#2dd4a0]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <div className="px-4 py-3 text-white bg-white/[0.03] hover:bg-[#2dd4a0] hover:text-black cursor-pointer text-sm border-b border-white/5 font-semibold active:bg-[#2dd4a0] active:text-black" onClick={() => onReasonSelect("Something Else")}>Something else</div>
              {filteredReasons.map((item: { name: string }) => (
                <div key={item.name} className="px-4 py-3 text-white hover:bg-[#2dd4a0] hover:text-black cursor-pointer text-sm border-b border-white/5 last:border-0 active:bg-[#2dd4a0] active:text-black" onClick={() => onReasonSelect(item.name)}>{item.name}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
