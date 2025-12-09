export interface SearchTermEntry {
  symptom: string;     // user-typed keyword
  condition: string;   // maps to condition slug
}

/**
 * SEARCH TERMS (SMART SEARCH KEYWORD INDEX)
 * -----------------------------------------
 * These keywords help match user symptom language with the correct condition.
 * Purely educational and Ads/YMYL-compliant. No diagnoses or medications.
 */

export const searchTerms: SearchTermEntry[] = [

  // -----------------------------
  // SINUS + COLD/FLU
  // -----------------------------
  { symptom: "sinus pressure", condition: "sinus-infection" },
  { symptom: "congestion", condition: "sinus-infection" },
  { symptom: "stuffed nose", condition: "sinus-infection" },
  { symptom: "blocked nose", condition: "sinus-infection" },
  { symptom: "face pressure", condition: "sinus-infection" },

  { symptom: "cold symptoms", condition: "cold-flu" },
  { symptom: "flu symptoms", condition: "cold-flu" },
  { symptom: "runny nose", condition: "cold-flu" },
  { symptom: "cough", condition: "cold-flu" },
  { symptom: "fatigue", condition: "cold-flu" },

  // -----------------------------
  // MIGRAINE / HEADACHE
  // -----------------------------
  { symptom: "headache", condition: "migraine" },
  { symptom: "pounding head", condition: "migraine" },
  { symptom: "light sensitivity", condition: "migraine" },
  { symptom: "sound sensitivity", condition: "migraine" },

  // -----------------------------
  // NAUSEA + DIGESTIVE
  // -----------------------------
  { symptom: "nausea", condition: "nausea" },
  { symptom: "queasy", condition: "nausea" },
  { symptom: "stomach upset", condition: "nausea" },

  { symptom: "heartburn", condition: "acid-reflux" },
  { symptom: "burning chest", condition: "acid-reflux" },
  { symptom: "throat irritation", condition: "acid-reflux" },

  { symptom: "constipated", condition: "constipation" },
  { symptom: "hard to go", condition: "constipation" },
  { symptom: "stomach tightness", condition: "constipation" },

  // -----------------------------
  // RASH / SKIN
  // -----------------------------
  { symptom: "skin rash", condition: "rash" },
  { symptom: "itching", condition: "rash" },
  { symptom: "red patches", condition: "rash" },
  { symptom: "bumps", condition: "rash" },
  { symptom: "skin irritation", condition: "rash" },

  // -----------------------------
  // EYE IRRITATION
  // -----------------------------
  { symptom: "pink eye", condition: "pink-eye" },
  { symptom: "red eye", condition: "pink-eye" },
  { symptom: "watery eye", condition: "pink-eye" },
  { symptom: "itchy eyes", condition: "pink-eye" },

  // -----------------------------
  // UTI-LIKE SYMPTOMS
  // -----------------------------
  { symptom: "burning urination", condition: "uti" },
  { symptom: "urinary discomfort", condition: "uti" },
  { symptom: "frequent urination", condition: "uti" },
  { symptom: "pelvic pressure", condition: "uti" },

  // -----------------------------
  // STD/STI GENERAL SYMPTOMS
  // -----------------------------
  { symptom: "possible std", condition: "std-sti" },
  { symptom: "possible sti", condition: "std-sti" },
  { symptom: "exposure concern", condition: "std-sti" },
  { symptom: "discharge change", condition: "std-sti" },
  { symptom: "genital irritation", condition: "std-sti" },

  // -----------------------------
  // BV / YEAST
  // -----------------------------
  { symptom: "odor change", condition: "bacterial-vaginosis" },
  { symptom: "thick discharge", condition: "yeast-infection" },
  { symptom: "vaginal irritation", condition: "yeast-infection" },
  { symptom: "itching irritation", condition: "yeast-infection" },

  // -----------------------------
  // SORE THROAT / STREP-LIKE
  // -----------------------------
  { symptom: "sore throat", condition: "sore-throat" },
  { symptom: "throat pain", condition: "sore-throat" },
  { symptom: "swollen throat", condition: "sore-throat" },

  { symptom: "possible strep", condition: "strep" },

  // -----------------------------
  // EAR
  // -----------------------------
  { symptom: "ear pain", condition: "ear-infection" },
  { symptom: "ear pressure", condition: "ear-infection" },
  { symptom: "ear fullness", condition: "ear-infection" },

  // -----------------------------
  // GENERAL SYMPTOMS
  // -----------------------------
  { symptom: "not sure", condition: "general-symptoms" },
  { symptom: "unsure symptom", condition: "general-symptoms" },
  { symptom: "general discomfort", condition: "general-symptoms" },

  // -----------------------------
  // FOLLOW-UP
  // -----------------------------
  { symptom: "follow up", condition: "follow-up-visit" },
  { symptom: "follow-up", condition: "follow-up-visit" },

  // -----------------------------
  // MENTAL HEALTH
  // -----------------------------
  { symptom: "anxiety", condition: "anxiety" },
  { symptom: "worry", condition: "anxiety" },
  { symptom: "stress", condition: "stress" },

  { symptom: "burnout", condition: "burnout" },
  { symptom: "tired all the time", condition: "burnout" },
  { symptom: "exhausted", condition: "burnout" },

  { symptom: "overwhelmed", condition: "therapy" },
  { symptom: "emotional discomfort", condition: "therapy" },

  { symptom: "focus issues", condition: "adhd-initial" },
  { symptom: "concentration problems", condition: "adhd-initial" },

  { symptom: "adhd followup", condition: "adhd-followup" },
  { symptom: "attention concerns", condition: "adhd-followup" }
];
