export interface LongformSection {
  title: string;
  body: string[];
}

export interface LongformCondition {
  slug: string;
  intro: string[];
  symptoms: string[];
  causes: string[];
  riskFactors: string[];
  telehealthProcess: string[];
  safetyNotes: string[];
  prevention: string[];
  stateNotes: string[];
}

/**
 * UNIVERSAL STATE NOTES (APPLIED TO ALL CONDITIONS)
 * -------------------------------------------------
 * Pure geographic + compliance statements.
 */
const universalStateNotes = [
  "Telehealth evaluations follow state-specific telehealth requirements.", 
  "Adults must be physically located within the state during the evaluation.",
  "Symptom submissions are reviewed securely and privately.",
  "Some concerns may require in-person evaluation depending on severity or duration."
];

/**
 * LONGFORM EDUCATIONAL CONTENT BY CONDITION
 * -----------------------------------------
 * All content is general, educational, Ads/YMYL-safe, and non-diagnostic.
 */
export const longformContent: Record<string, LongformCondition> = {

  // ============================================================
  // 1. SINUS INFECTION
  // ============================================================
  "sinus-infection": {
    slug: "sinus-infection",
    intro: [
      "This educational guide explains general sinus congestion, pressure, and discomfort symptoms.",
      "Sinus-related irritation can occur from environmental factors, routine seasonal exposure, or non-specific inflammation."
    ],
    symptoms: [
      "General facial pressure or fullness",
      "Nasal congestion or difficulty breathing through the nose",
      "Mild headache-like discomfort",
      "Post-nasal drip or throat clearing"
    ],
    causes: [
      "Seasonal changes or dry indoor air",
      "Environmental irritation such as dust or pollen",
      "Routine viral upper-respiratory irritation",
      "Non-specific sinus swelling or congestion"
    ],
    riskFactors: [
      "Frequent exposure to dry air or indoor heating",
      "Previous congestion episodes",
      "Environmental sensitivities",
      "Routine seasonal changes"
    ],
    telehealthProcess: [
      "You describe your symptoms through a secure intake.",
      "A clinician reviews timing, severity, and general patterns.",
      "Follow-up educational guidance may be provided based on your description.",
      "If symptoms suggest the need for in-person evaluation, that will be communicated."
    ],
    safetyNotes: [
      "Severe or escalating symptoms may require in-person assessment.",
      "Persistent high fever or severe pain are not suitable for telehealth evaluation.",
      "Sudden vision changes or swelling around the eyes require urgent care."
    ],
    prevention: [
      "Maintaining hydration may support comfort.",
      "Humidified air may be soothing in dry environments.",
      "Reducing exposure to environmental irritants may help some individuals."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 2. COLD & FLU (GENERAL URI SYMPTOMS)
  // ============================================================
  "cold-flu": {
    slug: "cold-flu",
    intro: [
      "Cold and flu-like symptoms are common and vary widely in intensity.",
      "This section provides general educational information about congestion, cough, and routine upper-respiratory discomfort."
    ],
    symptoms: [
      "Nasal congestion or runny nose",
      "General fatigue or tiredness",
      "Mild throat irritation",
      "Cough or chest tightness"
    ],
    causes: [
      "Seasonal viral exposure",
      "Environmental dryness or temperature shifts",
      "Routine upper-respiratory irritation"
    ],
    riskFactors: [
      "Frequent interactions in shared indoor spaces",
      "Dry air exposure",
      "Previous seasonal symptom patterns"
    ],
    telehealthProcess: [
      "A clinician reviews how long symptoms have been present.",
      "They may ask about temperature changes, hydration, and environmental exposures.",
      "General guidance may be offered depending on your description."
    ],
    safetyNotes: [
      "Difficulty breathing, chest pain, or high fever require in-person evaluation.",
      "Telehealth is not appropriate for emergency respiratory symptoms."
    ],
    prevention: [
      "Hydration may support comfort.",
      "Humidifiers can help reduce dryness.",
      "Resting may assist in overall symptom management."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 3. MIGRAINE & HEADACHE SYMPTOMS
  // ============================================================
  "migraine": {
    slug: "migraine",
    intro: [
      "Headache-like or migraine-like symptoms may vary from mild to recurring discomfort.",
      "This guide provides general educational context on patterns and non-specific triggers."
    ],
    symptoms: [
      "Head pressure or throbbing discomfort",
      "Sensitivity to light or sound",
      "General fatigue accompanying head discomfort"
    ],
    causes: [
      "Sleep pattern disruption",
      "Environmental lighting or noise exposure",
      "Routine stress or tension",
      "Weather or temperature variation"
    ],
    riskFactors: [
      "Irregular sleep",
      "High stress levels",
      "Environmental triggers such as bright screens",
      "Weather fluctuations"
    ],
    telehealthProcess: [
      "Clinicians may ask when the discomfort began and how it has progressed.",
      "Questions may explore patterns, triggers, and general wellness factors.",
      "Guidance may be provided to help understand typical patterns."
    ],
    safetyNotes: [
      "Sudden severe headache may require urgent in-person evaluation.",
      "Associated neurological symptoms are not appropriate for telehealth."
    ],
    prevention: [
      "Maintaining a consistent routine may help some individuals.",
      "Limiting exposure to bright or flickering screens may reduce discomfort.",
      "Hydration and consistent sleep may support wellness."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 4. NAUSEA
  // ============================================================
  "nausea": {
    slug: "nausea",
    intro: [
      "Nausea is a common symptom with many potential contributing factors.",
      "This section provides general educational insight into mild or temporary nausea episodes."
    ],
    symptoms: [
      "Stomach uneasiness",
      "Reduced appetite",
      "Mild abdominal discomfort"
    ],
    causes: [
      "Dietary changes or overeating",
      "Travel or motion sensitivity",
      "Routine digestive fluctuations"
    ],
    riskFactors: [
      "History of motion sensitivity",
      "Dietary routine interruptions",
      "Stress or fatigue"
    ],
    telehealthProcess: [
      "Clinicians often review timing, triggers, and severity.",
      "They may ask about dietary changes or hydration.",
      "General next-step guidance may be provided."
    ],
    safetyNotes: [
      "Persistent vomiting, dehydration, or severe pain require in-person care.",
      "Blood in stool or vomit requires emergency evaluation."
    ],
    prevention: [
      "Light meals may support comfort.",
      "Hydration may assist with mild nausea.",
      "Some people find routine schedules helpful."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 5. SKIN RASH
  // ============================================================
  "rash": {
    slug: "rash",
    intro: [
      "Skin changes can appear due to irritation, dryness, or non-specific environmental causes.",
      "This guide describes general patterns that individuals commonly report."
    ],
    symptoms: [
      "Redness or irritation",
      "Itchiness",
      "Dry or flaky patches"
    ],
    causes: [
      "Weather changes or low humidity",
      "Contact irritation from fabrics, lotions, or detergents",
      "General skin dryness or sensitivity"
    ],
    riskFactors: [
      "History of sensitive skin",
      "Exposure to new products",
      "Seasonal temperature changes"
    ],
    telehealthProcess: [
      "Clinicians may ask about timing and exposure history.",
      "Photo uploads can help provide visual context but are optional.",
      "Guidance may focus on general comfort and when in-person care may help."
    ],
    safetyNotes: [
      "Rapid spreading rash or difficulty breathing requires emergency care.",
      "High fever with rash requires prompt in-person evaluation."
    ],
    prevention: [
      "Avoiding new irritant products may help.",
      "Moisturizing regularly may support comfort.",
      "Protective clothing may reduce irritation."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 6. PINK EYE / EYE IRRITATION
  // ============================================================
  "pink-eye": {
    slug: "pink-eye",
    intro: [
      "Eye irritation or redness can occur due to dryness, allergens, or general environmental factors.",
      "This guide provides general educational context for mild irritation."
    ],
    symptoms: [
      "Redness or watery eyes",
      "Itchiness or irritation",
      "Mild eyelid swelling",
      "Light sensitivity"
    ],
    causes: [
      "Dry air or dust exposure",
      "Seasonal allergens",
      "Contact lens irritation",
      "Routine environmental factors"
    ],
    riskFactors: [
      "Contact lens use",
      "History of dry eyes",
      "Recent exposure to irritants"
    ],
    telehealthProcess: [
      "Clinicians may ask about duration and any visual changes.",
      "Photos may be helpful but they are optional.",
      "General guidance is provided based on your description."
    ],
    safetyNotes: [
      "Severe pain or sudden vision changes require urgent evaluation.",
      "Significant swelling or inability to open the eye requires in-person care."
    ],
    prevention: [
      "Avoid touching the eyes with unwashed hands.",
      "Using clean lenses and cases may reduce irritation.",
      "Humidified air may support comfort."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 7. UTI-LIKE SYMPTOMS (EDUCATIONAL)
  // ============================================================
  "uti": {
    slug: "uti",
    intro: [
      "Urinary discomfort is a common symptom with various potential causes.",
      "This guide explains general patterns often reported by adults seeking telehealth education."
    ],
    symptoms: [
      "Burning or irritation during urination",
      "Increased frequency or urgency",
      "Lower abdominal pressure"
    ],
    causes: [
      "Reduced hydration",
      "Irritation from hygiene products",
      "General urinary tract sensitivity"
    ],
    riskFactors: [
      "Previous urinary irritation episodes",
      "Low hydration",
      "Changes in routine or stress"
    ],
    telehealthProcess: [
      "Clinicians review timing, severity, and accompanying symptoms.",
      "They may ask about hydration, products used, and general patterns.",
      "Educational guidance may be provided."
    ],
    safetyNotes: [
      "Severe pain, fever, or back pain may require in-person evaluation.",
      "Blood in urine requires prompt medical attention."
    ],
    prevention: [
      "Hydration may support urinary comfort.",
      "Avoiding irritant products may help.",
      "Routine restroom breaks can support comfort."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 8. STD/STI EXPOSURE QUESTIONS (GENERAL EDUCATION)
  // ============================================================
  "std-sti": {
    slug: "std-sti",
    intro: [
      "Adults sometimes seek general information about possible STD/STI exposure or symptom concerns.",
      "Telehealth can help clarify when testing or in-person evaluation may be appropriate."
    ],
    symptoms: [
      "General irritation or discomfort",
      "Changes in discharge",
      "Mild urinary burning",
      "General exposure-related questions"
    ],
    causes: [
      "Recent exposure to a partner with symptoms",
      "Environmental irritation",
      "General urinary or skin sensitivity"
    ],
    riskFactors: [
      "Multiple partners",
      "Uncertainty about a partner’s symptoms",
      "Prior STD/STI concerns"
    ],
    telehealthProcess: [
      "A clinician reviews timing and exposure history.",
      "General guidance may include when testing is typically considered.",
      "Follow-up questions may be asked for context."
    ],
    safetyNotes: [
      "Severe pain, fever, or pronounced symptoms may require in-person care.",
      "Ulcers, sores, or severe swelling require direct evaluation."
    ],
    prevention: [
      "Open communication with partners can support clarity.",
      "Routine wellness visits may help identify concerns early."
    ],
    stateNotes: universalStateNotes
  }
};
