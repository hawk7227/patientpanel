import ConditionPageTemplate from "@/components/condition/ConditionPageTemplate";
import { states } from "@/config/state-config";
import { conditionCards } from "@/config/condition-config";

interface PageProps {
  params: {
    state: string;
    condition: string;
  };
}

export function generateMetadata({ params }: PageProps) {
  const validState = states[params.state]
    ? params.state
    : "florida";

  const validCondition = conditionCards[params.condition]
    ? params.condition
    : "general-symptoms";

  const conditionName =
    conditionCards[validCondition]?.title || "Condition";

  const stateName =
    states[validState]?.displayName || validState;

  return {
    title: `${conditionName} Telehealth in ${stateName} — Medazon Health`,
    description: `Private telehealth support for ${conditionName.toLowerCase()} concerns in ${stateName}. Licensed clinicians review self-reported symptoms in a secure and confidential format.`,
    alternates: {
      canonical: `https://medazonhealth.com/urgent-care/${validState}/${validCondition}`,
    },
  };
}

export default function Page({ params }: PageProps) {
  const validState = states[params.state]
    ? params.state
    : "florida";

  const validCondition = conditionCards[params.condition]
    ? params.condition
    : "general-symptoms";

  return (
    <ConditionPageTemplate
      state={validState}
      condition={validCondition}
    />
  );
}
