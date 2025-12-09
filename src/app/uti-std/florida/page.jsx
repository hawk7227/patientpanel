"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";

// =====================================================
// MERGED SMART SEARCH SOURCE LIST
// (Fuse.js + symptom-suggestions + keyword index)
// =====================================================
const SEARCH_LIST = [
  { symptom:"burning urination", name:"Urinary Tract Infection (UTI)" },
  { symptom:"uti", name:"Urinary Tract Infection (UTI)" },
  { symptom:"urinary discomfort", name:"Urinary Tract Infection (UTI)" },
  { symptom:"frequent urination", name:"Urinary Tract Infection (UTI)" },

  { symptom:"std", name:"Possible STD / STI" },
  { symptom:"exposure", name:"Possible STD / STI" },
  { symptom:"discharge", name:"Possible STD / STI" },

  { symptom:"sinus", name:"Sinus Infection" },
  { symptom:"cold", name:"Cold / Flu / Sinus" },

  { symptom:"migraine", name:"Migraine / Headache" },
  { symptom:"headache", name:"Migraine / Headache" },

  { symptom:"back pain", name:"Back Pain" },
  { symptom:"nausea", name:"Gastroenteritis / Nausea" },
  { symptom:"rash", name:"Rash / Allergic Reaction" },
  { symptom:"adhd", name:"ADHD Follow-Up" },
  { symptom:"anxiety", name:"Anxiety / Depression" },
  { symptom:"hair loss", name:"Hair Loss / Finasteride" },
  { symptom:"birth control", name:"Birth Control" },
  { name:"Something Else" }
];

// Fuse.js Config
const FUSE_OPTIONS = {
  keys: ["symptom", "name"],
  threshold: 0.35,
};

// =====================================================
// MERGED SMART SEARCH REACT COMPONENT
// =====================================================
function SmartSearch({ onSubmit }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fuse = useMemo(() => new Fuse(SEARCH_LIST, FUSE_OPTIONS), []);

  // Filter results
  useEffect(() => {
    const val = input.trim().toLowerCase();
    if (!val) {
      setResults([]);
      return;
    }

    let r = fuse.search(val).map((r) => r.item);
    if (!r.find((x) => x.name === "Something Else")) {
      r.push({ name: "Something Else" });
    }

    setResults(r.slice(0, 8));
  }, [input, fuse]);

  // Handle selection
  const handleSelect = (item) => {
    if (item.name === "Something Else") {
      setInput("");
      setShowDropdown(false);
      return;
    }

    setInput(item.name);
    setShowDropdown(false);
    onSubmit?.(item.name);
  };

  return (
    <div className="relative mx-auto max-w-[420px] w-full">
      <input
        type="text"
        value={input}
        placeholder="Type your symptom or condition..."
        className="w-full bg-black/40 border border-mint/20 text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:border-mint focus:ring-1 focus:ring-mint shadow-[0_0_10px_rgba(0,221,176,0.35)]"
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
      />

      {showDropdown && results.length > 0 && (
        <ul className="absolute left-0 right-0 bg-black/80 border border-mint/20 mt-1 rounded-xl shadow-xl overflow-hidden z-50 max-h-[260px] overflow-y-auto backdrop-blur-sm">
          {results.map((item, i) => (
            <li
              key={i}
              className="px-4 py-3 text-white hover:bg-mint/20 hover:text-mint cursor-pointer transition"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =====================================================
// COLLAPSIBLE BLOCK HELPER
// =====================================================
function Collapsible({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left text-mint font-semibold py-2 flex justify-between items-center"
      >
        {title}
        <span>{open ? "−" : "+"}</span>
      </button>

      <div
        className={`transition-all overflow-hidden ${
          open ? "max-h-[800px] mt-2" : "max-h-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// =====================================================
// MAIN PAGE COMPONENT STARTS HERE
// PART 1 — HERO + AVAILABILITY + PROVIDER CARD
// =====================================================
export default function Home() {
  const router = useRouter();

  // Provider Availability Pulse
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setAvailable((p) => !p);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Private UTI & STD Treatment Online in Florida — Medazon Health</title>
        <meta
          name="description"
          content="Private, confidential UTI & STD treatment in Florida. Florida-licensed clinicians provide same-day telehealth care and prescriptions to your local pharmacy."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-[#0b0f12] to-[#141b1e] text-white overflow-x-hidden">
        
        {/* =====================================================
           HERO SECTION
        ===================================================== */}
        <section className="relative hero min-h-screen flex flex-col items-center justify-center text-center px-5 py-20 bg-[url('/assets/hero.webp')] bg-cover bg-center before:absolute before:inset-0 before:bg-black/60 before:backdrop-blur-xl">
          <div className="relative z-10 max-w-[880px] w-full bg-black/40 border border-white/10 backdrop-blur-2xl rounded-2xl p-8 shadow-[0_0_40px_rgba(0,229,190,0.35)]">
            
            <p className="text-mint text-base font-semibold tracking-wide mb-4">
              Private Florida Telehealth
            </p>

            <h1 className="font-playfair text-4xl md:text-5xl font-bold leading-snug drop-shadow-[0_0_12px_rgba(0,221,176,0.35)]">
              Private UTI & STD Treatment — Florida-Licensed Doctors Online
            </h1>

            <p className="text-gray-200 max-w-[600px] mx-auto mt-4 text-lg">
              Discreet, same-day telehealth visits with Florida-licensed clinicians.
              Get evaluated privately and, if appropriate, receive a prescription sent
              to your local pharmacy.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button
                onClick={() =>
                  document
                    .getElementById("symptoms-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="btn primary bg-[#003d35] border border-mint px-8 py-3 rounded-xl font-bold shadow-[0_0_14px_rgba(0,221,176,0.35)] hover:bg-[#00584b]"
              >
                Start an Instant Visit →
              </button>

              <button
                onClick={() =>
                  document
                    .getElementById("symptoms-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="btn secondary bg-[#1b1d1f] border border-white/30 px-8 py-3 rounded-xl font-bold hover:border-mint hover:text-mint"
              >
                Book My Appointment →
              </button>
            </div>

            {/* Hero CTA Bullets */}
            <ul className="mt-6 text-gray-300 space-y-1 text-sm">
              <li>Same-Day Prescriptions When Appropriate</li>
              <li>Florida-Licensed UTI & STD Clinicians</li>
            </ul>

            {/* Live Availability */}
            <div className="mt-6 inline-flex items-center gap-3 bg-black/40 border border-mint/30 backdrop-blur-md px-6 py-3 rounded-full shadow-[0_0_15px_rgba(0,221,176,0.35)]">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  available ? "bg-mint shadow-[0_0_10px_rgba(0,221,176,0.8)]" : "bg-red-500"
                } animate-pulse`}
              ></span>
              <span className="text-mint font-semibold">
                {available ? "Provider Available Now" : "All Providers Busy — Queue Open"}
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================
           PROVIDER CARD (FOLD 2)
        ===================================================== */}
        <section className="py-20 px-5 flex justify-center bg-gradient-to-b from-[#0B0F12] to-[#141B1E]">
          <div className="max-w-[900px] w-full text-center bg-black/40 border border-mint/20 backdrop-blur-xl p-10 rounded-2xl shadow-[0_0_25px_rgba(0,229,190,0.45)]">
            
            <Image
              src="/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg"
              alt="Florida Provider LaMonica Hodges"
              width={160}
              height={160}
              className="mx-auto rounded-full border-4 border-mint shadow-[0_0_25px_rgba(0,221,176,0.4)] object-cover"
            />

            <h2 className="text-2xl font-playfair font-bold mt-6">
              LaMonica A. Hodges, MSN, APRN, FNP-C
            </h2>

            <p className="text-gray-300 mt-2 text-lg">
              Board-Certified Family Medicine · 10+ Years Experience · Licensed in Florida
            </p>

            <p className="text-mint font-medium mt-3 tracking-wide">
              Serving Tampa, Miami, Orlando & Jacksonville residents
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {["HIPAA Secure", "Stripe Encrypted", "Florida-Licensed", "Same-Day"].map(
                (t, i) => (
                  <span
                    key={i}
                    className="px-6 py-2 bg-white/10 border border-white/10 rounded-full shadow-[0_0_10px_rgba(0,221,176,0.35)] text-sm"
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

              {/* =====================================================
           FOLD 3 — CONDITION OVERVIEW (UTI + STD)
        ===================================================== */}
        <section className="condition-section py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] flex justify-center">
          <div className="condition-card max-w-[1000px] w-full text-center bg-black/40 border border-mint/20 backdrop-blur-xl p-10 rounded-2xl shadow-[0_0_25px_rgba(0,229,190,0.45)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent mb-4">
              UTI & STD Treatment in Florida
            </h2>

            <p className="text-gray-200 max-w-[650px] mx-auto text-lg leading-relaxed mb-10">
              Fast, discreet telehealth visits with Florida-licensed clinicians.  
              Receive expert evaluation and, if appropriate, same-day prescriptions  
              sent directly to your preferred pharmacy.
            </p>

            {/* 3 CARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Card 1 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-[0_0_15px_rgba(0,221,176,0.25)]">
                <Image
                  src="https://medazonhealth.com/private/visit/uti-virtual-visit/1.jpg"
                  alt="UTI Treatment Online Florida"
                  width={400}
                  height={260}
                  className="w-full h-[220px] object-cover rounded-md mb-4"
                />
                <h3 className="text-lg font-semibold mb-2">UTI Treatment</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Confidential online evaluation for urinary-tract infections.
                  Prescriptions sent to CVS, Walgreens, or Publix — same day.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-[0_0_15px_rgba(0,221,176,0.25)]">
                <Image
                  src="https://medazonhealth.com/private/uti-std/florida/std.jpg"
                  alt="STD Care Telehealth Florida"
                  width={400}
                  height={260}
                  className="w-full h-[220px] object-cover rounded-md mb-4"
                />
                <h3 className="text-lg font-semibold mb-2">STD / STI Care</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Private screening and treatment guidance for common STDs  
                  such as chlamydia, gonorrhea, and trichomoniasis.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-[0_0_15px_rgba(0,221,176,0.25)]">
                <Image
                  src="https://medazonhealth.com/private/uti-std/florida/dsd.jpg"
                  alt="Pharmacy Pickup Florida"
                  width={400}
                  height={260}
                  className="w-full h-[220px] object-cover rounded-md mb-4"
                />
                <h3 className="text-lg font-semibold mb-2">Pharmacy Pickup</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Prescriptions transmitted securely to any Florida pharmacy.  
                  No waiting rooms · No insurance required.
                </p>
              </div>
            </div>

            {/* ========== CTA AREA (Scroll to Smart Search) ========== */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <button
                onClick={() =>
                  document.getElementById("symptoms-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="btn primary bg-[#003d35] border border-mint px-8 py-3 rounded-xl font-bold shadow-[0_0_14px_rgba(0,221,176,0.35)] hover:bg-[#00584b]"
              >
                Start an Instant Visit →
              </button>

              <button
                onClick={() =>
                  document.getElementById("symptoms-section")?.scrollIntoView({ behavior: "smooth" })
                }
                className="btn secondary bg-[#1b1d1f] border border-white/30 px-8 py-3 rounded-xl font-semibold hover:border-mint hover:text-mint"
              >
                Book My Appointment →
              </button>
            </div>

            <ul className="cta-bullets text-gray-300 text-sm space-y-1">
              <li>Same-Day Prescriptions When Appropriate</li>
              <li>Florida-Licensed UTI & STD Clinicians</li>
            </ul>
          </div>
        </section>

        {/* =====================================================
            SMART SEARCH SECTION (MAIN TRIAGE FIELD)
        ===================================================== */}
        <section
          id="symptoms-section"
          className="symptoms-section py-20 px-5 border-y border-white/10 text-center bg-[#0f141b]"
        >
          <div className="max-w-[680px] mx-auto">
            <h2 className="text-3xl font-playfair font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent mb-2">
              What brings you in today?
            </h2>

            <p className="text-gray-400 mb-6 text-sm">
              A brief description helps the provider review quickly.
            </p>

            {/* Keyphrase crawlable block */}
            <div className="text-gray-300 text-xs mb-8 leading-6 max-w-[720px] mx-auto opacity-75">
              <span className="inline-block mx-2">UTI</span>
              <span className="inline-block mx-2">Urinary discomfort</span>
              <span className="inline-block mx-2">Burning urination</span>
              <span className="inline-block mx-2">Frequent urination</span>
              <span className="inline-block mx-2">STD symptoms</span>
              <span className="inline-block mx-2">Discharge</span>
              <span className="inline-block mx-2">Pelvic discomfort</span>
              <span className="inline-block mx-2">Rash</span>
              <span className="inline-block mx-2">Cold / flu</span>
              <span className="inline-block mx-2">Migraine</span>
              <span className="inline-block mx-2">Back pain</span>
              <span className="inline-block mx-2">Medication refill</span>
              <span className="inline-block mx-2">Birth control</span>
              <span className="inline-block mx-2">Private concern</span>
            </div>

            {/* SMART SEARCH COMPONENT */}
            <SmartSearch
              onSubmit={(conditionName) => {
                // Redirect to booking logic
                router.push(
                  `/private/uti-std/florida/booking?condition=${encodeURIComponent(
                    conditionName
                  )}`
                );
              }}
            />

            {/* CTA Buttons under search */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() =>
                  router.push("/private/uti-std/florida/booking?type=instant")
                }
                className="bg-mint text-black font-bold px-6 py-2.5 rounded-lg shadow-[0_0_10px_rgba(0,221,176,0.35)] hover:bg-teal-300 transition"
              >
                Start Visit →
              </button>
              <button
                onClick={() =>
                  router.push("/private/uti-std/florida/booking?type=later")
                }
                className="border border-white/30 text-white px-6 py-2.5 rounded-lg font-semibold hover:border-mint hover:text-mint transition"
              >
                Book Appointment →
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
           FOLD 4 — HOW IT WORKS
        ===================================================== */}
        <section className="how-section py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] flex justify-center">
          <div className="how-card max-w-[1000px] w-full text-center bg-black/40 border border-mint/20 p-10 rounded-2xl backdrop-blur-xl shadow-[0_0_25px_rgba(0,229,190,0.45)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent mb-4">
              How It Works
            </h2>

            <p className="text-gray-300 max-w-[640px] mx-auto mb-10 leading-relaxed text-lg">
              A simple, secure process designed for comfort and speed.  
              Licensed Florida clinicians review your case privately —  
              no waiting rooms or insurance required.
            </p>

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              
              {/* Step 1 */}
              <div className="how-step bg-black/50 border border-mint/30 rounded-xl p-6 shadow-[0_0_20px_rgba(0,221,176,0.35)] text-center">
                <Image
                  src="/assets/download_(3).svg"
                  alt="Describe Symptoms"
                  width={52}
                  height={52}
                  className="mx-auto mb-4 drop-shadow-[0_0_10px_rgba(0,229,190,0.8)]"
                />
                <h3 className="text-lg font-semibold mb-2">1 · Describe Your Symptoms</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Complete a 2-minute intake for UTI or STD symptoms —  
                  fully confidential and HIPAA-secure.
                </p>
              </div>

              {/* Step 2 */}
              <div className="how-step bg-black/50 border border-mint/30 rounded-xl p-6 shadow-[0_0_20px_rgba(0,221,176,0.35)] text-center">
                <Image
                  src="/assets/download_(2).svg"
                  alt="Provider Review"
                  width={52}
                  height={52}
                  className="mx-auto mb-4 drop-shadow-[0_0_10px_rgba(0,229,190,0.8)]"
                />
                <h3 className="text-lg font-semibold mb-2">2 · Provider Review</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  A Florida-licensed clinician privately reviews  
                  your information and may message you if  
                  details are needed.
                </p>
              </div>

              {/* Step 3 */}
              <div className="how-step bg-black/50 border border-mint/30 rounded-xl p-6 shadow-[0_0_20px_rgba(0,221,176,0.35)] text-center">
                <Image
                  src="/assets/download_(1).svg"
                  alt="Get Treatment"
                  width={52}
                  height={52}
                  className="mx-auto mb-4 drop-shadow-[0_0_10px_rgba(0,229,190,0.8)]"
                />
                <h3 className="text-lg font-semibold mb-2">3 · Receive Treatment</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  If appropriate, your prescription is sent  
                  electronically to your chosen Florida pharmacy — same day.
                </p>
              </div>

            </div>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button
                onClick={() =>
                  document.getElementById("symptoms-section")?.scrollIntoView({ behavior:"smooth" })
                }
                className="btn primary bg-[#003d35] border border-mint px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(0,221,176,0.35)] hover:bg-[#00584b]"
              >
                Start an Instant Visit →
              </button>

              <button
                onClick={() =>
                  document.getElementById("symptoms-section")?.scrollIntoView({ behavior:"smooth" })
                }
                className="btn secondary bg-transparent border border-white/50 px-8 py-3 rounded-xl font-bold hover:border-mint hover:text-mint"
              >
                Book My Appointment →
              </button>
            </div>

            <ul className="text-gray-300 text-sm space-y-1">
              <li>2-Minute Private Intake</li>
              <li>Provider Review in Minutes</li>
            </ul>
          </div>
        </section>

        {/* =====================================================
            TESTIMONIAL CARD
        ===================================================== */}
        <section className="testimonial-section py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] flex justify-center">
          <div className="testimonial-card max-w-[800px] w-full bg-black/40 border border-mint/20 backdrop-blur-xl p-10 rounded-2xl text-center shadow-[0_0_25px_rgba(0,229,190,0.45)]">
            
            <p className="font-playfair text-xl italic leading-relaxed mb-4">
              “I was able to describe my symptoms, get a response within an hour,  
              and pick up my medication the same afternoon.  
              The process was private, easy, and professional.”
            </p>

            <div className="flex flex-col items-center gap-1">
              <span className="text-mint font-semibold">
                — Patient, Tampa FL (Verified Visit)
              </span>
              <span className="text-gray-300 text-sm">
                ✅ Verified Telehealth Patient
              </span>
            </div>
          </div>
        </section>
        {/* =====================================================
            LONG-FORM EDUCATIONAL CONTENT (FOLD 7)
        ===================================================== */}
        <section
          id="education"
          className="py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] text-gray-200"
        >
          <div className="max-w-[1000px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent text-center mb-8">
              Educational Guide: Understanding UTI & STD Care in Florida
            </h2>

            <p className="text-lg leading-8 mb-10">
              This educational guide explains common urinary tract infection (UTI) and sexually transmitted
              infection (STD/STI) symptoms, what typically happens during telehealth evaluation, when
              in-person care may be recommended, general prevention tips, Florida-specific considerations,
              and how licensed clinicians review concerns. This information is not a diagnosis or treatment
              plan; it helps patients understand the telehealth process and determine whether online
              care may be appropriate under Florida's telehealth laws.
            </p>

            {/* =====================================================
                SMART SEARCH (INLINE PRESENTATION BLOCK)
            ===================================================== */}
            <section id="symptoms-section" className="py-10 text-center border-y border-white/10">
              <h2 className="text-3xl font-playfair font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent mb-2">
                What brings you in today?
              </h2>
              <p className="text-gray-400 text-sm mb-5">A brief description helps the provider review quickly.</p>

              <p className="text-gray-300 text-sm max-w-[620px] mx-auto leading-6 mb-6 opacity-80">
                Smart Search.
              </p>

              {/* Keyword Index */}
              <div className="text-gray-300 text-xs mb-8 leading-6 max-w-[720px] mx-auto opacity-75">
                {[
                  "UTI", "Urinary discomfort", "Burning urination", "Frequent urination", "Possible STD symptoms",
                  "Exposure concern", "Discharge", "Pelvic discomfort", "Rash", "Cold / flu symptoms",
                  "Sinus infection", "Migraine", "Nausea", "Back pain", "Medication refill", "Follow-up visit",
                  "Birth control", "Asthma / inhaler", "Hair loss", "Anxiety / stress"
                ].map((txt, idx) => (
                  <span key={idx} className="inline-block mx-2">
                    {txt}
                  </span>
                ))}
              </div>

              {/* Smart Search Component */}
              <SmartSearch
                onSubmit={(condition) => {
                  router.push(`/private/uti-std/florida/booking?condition=${encodeURIComponent(condition)}`);
                }}
              />

              {/* CTA */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => router.push("/private/uti-std/florida/booking?type=instant")}
                  className="bg-mint text-black font-bold px-6 py-2.5 rounded-lg shadow-[0_0_10px_rgba(0,221,176,0.35)] hover:bg-teal-300 transition"
                >
                  Start Visit →
                </button>
                <button
                  onClick={() => router.push("/private/uti-std/florida/booking?type=later")}
                  className="border border-white/30 text-white px-6 py-2.5 rounded-lg font-semibold hover:border-mint hover:text-mint transition"
                >
                  Book Appointment →
                </button>
              </div>
            </section>

            {/* =====================================================
                UTI EDUCATION BLOCK
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">What Is a Urinary Tract Infection?</h3>
            <p className="leading-7 mb-6">
              A urinary tract infection occurs when bacteria enter the urinary system and cause irritation or inflammation.
              UTIs can involve the bladder, urethra, or kidneys. Most people who seek telehealth support are experiencing
              mild symptoms that started recently and want fast, private access to a clinician licensed in Florida.
            </p>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">Common UTI Symptoms</h4>
            <ul className="ml-6 list-disc leading-7 mb-6">
              <li>Burning or discomfort during urination</li>
              <li>Frequent urge to urinate</li>
              <li>Lower abdominal pressure or mild pelvic discomfort</li>
              <li>Cloudy urine or strong odor</li>
              <li>Mild back or flank tension (non-severe)</li>
            </ul>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">Common Causes of UTIs</h4>
            <p className="leading-7 mb-6">
              UTIs may occur due to dehydration, sexual activity, irritating hygiene products, hormonal changes, or
              previous infections. Clinicians consider these factors during review.
            </p>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">UTI Risk Factors</h4>
            <ul className="ml-6 list-disc leading-7 mb-8">
              <li>Previous UTIs</li>
              <li>Low hydration</li>
              <li>Hygiene or personal care products</li>
              <li>Sexual activity</li>
              <li>Post-menopausal changes</li>
            </ul>

            {/* =====================================================
                STD EDUCATION BLOCK
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">Understanding STDs / STIs</h3>
            <p className="leading-7 mb-6">
              Common sexually transmitted infections include chlamydia, gonorrhea, trichomoniasis, and herpes.
              Many STDs require lab testing. Telehealth clinicians review symptoms, timing, exposure history,
              and medical background to determine next steps.
            </p>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">Common STD Symptoms</h4>
            <ul className="ml-6 list-disc leading-7 mb-6">
              <li>Genital discomfort or irritation</li>
              <li>Discharge or urinary burning</li>
              <li>Sores or bumps</li>
              <li>Exposure to a partner with confirmed infection</li>
              <li>Follow-up evaluation</li>
            </ul>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">When Lab Tests Are Recommended</h4>
            <p className="leading-7 mb-6">
              Many STD cases benefit from lab confirmation. Clinicians may recommend testing at Florida clinics,
              urgent care centers, or county health departments depending on symptoms and exposure.
            </p>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">Partner Notification (General Education)</h4>
            <p className="leading-7 mb-10">
              Individuals diagnosed with STDs are often encouraged to notify recent partners.
            </p>

            {/* =====================================================
                TELEHEALTH PROCESS
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">How Telehealth Works for UTI & STD Concerns</h3>
            <p className="leading-7 mb-6">
              Florida clinicians evaluate symptoms submitted through secure intake. They may ask questions about timing,
              severity, allergies, past history, pregnancy status, or exposure. Based on this information, the clinician
              determines whether telehealth is appropriate.
            </p>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">Clinicians Commonly Review</h4>
            <ul className="ml-6 list-disc leading-7 mb-6">
              <li>Duration of symptoms</li>
              <li>Severity changes</li>
              <li>Allergy history</li>
              <li>Medication list</li>
              <li>Previous conditions</li>
              <li>Pregnancy status</li>
              <li>Exposure timing</li>
            </ul>

            <h4 className="text-white font-semibold text-lg mt-6 mb-2">Treatment Expectations</h4>
            <p className="leading-7 mb-10">
              If treatment is appropriate, clinicians may electronically send medication to your Florida pharmacy.
            </p>

            {/* =====================================================
                WHEN TELEHEALTH MAY NOT BE APPROPRIATE
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">When Telehealth May Not Be Appropriate</h3>
            <ul className="ml-6 list-disc leading-7 mb-6">
              <li>High fever</li>
              <li>Severe abdominal or pelvic pain</li>
              <li>Significant blood in urine</li>
              <li>Vomiting or dehydration</li>
              <li>Pregnancy with troubling symptoms</li>
              <li>Symptoms lasting unusually long</li>
              <li>Possible kidney infection signs</li>
            </ul>

            <p className="leading-7 mb-10">
              Severe symptoms may require in-person evaluation.
            </p>

            {/* =====================================================
                PREVENTION
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">General Prevention Tips</h3>

            <h4 className="text-white font-semibold text-lg mb-2">Reducing UTI Risk</h4>
            <ul className="ml-6 list-disc leading-7 mb-6">
              <li>Stay hydrated</li>
              <li>Urinate after sexual activity</li>
              <li>Avoid irritating hygiene products</li>
              <li>Wear breathable fabrics</li>
            </ul>

            <h4 className="text-white font-semibold text-lg mb-2">Reducing STD Risk</h4>
            <ul className="ml-6 list-disc leading-7 mb-10">
              <li>Use protection consistently</li>
              <li>Limit exposure to unknown partners</li>
              <li>Seek testing when needed</li>
              <li>Discuss concerns with partners</li>
            </ul>

            {/* =====================================================
                FLORIDA REGIONS
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">
              Florida-Specific Telehealth Insights
            </h3>

            <p className="leading-7 mb-6">
              Florida supports telehealth evaluations under Florida Statute §456.47. Clinicians can provide guidance,
              review symptoms, and assist adults statewide.
            </p>

            <h4 className="text-white font-semibold text-lg mb-2">Major Florida Regions</h4>
            <ul className="ml-6 list-disc leading-7 mb-8">
              <li>South Florida (Miami, Fort Lauderdale, West Palm Beach)</li>
              <li>Central Florida (Orlando, Kissimmee, Lakeland)</li>
              <li>Tampa Bay Area (Tampa, St. Petersburg, Clearwater)</li>
              <li>North Florida (Jacksonville, Tallahassee)</li>
              <li>Panhandle (Pensacola, Panama City)</li>
            </ul>

            {/* =====================================================
                RELATED CONDITIONS
            ===================================================== */}
            <h3 className="text-mint text-xl font-bold mt-10 mb-4">Related Visit Reasons</h3>
            <ul className="ml-6 list-disc leading-7 mb-4">
              <li><a href="/private/visit/bv" className="text-mint">Bacterial Vaginosis (BV)</a></li>
              <li><a href="/private/visit/yeast" className="text-mint">Yeast Infection</a></li>
              <li><a href="/private/visit/sinus" className="text-mint">Sinus Infection</a></li>
              <li><a href="/private/visit/cold-flu" className="text-mint">Cold / Flu / URI</a></li>
              <li><a href="/private/visit/refill" className="text-mint">Medication Refill</a></li>
              <li><a href="/private/visit/private" className="text-mint">Private / Sensitive Visit</a></li>
            </ul>

          </div>
        </section>

        {/* =====================================================
            FOLD 8 — FLORIDA CITIES WE SERVE
        ===================================================== */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] text-gray-200 text-center">
          <div className="max-w-[1000px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent mb-6">
              Florida Cities We Serve
            </h2>

            <p className="leading-7 max-w-[760px] mx-auto mb-8">
              Licensed Florida clinicians support adults statewide through secure telehealth.
              These city pages help patients in major metro areas access private UTI & STD information
              and appointment options.
            </p>

            {/* Cities Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              {[
                "Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale",
                "St. Petersburg", "Tallahassee", "Gainesville", "Sarasota", "Pensacola"
              ].map((city, idx) => (
                <a
                  key={idx}
                  href={`/private/uti-std/florida/${city.toLowerCase().replace(/ /g, "-")}`}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-mint font-semibold shadow-[0_0_10px_rgba(0,221,176,0.25)] hover:bg-white/10 transition"
                >
                  {city}
                </a>
              ))}
            </div>

          </div>
        </section>

        {/* =====================================================
            FOLD 9 — ZIP CODE COVERAGE
        ===================================================== */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] text-gray-200">
          <div className="max-w-[1000px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent mb-6 text-center">
              Florida ZIP Codes We Support
            </h2>

            <p className="text-center leading-7 max-w-[760px] mx-auto mb-10">
              Private telehealth support is available statewide. ZIP clusters help patients access
              UTI & STD education and appointment options closest to their location.
            </p>

            {/* ZIP REGION GRID */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Miami", ["33101", "33130", "33147", "33150", "33161"]],
                ["Orlando", ["32801", "32803", "32806", "32811", "32822"]],
                ["Tampa", ["33602", "33603", "33609", "33611", "33629"]],
                ["Jacksonville", ["32202", "32204", "32205", "32207", "32210"]],
                ["Fort Lauderdale", ["33301", "33304", "33308", "33312", "33316"]],
                ["St. Petersburg", ["33701", "33704", "33705", "33707", "33713"]],
                ["Tallahassee", ["32301", "32303", "32308", "32311", "32312"]],
                ["Gainesville", ["32601", "32605", "32607", "32608", "32653"]],
                ["Sarasota", ["34231", "34232", "34233", "34234", "34236"]],
                ["Pensacola", ["32501", "32502", "32503", "32504", "32507"]],
              ].map(([city, zips], idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center shadow-[0_0_10px_rgba(0,221,176,0.25)]"
                >
                                    <h4 className="text-mint font-semibold mb-2">
                    {city}
                  </h4>

                  <p className="text-gray-300 text-sm leading-6">
                    {zips.map((z, i) => (
                      <span key={i}>
                        {z}
                        {i < zips.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            FOLD 10 — WHY PATIENTS CHOOSE THIS SERVICE
        ===================================================== */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] text-gray-200">
          <div className="max-w-[1000px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl p-10 rounded-2xl shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent text-center mb-6">
              Why Florida Patients Choose This Service
            </h2>

            <p className="text-center max-w-[760px] mx-auto mb-8 leading-7 text-lg">
              Adults across Florida often prefer private telehealth visits for urinary or STD-related
              concerns. Below are key reasons patients use this service.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Licensed Florida Clinicians",
                  text: "Evaluations performed by clinicians licensed in the state of Florida and experienced in virtual care."
                },
                {
                  title: "No Waiting Rooms",
                  text: "Private, secure online intake instead of urgent care waiting rooms."
                },
                {
                  title: "Same-Day Pharmacy Pickup",
                  text: "Prescriptions can be transmitted electronically to major pharmacies statewide."
                },
                {
                  title: "Fully Private & Secure",
                  text: "Encrypted, HIPAA-compliant systems for maximum confidentiality."
                },
                {
                  title: "Statewide Availability",
                  text: "Access care from any region in Florida with a reliable connection."
                },
                {
                  title: "Insurance Not Required",
                  text: "Self-pay visits available without navigating insurance policies."
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-[0_0_15px_rgba(0,221,176,0.25)]"
                >
                  <h3 className="text-mint font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-300 leading-6">{item.text}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* =====================================================
            FOLD 11 — COVERAGE AREAS
        ===================================================== */}
        <section className="py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] text-gray-200">
          <div className="max-w-[1000px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl p-10 rounded-2xl shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent text-center mb-6">
              Florida Coverage Areas
            </h2>

            <p className="text-center max-w-[760px] mx-auto leading-7 mb-8">
              Adults across Florida can access private telehealth evaluation from any region with an
              internet connection. These areas reflect common regional groupings.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "South Florida",
                  counties: ["Miami-Dade County", "Broward County", "Palm Beach County"]
                },
                {
                  title: "Central Florida",
                  counties: ["Orange County", "Osceola County", "Seminole County", "Polk County"]
                },
                {
                  title: "Tampa Bay Region",
                  counties: ["Hillsborough County", "Pinellas County", "Pasco County"]
                },
                {
                  title: "North Florida",
                  counties: ["Duval County", "St. Johns County", "Alachua County"]
                },
                {
                  title: "Florida Panhandle",
                  counties: ["Escambia County", "Santa Rosa County", "Okaloosa County", "Bay County"]
                },
                {
                  title: "Gulf Coast",
                  counties: ["Sarasota County", "Manatee County", "Lee County", "Collier County"]
                }
              ].map((region, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-[0_0_15px_rgba(0,221,176,0.25)]"
                >
                  <h3 className="text-mint font-semibold text-lg mb-2">{region.title}</h3>
                  <p className="text-sm leading-6">
                    {region.counties.map((c, i) => (
                      <span key={i}>
                        {c}
                        {i < region.counties.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="text-mint text-xl font-bold mt-10 mb-4 text-center">
              Florida Telehealth Availability
            </h3>

            <p className="text-center max-w-[760px] mx-auto leading-7 mb-6">
              Telehealth evaluations for mild concerns are available during extended hours.
              Availability varies based on clinician schedules.
            </p>

            <p className="text-center text-mint font-semibold mt-8">
              *This section is for general educational and informational use.*
            </p>

          </div>
        </section>

               {/* =====================================================
            PROVIDER E-E-A-T BLOCK (BOTTOM VERSION)
        ===================================================== */}
        <section
          id="provider-bottom"
          className="py-20 px-5 bg-gradient-to-b from-[#0B0F12] to-[#141B1E] text-gray-200"
        >
          <div className="max-w-[1000px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h2 className="font-playfair text-3xl font-bold bg-gradient-to-r from-mint to-teal-300 bg-clip-text text-transparent text-center mb-6">
              About Your Florida Clinician
            </h2>

            <p className="max-w-[760px] mx-auto text-center leading-7 mb-8 text-lg">
              This section provides general educational background about the licensed clinician who
              reviews symptoms submitted by adults located in Florida during private telehealth visits.
              It is not a replacement for clinical consultation but helps patients understand training,
              experience, and areas of focus.
            </p>

            {/* CLINICAL BIO CONTENT */}
            <div className="max-w-[760px] mx-auto text-left leading-7 text-gray-200">

              <h3 className="text-mint text-xl font-bold mb-2">
                LaMonica A. Hodges, MSN, APRN, FNP-C
              </h3>

              <p className="mb-4">
                LaMonica Hodges is a Florida-licensed Family Nurse Practitioner with more than ten years
                of clinical experience in primary care, symptom evaluation, women’s health, and telehealth
                communication. Her background includes reviewing common non-emergent concerns such as
                mild urinary symptoms, exposure concerns, medication follow-ups, and other assessments
                appropriate for virtual evaluation.
              </p>

              <h4 className="text-white font-semibold text-lg mt-6 mb-2">Education & Credentials</h4>
              <ul className="ml-6 list-disc leading-7 mb-4">
                <li>Master of Science in Nursing (MSN)</li>
                <li>Board-Certified Family Nurse Practitioner (FNP-C)</li>
                <li>Licensed to practice in the State of Florida</li>
              </ul>

              <h4 className="text-white font-semibold text-lg mt-6 mb-2">Clinical Focus Areas</h4>
              <ul className="ml-6 list-disc leading-7 mb-4">
                <li>Evaluation of mild urinary symptoms</li>
                <li>Education on common STDs/STIs</li>
                <li>Symptom-based primary care assessments</li>
                <li>Telehealth follow-up guidance</li>
              </ul>

              <h4 className="text-white font-semibold text-lg mt-6 mb-2">Telehealth Experience</h4>
              <p className="mb-4">
                LaMonica incorporates telehealth as part of her broader practice, focusing on secure,
                patient-centered communication to help adults across Florida describe symptoms, understand
                next steps, and determine whether online care is appropriate for their situation.
              </p>

              <h4 className="text-white font-semibold text-lg mt-6 mb-2">Patient Trust & Safety</h4>
              <p className="mb-4">
                All evaluations follow Florida telehealth requirements, including privacy guidelines,
                professional standards, and secure handling of patient information.
              </p>

              <p className="text-center text-mint font-semibold mt-6">
                *This section is for general educational purposes and does not replace clinical care.*
              </p>

            </div>
          </div>
        </section>

        {/* =====================================================
            FOOTER
        ===================================================== */}
        <footer className="py-20 px-5 bg-black text-gray-300 border-t border-white/10 text-center">
          <div className="max-w-[900px] mx-auto bg-black/40 border border-mint/20 backdrop-blur-xl rounded-2xl p-10 shadow-[0_0_25px_rgba(0,229,190,0.35)]">

            <h3 className="text-mint text-2xl font-bold mb-1">Medazon Health</h3>
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-6">
              Secure · Licensed · Private Telehealth Care in Florida
            </p>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-4 text-sm mb-6">
              {["Terms of Service", "Privacy Policy", "HIPAA Notice", "State Licensure", "Telehealth Consent"].map(
                (label, i) => (
                  <a key={i} href="#" className="hover:text-mint transition">
                    {label}
                  </a>
                )
              )}
            </div>

            <p className="text-xs text-gray-400 leading-6 mb-8">
              © {new Date().getFullYear()} Medazon Health — All rights reserved.
              <br />
              Licensed Florida Provider · 123 Wellness Blvd · Tampa FL 33602
              <br />
              Telehealth authorized under Florida Statute § 456.47.
            </p>

            {/* Social icons */}
            <div className="flex justify-center gap-4 text-lg">
              <a href="#" className="hover:text-mint">🌐</a>
              <a href="#" className="hover:text-mint">📸</a>
              <a href="#" className="hover:text-mint">💼</a>
            </div>
          </div>

          <p className="text-xs text-gray-500 max-w-[900px] mx-auto mt-6 leading-6">
            Medazon Health offers private UTI and STD telehealth treatment for Florida residents,
            serving Tampa, Miami, Orlando, Jacksonville, and statewide regions.
          </p>
        </footer>

      </div>

      {/* =====================================================
          MERGED & OPTIMIZED JSON-LD SCHEMA BUNDLE
      ===================================================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            name: "Private UTI & STD Treatment — Florida Telehealth",
            url: "https://medazonhealth.com/private/uti-std/florida",

            medicalSpecialty: ["Urology", "InfectiousDisease", "Telemedicine"],
            about: [
              {
                "@type": "MedicalCondition",
                name: "Urinary Tract Infection",
                signOrSymptom: [
                  "Burning urination",
                  "Frequent urination",
                  "Pelvic discomfort"
                ]
              },
              {
                "@type": "MedicalCondition",
                name: "Sexually Transmitted Infection",
                signOrSymptom: [
                  "Genital discomfort",
                  "Discharge",
                  "Urinary burning"
                ]
              }
            ],

            provider: {
              "@type": "Physician",
              name: "LaMonica A. Hodges, MSN, APRN, FNP-C",
              medicalSpecialty: ["FamilyMedicine", "PrimaryCare", "Telemedicine"],
              worksFor: {
                "@type": "Organization",
                name: "Medazon Health"
              }
            },

            potentialAction: {
              "@type": "MedicalTherapy",
              name: "Telehealth Evaluation",
              url: "https://medazonhealth.com/private/uti-std/florida/booking"
            },

            mainEntity: {
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Can I get UTI treatment online in Florida?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "Yes. Florida-licensed clinicians can review symptoms and, when appropriate, prescribe antibiotics electronically to your pharmacy."
                  }
                },
                {
                  "@type": "Question",
                  name: "Is STD treatment confidential?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text:
                      "All communication is encrypted and HIPAA-compliant. Your information is never shared outside secure systems."
                  }
                }
              ]
            },

            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Private Care",
                  item: "https://medazonhealth.com/private"
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "UTI & STD",
                  item: "https://medazonhealth.com/private/uti-std"
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Florida",
                  item: "https://medazonhealth.com/private/uti-std/florida"
                }
              ]
            }
          })
        }}
      />

    </>
  );
}



