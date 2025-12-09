import { conditionCards } from "@/config/condition-config";
import { states } from "@/config/state-config";
import { getLongform } from "@/config/longform-config";
import SchemaBundle from "@/components/condition/SchemaBundle";

interface PageProps {
  params: {
    condition: string;
  };
}

// --------------------------------------------------------
// METADATA FOR EACH GLOBAL CONDITION PAGE
// --------------------------------------------------------
export function generateMetadata({ params }: PageProps) {
  const cond = conditionCards[params.condition]
    ? params.condition
    : "general-symptoms";

  const conditionName = conditionCards[cond].title;

  const title = `${conditionName} — National Telehealth Educational Guide`;
  const description = `Explore general educational telehealth information about ${conditionName.toLowerCase()}, including symptom categories, causes, risk factors, and when adults may require in-person evaluation.`;

  const url = `https://medazonhealth.com/conditions/${cond}`;

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
// GLOBAL CONDITION LANDING PAGE
// --------------------------------------------------------
export default function Page({ params }: PageProps) {
  const cond = conditionCards[params.condition]
    ? params.condition
    : "general-symptoms";

  const info = conditionCards[cond];
  const longform = getLongform(cond);
  const allStates = Object.keys(states);

  const canonicalUrl = `https://medazonhealth.com/conditions/${cond}`;

  const providerName = "LaMonica A. Hodges, MSN, APRN, FNP-C";
  const providerAddress = "2700 NE 62ND Street, Fort Lauderdale, FL 33308";

  return (
    <>
      {/* SEO Schema */}
      <SchemaBundle
        state="nationwide"
        condition={cond}
        providerName={providerName}
        providerCredentials="Board-Certified Family Nurse Practitioner"
        providerAddress={providerAddress}
        pageUrl={canonicalUrl}
      />

      {/* =================================================== */}
      {/* HERO */}
      {/* =================================================== */}
      <section className="relative min-h-[55vh] flex flex-col justify-center items-center 
            bg-[url('/assets/hero.webp')] bg-cover bg-center px-6 py-20 overflow-hidden">

        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

        <div className="relative z-10 max-w-3xl mx-auto text-center 
                bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 
                shadow-[0_0_40px_rgba(0,221,176,0.35)] px-10 py-12">

          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.5)]">
            {info.title}
          </h1>

          <p className="text-white/80 text-lg leading-relaxed">
            A nationwide educational overview of {info.title.toLowerCase()} that adults commonly
            review during a virtual urgent-care evaluation.
          </p>
        </div>
      </section>

      {/* =================================================== */}
      {/* LONGFORM EDUCATIONAL CONTENT (national) */}
      {/* =================================================== */}
      <section className="w-full py-20 px-6 flex justify-center 
                         bg-gradient-to-b from-[#0B0F12] to-[#141B1E]">

        <div className="w-full max-w-4xl bg-white/5 backdrop-blur-xl rounded-2xl 
                        border border-white/10 shadow-[0_0_30px_rgba(0,221,176,0.35)]
                        px-10 py-14">

          <h2 className="text-white text-3xl font-bold mb-6
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.4)]">
            Educational Overview
          </h2>

          {/* Intro */}
          {longform.intro.map((p, idx) => (
            <p key={idx} className="text-white/80 text-base mb-4 leading-relaxed">
              {p}
            </p>
          ))}

          {/* Symptoms */}
          <h3 className="text-[#00ddb0] font-semibold text-xl mt-10 mb-3">
            Common Symptoms
          </h3>
          <ul className="list-disc ml-6 text-white/70 leading-relaxed">
            {longform.symptoms.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>

          {/* Causes */}
          <h3 className="text-[#00ddb0] font-semibold text-xl mt-10 mb-3">
            Possible Causes
          </h3>
          <ul className="list-disc ml-6 text-white/70 leading-relaxed">
            {longform.causes.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>

          {/* Risk Factors */}
          <h3 className="text-[#00ddb0] font-semibold text-xl mt-10 mb-3">
            General Risk Factors
          </h3>
          <ul className="list-disc ml-6 text-white/70 leading-relaxed">
            {longform.riskFactors.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>

          {/* Disclaimer */}
          <p className="text-[#00ddb0] font-semibold text-xs mt-12">
            *This information is general and educational.*
          </p>
        </div>
      </section>

      {/* =================================================== */}
      {/* STATE SELECTION GRID */}
      {/* =================================================== */}
      <section className="w-full py-20 px-6 flex justify-center 
                         bg-gradient-to-b from-[#0B0F12] to-[#141B1E]">

        <div className="w-full max-w-6xl text-center">

          <h2 className="text-white text-3xl font-bold mb-6
                         drop-shadow-[0_0_12px_rgba(0,221,176,0.4)]">
            Select Your State
          </h2>

          <p className="text-white/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
            Choose your location to see how this condition is reviewed through educational 
            virtual urgent care in your state.
          </p>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-10">
            {allStates.map((stateSlug) => (
              <a
                key={stateSlug}
                href={`/urgent-care/${stateSlug}/${cond}`}
                className="block bg-white/10 border border-white/10 p-6 rounded-xl
                           shadow-[0_0_18px_rgba(0,221,176,0.35)]
                           hover:shadow-[0_0_24px_rgba(0,221,176,0.55)]
                           hover:bg-white/20 transition-all text-left"
              >
                <h3 className="text-[#00ddb0] font-semibold text-lg">
                  {states[stateSlug].displayName}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed mt-1">
                  View educational telehealth information for {info.title.toLowerCase()} in {states[stateSlug].displayName}.
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
