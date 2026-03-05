// Service definitions for dynamic pages
// Content structure based on https://medazonhealth.com/private/uti-std/florida/

export interface ServiceData {
  slug: string;
  name: string;
  shortName: string;
  
  // Hero Section
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaButtons: {
      primary: { text: string; icon: string };
      secondary: { text: string; icon: string };
    };
    bullets: string[];
  };

  // Provider Section
  provider: {
    badge: string;
    name: string;
    credentials: string;
    title: string;
    experience: string;
    servingText: string;
    image: string;
    trustBadges: { icon: string; text: string }[];
  };

  // Treatment Cards Section
  treatmentSection: {
    title: string;
    subtitle: string;
    cards: {
      title: string;
      description: string;
      image?: string;
      imageAlt?: string;
    }[];
  };

  // Symptom Input Section
  symptomInput: {
    title: string;
    subtitle: string;
    ctaButtons: {
      primary: { text: string; icon: string };
      secondary: { text: string; icon: string };
    };
    bullets: string[];
  };

  // How It Works Section
  howItWorks: {
    title: string;
    subtitle: string;
    steps: {
      step: string;
      title: string;
      description: string;
      image?: string;
      imageAlt?: string;
    }[];
    ctaButtons: {
      primary: { text: string; icon: string };
      secondary: { text: string; icon: string };
    };
    bullets: string[];
  };

  // Testimonial Section
  testimonial: {
    quote: string;
    attribution: string;
    location: string;
    badge: string;
  };

  // FAQ Section
  faqSection: {
    title: string;
    subtitle: string;
    faqs: {
      question: string;
      answer: string;
    }[];
  };

  // Provider Bio Section (Your Clinician)
  providerBio: {
    sectionTitle: string;
    sectionSubtitle: string;
    expandButtonText: string;
    name: string;
    credentials: string;
    bio: string;
    education: {
      title: string;
      items: string[];
    };
    clinicalFocus: {
      title: string;
      items: string[];
    };
    professionalApproach: {
      title: string;
      content: string;
    };
    // commonSymptoms: {
    //   title: string;
    //   items: string[];
    // };
    // treatmentExpectations: {
    //   title: string;
    //   description: string;
    // };
    // whenNotAppropriate: {
    //   title: string;
    //   description: string;
    //   items: string[];
    // };
  };

  // Prevention Tips Section
  preventionTips: {
    title: string;
    categories: {
      title: string;
      tips: string[];
    }[];
  };

  // State-Specific Insights
  stateInsights: {
    title: string;
    description: string;
    regions: {
      title: string;
      areas: string[];
    };
    pharmacyInfo: {
      title: string;
      description: string;
    };
  };

  // Related Visit Reasons
  relatedReasons: {
    title: string;
    items: string[];
  };

  // Cities Section
  citiesSection: {
    title: string;
    subtitle: string;
  };

  // ZIP Codes Section
  zipSection: {
    title: string;
    subtitle: string;
  };

  // Why Patients Choose Section
  whyChoose: {
    title: string;
    subtitle: string;
    reasons: {
      title: string;
      description: string;
    }[];
  };

  // Coverage Areas Section
  coverageAreas: {
    title: string;
    subtitle: string;
    regions: {
      name: string;
      counties: string[];
    }[];
    availabilityNote: string;
  };

  // About Clinician Section (Second bio)
  aboutClinician: {
    title: string;
    name: string;
    credentials: string;
    bio: string;
    education: {
      title: string;
      items: string[];
    };
    focus: {
      title: string;
      items: string[];
    };
    telehealth: {
      title: string;
      description: string;
    };
    safety: {
      title: string;
      description: string;
    };
    disclaimer: string;
  };

  // Final CTA Section
  finalCta: {
    ctaButtons: {
      primary: { text: string; icon: string };
      secondary: { text: string; icon: string };
    };
    bullets: string[];
  };

  // Footer Info
  footer: {
    brandText: string;
    links: { text: string; href: string }[];
    copyright: string;
    address: string;
    legalNote: string;
  };

  // Price info
  priceNote?: string;
}

export const SERVICES: Record<string, ServiceData> = {
  "uti-std": {
    slug: "uti-std",
    name: "UTI & STD Treatment",
    shortName: "UTI/STD",

    // Hero Section
    hero: {
      badge: "Private {state} Telehealth",
      title: "Private UTI & STD Treatment — {state}-Licensed Doctors Online",
      subtitle: "Discreet, same-day telehealth visits with {state}-licensed clinicians. Get evaluated privately and, if appropriate, receive a prescription sent to your local pharmacy.",
      ctaButtons: {
        primary: { text: "Start an Instant Visit", icon: "arrow-right" },
        secondary: { text: "Book My Appointment", icon: "calendar" },
      },
      bullets: [
        "Same-Day Prescriptions When Appropriate",
        "{state}-Licensed UTI & STD Clinicians",
      ],
    },

    // Provider Section
    provider: {
      badge: "Provider Available Now",
      name: "LaMonica A. Hodges",
      credentials: "MSN, APRN, FNP-C",
      title: "Board-Certified Family Medicine",
      experience: "10+ Years Experience",
      servingText: "Serving {cities} residents",
      image: "/assets/F381103B-745E-4447-91B2-F1E32951D47F.jpeg",
      trustBadges: [
        { icon: "🟢", text: "HIPAA Secure" },
        { icon: "💳", text: "Stripe Encrypted" },
        { icon: "🏥", text: "{state_abbr}-Licensed" },
        { icon: "⚡", text: "Same-Day" },
      ],
    },

    // Treatment Cards Section
    treatmentSection: {
      title: "UTI & STD Treatment in {state}",
      subtitle: "Fast, discreet telehealth visits with {state}-licensed clinicians. Receive expert evaluation and, if appropriate, same-day prescriptions sent directly to your preferred pharmacy.",
      cards: [
        {
          title: "UTI Treatment",
          description: "Confidential online evaluation for urinary-tract infections. Antibiotics sent to CVS, Walgreens, or Publix — same day.",
          image: "/assets/service_uti.jpg",
          imageAlt: "UTI Treatment Online {state}",
        },
        {
          title: "STD / STI Care",
          description: "Private screening and treatment guidance for common STDs such as chlamydia, gonorrhea, and trichomoniasis.",
          image: "/assets/service_anxiety.jpg",
          imageAlt: "STD Care Telehealth {state}",
        },
        {
          title: "Pharmacy Pickup",
          description: "Prescriptions transmitted securely to any {state} pharmacy. No waiting rooms · No insurance required.",
          image: "/assets/service_general.jpg",
          imageAlt: "Pharmacy Pickup {state}",
        },
      ],
    },

    // Symptom Input Section
    symptomInput: {
      title: "What brings you in today?",
      subtitle: "A brief description helps the provider review quickly.",
      ctaButtons: {
        primary: { text: "Start an Instant Visit", icon: "arrow-right" },
        secondary: { text: "Book My Appointment", icon: "calendar" },
      },
      bullets: [
        "Same-Day Prescriptions When Appropriate",
        "{state}-Licensed UTI & STD Clinicians",
      ],
    },

    // How It Works Section
    howItWorks: {
      title: "How It Works",
      subtitle: "A simple, secure process designed for comfort and speed. Licensed {state} clinicians review your case privately — no waiting rooms or insurance required.",
      steps: [
        {
          step: "1",
          title: "Describe Your Symptoms",
          description: "Complete a quick 2-minute intake for UTI or STD symptoms — fully confidential and HIPAA-secure.",
          imageAlt: "Describe Symptoms",
        },
        {
          step: "2",
          title: "Provider Review",
          description: "A {state}-licensed clinician privately reviews your information and may message you if details are needed.",
          imageAlt: "Provider Review",
        },
        {
          step: "3",
          title: "Receive Treatment",
          description: "If appropriate, your prescription is electronically sent to your chosen {state} pharmacy — same day.",
          imageAlt: "Get Treatment",
        },
      ],
      ctaButtons: {
        primary: { text: "Start an Instant Visit", icon: "arrow-right" },
        secondary: { text: "Book My Appointment", icon: "calendar" },
      },
      bullets: [
        "2-Minute Private Intake",
        "Provider Review in Minutes",
      ],
    },

    // Testimonial Section
    testimonial: {
      quote: "I was able to describe my symptoms, get a response within an hour, and pick up my medication that same afternoon. The process was private, easy, and professional.",
      attribution: "Patient",
      location: "Tampa FL",
      badge: "✅ Verified Telehealth Patient",
    },

    // FAQ Section
    faqSection: {
      title: "Frequently Asked Questions",
      subtitle: "Answers to the most common questions about private UTI & STD treatment through Medazon Health in {state}.",
      faqs: [
        {
          question: "Can I get UTI treatment online in {state}?",
          answer: "Yes. {state}-licensed clinicians can review your UTI symptoms and, when appropriate, prescribe antibiotics electronically to your local pharmacy the same day.",
        },
        {
          question: "Is STD treatment confidential?",
          answer: "Absolutely. All communication is encrypted and HIPAA-compliant. Your information is never shared or stored outside our secure system.",
        },
        {
          question: "Do I need a lab test before treatment?",
          answer: "Not always. For common UTIs and some STDs, providers can treat based on symptoms. If testing is needed, we'll guide you to a {state} lab or clinic.",
        },
        {
          question: "Which pharmacies can you send to?",
          answer: "Any {state} pharmacy — CVS, Walgreens, Publix, Walmart, or independent locations across the state.",
        },
        {
          question: "Is telehealth for STD care legal in {state}?",
          answer: "Yes. Telehealth is authorized under {state_statute}, allowing licensed providers to evaluate and treat patients remotely within state guidelines.",
        },
        {
          question: "How fast are {state} telehealth reviews completed?",
          answer: "Review times vary, but many patients receive a response the same day depending on clinician availability.",
        },
        {
          question: "Do I need a video call for UTI or STD evaluation?",
          answer: "Not always. Many evaluations are completed through secure symptom intake. If a video call is required, the clinician will let you know.",
        },
        {
          question: "Can {state} clinicians treat symptoms during nights or weekends?",
          answer: "Yes. Telehealth support is available during extended hours. Availability may vary by day.",
        },
        {
          question: "Is treatment guaranteed after submitting symptoms?",
          answer: "No. Clinicians review each case individually and determine whether treatment is clinically appropriate.",
        },
        {
          question: "What {state} pharmacies can receive prescriptions?",
          answer: "Prescriptions can be sent to most pharmacies, including Publix, CVS, Walgreens, Walmart, and independent {state} pharmacies.",
        },
        {
          question: "Can I use telehealth for recurrent UTIs?",
          answer: "Clinicians can review symptoms for recurrent cases, but may recommend in-person testing depending on frequency and history.",
        },
        {
          question: "Which STD symptoms commonly require lab testing?",
          answer: "Symptoms such as discharge, sores, or exposure history may require lab confirmation. The clinician will guide next steps.",
        },
        {
          question: "Can I get help if I had recent exposure to an STD?",
          answer: "Yes. Clinicians can review exposure concerns and provide guidance on testing timelines or next steps.",
        },
        {
          question: "Are my STD or UTI details kept private?",
          answer: "Yes. All communication is encrypted and handled in compliance with privacy and confidentiality standards.",
        },
        {
          question: "How long do UTI symptoms normally last?",
          answer: "Duration varies by cause and individual circumstances. Clinicians provide guidance based on your specific symptoms.",
        },
        {
          question: "Can dehydration worsen UTI symptoms?",
          answer: "Many people report more discomfort when hydration is low. Increasing fluid intake may help some individuals.",
        },
        {
          question: "Do I need insurance to use this service?",
          answer: "No. Telehealth visits are offered on a self-pay basis, and insurance is not required.",
        },
        {
          question: "Can telehealth evaluate symptoms for genital herpes?",
          answer: "Clinicians can review symptoms and provide education, and may guide whether testing or additional evaluation is needed.",
        },
        {
          question: "What happens if my symptoms worsen after a visit?",
          answer: "You may need additional evaluation. Severe or persistent symptoms may require in-person care.",
        },
        {
          question: "Can pregnancy affect UTI or STD evaluation?",
          answer: "Pregnancy may require different evaluation steps. Clinicians consider this information during review.",
        },
        {
          question: "Can telehealth evaluate pain on one side of the back?",
          answer: "Severe or one-sided back pain may require in-person evaluation, depending on the cause and severity.",
        },
        {
          question: "Can minors use this service?",
          answer: "No. This service is for adults only.",
        },
        {
          question: "What if I am allergic to certain medications?",
          answer: "Clinicians review allergy history carefully to determine appropriate options or next steps.",
        },
        {
          question: "How do {state} telehealth laws apply to this service?",
          answer: "Evaluations follow {state_statute}, which governs telehealth use by licensed {state} clinicians.",
        },
        {
          question: "Can I get general advice if I'm unsure what condition I have?",
          answer: "Yes. Clinicians can review symptoms to help determine whether telehealth is appropriate or whether in-person testing is better.",
        },
        {
          question: "Is the visit truly private?",
          answer: "Yes. All information is handled in secure, encrypted systems designed to maintain confidentiality.",
        },
        {
          question: "Can I ask the clinician follow-up questions?",
          answer: "Yes. Clinicians may follow up with additional questions or clarification as needed.",
        },
        {
          question: "Can I use telehealth if I recently returned to {state}?",
          answer: "Yes, as long as you are physically located in {state} at the time of the visit.",
        },
        {
          question: "Do {state} rural areas receive the same support?",
          answer: "Yes. Telehealth can be used from any region in {state} with reliable internet access.",
        },
        {
          question: "Can STD symptoms appear even without visible changes?",
          answer: "Yes. Some infections cause no visible symptoms. Clinicians review exposures and timing to guide next steps.",
        },
        {
          question: "Can I request testing locations near me?",
          answer: "Clinicians may provide guidance on testing options, which include clinics, urgent care centers, or county resources.",
        },
        {
          question: "What if my pharmacy does not have the medication?",
          answer: "Pharmacy availability varies. Patients may request a transfer to another {state} pharmacy if needed.",
        },
        {
          question: "Can I receive general education without treatment?",
          answer: "Yes. Telehealth can provide general education and symptom-based guidance even if treatment is not recommended.",
        },
        {
          question: "Can I use this service if I am traveling within {state}?",
          answer: "Yes. As long as you are physically in the state during the evaluation, you may use telehealth services.",
        },
        {
          question: "What payment methods are accepted?",
          answer: "Major debit and credit cards are accepted through encrypted payment processing.",
        },
      ],
    },

    // Provider Bio Section
    providerBio: {
      sectionTitle: "Your {state} Clinician",
      sectionSubtitle: "This section provides general educational background about the licensed clinician who reviews symptom submissions from adults located in {state} during private telehealth visits. This information offers insight into training, experience, and scope of practice.",
      expandButtonText: "See More",
      name: "LaMonica A. Hodges",
      credentials: "MSN, APRN, FNP-C",
      bio: "LaMonica Hodges is a {state}-licensed Family Nurse Practitioner with more than ten years of clinical experience in primary care, symptom evaluation, women's health, and virtual care. Her clinical background includes reviewing common non-emergent symptoms such as mild urinary discomfort, general STD exposure questions, medication follow-up scenarios, and other conditions appropriate for telehealth review.",
      education: {
        title: "Education & Clinical Credentials",
        items: [
          "Master of Science in Nursing (MSN)",
          "Board-Certified Family Nurse Practitioner (FNP-C)",
          "Licensed to practice in the State of {state}",
        ],
      },
      clinicalFocus: {
        title: "Clinical Focus Areas",
        items: [
          "Evaluation of mild urinary symptoms",
          "General education on common STDs/STIs",
          "Primary care follow-up guidance",
          "Virtual symptom assessment and triage",
        ],
      },
      professionalApproach: {
        title: "Professional Approach",
        content: "All telehealth evaluations follow Florida Statute §456.47, including privacy requirements and professional standards. Clinicians review symptoms, ask follow-up questions when needed, and may recommend in-person evaluation if symptoms extend beyond the scope of telehealth."
      },
    //   commonSymptoms: {
    //     title: "Common Symptoms Reviewed via Telehealth",
    //     items: [
    //       "Burning or discomfort during urination",
    //       "Increased urinary frequency or urgency",
    //       "Unusual discharge or odor",
    //       "Mild pelvic discomfort",
    //       "Recent exposure to partners with symptoms or confirmed diagnoses",
    //     ],
    //   },
    //   treatmentExpectations: {
    //     title: "Treatment Expectations (General Education)",
    //     description: "If a clinician determines that treatment is suitable, they may electronically send medication to a {state} pharmacy selected during the visit. Medication choices depend on allergies, symptoms, medication history, and clinical judgment. This page does not list specific medications or guaranteed treatments.",
    //   },
    //   whenNotAppropriate: {
    //     title: "When Telehealth May Not Be Appropriate",
    //     description: "Some symptoms require in-person evaluation. Telehealth clinicians may redirect patients to in-person care if symptoms fall outside the scope of remote evaluation.",
    //     items: [
    //       "High fever",
    //       "Severe abdominal or pelvic pain",
    //       "Blood in urine with significant discomfort",
    //       "Vomiting or inability to keep fluids down",
    //       "Pregnancy with concerning symptoms",
    //       "Symptoms lasting significantly longer than expected",
    //       "Possible kidney infection indicators",
    //     ],
    //   },
    },

    // Prevention Tips Section
    preventionTips: {
      title: "General Prevention Tips",
      categories: [
        {
          title: "Reducing UTI Risk",
          tips: [
            "Stay hydrated",
            "Urinate after sexual activity",
            "Avoid irritating hygiene products",
            "Wear breathable fabrics",
          ],
        },
        {
          title: "Reducing STD Risk",
          tips: [
            "Use protection consistently",
            "Limit exposure to unknown partners",
            "Seek testing when needed",
            "Discuss concerns with partners",
          ],
        },
      ],
    },

    // State-Specific Insights
    stateInsights: {
      title: "{state}-Specific Telehealth Insights",
      description: "{state} supports telehealth evaluations under {state_statute}, which permits licensed {state} clinicians to review symptoms and provide guidance or prescriptions when appropriate. Because of {state}'s large size and diverse regions, telehealth is commonly used by residents in both metropolitan and rural areas.",
      regions: {
        title: "Major {state} Regions Commonly Using Telehealth",
        areas: [
          "South {state} (Miami, Fort Lauderdale, West Palm Beach)",
          "Central {state} (Orlando, Kissimmee, Lakeland)",
          "Tampa Bay Region (Tampa, St. Petersburg, Clearwater)",
          "North {state} (Jacksonville, Tallahassee)",
          "Panhandle (Pensacola, Panama City)",
        ],
      },
      pharmacyInfo: {
        title: "{state} Pharmacy Convenience",
        description: "{state}'s statewide network of Publix, CVS, Walgreens, Walmart, and independent pharmacies provides broad access for same-day pickup when a clinician determines treatment is appropriate.",
      },
    },

    // Related Visit Reasons
    relatedReasons: {
      title: "Related Visit Reasons",
      items: [
        "Bacterial Vaginosis (BV)",
        "Yeast Infection",
        "Sinus Infection",
        "Cold / Flu / URI",
        "Medication Refill",
        "Private / Sensitive Visit",
      ],
    },

    // Cities Section
    citiesSection: {
      title: "{state} Cities We Serve",
      subtitle: "Licensed {state} clinicians support adults statewide through secure telehealth. These city pages help patients in major metro areas access private UTI & STD educational information and appointment options.",
    },

    // ZIP Codes Section
    zipSection: {
      title: "{state} ZIP Codes We Support",
      subtitle: "Private telehealth support is available to adults throughout {state}. These ZIP clusters help patients across major regions access UTI & STD education and appointment options closest to their location.",
    },

    // Why Patients Choose Section
    whyChoose: {
      title: "Why {state} Patients Choose This Service",
      subtitle: "Adults across {state} often prefer private telehealth visits for urinary or STD-related concerns. Below are key reasons patients use this service, based on convenience, accessibility, privacy, and statewide clinician availability.",
      reasons: [
        {
          title: "Licensed {state} Clinicians",
          description: "All evaluations are performed by clinicians licensed in the state of {state} and familiar with common primary care concerns handled in virtual settings.",
        },
        {
          title: "No Waiting Rooms",
          description: "Many patients prefer a private, secure online intake rather than traveling to urgent care or sitting in a waiting room for mild or uncomplicated concerns.",
        },
        {
          title: "Same-Day Pharmacy Pickup",
          description: "When clinically appropriate, prescriptions can be electronically transmitted to {state} pharmacies such as Publix, CVS, Walgreens, Walmart, and local locations statewide.",
        },
        {
          title: "Fully Private & Secure",
          description: "All communication is encrypted, and information is handled in accordance with privacy requirements. Many patients prefer online intakes for sensitive concerns.",
        },
        {
          title: "Statewide Availability",
          description: "Telehealth access supports residents across South {state}, Central {state}, Tampa Bay, North {state}, the Panhandle, and rural regions.",
        },
        {
          title: "Insurance Not Required",
          description: "Visits are offered on a self-pay basis, allowing adults to access care without navigating insurance plans or coverage prerequisites.",
        },
      ],
    },

    // Coverage Areas Section
    coverageAreas: {
      title: "{state} Coverage Areas",
      subtitle: "Adults across {state} can access private telehealth evaluation from any region with a reliable connection. These coverage areas reflect common geographic regions and county groupings used by {state} public health and clinic networks.",
      regions: [
        {
          name: "South {state}",
          counties: ["Miami-Dade County", "Broward County", "Palm Beach County"],
        },
        {
          name: "Central {state}",
          counties: ["Orange County", "Osceola County", "Seminole County", "Polk County"],
        },
        {
          name: "Tampa Bay Region",
          counties: ["Hillsborough County", "Pinellas County", "Pasco County"],
        },
        {
          name: "North {state}",
          counties: ["Duval County", "St. Johns County", "Alachua County"],
        },
        {
          name: "{state} Panhandle",
          counties: ["Escambia County", "Santa Rosa County", "Okaloosa County", "Bay County"],
        },
        {
          name: "Gulf Coast",
          counties: ["Sarasota County", "Manatee County", "Lee County", "Collier County"],
        },
      ],
      availabilityNote: "Telehealth evaluations for mild, non-emergent concerns are available during extended daily hours. Exact availability varies based on clinician schedules.",
    },

    // About Clinician Section (Second detailed bio)
    aboutClinician: {
      title: "About Your {state} Clinician",
      name: "LaMonica A. Hodges",
      credentials: "MSN, APRN, FNP-C",
      bio: "LaMonica Hodges is a {state}-licensed Family Nurse Practitioner with more than ten years of clinical experience in primary care, symptom evaluation, women's health, and telehealth communication. Her background includes reviewing common non-emergent concerns such as mild urinary symptoms, general STD exposure questions, medication follow-ups, and everyday primary care issues appropriate for remote assessment.",
      education: {
        title: "Education & Clinical Credentials",
        items: [
          "Master of Science in Nursing (MSN)",
          "Board-Certified Family Nurse Practitioner (FNP-C)",
          "Licensed to practice in the State of {state}",
          "Over 10 years of clinical experience",
        ],
      },
      focus: {
        title: "Professional Focus",
        items: [
          "Evaluation of mild urinary symptoms",
          "General education on common STDs/STIs",
          "Primary care and symptom-based assessments",
          "Telehealth follow-up guidance",
        ],
      },
      telehealth: {
        title: "Telehealth Experience",
        description: "LaMonica incorporates telehealth as part of her broader clinical practice, focusing on secure, patient-centered communication that helps adults across {state} describe symptoms, understand next steps, and determine whether online care is appropriate for their situation.",
      },
      safety: {
        title: "Patient Trust & Safety",
        description: "Every evaluation follows {state} telehealth requirements, including privacy guidelines, professional standards, and secure handling of patient information. All recommendations are based on the symptoms and history provided during the visit.",
      },
      disclaimer: "*This section is for general educational and informational purposes.*",
    },

    // Final CTA Section
    finalCta: {
      ctaButtons: {
        primary: { text: "Start an Instant Visit", icon: "arrow-right" },
        secondary: { text: "Book My Appointment", icon: "calendar" },
      },
      bullets: [
        "HIPAA-Secure Platform",
        "{state}-Licensed Telehealth",
      ],
    },

    // Footer Info
    footer: {
      brandText: "Medazon Health",
      links: [
        { text: "Terms of Service", href: "/terms" },
        { text: "Privacy Policy", href: "/privacy" },
        { text: "HIPAA Notice", href: "/hipaa" },
        { text: "State Licensure", href: "/licensure" },
        { text: "Telehealth Consent", href: "/consent" },
      ],
      copyright: "© Medazon Health — All rights reserved.",
      address: "Licensed {state} Provider · 123 Wellness Blvd · Tampa FL 33602",
      legalNote: "Telehealth authorized under {state_statute}. Services provided via HIPAA-secure telehealth by state-licensed clinicians.",
    },

    priceNote: "$59 per visit — Traditional Insurances Accepted",
  },
};

export const SERVICE_SLUGS = Object.keys(SERVICES);

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return SERVICES[slug.toLowerCase()];
}

// Helper to replace placeholders in content
export function replaceStatePlaceholders(
  content: string,
  stateName: string,
  stateAbbr?: string,
  stateStatute?: string,
  cities?: string[]
): string {
  const citiesStr = cities?.slice(0, 4).join(", ") || "";
  return content
    .replace(/{state}/g, stateName)
    .replace(/{state_abbr}/g, stateAbbr || stateName.substring(0, 2).toUpperCase())
    .replace(/{state_statute}/g, stateStatute || "applicable state telehealth laws")
    .replace(/{cities}/g, citiesStr);
}
