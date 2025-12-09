import SchemaBundle from "@/components/condition/SchemaBundle";
import { states } from "@/config/state-config";

export const metadata = {
  title: "Virtual Urgent Care — Private Online Symptom Review | Medazon Health",
  description:
    "Educational telehealth information for adults seeking private, secure online urgent care. Select your state to explore common concerns such as sinus discomfort, skin irritation, general symptoms, and more.",
  alternates: {
    canonical: "https://medazonhealth.com/urgent-care"
  },
  openGraph: {
    title: "Virtual Urgent Care — Private Online Symptom Review",
    description:
      "Explore telehealth educational resources and securely describe symptoms online. Select your state to view available urgent-care categories.",
    url: "https://medazonhealth.com/urgent-care",
    type: "website"
  },
  twitter: {
    title: "Virtual Urgent Care — Private Online Symptom Review",
    description:
      "Secure symptom review for adults via telehealth. Select your state to get started."
  }
};

export default function UrgentCareHomePage() {
  const providerName = "LaMonica A. Hodges, MSN, APRN, FNP-C";
  const providerAddress = "2700 NE 62ND Street, Fort Lauderdale, FL 33308";

  const canonicalUrl = "https://medazonhealth.com/urgent-care";

  return (
    <>
      {/* Nationwide Schema */}
      <SchemaBundle
        state="nationwide"
        condition="general-symptoms"
        providerName={providerName}
        providerCredentials="Board-Certified Family Nurse Practitioner"
        providerAddress={providerAddress}
        pageUrl={canonicalUrl}
      />

      {/* =================================================== */}
      {/* HERO SECTION */}
      {/* =================================================== */}
      <section className="relative min-h-[60vh] flex flex-col justify-center items-center 
            bg-[url('/assets/hero.webp')] bg-cover bg-center px-6 py-20 overflow-hidden">

        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

        <div className="relative z-10 max-w-3xl mx-auto text-center 
                bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 
                shadow-[0_0_40px_rgba(0,221,176,0.35)] px-10 py-12">

          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.5)]">
            Virtual Urgent Care for Adults
          </h1>

          <p className="text-white/80 text-lg leading-relaxed">
            Select your state to access private, educational telehealth guidance for 
            common concerns such as sinus discomfort, skin irritation, general symptoms, and more.
          </p>
        </div>
      </section>

      {/* =================================================== */}
      {/* STATE GRID — ALL 22 STATES */}
      {/* =================================================== */}
      <section className="w-full py-20 px-6 flex justify-center 
                         bg-gradient-to-b from-[#0B0F12] to-[#141B1E]">

        <div className="w-full max-w-5xl text-center">
          <h2 className="text-white text-3xl font-bold mb-6
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.4)]">
            Choose Your State
          </h2>

          <p className="text-white/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
            Telehealth availability depends on clinician licensure. Select your location to explore 
            available educational content and symptom categories.
          </p>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-10">
            {Object.keys(states).map((stateSlug) => {
              const stateInfo = states[stateSlug];
              return (
                <a
                  key={stateSlug}
                  href={`/urgent-care/${stateSlug}`}
                  className="block bg-white/10 border border-white/10 p-6 rounded-xl
                             shadow-[0_0_18px_rgba(0,221,176,0.35)]
                             hover:shadow-[0_0_24px_rgba(0,221,176,0.55)]
                             hover:bg-white/20 transition-all text-left"
                >
                  <h3 className="text-[#00ddb0] font-semibold text-lg">
                    {stateInfo.displayName}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed mt-1">
                    View educational telehealth information for adults located in {stateInfo.displayName}.
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================================================== */}
      {/* PROVIDER E-E-A-T SECTION */}
      {/* =================================================== */}
      <section className="w-full py-20 px-6 flex justify-center 
                         bg-gradient-to-b from-[#0B0F12] to-[#141B1E]">

        <div className="w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl 
                        border border-white/10 shadow-[0_0_30px_rgba(0,221,176,0.35)]
                        px-10 py-14 text-center">

          <img
            src="/providers/lamonica.jpg"
            className="w-32 h-32 rounded-full mx-auto mb-4
                       border-4 border-[#00ddb0] shadow-[0_0_25px_rgba(0,221,176,0.45)]"
          />

          <h3 className="text-white text-xl font-bold mb-1">{providerName}</h3>
          <p className="text-white/70 text-sm">Board-Certified Family Nurse Practitioner</p>
          <p className="text-white/60 text-xs mt-1">10+ Years Experience</p>

          <p className="text-white/70 text-sm mt-6 leading-relaxed">
            This clinician reviews adult symptom submissions for states in which they are licensed. 
            All telehealth communication follows state-specific requirements and uses encrypted systems.
          </p>

          <p className="text-[#00ddb0] font-semibold text-xs mt-6">
            *This is general educational and informational content.*
          </p>
        </div>
      </section>
    </>
  );
}
