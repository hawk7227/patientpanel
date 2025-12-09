import SchemaBundle from "@/components/condition/SchemaBundle";
import { states } from "@/config/state-config";
import { conditionCards } from "@/config/condition-config";

interface PageProps {
  params: {
    state: string;
  };
}

// --------------------------------------------------------
// STATE LANDING PAGE METADATA
// --------------------------------------------------------
export function generateMetadata({ params }: PageProps) {
  const validState = states[params.state] ? params.state : "florida";

  const stateName = states[validState]?.displayName || validState;

  const title = `${stateName} Virtual Urgent Care — Private Online Symptom Review`;
  const description = `Educational telehealth information for adults located in ${stateName}. Explore common concerns such as sinus issues, skin symptoms, general discomfort, and more.`;

  const url = `https://medazonhealth.com/urgent-care/${validState}`;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      type: "article"
    },
    twitter: {
      title,
      description
    }
  };
}

// --------------------------------------------------------
// STATE LANDING PAGE RENDER
// --------------------------------------------------------
export default function Page({ params }: PageProps) {
  const validState = states[params.state] ? params.state : "florida";
  const stateName = states[validState]?.displayName;

  const providerName = "LaMonica A. Hodges, MSN, APRN, FNP-C";
  const providerAddress = "2700 NE 62ND Street, Fort Lauderdale, FL 33308";

  const canonicalUrl = `https://medazonhealth.com/urgent-care/${validState}`;

  const allConditions = Object.keys(conditionCards);

  return (
    <>
      {/* STATE-LEVEL SCHEMA */}
      <SchemaBundle
        state={validState}
        condition="general-symptoms"
        providerName={providerName}
        providerCredentials="Board-Certified Family Nurse Practitioner"
        providerAddress={providerAddress}
        pageUrl={canonicalUrl}
      />

      {/* ---------------------- */}
      {/* HERO SECTION */}
      {/* ---------------------- */}
      <section className="relative min-h-[60vh] flex flex-col justify-center items-center 
            bg-[url('/assets/hero.webp')] bg-cover bg-center px-6 py-20 overflow-hidden">
        
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

        <div className="relative z-10 max-w-3xl mx-auto text-center 
                bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 
                shadow-[0_0_40px_rgba(0,221,176,0.35)] px-10 py-12">

          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.5)]">
            {stateName} Virtual Urgent Care
          </h1>

          <p className="text-white/80 text-lg leading-relaxed">
            A private, secure online option for adults located in {stateName}.  
            Explore common symptom categories and educational information.
          </p>
        </div>
      </section>


      {/* ---------------------- */}
      {/* CONDITION GRID */}
      {/* ---------------------- */}
      <section className="w-full py-20 px-6 flex justify-center 
                         bg-gradient-to-b from-[#0B0F12] to-[#141B1E]">
        
        <div className="w-full max-w-6xl text-center">
          <h2 className="text-white text-3xl font-bold mb-6 
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.4)]">
            Select a Concern
          </h2>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-10">
            {allConditions.map((cond) => {
              const info = conditionCards[cond];
              return (
                <a
                  key={cond}
                  href={`/urgent-care/${validState}/${cond}`}
                  className="block bg-white/10 border border-white/10 p-6 rounded-xl
                             shadow-[0_0_18px_rgba(0,221,176,0.35)]
                             hover:shadow-[0_0_24px_rgba(0,221,176,0.55)]
                             hover:bg-white/20 transition-all"
                >
                  <img
                    src={info.image}
                    alt={info.title}
                    className="w-full h-36 object-cover rounded-lg mb-4 bg-white/10"
                  />
                  <h3 className="text-[#00ddb0] font-semibold text-lg mb-1">
                    {info.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {info.description}
                  </p>
                </a>
              );
            })}
          </div>
        </div>
      </section>


      {/* ---------------------- */}
      {/* PROVIDER E-E-A-T SECTION */}
      {/* ---------------------- */}
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
            This clinician reviews adult symptom submissions for {stateName} telehealth visits. 
            All communication occurs through encrypted systems and complies with state guidelines.
          </p>

          <p className="text-[#00ddb0] font-semibold text-xs mt-6">
            *This section is for general educational and informational purposes.*
          </p>
        </div>
      </section>
    </>
  );
}
