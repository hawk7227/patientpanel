"use client";

import React from "react";

// Folds
import Fold1Hero from "./Fold1Hero";
import Fold2Provider from "./Fold2Provider";
import Fold3ConditionOverview from "./Fold3ConditionOverview";
import Fold4HowItWorks from "./Fold4HowItWorks";
import Fold5FAQ from "./Fold6FAQ";
import Fold6Testimonial from "./Fold6Testimonial";
import Fold7LongForm from "./Fold7LongForm";
import Fold8Cities from "./Fold8Cities";
import Fold9ZIPCodes from "./Fold9ZIPCodes";
import Fold10WhyUs from "./Fold10WhyUs";
import Fold11Coverage from "./Fold11Coverage";
import Fold12ProviderBottom from "./Fold12ProviderBottom";

// Config
import { states } from "@/config/state-config";
import { conditionCards } from "@/config/condition-config";
import { faqByCondition } from "@/config/faq-config";
import { longformContent, getLongform } from "@/config/longform-config";
import { cityLists } from "@/config/city-config";
import { zipLists } from "@/config/zip-config";
import { coverageByState } from "@/config/coverage-config";
import { searchTerms } from "@/config/search-terms-config";

interface PageTemplateProps {
  state: string;       // "florida"
  condition: string;   // "uti", "rash", "migraine", etc.
}

export default function ConditionPageTemplate({
  state,
  condition
}: PageTemplateProps) {

  // Lookup state data
  const stateData = states[state] || states["florida"];

  // Lookup condition card info
  const card = conditionCards[condition] || conditionCards["general-symptoms"];

  // FAQ for condition
  const faqs = faqByCondition[condition];

  // Longform
  const longform = getLongform(condition);

  // City list for this state
  const cities = cityLists[state] || [];

  // ZIP clusters for this state
  const zips = zipLists[state] || [];

  // Coverage regions
  const coverage = coverageByState[state] || [];

  // Search keyword index — filter for this condition
  const keywordIndex = searchTerms
    .filter(t => t.condition === condition)
    .map(t => t.symptom);

  // Provider Info (static now, can be dynamic later)
  const providerImage = "/providers/lamonica.jpg";
  const providerName = "LaMonica A. Hodges, MSN, APRN, FNP-C";
  const providerCredentials = "Board-Certified Family Nurse Practitioner";
  const providerExperience = "10+ Years Experience";
  const providerAreas = `Licensed in ${stateData.displayName}`;

  // Educational bio for bottom fold
  const educationalBio = [
    "This educational section provides general background information about the clinician who reviews adult symptom submissions within this state.",
    "The clinician has experience evaluating routine, non-emergent concerns and guiding adults on when in-person care may be appropriate.",
    "All telehealth communication follows state-specific requirements and uses encrypted systems designed to protect privacy.",
    "This educational information does not replace an evaluation and is not a diagnosis."
  ];

  return (
    <main className="flex flex-col w-full">

      {/* ============================== */}
      {/* FOLD 1 — HERO */}
      {/* ============================== */}
      <Fold1Hero
        title={card.title}
        subtitle={`Private ${stateData.displayName} Telehealth`}
        onStartVisit={() => {
          const el = document.getElementById("smart-search");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onBookVisit={() => {
          const el = document.getElementById("smart-search");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* ============================== */}
      {/* FOLD 2 — PROVIDER */}
      {/* ============================== */}
      <Fold2Provider
        providerImage={providerImage}
        providerName={providerName}
        providerCredentials={providerCredentials}
        providerExperience={providerExperience}
        serviceAreaText={providerAreas}
        badges={[
          "HIPAA Secure",
          "Encrypted Platform",
          `State-Licensed (${stateData.displayName})`
        ]}
      />

      {/* ============================== */}
      {/* FOLD 3 — CONDITION OVERVIEW */}
      {/* ============================== */}
      <Fold3ConditionOverview
        cards={[
          {
            title: card.title,
            description: card.description,
            image: card.image
          }
        ]}
      />

      {/* ============================== */}
      {/* FOLD 4 — HOW IT WORKS */}
      {/* ============================== */}
      <Fold4HowItWorks />

      {/* ============================== */}
      {/* FOLD 5 — FAQ */}
      {/* ============================== */}
      <Fold5FAQ faqs={faqs} />

      {/* ============================== */}
      {/* FOLD 6 — TESTIMONIAL */}
      {/* ============================== */}
      <Fold6Testimonial />

      {/* ============================== */}
      {/* FOLD 7 — LONGFORM EDUCATION */}
      {/* ============================== */}
      <div id="smart-search">
        <Fold7LongForm 
          data={longform}
          keywordIndex={keywordIndex}
        />
      </div>

      {/* ============================== */}
      {/* FOLD 8 — CITIES */}
      {/* ============================== */}
      {cities.length > 0 && (
        <Fold8Cities cities={cities} stateSlug={state} />
      )}

      {/* ============================== */}
      {/* FOLD 9 — ZIP CODES */}
      {/* ============================== */}
      {zips.length > 0 && (
        <Fold9ZIPCodes zips={zips} />
      )}

      {/* ============================== */}
      {/* FOLD 10 — WHY US */}
      {/* ============================== */}
      <Fold10WhyUs />

      {/* ============================== */}
      {/* FOLD 11 — COVERAGE REGIONS */}
      {/* ============================== */}
      {coverage.length > 0 && (
        <Fold11Coverage coverage={coverage} />
      )}

      {/* ============================== */}
      {/* FOLD 12 — PROVIDER BOTTOM BIO */}
      {/* ============================== */}
      <Fold12ProviderBottom
        providerImage={providerImage}
        providerName={providerName}
        providerCredentials={providerCredentials}
        providerExperience={providerExperience}
        educationalBio={educationalBio}
      />

    </main>
  );
}
