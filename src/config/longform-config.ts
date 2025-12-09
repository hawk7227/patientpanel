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
  },
  // ============================================================
  // 9. YEAST-LIKE SYMPTOMS (GENERAL IRRITATION)
  // ============================================================
  "yeast-infection": {
    slug: "yeast-infection",
    intro: [
      "Yeast-like symptoms may include itching, dryness, or irritation in sensitive areas.",
      "This section provides general educational information for understanding common patterns people describe."
    ],
    symptoms: [
      "Itching or irritation",
      "Dryness or redness",
      "Thick discharge changes",
      "General discomfort"
    ],
    causes: [
      "Moisture imbalance",
      "Irritating soaps or detergents",
      "Hormonal fluctuations",
      "General skin sensitivity"
    ],
    riskFactors: [
      "History of irritation episodes",
      "Use of new hygiene products",
      "Humidity or tight clothing"
    ],
    telehealthProcess: [
      "Clinicians may ask about symptom timing and possible irritants.",
      "Optional photos can help provide context but are not required.",
      "General symptom education may be offered."
    ],
    safetyNotes: [
      "Severe swelling, high fever, or spreading redness require in-person evaluation.",
      "Persistent symptoms may need testing."
    ],
    prevention: [
      "Avoiding irritant products may help.",
      "Wearing breathable fabrics may support comfort.",
      "Maintaining dryness may reduce irritation."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 10. BV-LIKE SYMPTOMS (EDUCATIONAL)
  // ============================================================
  "bacterial-vaginosis": {
    slug: "bacterial-vaginosis",
    intro: [
      "Some adults experience discharge or odor changes due to routine imbalances.",
      "This educational section explains general BV-like symptoms without diagnosis."
    ],
    symptoms: [
      "Odor change",
      "Discharge variation",
      "Mild pelvic discomfort"
    ],
    causes: [
      "Routine bacterial imbalance",
      "New hygiene products",
      "Moisture or clothing changes"
    ],
    riskFactors: [
      "History of routine imbalances",
      "Hormonal shifts",
      "Environmental changes"
    ],
    telehealthProcess: [
      "Clinicians may explore timing, pattern changes, and comfort level.",
      "Photos are optional and used only for educational context.",
      "Guidance may include when in-person testing is typically recommended."
    ],
    safetyNotes: [
      "Severe pain, heavy bleeding, or fever require in-person care.",
      "Symptoms that persist or worsen may need testing."
    ],
    prevention: [
      "Avoiding irritant products may support comfort.",
      "Breathable fabrics can reduce moisture.",
      "Consistent routines may help some individuals."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 11. PRIVATE / SENSITIVE VISIT
  // ============================================================
  "sensitive-visit": {
    slug: "sensitive-visit",
    intro: [
      "Some individuals prefer to discuss concerns that feel personal or difficult to categorize.",
      "Private visits offer a secure space to describe symptoms discreetly."
    ],
    symptoms: [
      "General discomfort",
      "Personal concerns",
      "Unclear symptoms",
      "Sensitive questions"
    ],
    causes: [
      "Stress or interpersonal concerns",
      "Routine changes",
      "General uncertainty about symptoms"
    ],
    riskFactors: [
      "New environments or stressors",
      "Lifestyle changes",
      "History of sensitive concerns"
    ],
    telehealthProcess: [
      "Clinicians review the concern privately.",
      "Follow-up questions may clarify context.",
      "General educational guidance is provided."
    ],
    safetyNotes: [
      "Severe or rapidly worsening symptoms require in-person evaluation.",
      "Telehealth is educational and not intended for emergency concerns."
    ],
    prevention: [
      "Routine wellness check-ins may help track changes.",
      "Stress management strategies may support comfort."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 12. ANXIETY (GENERAL WELLNESS)
  // ============================================================
  "anxiety": {
    slug: "anxiety",
    intro: [
      "Feelings of stress, tension, or worry can affect physical and emotional well-being.",
      "This section provides general educational insight into common anxiety-related patterns."
    ],
    symptoms: [
      "Restlessness or difficulty relaxing",
      "Racing thoughts",
      "Difficulty concentrating",
      "Physical tension"
    ],
    causes: [
      "Life changes or stress",
      "Sleep disruption",
      "Routine pressure or overthinking"
    ],
    riskFactors: [
      "High-stress environments",
      "Irregular schedules",
      "Poor sleep patterns"
    ],
    telehealthProcess: [
      "Clinicians may ask about timing and intensity of stress or tension.",
      "General wellness suggestions may be offered.",
      "Telehealth may help determine when in-person evaluation is recommended."
    ],
    safetyNotes: [
      "Thoughts of self-harm or severe panic require immediate in-person or emergency care.",
      "Telehealth is not a substitute for crisis support."
    ],
    prevention: [
      "Regular sleep routines may support emotional balance.",
      "Breathing or grounding techniques may help some individuals.",
      "Talking with supportive individuals may assist with clarity."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 13. THERAPY / EMOTIONAL WELLNESS SUPPORT
  // ============================================================
  "therapy": {
    slug: "therapy",
    intro: [
      "Emotional wellness concerns may include low motivation, sadness, or stress.",
      "This section provides general educational information about emotional patterns and wellness support."
    ],
    symptoms: [
      "Low energy or reduced motivation",
      "Persistent sadness",
      "Difficulty focusing",
      "Emotional overwhelm"
    ],
    causes: [
      "Life transitions",
      "Relationship stress",
      "Routine disruption"
    ],
    riskFactors: [
      "Lack of rest or routine",
      "Challenging environments",
      "High pressure work schedules"
    ],
    telehealthProcess: [
      "Clinicians may ask about timing, triggers, and stressors.",
      "Supportive guidance may help clarify next steps.",
      "Telehealth may recommend in-person care for complex concerns."
    ],
    safetyNotes: [
      "Thoughts of self-harm require immediate emergency care.",
      "Intense or escalating emotional symptoms require in-person support."
    ],
    prevention: [
      "Maintaining supportive connections may help emotional balance.",
      "Routine rest and breaks can support overall well-being."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 14. ADHD INITIAL (GENERAL EDUCATION)
  // ============================================================
  "adhd-initial": {
    slug: "adhd-initial",
    intro: [
      "Attention-related challenges may include difficulty focusing, organizing tasks, or completing routines.",
      "This guide explains general educational patterns without diagnosing ADHD."
    ],
    symptoms: [
      "Difficulty maintaining focus",
      "Restlessness or fidgeting",
      "Easily distracted",
      "Trouble organizing or completing tasks"
    ],
    causes: [
      "Routine shifts",
      "Sleep disruption",
      "Environmental distractions"
    ],
    riskFactors: [
      "Family tendencies toward focus difficulties",
      "Inconsistent schedules",
      "High stimulation environments"
    ],
    telehealthProcess: [
      "Clinicians may explore work, school, and routine patterns.",
      "Educational discussion may cover organizational strategies.",
      "Telehealth may recommend in-person evaluation for full diagnostics."
    ],
    safetyNotes: [
      "Sudden severe behavioral changes require in-person evaluation.",
      "Telehealth does not replace formal ADHD testing."
    ],
    prevention: [
      "Structured routines may support focus.",
      "Limiting distractions may help improve concentration."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 15. ADHD FOLLOW-UP
  // ============================================================
  "adhd-followup": {
    slug: "adhd-followup",
    intro: [
      "Follow-up visits help adults describe progress, challenges, and changes in routine related to focus concerns.",
      "This educational section supports general discussion of organization and routine patterns."
    ],
    symptoms: [
      "Difficulty staying on task",
      "Varying motivation",
      "Restlessness",
      "Trouble completing routines"
    ],
    causes: [
      "Disrupted sleep patterns",
      "Increased stress or demands",
      "Environmental noise or distractions"
    ],
    riskFactors: [
      "Changes in routine",
      "High workload periods",
      "Lifestyle transitions"
    ],
    telehealthProcess: [
      "Clinicians may ask what has improved or become more challenging.",
      "Educational suggestions may support better routine planning.",
      "Telehealth may help determine when in-person care is more appropriate."
    ],
    safetyNotes: [
      "Sudden or severe concentration changes may require in-person evaluation.",
      "Telehealth is not a replacement for comprehensive behavioral assessment."
    ],
    prevention: [
      "Stable daily routines may support attention.",
      "Periodic breaks may improve productivity."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 16. STRESS & FATIGUE
  // ============================================================
  "stress": {
    slug: "stress",
    intro: [
      "Stress can influence mental and physical well-being and may arise from multiple life circumstances.",
      "This guide explains general educational patterns commonly described by adults."
    ],
    symptoms: [
      "Worry or tension",
      "Irritability",
      "Difficulty focusing",
      "Fatigue or low motivation"
    ],
    causes: [
      "Workload or personal responsibilities",
      "Sleep disruption",
      "Challenging life events",
      "Environmental pressures"
    ],
    riskFactors: [
      "High-pressure environments",
      "Irregular sleep schedules",
      "Limited downtime"
    ],
    telehealthProcess: [
      "Clinicians may ask about stressors and recent changes.",
      "Supportive educational guidance may be offered.",
      "Telehealth can discuss when in-person care may help."
    ],
    safetyNotes: [
      "Severe emotional distress or self-harm concerns require emergency support.",
      "Telehealth is not intended for crisis situations."
    ],
    prevention: [
      "Scheduled breaks may support resilience.",
      "Healthy sleep and hydration may help reduce tension.",
      "Supportive routines may improve emotional balance."
    ],
    stateNotes: universalStateNotes
  },
  // ============================================================
  // 17. BURNOUT & FATIGUE (GENERAL WELLNESS)
  // ============================================================
  "burnout": {
    slug: "burnout",
    intro: [
      "Burnout may develop gradually in response to prolonged stress or demanding routines.",
      "This section explains general patterns adults report when experiencing emotional or physical fatigue."
    ],
    symptoms: [
      "Low motivation",
      "Difficulty concentrating",
      "Emotional exhaustion",
      "Reduced productivity"
    ],
    causes: [
      "High workloads",
      "Lack of rest or recovery time",
      "Routine pressure",
      "Emotional strain"
    ],
    riskFactors: [
      "Long work hours",
      "Limited breaks",
      "Challenging personal circumstances"
    ],
    telehealthProcess: [
      "Clinicians may ask about stress levels and daily patterns.",
      "Supportive guidance may focus on pacing and routine adjustments.",
      "Telehealth can offer clarity about when in-person care may help."
    ],
    safetyNotes: [
      "Severe emotional distress or self-harm concerns require immediate support.",
      "Sudden behavioral changes require in-person evaluation."
    ],
    prevention: [
      "Regular rest breaks may support resilience.",
      "Healthy sleep routines may reduce fatigue.",
      "Maintaining boundaries may support emotional recovery."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 18. PRESCRIPTION REFILL (GENERAL REVIEW ONLY)
  // ============================================================
  "prescription-refill": {
    slug: "prescription-refill",
    intro: [
      "Some adults request support reviewing ongoing, stable medication needs.",
      "This section provides general educational information without referencing specific medications."
    ],
    symptoms: [
      "Concerns about ongoing routine medications",
      "Questions about timing of refills",
      "General follow-up questions"
    ],
    causes: [
      "Scheduling needs",
      "Routine wellness follow-up",
      "Changes in personal planning"
    ],
    riskFactors: [
      "Long-term care routines",
      "Previous refill timing issues",
      "New life changes"
    ],
    telehealthProcess: [
      "Clinicians review pharmacy preferences and refill timing.",
      "Clarifying questions may ensure accuracy.",
      "Telehealth may advise when in-person evaluation is required."
    ],
    safetyNotes: [
      "Telehealth cannot support controlled substance refills.",
      "Complex or new symptoms may require in-person evaluation."
    ],
    prevention: [
      "Tracking timing may support refill planning.",
      "Maintaining a consistent schedule may reduce interruptions."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 19. EAR DISCOMFORT
  // ============================================================
  "ear-infection": {
    slug: "ear-infection",
    intro: [
      "Ear discomfort may arise from congestion, pressure changes, or environmental irritation.",
      "This educational section covers non-specific ear-related symptoms."
    ],
    symptoms: [
      "Fullness or pressure",
      "Mild discomfort when swallowing",
      "Reduced ability to equalize pressure"
    ],
    causes: [
      "Seasonal congestion",
      "Altitude or pressure changes",
      "Environmental irritation"
    ],
    riskFactors: [
      "Recent travel",
      "Congestion episodes",
      "Exposure to loud environments"
    ],
    telehealthProcess: [
      "Clinicians may ask about timing and associated symptoms like congestion.",
      "Follow-up questions help clarify cause patterns.",
      "General wellness suggestions may be provided."
    ],
    safetyNotes: [
      "Severe pain or fluid drainage requires in-person evaluation.",
      "High fever or balance issues require urgent care."
    ],
    prevention: [
      "Gentle pressure equalizing techniques may help.",
      "Avoiding loud noise may reduce irritation."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 20. SORE THROAT
  // ============================================================
  "sore-throat": {
    slug: "sore-throat",
    intro: [
      "General throat irritation can occur due to dryness, speaking strain, or routine seasonal factors.",
      "This guide provides educational context only."
    ],
    symptoms: [
      "Scratchy or dry throat",
      "Discomfort when swallowing",
      "Mild hoarseness"
    ],
    causes: [
      "Dry indoor air",
      "Seasonal allergens",
      "Extended speaking or singing",
      "General upper-respiratory irritation"
    ],
    riskFactors: [
      "Low hydration",
      "Indoor heating exposure",
      "Frequent speaking"
    ],
    telehealthProcess: [
      "Clinicians may ask when discomfort began and whether it has changed.",
      "Optional photos of the throat may help provide context.",
      "General educational guidance may be offered."
    ],
    safetyNotes: [
      "High fever or severe throat pain require in-person evaluation.",
      "Difficulty breathing or swallowing requires emergency care."
    ],
    prevention: [
      "Hydration may support throat comfort.",
      "Humidifiers may help in dry environments.",
      "Voice rest can reduce irritation."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 21. STREP-LIKE SYMPTOMS (EDUCATIONAL)
  // ============================================================
  "strep": {
    slug: "strep",
    intro: [
      "Some sore throat symptoms may prompt questions about possible bacterial involvement.",
      "This section provides educational guidance on general patterns and when in-person testing is typically recommended."
    ],
    symptoms: [
      "Throat pain",
      "Swollen tonsils",
      "Redness or irritation",
      "Discomfort when swallowing"
    ],
    causes: [
      "Routine viral irritation",
      "Dry air exposure",
      "Environmental factors"
    ],
    riskFactors: [
      "Exposure to individuals with throat symptoms",
      "Seasonal weather changes"
    ],
    telehealthProcess: [
      "A clinician reviews symptom timing and severity.",
      "They may discuss whether in-person testing is appropriate.",
      "Telehealth may provide educational next-step recommendations."
    ],
    safetyNotes: [
      "High fever or severe throat pain require in-person evaluation.",
      "Difficulty swallowing or drooling requires urgent care."
    ],
    prevention: [
      "Hydration may support comfort.",
      "Humidifiers can reduce dryness.",
      "Limiting exposure to irritants may help."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 22. BACK PAIN (MILD)
  // ============================================================
  "back-pain": {
    slug: "back-pain",
    intro: [
      "Mild back discomfort is common and may relate to posture, muscle strain, or routine activity.",
      "This guide provides general educational insight into back tension or soreness."
    ],
    symptoms: [
      "Lower or upper back tension",
      "Muscle tightness",
      "Reduced range of motion"
    ],
    causes: [
      "Lifting or reaching motions",
      "Poor posture",
      "Prolonged sitting or standing"
    ],
    riskFactors: [
      "Sedentary routines",
      "Repetitive motion tasks",
      "Stress or tension buildup"
    ],
    telehealthProcess: [
      "Clinicians may ask about recent activity changes.",
      "Educational suggestions may include general posture or stretching tips.",
      "Telehealth may indicate when in-person evaluation is needed."
    ],
    safetyNotes: [
      "Numbness, tingling, or loss of bowel/bladder control require emergency care.",
      "Severe or persistent back pain warrants in-person evaluation."
    ],
    prevention: [
      "Gentle stretching routines may support comfort.",
      "Periodic movement breaks can reduce stiffness.",
      "Adjusting posture may help reduce strain."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 23. ACID REFLUX (GENERAL EDUCATION)
  // ============================================================
  "acid-reflux": {
    slug: "acid-reflux",
    intro: [
      "Acid reflux-like symptoms may include chest discomfort, burning sensation, or throat irritation.",
      "This section provides general educational context, without diagnosing specific conditions."
    ],
    symptoms: [
      "Burning sensation in chest or throat",
      "Regurgitation sensation",
      "Throat irritation"
    ],
    causes: [
      "Eating before lying down",
      "Large or spicy meals",
      "Routine digestive sensitivity"
    ],
    riskFactors: [
      "Late-night eating",
      "Stress or irregular routines",
      "Dietary triggers"
    ],
    telehealthProcess: [
      "Clinicians may ask when symptoms occur and what foods or routines precede them.",
      "General lifestyle-focused educational suggestions may be discussed.",
      "Telehealth may clarify when in-person evaluation is recommended."
    ],
    safetyNotes: [
      "Chest pain, shortness of breath, or radiation of pain require emergency evaluation.",
      "Persistent or severe symptoms may require in-person care."
    ],
    prevention: [
      "Avoid lying down shortly after eating.",
      "Small, consistent meals may support comfort.",
      "Some individuals find identifying food triggers helpful."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 24. CONSTIPATION
  // ============================================================
  "constipation": {
    slug: "constipation",
    intro: [
      "Constipation is a common concern defined by less frequent bowel movements or straining.",
      "This section provides general educational insight, not a diagnosis."
    ],
    symptoms: [
      "Hard stools",
      "Infrequent bowel movements",
      "Abdominal tension"
    ],
    causes: [
      "Low fiber intake",
      "Low hydration",
      "Routine changes",
      "Stress or decreased movement"
    ],
    riskFactors: [
      "Travel or disruptions in routine",
      "Low daily water intake",
      "Sedentary activity"
    ],
    telehealthProcess: [
      "Clinicians may review timing and recent dietary patterns.",
      "General wellness suggestions may be provided.",
      "Telehealth may advise when in-person evaluation is warranted."
    ],
    safetyNotes: [
      "Severe abdominal pain, vomiting, or inability to pass stool require urgent evaluation.",
      "Blood in stool requires in-person medical attention."
    ],
    prevention: [
      "Increasing hydration may support comfort.",
      "Routine movement may help some individuals.",
      "Consistent meal schedules may reduce symptoms."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 25. FEVER (MILD)
  // ============================================================
  "fever-mild": {
    slug: "fever-mild",
    intro: [
      "Mild fever may accompany many routine viral or environmental changes.",
      "This guide provides general, educational information."
    ],
    symptoms: [
      "Temperature elevation",
      "Fatigue",
      "Body aches",
      "Chills"
    ],
    causes: [
      "Routine viral exposure",
      "Seasonal temperature shifts",
      "Environmental factors"
    ],
    riskFactors: [
      "Close contact environments",
      "Low hydration",
      "Sleep disruption"
    ],
    telehealthProcess: [
      "Clinicians may ask about temperature trends and accompanying symptoms.",
      "General guidance may be offered depending on your description.",
      "Telehealth may suggest when in-person evaluation is appropriate."
    ],
    safetyNotes: [
      "High fever, confusion, or trouble breathing require urgent evaluation.",
      "Prolonged fever may require in-person care."
    ],
    prevention: [
      "Hydration may support comfort.",
      "Resting may help the body recover.",
      "Monitoring symptoms can help identify changes."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 26. GENERAL SYMPTOMS (UNCLEAR OR MIXED)
  // ============================================================
  "general-symptoms": {
    slug: "general-symptoms",
    intro: [
      "Some adults describe unclear symptoms that do not fit neatly into a category.",
      "This educational section helps frame general symptom exploration."
    ],
    symptoms: [
      "Non-specific discomfort",
      "Difficulty describing sensation",
      "General fatigue",
      "Mild irritation"
    ],
    causes: [
      "Routine life stress",
      "Environmental factors",
      "Changes in sleep or hydration"
    ],
    riskFactors: [
      "Irregular routines",
      "Stress or workload changes",
      "Environmental exposure"
    ],
    telehealthProcess: [
      "Clinicians may ask clarifying questions to understand the pattern.",
      "General educational suggestions may be offered.",
      "Telehealth can help determine next steps."
    ],
    safetyNotes: [
      "Severe, sudden, or worsening symptoms require in-person evaluation.",
      "Emergency symptoms require immediate care."
    ],
    prevention: [
      "Hydration, rest, and consistent routines may support comfort.",
      "Tracking symptom timing may provide useful insight."
    ],
    stateNotes: universalStateNotes
  },

  // ============================================================
  // 27. FOLLOW-UP VISIT
  // ============================================================
  "follow-up-visit": {
    slug: "follow-up-visit",
    intro: [
      "Follow-up conversations allow adults to review progress, changes, or new concerns after a previous discussion.",
      "This section provides general educational guidance for ongoing assessment."
    ],
    symptoms: [
      "Changes in symptom patterns",
      "New discomfort",
      "Improvement or worsening concerns"
    ],
    causes: [
      "Lifestyle adjustments",
      "New routines",
      "Environmental factors"
    ],
    riskFactors: [
      "History of similar symptoms",
      "Recent lifestyle or routine shifts"
    ],
    telehealthProcess: [
      "Clinicians may compare previous descriptions with current updates.",
      "Educational guidance may focus on tracking patterns.",
      "Follow-up may clarify when in-person evaluation is recommended."
    ],
    safetyNotes: [
      "Rapidly worsening symptoms require in-person evaluation."
    ],
    prevention: [
      "Routine wellness tracking may support clearer communication.",
      "Stable daily habits may help identify progress."
    ],
    stateNotes: universalStateNotes
  }

};

/**
 * SAFE ACCESSOR FOR LONGFORM CONTENT
 * ----------------------------------
 * Returns the requested condition if available,
 * otherwise falls back to "general-symptoms".
 */
export function getLongform(condition: string): LongformCondition {
  return longformContent[condition] || longformContent["general-symptoms"];
}


