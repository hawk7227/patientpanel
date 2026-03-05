export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * UNIVERSAL 35-ITEM FAQ SET
 * --------------------------
 * This set is educational, non-prescriptive, and fully Ads/YMYL compliant.
 * It applies to ALL 28 conditions.
 */
export const universalFAQ: FAQItem[] = [
  {
    question: "How does a telehealth visit work?",
    answer:
      "You describe your symptoms or concerns through a secure online form. A licensed clinician reviews the information and may ask follow-up questions before providing general guidance or next steps."
  },
  {
    question: "Do I need a video call?",
    answer:
      "Many evaluations are completed through secure intake forms and messaging. If a video call is appropriate, the clinician will let you know."
  },
  {
    question: "How fast will a clinician review my information?",
    answer:
      "Review times vary depending on daily volume and availability. Many submissions are reviewed the same day."
  },
  {
    question: "Can telehealth handle urgent medical emergencies?",
    answer:
      "No. Telehealth is not a substitute for emergency care. Severe or worsening symptoms require urgent in-person evaluation."
  },
  {
    question: "What information should I include when describing symptoms?",
    answer:
      "Provide details such as timing, severity, recent changes, and anything that makes the symptoms better or worse."
  },
  {
    question: "Do I need to upload photos?",
    answer:
      "Photos are optional. If helpful, a clinician may request them for context, but this is not required."
  },
  {
    question: "Is my personal information kept private?",
    answer:
      "Yes. All communication is encrypted and handled according to privacy and confidentiality standards."
  },
  {
    question: "Can telehealth provide diagnoses?",
    answer:
      "Telehealth provides general educational guidance and next-step recommendations. Diagnoses often require in-person evaluation or testing."
  },
  {
    question: "Will I always receive a specific treatment plan?",
    answer:
      "No. Recommendations depend on the symptoms and information provided. Some concerns may require in-person evaluation."
  },
  {
    question: "Is testing required for certain symptoms?",
    answer:
      "Some situations may benefit from laboratory testing. If appropriate, a clinician may recommend local options."
  },
  {
    question: "Can I get general advice even if I am unsure what condition I have?",
    answer:
      "Yes. You can describe symptoms in your own words and a clinician can provide general educational guidance."
  },
  {
    question: "What if my symptoms worsen?",
    answer:
      "Worsening symptoms may require in-person or urgent care evaluation."
  },
  {
    question: "Is telehealth available on weekends?",
    answer:
      "Availability varies by day and clinician. You may submit your information at any time."
  },
  {
    question: "Do I need insurance?",
    answer:
      "No. Services are offered on a self-pay basis."
  },
  {
    question: "Can telehealth help with follow-up questions?",
    answer:
      "Yes. Clinicians may respond to follow-up questions depending on the situation."
  },
  {
    question: "Can I use telehealth while traveling?",
    answer:
      "You must be physically located in the state where the clinician is licensed at the time of evaluation."
  },
  {
    question: "Are there age restrictions?",
    answer:
      "Services are intended for adults only."
  },
  {
    question: "Can I request general wellness guidance?",
    answer:
      "Yes. Telehealth can provide general wellness and educational insights."
  },
  {
    question: "Do I need prior medical records?",
    answer:
      "No. Provide as much relevant context as possible during your submission."
  },
  {
    question: "Can telehealth assist with mild recurring symptoms?",
    answer:
      "Telehealth may offer general educational guidance for recurring symptoms, depending on severity and history."
  },
  {
    question: "What if my pharmacy does not have a recommended item?",
    answer:
      "Availability varies. A clinician may suggest general next-step options."
  },
  {
    question: "Are photos of rashes or skin changes required?",
    answer:
      "No. Photos are optional and only used to help provide general context if needed."
  },
  {
    question: "Can stress impact my symptoms?",
    answer:
      "Some individuals report changes in symptoms during stressful periods. Clinicians may discuss general wellness strategies."
  },
  {
    question: "What if I made a mistake in my submission?",
    answer:
      "You may send a correction or clarification after submitting."
  },
  {
    question: "Can I use telehealth from a mobile device?",
    answer:
      "Yes. The platform is compatible with most smartphones, tablets, and computers."
  },
  {
    question: "Do I need to prepare anything before submitting my symptoms?",
    answer:
      "You may want to note when symptoms started, any recent changes, and anything that makes them better or worse."
  },
  {
    question: "Is telehealth private for sensitive concerns?",
    answer:
      "Yes. Many adults prefer telehealth specifically for privacy and secure communication."
  },
  {
    question: "Can telehealth help with non-specific symptoms?",
    answer:
      "Yes. Describe what you're experiencing and a clinician can offer general guidance."
  },
  {
    question: "Can telehealth explain when in-person care is more appropriate?",
    answer:
      "Yes. If symptoms suggest the need for in-person evaluation, that will be communicated."
  },
  {
    question: "What if I have questions after reading educational guidance?",
    answer:
      "You may submit additional questions for clarification depending on the clinician’s availability."
  },
  {
    question: "Does submitting symptoms guarantee a specific outcome?",
    answer:
      "No. Recommendations depend on the information provided, and some situations require in-person assessment."
  },
  {
    question: "Can weather or environmental changes affect symptoms?",
    answer:
      "Some individuals notice symptom variation with temperature, humidity, or seasonal shifts."
  },
  {
    question: "Is telehealth helpful for reviewing symptoms before deciding next steps?",
    answer:
      "Yes. Telehealth can support learning about symptom patterns and when in-person care may help."
  },
  {
    question: "Is this service suitable for emergency concerns?",
    answer:
      "No. Emergency symptoms require immediate in-person evaluation."
  },
  {
    question: "Can I receive general education without submitting all details?",
    answer:
      "Providing more detail may allow for more accurate educational guidance, but minimal information can still be reviewed."
  }
];

/**
 * MAP EVERY CONDITION TO UNIVERSAL FAQ
 */
export const faqByCondition: Record<string, FAQItem[]> = new Proxy(
  {},
  {
    get: () => universalFAQ
  }
);
