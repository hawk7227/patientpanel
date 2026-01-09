"use client";

import React from "react";
import { states } from "@/config/state-config";
import { conditionCards } from "@/config/condition-config";

interface SchemaBundleProps {
  state: string;       // "florida"
  condition: string;   // "uti", "rash", etc.
  providerName: string;
  providerCredentials: string;
  providerAddress: string;
  pageUrl: string;     // full canonical URL
}

export default function SchemaBundle({
  state,
  condition,
  providerName,
  providerCredentials,
  providerAddress,
  pageUrl
}: SchemaBundleProps) {

  // ================================
  // LOOKUP STATE + CONDITION DATA
  // ================================
  const stateData = states[state] || states["florida"];
  const card = conditionCards[condition] || conditionCards["general-symptoms"];

  // Example: "Florida Telehealth — Sinus Infection Educational Page"
  const pageTitle = `${stateData.displayName} Telehealth — ${card.title}`;
  const pageDescription = `Educational information about ${card.title.toLowerCase()} for adults located in ${stateData.displayName}.`;

  // Breadcrumbs for rich results
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Urgent Care",
        "item": "https://medazonhealth.com/urgent-care"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": stateData.displayName,
        "item": `https://medazonhealth.com/urgent-care/${state}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": card.title,
        "item": pageUrl
      }
    ]
  };

  // Medical Condition schema (educational only)
  const conditionSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    "name": card.title,
    "description": `General educational information about ${card.title.toLowerCase()}.`,
    "url": pageUrl
  };

  // MedicalWebPage schema
  const medicalWebPageSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": pageTitle,
    "description": pageDescription,
    "about": {
      "@type": "MedicalCondition",
      "name": card.title
    },
    "audience": {
      "@type": "MedicalAudience",
      "audienceType": "Adult"
    },
    "inLanguage": "en-US",
    "mainEntityOfPage": pageUrl,
    "publisher": {
      "@type": "Organization",
      "name": "Medazon Health",
      "url": "https://medazonhealth.com"
    }
  };

  // Provider schema (educational clinician information only)
  const providerSchema = {
    "@context": "https://schema.org",
    "@type": "Physician",
    "name": providerName,
    "medicalSpecialty": "Telemedicine",
    "description": `This clinician reviews adult symptom submissions for ${stateData.displayName} telehealth visits.`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": providerAddress,
      "addressRegion": stateData.displayName,
      "addressCountry": "US"
    },
    "url": "https://medazonhealth.com"
  };

  // Organization schema (Medazon Health identity)
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Medazon Health",
    "url": "https://medazonhealth.com",
    "description": "Privacy-focused telehealth platform for adults located in licensed states.",
    "logo": "https://medazonhealth.com/logo.png"
  };

  // ================================
  // INSERT ALL JSON-LD INTO PAGE
  // ================================
  const jsonSchemas = [
    breadcrumbList,
    conditionSchema,
    medicalWebPageSchema,
    providerSchema,
    orgSchema
  ];

  return (
    <>
      {jsonSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
