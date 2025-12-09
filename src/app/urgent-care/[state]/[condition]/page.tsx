import ConditionPageTemplate from "@/components/condition/ConditionPageTemplate";
import SchemaBundle from "@/components/condition/SchemaBundle";

import { states } from "@/config/state-config";
import { conditionCards } from "@/config/condition-config";

interface PageProps {
  params: {
    state: string;
    condition: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  // Validate state + condition
  const validState = states[params.state] ? params.state : "florida";
  const validCondition = conditionCards[params.condition]
    ? params.condition
    : "general-symptoms";

  const conditionName = conditionCards[validCondition]?.title || "Condition";
  const stateName = states[validState]?.displayName || validState;

  const pageTitle = `${conditionName} — ${stateName} Telehealth`;
  const description = `Educational telehealth information for ${conditionName.toLowerCase()} for adults located in ${stateName}.`;

  const url = `https://medazonhealth.com/urgent-care/${validState}/${validCondition}`;

  return {
    title: pageTitle,
    description: description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: pageTitle,
      description: description,
      url,
      type: "article"
    },
    twitter: {
      title: pageTitle,
      description
    }
  };
}

export default function Page({ params }: PageProps) {
  const validState = states[params.state] ? params.state : "florida";
  const validCondition = conditionCards[params.condition]
    ? params.condition
    : "general-symptoms";

  const url = `https://medazonhealth.com/urgent-care/${validState}/${validCondition}`;

  return (
    <>
      {/* SEO Structured Data */}
      <SchemaBundle
        state={validState}
        condition={validCondition}
        providerName="LaMonica A. Hodges, MSN, APRN, FNP-C"
        providerCredentials="Board-Certified Family Nurse Practitioner"
        providerAddress="2700 NE 62ND Street, Fort Lauderdale, FL 33308"
        pageUrl={url}
      />

      {/* Main Page Template */}
      <ConditionPageTemplate
        state={validState}
        condition={validCondition}
      />
    </>
  );
}
