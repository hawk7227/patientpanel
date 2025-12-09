export interface ConditionCard {
  slug: string;          // used in routing
  title: string;         // human-readable condition name
  description: string;   // short educational text
  image: string;         // public image path
}

export const conditionCards: Record<string, ConditionCard> = {

  // -------------------------------------------------------
  // CORE GENERAL URGENT-CARE CONDITIONS
  // -------------------------------------------------------

  "sinus-infection": {
    slug: "sinus-infection",
    title: "Sinus Infection",
    description: "Educational information about sinus pressure, congestion, and general symptom considerations.",
    image: "/condition-images/sinus.jpg"
  },

  "cold-flu": {
    slug: "cold-flu",
    title: "Cold & Flu Symptoms",
    description: "General information about non-emergent cold or flu-like symptoms such as congestion or fatigue.",
    image: "/condition-images/coldflu.jpg"
  },

  "migraine": {
    slug: "migraine",
    title: "Migraine & Headache",
    description: "General educational information about recurring headaches or migraine-like symptoms.",
    image: "/condition-images/migraine.jpg"
  },

  "nausea": {
    slug: "nausea",
    title: "Nausea",
    description: "General information about mild nausea or digestive discomfort.",
    image: "/condition-images/nausea.jpg"
  },

  "rash": {
    slug: "rash",
    title: "Skin Rash",
    description: "General educational information on mild skin irritation or rash-like symptoms.",
    image: "/condition-images/rash.jpg"
  },

  "pink-eye": {
    slug: "pink-eye",
    title: "Pink Eye / Eye Irritation",
    description: "General symptom information related to eye redness or irritation.",
    image: "/condition-images/pinkeye.jpg"
  },


  // -------------------------------------------------------
  // URINARY & SENSITIVE CONDITIONS
  // -------------------------------------------------------

  "uti": {
    slug: "uti",
    title: "UTI-Like Urinary Symptoms",
    description: "General information about urinary discomfort or irritation.",
    image: "/condition-images/uti.jpg"
  },

  "std-sti": {
    slug: "std-sti",
    title: "Possible STD / STI Exposure",
    description: "Educational information about common STD/STI concerns or exposure questions.",
    image: "/condition-images/std.jpg"
  },

  "yeast-infection": {
    slug: "yeast-infection",
    title: "Yeast-Like Symptoms",
    description: "General information about vaginal irritation or discharge changes.",
    image: "/condition-images/yeast.jpg"
  },

  "bacterial-vaginosis": {
    slug: "bacterial-vaginosis",
    title: "BV-Like Symptoms",
    description: "Educational information about discharge or odor changes.",
    image: "/condition-images/bv.jpg"
  },

  "sensitive-visit": {
    slug: "sensitive-visit",
    title: "Private / Sensitive Visit",
    description: "A private category for concerns that do not fit common symptom groups.",
    image: "/condition-images/private.jpg"
  },


  // -------------------------------------------------------
  // MENTAL HEALTH / ADHD / WELLNESS
  // -------------------------------------------------------

  "anxiety": {
    slug: "anxiety",
    title: "Anxiety Concerns",
    description: "Educational overview of general stress, tension, or worry-related symptoms.",
    image: "/condition-images/anxiety.jpg"
  },

  "therapy": {
    slug: "therapy",
    title: "Emotional Support / Wellness",
    description: "General information about low motivation, stress sensitivity, or emotional fatigue.",
    image: "/condition-images/therapy.jpg"
  },

  "adhd-initial": {
    slug: "adhd-initial",
    title: "ADHD Initial Visit",
    description: "General educational information about attention or focus difficulties.",
    image: "/condition-images/adhd.jpg"
  },

  "adhd-followup": {
    slug: "adhd-followup",
    title: "ADHD Follow-Up",
    description: "General information about ongoing attention or focus concerns.",
    image: "/condition-images/adhd2.jpg"
  },

  "stress": {
    slug: "stress",
    title: "Stress-Related Symptoms",
    description: "General educational information regarding stress or routine disruptions.",
    image: "/condition-images/stress.jpg"
  },

  "burnout": {
    slug: "burnout",
    title: "Burnout & Fatigue",
    description: "General information about low energy or reduced motivation.",
    image: "/condition-images/burnout.jpg"
  },


  // -------------------------------------------------------
  // GENERAL CLINICAL CATEGORIES
  // -------------------------------------------------------

  "prescription-refill": {
    slug: "prescription-refill",
    title: "Prescription Refill",
    description: "General review for stable, ongoing medication needs. No controlled substances.",
    image: "/condition-images/refill.jpg"
  },

  "ear-infection": {
    slug: "ear-infection",
    title: "Ear Discomfort",
    description: "General information about ear fullness or mild pressure symptoms.",
    image: "/condition-images/ear.jpg"
  },

  "sore-throat": {
    slug: "sore-throat",
    title: "Sore Throat",
    description: "General overview of throat discomfort, dryness, or irritation.",
    image: "/condition-images/throat.jpg"
  },

  "strep": {
    slug: "strep",
    title: "Strep-Like Symptoms",
    description: "Educational information about sore throat symptoms that may require testing.",
    image: "/condition-images/strep.jpg"
  },

  "back-pain": {
    slug: "back-pain",
    title: "Back Pain (Mild)",
    description: "General information about muscle tension or mild back discomfort.",
    image: "/condition-images/back.jpg"
  },

  "acid-reflux": {
    slug: "acid-reflux",
    title: "Acid Reflux Symptoms",
    description: "General educational information regarding irritation after meals or lying down.",
    image: "/condition-images/reflux.jpg"
  },

  "constipation": {
    slug: "constipation",
    title: "Constipation",
    description: "General information about infrequent bowel movements or mild abdominal tension.",
    image: "/condition-images/constipation.jpg"
  },

  "fever-mild": {
    slug: "fever-mild",
    title: "Mild Fever",
    description: "General educational information about non-emergent temperature elevation.",
    image: "/condition-images/fever.jpg"
  },

  "general-symptoms": {
    slug: "general-symptoms",
    title: "General Symptoms",
    description: "A general category for non-specific concerns or unclear symptoms.",
    image: "/condition-images/general.jpg"
  },

  "follow-up-visit": {
    slug: "follow-up-visit",
    title: "Follow-Up Visit",
    description: "General educational information for reviewing changes in symptoms.",
    image: "/condition-images/followup.jpg"
  }
};
