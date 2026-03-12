export default function AssessmentPageContent() {
  const [showMore, setShowMore] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    (v as HTMLVideoElement & { defaultMuted?: boolean }).defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.loop = true;

    const tryPlay = () => {
      v.play().catch(() => {});
    };

    tryPlay();

    const onInteract = () => {
      tryPlay();
    };

    document.addEventListener("touchstart", onInteract, { once: true, passive: true });
    document.addEventListener("click", onInteract, { once: true });

    const onVisible = () => {
      if (!document.hidden) tryPlay();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const handleConditionClick = (condition: string) => {
    window.dispatchEvent(new CustomEvent("medazon-start-chat", { detail: condition }));
  };

  return (
    <main className="min-h-screen bg-[#040807] text-white font-sans selection:bg-teal-500/30">
      <StateGate />
      <ChatWidget />

      {/* HERO */}
      <section
        className="relative overflow-hidden px-4"
        style={{
          paddingTop: "clamp(12px, 3vw, 32px)",
          paddingBottom: "clamp(32px, 6vw, 72px)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.14),transparent_60%)]" />
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Mobile top row */}
          <div className="flex items-center justify-between mb-4 md:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white p-1 transition-colors">
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <div className="w-7 h-7 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 font-bold text-sm">M</div>
              <span className="text-base font-bold">
                Medazon<span className="text-teal-400">Health</span>
              </span>
            </div>

            <StateBadge />
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#040807] border border-white/5 rounded-xl px-4 py-4 mb-4 text-left">
              <div className="flex flex-col gap-3">
                <a href="#" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">
                  Home
                </a>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">
                  How It Works
                </a>
                <a href="#provider" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">
                  About Your Provider
                </a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-1.5 transition-colors">
                  FAQ
                </a>
                <Link
                  href="/express-checkout"
                  onClick={() => {
                    try {
                      localStorage.removeItem("medazon_express_answers");
                      sessionStorage.setItem(
                        "expressPatient",
                        JSON.stringify({
                          id: null,
                          firstName: "",
                          lastName: "",
                          email: "",
                          phone: "",
                          dateOfBirth: "",
                          address: "",
                          source: "new",
                          pharmacy: "",
                        })
                      );
                    } catch {}
                  }}
                  className="bg-orange-500 text-white font-bold px-5 py-3 rounded-xl text-sm hover:bg-orange-400 transition-all flex items-center justify-center gap-2 mt-1 w-full whitespace-nowrap"
                >
                  BOOK A CARE FIRST VISIT <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}

          {/* Desktop nav */}
          <nav className="hidden md:flex sticky top-0 z-50 bg-[#040807]/95 backdrop-blur-md border-b border-white/5 items-center justify-between px-8 py-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400 font-bold">M</div>
              <span className="text-lg font-bold">
                Medazon<span className="text-teal-400">Health</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Home
              </a>
              <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#provider" className="text-sm text-gray-400 hover:text-white transition-colors">
                About Your Provider
              </a>
              <a href="#faq" className="text-sm text-gray-400 hover:text-white transition-colors">
                FAQ
              </a>
              <StateBadge />
            </div>
          </nav>

          <div className="grid lg:grid-cols-[1fr_1.02fr] gap-8 lg:gap-10 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center rounded-full border border-teal-400/20 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-teal-300">
                Care First Review
              </div>

              <h1
                className="font-bold leading-[1.02] font-serif mt-5 mx-auto lg:mx-0 max-w-[320px] sm:max-w-2xl lg:max-w-none"
                style={{ fontSize: "clamp(34px, 8vw, 64px)" }}
              >
                Private Medical Care
                <span className="block text-teal-400">Without the Appointment</span>
              </h1>

              <p className="text-gray-300 mt-5 mx-auto lg:mx-0 max-w-xl leading-7" style={{ fontSize: "clamp(15px, 3.8vw, 18px)" }}>
                Answer a few questions. Your provider reviews your case. Prescription sent to your pharmacy.
              </p>

              {/* quick trust pills */}
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  Same Provider Every Visit
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  Private Practice
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  Sent to Your Pharmacy
                </span>
              </div>

              {/* Main CTA block */}
              <div className="mt-7">
                <PairedCTABlock />
              </div>

              {/* Care First explanation */}
              <div className="mt-10 max-w-xl mx-auto lg:mx-0 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left shadow-2xl backdrop-blur">
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-teal-300">Why Care First?</div>

                <div className="mt-4 space-y-3 text-sm leading-7 text-gray-300 sm:text-[15px]">
                  <p>• Patients should not have to pay for treatment before experiencing it.</p>
                  <p>• The small $1.89 Care First reserve confirms your request so your provider can personally review your case in private.</p>
                  <p>• Most reviews happen within minutes.</p>
                </div>

                <p className="mt-4 text-sm font-semibold text-white sm:text-[15px]">
                  Care comes first. You only pay after your care is complete.
                </p>
              </div>

              {/* Care options */}
              <div className="mt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500 text-center lg:text-left">
                  Care options
                </div>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                    💬 Secure Text
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                    📞 Phone Call
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                    🎥 Video Visit
                  </span>
                </div>
              </div>
            </div>

            {/* Right provider video */}
            <div className="order-1 lg:order-2 max-w-xl mx-auto w-full">
              <div
                className="overflow-hidden rounded-[28px] border border-teal-500/30 bg-[#08110f] shadow-[0_0_40px_rgba(20,184,166,0.12)]"
              >
                <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5">
                  <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-green-300">I&apos;m Online</span>
                </div>

                <div className="relative w-full overflow-hidden" style={{ height: "clamp(240px, 48vw, 360px)" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onCanPlay={(e) => {
                      const v = e.currentTarget;
                      v.muted = true;
                      v.play().catch(() => {});
                    }}
                    onLoadedData={(e) => {
                      const v = e.currentTarget;
                      v.muted = true;
                      v.play().catch(() => {});
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                    webkit-playsinline="true"
                    x5-playsinline="true"
                    preload="auto"
                  >
                    <source src="/assets/doctor-instant-visit.mp4" type="video/mp4" />
                  </video>

                  <div className="absolute inset-0 bg-black/35" />

                  <div className="absolute left-0 right-0 top-0 flex flex-col items-center justify-center gap-1 px-4 text-center z-10" style={{ height: "78%" }}>
                    <h3 className="text-white font-black drop-shadow-lg" style={{ fontSize: "clamp(14px,3.5vw,22px)" }}>
                      LaMonica A. Hodges, MSN, APRN, FNP-C
                    </h3>
                    <p className="text-gray-200 drop-shadow-lg" style={{ fontSize: "clamp(11px,2.6vw,14px)" }}>
                      Licensed • Board-Certified • Private Practice
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-yellow-400">
                      <Star size={12} className="fill-yellow-400" />
                      <Star size={12} className="fill-yellow-400" />
                      <Star size={12} className="fill-yellow-400" />
                      <Star size={12} className="fill-yellow-400" />
                      <Star size={12} className="fill-yellow-400" />
                      <span className="ml-2 text-[11px] text-gray-200 sm:text-xs">4.9 / 12,398 reviews</span>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center px-4 z-10" style={{ height: "22%" }}>
                    <div className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                      Currently reviewing patient cases
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* trust strip */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center">
              <p className="text-teal-400 font-black text-lg">2 min</p>
              <p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Avg. Intake</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center">
              <p className="text-orange-400 font-black text-lg">Minutes</p>
              <p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Most Reviews</p>
            </div>
            <div className="bg-white/[0.02] rounded-xl py-3 px-2 border border-white/5 text-center">
              <p className="text-white font-black text-lg">$1.89</p>
              <p className="text-gray-500 text-[9px] uppercase tracking-wide font-medium">Reserve</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold font-serif tracking-tight">
              How It <span className="text-teal-400">Works</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-400">
              Built to feel faster, quieter, and more personal than a traditional telehealth appointment.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Card 1 */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0f0d] shadow-2xl">
              <div className="relative h-[260px] sm:h-[300px]">
                <img src="/assets/service_uti.jpg" alt="Describe Your Symptoms" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/80" />
                <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                  2 min
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">Step 1</div>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-white">Describe Your Symptoms</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-200">
                    Answer a few quick questions from your phone.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0f0d] shadow-2xl">
              <div className="relative h-[260px] sm:h-[300px]">
                <img src="/assets/service_general.jpg" alt="Provider Reviews Your Case" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/80" />
                <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                  Private review
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">Step 2</div>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-white">Your Provider Reviews Your Case</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-200">
                    Your information is personally reviewed in private.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0f0d] shadow-2xl">
              <div className="relative h-[260px] sm:h-[300px]">
                <img src="/assets/service_anxiety.jpg" alt="Treatment Sent if Appropriate" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/80" />
                <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                  Same day
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">Step 3</div>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-white">Treatment Sent if Appropriate</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-200">
                    Prescriptions can be sent directly to your pharmacy.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4 */}
            <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0f0d] shadow-2xl">
              <div className="relative h-[260px] sm:h-[300px]">
                <img src="/assets/service_cold_flu.jpg" alt="Private and Simple" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/80" />
                <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                  Care First
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">Bonus</div>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-white">Private and Simple</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-200">
                    No waiting room. No video required unless needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE TREAT */}
      <section className="relative px-4 pb-16 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/20 to-teal-500/5 rounded-[35px] blur-lg opacity-60" />
            <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-6 md:p-10 shadow-2xl">
              <h3 className="text-xl md:text-2xl font-bold mb-6 font-serif text-center">
                What We Treat — <span className="text-teal-400">Privately and Discreetly</span>
              </h3>

              {/* 6 main cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <button onClick={() => handleConditionClick("uti")} className="group flex flex-col items-center justify-center gap-2 bg-red-500/10 hover:bg-white/5 border border-red-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                  <Zap className="w-6 h-6 text-red-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">UTI Symptoms</div>
                    <div className="text-[10px] text-gray-500 mt-1">Burning, frequent urination</div>
                  </div>
                </button>

                <button onClick={() => handleConditionClick("adhd")} className="group flex flex-col items-center justify-center gap-2 bg-indigo-500/10 hover:bg-white/5 border border-indigo-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                  <Lightbulb className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">ADHD</div>
                    <div className="text-[10px] text-gray-500 mt-1">Focus, attention</div>
                  </div>
                </button>

                <button onClick={() => handleConditionClick("anxiety")} className="group flex flex-col items-center justify-center gap-2 bg-purple-500/10 hover:bg-white/5 border border-purple-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                  <Heart className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">Anxiety & Stress</div>
                    <div className="text-[10px] text-gray-500 mt-1">Racing thoughts, worry</div>
                  </div>
                </button>

                <button onClick={() => handleConditionClick("cold-flu")} className="group flex flex-col items-center justify-center gap-2 bg-blue-500/10 hover:bg-white/5 border border-blue-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                  <BarChart2 className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform rotate-90" />
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">Cold & Flu</div>
                    <div className="text-[10px] text-gray-500 mt-1">Fever, cough, congestion</div>
                  </div>
                </button>

                <button onClick={() => handleConditionClick("weight-loss")} className="group flex flex-col items-center justify-center gap-2 bg-teal-500/10 hover:bg-white/5 border border-teal-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                  <Zap className="w-6 h-6 text-teal-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">Weight Management</div>
                    <div className="text-[10px] text-gray-500 mt-1">Semaglutide, tirzepatide</div>
                  </div>
                </button>

                <button onClick={() => handleConditionClick("std")} className="group flex flex-col items-center justify-center gap-2 bg-pink-500/10 hover:bg-white/5 border border-pink-500/30 hover:border-white/20 rounded-xl p-4 h-32 transition-all">
                  <Shield className="w-6 h-6 text-pink-400 group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">STD Concerns</div>
                    <div className="text-[10px] text-gray-500 mt-1">Discreet, judgment-free</div>
                  </div>
                </button>
              </div>

              <h4 className="text-xl font-bold font-serif text-center mb-4">Something Else?</h4>

              <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
                  <button onClick={() => handleConditionClick("skin")} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Skin Issues</button>
                  <button onClick={() => handleConditionClick("erectile-dysfunction")} className="bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Erectile Dysfunction</button>
                  <button onClick={() => handleConditionClick("depression")} className="bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Depression</button>
                  <button onClick={() => handleConditionClick("birth-control")} className="bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Birth Control</button>
                  <button onClick={() => handleConditionClick("hair-loss")} className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Hair Loss</button>
                  <button onClick={() => handleConditionClick("allergies")} className="bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Allergies</button>
                  <button onClick={() => handleConditionClick("sinus")} className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Sinus Infections</button>
                  <button onClick={() => handleConditionClick("rx-refill")} className="bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Rx Refills</button>
                  <button onClick={() => handleConditionClick("other")} className="bg-gray-500/10 border border-gray-500/30 text-gray-300 hover:bg-gray-500/20 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all shrink-0">Other</button>
                  <div className="flex items-center shrink-0 pl-1">
                    <ArrowRight size={18} className="text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Care options</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">💬 Secure Text</span>
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">📞 Phone Call</span>
                  <span className="bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">🎥 Video Visit</span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mt-6">
                Treated from home. Prescription to your pharmacy. No one has to know.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-16 px-4 bg-[#050a08]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 font-serif text-center">
            There are two kinds of <span className="text-teal-400">telehealth.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#0a0f0d] border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-red-400 font-bold text-lg mb-4 text-center">Volume-Driven Telehealth</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <span>Whoever&apos;s available</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <span>See as many patients as possible</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <span>Auto-approved, rubber stamped</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <span>Shared systems, corporate data</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <span>Hidden copays, surprise bills</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                  <span>A waiting room with WiFi</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0f0d] border border-teal-500/40 rounded-2xl p-6">
              <h3 className="text-teal-400 font-bold text-lg mb-4 text-center">Medazon Health</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Your provider. Always.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Accept only patients we can help</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Personally reviewed, selectively accepted</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Discretion and privacy first</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Care comes first</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Your own private practice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KEEP THE REST OF YOUR PAGE BELOW THIS POINT EXACTLY AS-IS */}

      {/* SECTION 7: PRIVACY & DISCRETION — $189 lives here ONCE */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-teal-500/10 to-teal-500/5 rounded-[35px] blur-lg opacity-40" />
            <div className="relative bg-[#0a0f0d] border border-teal-500/40 rounded-[30px] p-8 md:p-12 shadow-2xl text-center">
              <EyeOff size={32} className="text-teal-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-6 font-serif">
                Built for <span className="text-teal-400">Privacy and Discretion</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed text-base">
                Your private practice provider puts your privacy and discretion before everything else. They personally review your case and only accept patients they can genuinely help. If accepted, and only after your visit is complete or your treatment has been delivered, a $189 flat visit fee is billed — no hidden costs, no insurance games, no surprises.
              </p>
              <p className="text-gray-500 mt-6 text-sm">
                No waiting rooms. No judgment. No one has to know.
                <br />
                <span className="text-teal-400 font-medium">Your case is between you and your provider.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: TESTIMONIALS */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 font-serif text-center">
            What Our Patients <span className="text-teal-400">Say</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">
                &ldquo;I was tired of explaining my history to a new doctor every time. With Medazon, my provider already knows me.&rdquo;
              </p>
              <p className="text-teal-400 text-xs font-medium">— M.R., Florida</p>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">
                &ldquo;My provider actually read my file before responding. That&apos;s never happened on any other telehealth app.&rdquo;
              </p>
              <p className="text-teal-400 text-xs font-medium">— K.T., Florida</p>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">
                &ldquo;Nobody knew I was being treated. That&apos;s exactly what I wanted.&rdquo;
              </p>
              <p className="text-gray-500 text-xs font-medium">— Anonymous</p>
            </div>
            <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-2xl p-6">
              <p className="text-gray-300 text-sm italic mb-4">
                &ldquo;One flat fee. No insurance nightmare. My provider sent the prescription to my pharmacy the same day.&rdquo;
              </p>
              <p className="text-teal-400 text-xs font-medium">— J.L., Florida</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            <Star size={14} className="text-yellow-400 fill-yellow-400 inline" />{" "}
            4.9 average from 12,398 patient reviews
          </p>
        </div>
      </section>

      {/* SECTION 11: FINAL CTA */}
      <section className="pb-16 px-4 bg-[#050a08]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0a0f0d] border border-teal-500/20 rounded-3xl p-8 md:p-12 shadow-[0_0_40px_rgba(20,184,166,0.1)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
            <h2 className="text-3xl font-bold mb-4 font-serif text-white">
              Medazon puts <span className="text-teal-400">care first.</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Private practice providers who put your privacy and discretion before everything else. Only charged if your provider accepts and treats your case.
            </p>
            <div className="mb-8">
              <PairedCTABlock />
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <Lock size={16} className="text-teal-400" /> HIPAA Compliant
              </span>
              <span className="flex items-center gap-2">
                <Shield size={16} className="text-teal-400" /> 256-bit Encrypted
              </span>
              <span className="flex items-center gap-2">
                <Check size={16} className="text-green-400" /> Board-Certified
              </span>
              <span className="flex items-center gap-2">
                <Users size={16} className="text-teal-400" /> Private Practice
              </span>
              <span className="flex items-center gap-2">
                <RefreshCw size={16} className="text-teal-400" /> Same Provider Every Visit
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: FAQ + ALL 9 INFO FOLDS */}
      <div id="faq"></div>
      <FAQFold />
      <div id="provider"></div>
      <ProviderFold />
      <CitiesFold />
      <PrivacyFold />
      <WhyUsFold />
      <CoverageFold />
      <AvailabilityFold />
      <AboutClinicianFold />
      <ZipCodesFold />

      {/* FOOTER */}
      <footer className="py-12 px-4 border-t border-teal-500/10 bg-[#040807]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="text-center md:text-left">
            <p className="font-bold text-white text-lg">Medazon Health</p>
            <p className="text-xs text-gray-500 mt-1">Private Practice Telehealth</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
            <Link href="#" className="hover:text-teal-400 transition-colors">Home</Link>
            <Link href="#how-it-works" className="hover:text-teal-400 transition-colors">How It Works</Link>
            <Link href="#provider" className="hover:text-teal-400 transition-colors">About Your Provider</Link>
            <Link href="#faq" className="hover:text-teal-400 transition-colors">FAQ</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">Cancellation Policy</Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto text-center border-t border-white/5 pt-8">
          <p className="text-xs text-gray-500 mb-4">Medazon puts care first. Only charged if your provider accepts and treats your case.</p>
          <p className="text-[10px] text-gray-600">© 2026 Medazon Health. All rights reserved. HIPAA Compliant · Board-Certified Providers · Florida</p>
        </div>
      </footer>
    </main>
  );
}





