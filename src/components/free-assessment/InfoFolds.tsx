"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Shield, Lock, FileText, CheckCircle, Eye, Landmark } from "lucide-react";
import { FAQS, STATE_CONFIG } from "@/lib/assessment-data";

// --- CUSTOM HOOK ---
function useCurrentState() {
  const [stateName, setStateName] = useState("Florida");
  const [stateKey, setStateKey] = useState("florida");

  useEffect(() => {
    const updateState = () => {
      const savedName = localStorage.getItem('userStateName');
      const savedKey = localStorage.getItem('userConfirmedState');
      if (savedName) setStateName(savedName);
      if (savedKey) setStateKey(savedKey.toLowerCase());
    };
    updateState();
    window.addEventListener('medazon-state-updated', updateState);
    return () => window.removeEventListener('medazon-state-updated', updateState);
  }, []);

  return { stateName, stateKey };
}

// --- GENERIC FOLD ---
interface FoldProps {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  dark?: boolean;
}

function Fold({ title, subtitle, children, dark = false }: FoldProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={`py-12 px-4 ${dark ? 'bg-[#050a08]' : ''}`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#0a0f0d]/80 border border-teal-500/20 rounded-2xl p-6 md:p-8 transition-all">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center font-serif text-white">
            {title}
          </h2>
          <p className="text-gray-400 text-center mb-6">{subtitle}</p>
          
          {!isOpen && (
            <div className="text-center">
              <button 
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 font-medium px-6 py-3 rounded-xl hover:bg-teal-500/20 transition-all"
              >
                <span>See More</span>
                <ChevronDown size={16} />
              </button>
            </div>
          )}

          {isOpen && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
               {children}
               <div className="text-center mt-6">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 text-sm hover:text-teal-400"
                  >
                    Show Less
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// 1. FAQ
export const FAQFold = () => (
  <Fold title={<span>Frequently Asked <span className="text-teal-400">Questions</span></span>} subtitle="About our free health assessment" dark>
    <div className="space-y-4">
      {FAQS.map((faq, i) => (
        <div key={i} className="border-b border-white/10 pb-3">
          <p className="text-teal-400 font-medium">{faq.q}</p>
          <p className="text-gray-400 text-sm mt-1">{faq.a}</p>
        </div>
      ))}
    </div>
  </Fold>
);

// 2. Provider (Brief)
export const ProviderFold = () => {
  const { stateName } = useCurrentState();
  return (
    <Fold title={<span>Your <span className="text-teal-400">{stateName} Clinician</span></span>} subtitle="Board-certified provider with 10+ years experience">
      <div className="space-y-4 text-gray-300">
        <h3 className="text-teal-400 text-xl font-semibold">LaMonica A. Hodges, MSN, APRN, FNP-C</h3>
        <p>LaMonica Hodges is a licensed Family Nurse Practitioner with more than ten years of clinical experience in primary care, symptom evaluation, women's health, mental health, and virtual care.</p>
        
        <h4 className="text-white font-semibold mt-4">Clinical Focus Areas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
          {['Primary Care & General Health', 'Mental Health (Anxiety, Depression)', 'Weight Loss', 'Skin Conditions', 'Sexual Health', 'Women\'s Health', 'Men\'s Health'].map((area, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-teal-400 mt-1 flex-shrink-0" />
              <span>{area}</span>
            </div>
          ))}
        </div>
      </div>
    </Fold>
  );
};

// 3. Cities (Dynamic Array)
export const CitiesFold = () => {
  const { stateName, stateKey } = useCurrentState();
  const config = STATE_CONFIG[stateKey] || STATE_CONFIG['florida'];
  const cities = config.citiesArray || ['Miami', 'Orlando', 'Tampa'];
  const abbrev = config.abbrev || 'FL';

  return (
    <Fold title={<span>{stateName} Cities <span className="text-teal-400">We Serve</span></span>} subtitle="Telehealth available statewide" dark>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cities.map((city: string) => (
           <div key={city} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
             <span className="text-teal-400 font-medium text-sm">{city}</span>
           </div>
        ))}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
           <span className="text-teal-400 font-medium text-sm">+ All {abbrev} Cities</span>
        </div>
      </div>
      <p className="text-gray-400 text-sm text-center">As long as you're physically located in {stateName} at the time of your visit, we can help – statewide coverage.</p>
    </Fold>
  );
};

// 4. Privacy
export const PrivacyFold = () => {
  const { stateName } = useCurrentState();
  return (
    <Fold title={<span>{stateName} Privacy & <span className="text-teal-400">Compliance</span></span>} subtitle="Your information is protected">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          {/* Card 1: HIPAA */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
            <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2 text-base">
              <Shield size={18} className="fill-blue-400/20"/> HIPAA Compliant
            </h4>
            <p className="text-sm text-gray-400 pl-1">All communications protected by federal law.</p>
          </div>

          {/* Card 2: Encryption */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
            <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2 text-base">
              <Lock size={18} className="fill-amber-400/20"/> 256-bit Encryption
            </h4>
            <p className="text-sm text-gray-400 pl-1">Bank-level SSL encryption for all data.</p>
          </div>

          {/* Card 3: No Insurance */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
            <h4 className="text-rose-400 font-semibold mb-2 flex items-center gap-2 text-base">
              <Eye size={18} className="fill-rose-400/20"/> No Insurance Records
            </h4>
            <p className="text-sm text-gray-400 pl-1">Self-pay only = complete privacy.</p>
          </div>

          {/* Card 4: Telehealth Law */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
            <h4 className="text-teal-400 font-semibold mb-2 flex items-center gap-2 text-base">
              <Landmark size={18} className="fill-teal-400/20"/> {stateName} Telehealth Law
            </h4>
            <p className="text-sm text-gray-400 pl-1">Compliant with state regulations.</p>
          </div>
       </div>
       
       <p className="text-teal-400 text-sm mt-6 text-center">
         Licensed telehealth services for adults 18+ in {stateName}.
       </p>
    </Fold>
  );
};

// 5. Why Us
export const WhyUsFold = () => {
  const { stateName } = useCurrentState();
  return (
    <Fold title={<span>Why {stateName} Patients <span className="text-teal-400">Choose Us</span></span>} subtitle="Trusted for private telehealth care" dark>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
              { t: "Licensed Clinicians", d: "Board-certified providers." },
              { t: "No Waiting Rooms", d: "Get evaluated from home." },
              { t: "Same-Day Pharmacy", d: "Prescriptions sent instantly." },
              { t: "50+ Conditions", d: "UTI, anxiety, weight loss, etc." },
              { t: "No Insurance Needed", d: "$189 flat rate per visit." },
              { t: "Maximum Privacy", d: "Nothing on insurance records." }
          ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-teal-400 font-semibold mb-1">{item.t}</h4>
                <p className="text-gray-400 text-sm">{item.d}</p>
              </div>
          ))}
      </div>
    </Fold>
  );
};

// 6. Coverage Areas
export const CoverageFold = () => {
  const { stateName, stateKey } = useCurrentState();
  const config = STATE_CONFIG[stateKey] || STATE_CONFIG['florida'];
  const regions = config.regions || [];

  return (
    <Fold title={<span>{stateName} <span className="text-teal-400">Coverage Areas</span></span>} subtitle="Statewide coverage by region">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((region: any, i: number) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-teal-400 font-semibold mb-2">{region.name}</h4>
            <p className="text-gray-400 text-sm">{region.counties}</p>
          </div>
        ))}
      </div>
    </Fold>
  );
};

// 7. Availability
export const AvailabilityFold = () => {
  const { stateName } = useCurrentState();
  return (
    <Fold title={<span>{stateName} Telehealth <span className="text-teal-400">Availability</span></span>} subtitle="Extended hours for your convenience" dark>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-center">
         <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">🌅</div>
            <h4 className="text-teal-400 font-semibold">Morning</h4>
            <p className="text-gray-400 text-sm">8:00 AM - 12:00 PM</p>
         </div>
         <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">☀️</div>
            <h4 className="text-teal-400 font-semibold">Afternoon</h4>
            <p className="text-gray-400 text-sm">12:00 PM - 5:00 PM</p>
         </div>
         <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="text-2xl mb-2">🌙</div>
            <h4 className="text-teal-400 font-semibold">Evening</h4>
            <p className="text-gray-400 text-sm">5:00 PM - 8:00 PM</p>
         </div>
      </div>
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-center">
         <p className="text-sm"><span className="text-teal-400 font-semibold">Available 7 Days a Week</span> — Including weekends and holidays.</p>
      </div>
    </Fold>
  );
};

// 8. About Clinician Detailed
export const AboutClinicianFold = () => {
  const { stateName } = useCurrentState();
  return (
    <Fold title={<span>About Your {stateName} <span className="text-teal-400">Clinician</span></span>} subtitle="Detailed provider background">
      <div className="max-w-2xl mx-auto space-y-4 text-gray-300">
        <h3 className="text-teal-400 text-xl font-semibold">LaMonica A. Hodges, MSN, APRN, FNP-C</h3>
        <p className="text-sm">Board-Certified Family Nurse Practitioner with 10+ years of clinical experience. Licensed to practice in {stateName}. Master of Science in Nursing (MSN).</p>
        <p className="text-sm">Telehealth evaluations follow all {stateName} requirements including privacy guidelines and professional standards.</p>
        <p className="text-teal-400 text-sm text-center italic">*For general educational purposes.*</p>
      </div>
    </Fold>
  );
};

// 9. Zip Codes
export const ZipCodesFold = () => {
  const { stateName, stateKey } = useCurrentState();
  const config = STATE_CONFIG[stateKey] || STATE_CONFIG['florida'];
  const zips = config.zips || [];

  return (
    <Fold title={<span>{stateName} ZIP Codes <span className="text-teal-400">We Support</span></span>} subtitle="Major ZIP code clusters by city" dark>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {zips.map((item: any, i: number) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <h4 className="text-teal-400 font-semibold text-xs mb-1">{item.city}</h4>
            <p className="text-gray-400 text-[10px]">{item.codes.join(', ')}</p>
          </div>
        ))}
      </div>
      <p className="text-gray-400 text-sm text-center mt-4">+ All other {stateName} ZIP codes supported statewide</p>
    </Fold>
  );
};