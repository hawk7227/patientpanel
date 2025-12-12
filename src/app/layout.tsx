import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Instant Virtual Urgent Care in Florida — Medazon Health",
  description: "Fast, private virtual urgent care in Florida. Licensed clinicians evaluate symptoms for cold/flu, UTI concerns, sinus infections, nausea, rashes, pink eye, allergies, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://medazonhealth.com/urgent-care/florida" />
        <meta name="theme-color" content="#0B0F12" />

        {/* Medical Business (Primary Entity) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          "name": "Medazon Health Urgent Care",
          "url": "https://medazonhealth.com/urgent-care/florida",
          "description": "Florida urgent care telehealth service providing virtual evaluations for mild symptoms such as cold/flu, sinus infections, pink eye, nausea, rashes, and urinary discomfort.",
          "areaServed": "Florida",
          "medicalSpecialty": [
            "UrgentCare",
            "Telemedicine",
            "PrimaryCare"
          ],
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "2700 NE 62ND Street",
            "addressLocality": "Fort Lauderdale",
            "addressRegion": "FL",
            "postalCode": "33308",
            "addressCountry": "US"
          }
        }
        `}} />

        {/* Medical Web Page — Urgent Care Page */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          "name": "Florida Virtual Urgent Care — Medazon Health",
          "url": "https://medazonhealth.com/urgent-care/florida",
          "description": "Educational information about Florida virtual urgent care including symptoms evaluated, care limitations, telehealth workflow, safety guidelines, pharmacy pickup expectations, and regional coverage.",
          "about": [
            { "@type": "MedicalCondition", "name": "Common Cold" },
            { "@type": "MedicalCondition", "name": "Influenza" },
            { "@type": "MedicalCondition", "name": "Urinary Symptoms" },
            { "@type": "MedicalCondition", "name": "Allergies" },
            { "@type": "MedicalCondition", "name": "Sinus Infection" },
            { "@type": "MedicalCondition", "name": "Pink Eye (Conjunctivitis)" },
            { "@type": "MedicalCondition", "name": "Skin Rash" },
            { "@type": "MedicalCondition", "name": "Migraine" },
            { "@type": "MedicalCondition", "name": "Nausea" }
          ],
          "inLanguage": "en-US",
          "publisher": {
            "@type": "Organization",
            "name": "Medazon Health"
          }
        }
        `}} />

        {/* Breadcrumb List — Urgent Care Navigation */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Services", "item": "https://medazonhealth.com/services" },
            { "@type": "ListItem", "position": 2, "name": "Urgent Care", "item": "https://medazonhealth.com/urgent-care" },
            { "@type": "ListItem", "position": 3, "name": "Florida Virtual Urgent Care", "item": "https://medazonhealth.com/urgent-care/florida" }
          ]
        }
        `}} />

        {/* Medical Conditions (Urgent Care Conditions) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        [
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Common Cold",
            "signOrSymptom": ["Runny nose", "Cough", "Sore throat"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Influenza",
            "signOrSymptom": ["Fever", "Body aches", "Chills"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Urinary Symptoms",
            "signOrSymptom": ["Burning urination", "Urinary frequency"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Pink Eye (Conjunctivitis)",
            "signOrSymptom": ["Eye redness", "Discharge", "Itching"]
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalCondition",
            "name": "Skin Rash",
            "signOrSymptom": ["Redness", "Itching", "Irritation"]
          }
        ]
        `}} />

        {/* Medical Procedure — Urgent Care Evaluation */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "MedicalProcedure",
          "name": "Virtual Urgent Care Evaluation",
          "description": "A telehealth review of urgent care symptoms by a clinician licensed in Florida, determining whether virtual care is appropriate or if in-person evaluation is required.",
          "howPerformed": "Symptoms are submitted securely and reviewed by a clinician. Follow-up questions may be asked when needed.",
          "followup": "Advice is provided for in-person care, emergency symptoms, or pharmacy pickup when appropriate."
        }
        `}} />

        {/* Physician — E-E-A-T Boost */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "Physician",
          "name": "LaMonica A. Hodges, MSN, APRN, FNP-C",
          "jobTitle": "Family Nurse Practitioner",
          "description": "Florida-licensed clinician experienced in urgent care telehealth assessments including mild symptoms such as cold, flu, sinus pressure, urinary symptoms, rash, nausea, and pink eye.",
          "medicalSpecialty": [
            "UrgentCare",
            "PrimaryCare",
            "Telemedicine"
          ],
          "worksFor": {
            "@type": "Organization",
            "name": "Medazon Health"
          },
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "2700 NE 62ND Street",
            "addressLocality": "Fort Lauderdale",
            "addressRegion": "FL",
            "addressCountry": "US"
          }
        }
        `}} />

        {/* ItemList — Smart Search Symptom Index */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Urgent Care Symptom Search Index",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "item": "Cold symptoms" },
            { "@type": "ListItem", "position": 2, "item": "Flu symptoms" },
            { "@type": "ListItem", "position": 3, "item": "Sinus infection" },
            { "@type": "ListItem", "position": 4, "item": "Pink eye" },
            { "@type": "ListItem", "position": 5, "item": "Urinary discomfort" },
            { "@type": "ListItem", "position": 6, "item": "Rash or irritation" },
            { "@type": "ListItem", "position": 7, "item": "Migraine" },
            { "@type": "ListItem", "position": 8, "item": "Nausea" }
          ]
        }
        `}} />

        {/* SearchAction — For Symptom Smart Search */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `
        {
          "@context": "https://schema.org",
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://medazonhealth.com/intake?symptom={search_term}"
          },
          "query-input": "required name=search_term"
        }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
