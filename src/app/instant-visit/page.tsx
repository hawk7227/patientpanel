import React from 'react';

export default function LandingPreview() {
  return (
    <div className="min-h-screen text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#040807' }}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(251, 146, 60, 0.4); }
          50% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.6); }
        }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        
        @keyframes live-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .live-dot { animation: live-dot 1s ease-in-out infinite; }
        
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 0.2; }
        }
        .ring-pulse { animation: ring-pulse 2s ease-in-out infinite; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .float { animation: float 3s ease-in-out infinite; }
        
        @keyframes pulse-orange {
          0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4); }
          50% { box-shadow: 0 0 35px rgba(249, 115, 22, 0.6); }
        }
        .pulse-orange { animation: pulse-orange 1.5s ease-in-out infinite; }
      `}</style>

      {/* LIVE AVAILABILITY BAR */}
      <div style={{ background: 'linear-gradient(to right, rgba(239,68,68,0.2), rgba(239,68,68,0.1), rgba(239,68,68,0.2))', borderBottom: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full px-3 py-1 pulse-glow" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <span className="w-2 h-2 rounded-full live-dot" style={{ background: '#4ade80' }}></span>
              <span className="text-xs font-semibold" style={{ color: '#f87171' }}>DOCTOR AVAILABLE NOW</span>
            </div>
            <span className="text-sm text-gray-300 hidden sm:inline">Skip the line • Get seen in minutes</span>
          </div>
          <button className="text-white font-semibold text-sm px-5 py-2 rounded-lg flex items-center gap-2" style={{ background: '#ef4444' }}>
            Start Instant Visit →
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-8 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(239,68,68,0.06) 0%, transparent 50%)' }}></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45,212,191,0.15)' }}>
                <span style={{ color: '#2dd4bf' }}>🛡️</span>
              </div>
              <span className="text-xl font-bold text-white">Medazon<span style={{ color: '#2dd4bf' }}>Health</span></span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center leading-tight" style={{ fontFamily: 'Georgia, Times, serif' }}>
            See a Doctor
            <span className="block" style={{ color: '#f87171', textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>In Minutes, Not Days</span>
          </h1>
          
          <p className="text-xl text-gray-300 text-center mb-10 max-w-2xl mx-auto">
            No appointments. No waiting rooms. Just instant access to a Florida-licensed provider.
          </p>

          {/* WIDGET */}
          <div className="relative max-w-2xl mx-auto mb-12">
            <div className="absolute rounded-3xl pointer-events-none" style={{ top: '-8px', left: '-8px', right: '-8px', bottom: '-8px', background: 'linear-gradient(180deg, rgba(239,68,68,0.25) 0%, rgba(20,184,166,0.15) 100%)', filter: 'blur(20px)' }}></div>
            
            <div className="relative rounded-3xl p-6 overflow-hidden" style={{ background: '#0a1210', border: '1px solid rgba(20,184,166,0.3)' }}>
              
              {/* Doctor Profile */}
              <div className="flex items-center gap-5 mb-6">
                <div className="relative flex-shrink-0">
                  <div className="absolute ring-pulse" style={{ inset: '-6px', border: '2px solid rgba(20,184,166,0.4)', borderRadius: '100%' }}></div>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(to bottom right, #0d9488, #115e59)' }}>
                    LH
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full live-dot" style={{ background: '#22c55e', border: '3px solid #0a1210' }}></div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-1">LaMonica A. Hodges</h2>
                  <p className="text-gray-400 text-sm mb-2">Board-Certified Family Nurse Practitioner</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.4)', color: '#2dd4bf' }}>FL Licensed</span>
                    <span className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
                      <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#4ade80' }}></span>
                      Available Now
                    </span>
                  </div>
                </div>
              </div>

              {/* NEW MEDAZONCOMPACT PHONE FRAME */}
              <div 
                className="rounded-2xl overflow-hidden mb-6 float relative"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(5, 11, 20, 0.95) 0%, rgba(13, 18, 24, 0.98) 100%)',
                  border: '1px solid rgba(45, 245, 198, 0.2)',
                  boxShadow: '0 0 40px rgba(45, 245, 198, 0.15), 0 0 80px rgba(45, 245, 198, 0.08)'
                }}
              >
                
                {/* HEADER - I'M ONLINE */}
                <div className="flex items-center justify-center px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full live-dot" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }}></span>
                    <span className="text-sm font-bold tracking-wider" style={{ color: '#4ade80' }}>I'M ONLINE</span>
                  </div>
                </div>

                {/* PROVIDER SECTION */}
                <div className="relative overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(5, 11, 20, 0.7) 0%, rgba(5, 11, 20, 0.9) 100%)' }}>
                  <div className="relative z-10 px-3 py-3 flex flex-col items-center">
                    {/* MUTED Badge */}
                    <div className="flex items-center gap-1 rounded px-2 py-0.5 mb-2" style={{ background: 'rgba(239, 68, 68, 0.3)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                      <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#ef4444' }}></span>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>Muted</span>
                    </div>

                    {/* Avatar */}
                    <div className="relative mb-2">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(45, 245, 198, 0.2)', boxShadow: '0 0 0 3px rgba(45, 245, 198, 0.3), 0 0 20px rgba(45, 245, 198, 0.2)' }}>
                        <svg viewBox="0 0 24 24" fill="#2df5c6" className="w-8 h-8">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full" style={{ background: '#4ade80', border: '2px solid #0d1218', boxShadow: '0 0 6px #4ade80' }}></div>
                    </div>

                    <h3 className="text-white font-bold text-sm mb-0">LaMonica Hodges</h3>
                    <p className="text-[11px] text-gray-400 mb-2">Board-Certified FNP</p>

                    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ border: '1px solid rgba(234, 179, 8, 0.5)', background: 'rgba(234, 179, 8, 0.15)' }}>
                      <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#facc15' }}></span>
                      <span className="text-[11px] font-medium" style={{ color: '#facc15' }}>Currently with a patient</span>
                    </div>
                  </div>
                </div>

                {/* QUEUE SECTION */}
                <div className="py-2.5 px-3">
                  <div className="rounded-lg p-2.5 text-center flex items-center justify-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(45, 245, 198, 0.1) 0%, rgba(45, 245, 198, 0.05) 100%)', border: '1px solid rgba(45, 245, 198, 0.2)' }}>
                    <div className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2df5c6" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      </svg>
                      <span className="text-xl font-black" style={{ color: '#2df5c6' }}>1</span>
                      <span className="text-sm font-semibold text-white">in Queue</span>
                    </div>
                    <div className="w-px h-6" style={{ background: 'rgba(45, 245, 198, 0.3)' }}></div>
                    <span className="text-sm font-bold" style={{ color: '#2df5c6' }}>🎉 You're Up Next!</span>
                  </div>
                </div>

                {/* FORM FIELDS */}
                <div className="px-3 pb-3 space-y-2">
                  {/* Row 1: Reason & Visit Type */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg px-3 py-3 text-white font-semibold flex items-center justify-between text-sm" style={{ background: '#0d1218', border: '1px solid #f97316', boxShadow: '0 0 8px rgba(249,115,22,0.4)' }}>
                      <span className="truncate">Reason For Visit</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2df5c6" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                    <div className="rounded-lg px-3 py-3 text-white font-semibold flex items-center justify-between text-sm" style={{ background: '#0d1218', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span className="truncate">Visit Type</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2df5c6" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>

                  {/* Row 2: Day/Time & Email */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg px-3 py-3 text-white font-semibold flex items-center justify-between text-xs" style={{ background: '#0d1218', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span className="truncate">Appointment Day/Time</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2df5c6" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div className="relative">
                      <div className="rounded-lg px-3 py-3 pr-10 text-white text-xs font-semibold truncate" style={{ background: '#0d1218', border: '1px solid #2df5c6' }}>
                        hawk7227@yahoo.com
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center" style={{ background: '#ef4444' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                          <circle cx="12" cy="10" r="1.5"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(13, 18, 24, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg px-3 py-3 text-white text-sm font-medium" style={{ background: '#11161c', border: '1px solid #2df5c6' }}>MARCUS</div>
                      <div className="rounded-lg px-3 py-3 text-white text-sm font-medium" style={{ background: '#11161c', border: '1px solid #2df5c6' }}>HAWKINS</div>
                      <div className="rounded-lg px-3 py-3 text-white text-sm font-medium" style={{ background: '#11161c', border: '1px solid #2df5c6' }}>(602)-549-8598</div>
                      <div className="rounded-lg px-3 py-3 text-white text-sm font-medium" style={{ background: '#11161c', border: '1px solid #2df5c6' }}>01/03/1975</div>
                      <div className="col-span-2 rounded-lg px-3 py-3 text-white text-sm font-medium truncate" style={{ background: '#11161c', border: '1px solid #2df5c6' }}>7204 E Paradise Dr, Scottsdale, AZ</div>
                    </div>
                  </div>

                  {/* CTA - Orange */}
                  <button className="w-full text-white px-4 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 pulse-orange" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)' }}>
                    🔒 SECURE YOUR SPOT
                  </button>
                  
                  {/* Card Authorized Disclaimer */}
                  <p className="text-[10px] text-gray-500 text-center mt-2 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="#2dd4bf" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Card authorized only — charged when call starts
                  </p>
                </div>
              </div>

              {/* 3-Step Process */}
              <div className="flex items-start justify-between gap-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(239,68,68,0.2)' }}>
                    <span className="font-bold text-sm" style={{ color: '#f87171' }}>1</span>
                  </div>
                  <div className="text-sm font-medium">Quick intake</div>
                  <div className="text-xs text-gray-500">2 minutes</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(234,179,8,0.2)' }}>
                    <span className="font-bold text-sm" style={{ color: '#facc15' }}>2</span>
                  </div>
                  <div className="text-sm font-medium">Wait in queue</div>
                  <div className="text-xs text-gray-500">We'll text you</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(34,197,94,0.2)' }}>
                    <span className="font-bold text-sm" style={{ color: '#4ade80' }}>3</span>
                  </div>
                  <div className="text-sm font-medium">Video call</div>
                  <div className="text-xs text-gray-500">Get treated</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="#2dd4bf" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              HIPAA Compliant
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="#60a5fa" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              256-bit Encryption
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="#4ade80" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
              Licensed Provider
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

