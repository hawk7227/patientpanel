"use client";
import { Check, Lock, Shield } from "lucide-react";
import { useState } from "react";

interface Props {
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  address: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onDobChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onSubmit: () => void;
  isReady: boolean;
  isReturning: boolean;
}

export default function StepDemographics({
  firstName, lastName, phone, dob, address,
  onFirstNameChange, onLastNameChange, onPhoneChange, onDobChange, onAddressChange,
  onSubmit, isReady, isReturning,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit();
  };

  return (
    <div className="text-white font-sans overflow-hidden" style={{ background: "linear-gradient(168deg, #091211 0%, #080c10 40%, #0a0e14 100%)", height: "100svh", minHeight: "0" }}>
      <div className="h-full max-w-[430px] mx-auto flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 4px)", paddingBottom: "env(safe-area-inset-bottom, 4px)", paddingLeft: "16px", paddingRight: "16px" }}>

        {/* Header */}
        <div className="text-center pt-2 pb-1 flex-shrink-0">
          <span className="text-white font-black text-[15px] tracking-tight">MEDAZON</span>
          <span className="text-[#2dd4a0] font-black text-[15px] tracking-tight">HEALTH</span>
        </div>

        {/* Payment Confirmed Badge */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[#2dd4a0]/40 bg-[#2dd4a0]/10" style={{ boxShadow: "0 0 20px rgba(45,212,160,0.15)" }}>
            <Check size={18} className="text-[#2dd4a0]" strokeWidth={3} />
            <span className="text-[#2dd4a0] font-bold text-[14px]">Payment Confirmed</span>
          </div>
        </div>

        {/* Required Info Card */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-2" style={{ scrollbarWidth: "none" }}>
          {/* Heading */}
          <div className="text-center space-y-1 px-2">
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Required Before Visit</p>
            <h2 className="text-white font-black text-[18px] leading-tight">Complete Your Medical Intake</h2>
            <p className="text-gray-400 text-[12px]">Your pharmacy requires the following details to process and send your prescription</p>
          </div>

          {/* Form */}
          <div className="rounded-xl border border-white/10 bg-[#11161c] p-4 space-y-3">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider block mb-1">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                  placeholder="First name"
                  className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2dd4a0] placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider block mb-1">Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                  placeholder="Last name"
                  className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2dd4a0] placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider block mb-1">Phone Number</label>
              <input
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
                className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2dd4a0] placeholder:text-gray-600"
              />
            </div>

            {/* DOB */}
            <div>
              <label className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider block mb-1">Date of Birth</label>
              <input
                value={dob}
                onChange={(e) => onDobChange(e.target.value)}
                placeholder="MM/DD/YYYY"
                type="date"
                className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2dd4a0] placeholder:text-gray-600"
              />
            </div>

            {/* Address (optional) */}
            <div>
              <label className="text-gray-500 text-[9px] font-semibold uppercase tracking-wider block mb-1">Address <span className="text-gray-700">(optional)</span></label>
              <input
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="Street address, city, state"
                className="w-full bg-[#0d1218] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2dd4a0] placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Drug Allergies Quick Question */}
          <div className="rounded-xl border border-white/10 bg-[#11161c] p-4 space-y-2">
            <h3 className="text-white font-bold text-[14px]">Any Drug Allergies?</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="py-2.5 rounded-xl border border-white/10 text-white font-semibold text-sm hover:bg-white/5 transition-all active:bg-[#2dd4a0] active:text-black">Yes</button>
              <button className="py-2.5 rounded-xl border border-white/10 text-white font-semibold text-sm hover:bg-white/5 transition-all active:bg-[#2dd4a0] active:text-black">No</button>
            </div>
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-2 px-2">
            <Shield size={14} className="text-[#2dd4a0] flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-[9px] leading-relaxed">Your information is encrypted and protected under HIPAA. We only share what&apos;s required with your pharmacy to fill your prescription.</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex-shrink-0 pb-2 pt-1 space-y-1">
          <button
            onClick={handleSubmit}
            disabled={!isReady || submitting}
            className={`w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg transition-all ${isReady && !submitting ? "bg-[#2dd4a0] text-black" : "bg-white/10 text-gray-500 cursor-not-allowed"}`}
          >
            {submitting ? (
              <><div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />Processing...</>
            ) : (
              <>Continue to Your Visit</>
            )}
          </button>
          <p className="text-center text-gray-700 text-[8px]"><Lock size={8} className="inline mr-0.5" />HIPAA Compliant · Encrypted</p>
        </div>
      </div>
    </div>
  );
}
