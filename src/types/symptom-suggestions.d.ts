export interface SymptomSuggestion {
  name: string;
  smart_search: string[];
}

declare module "@/data/symptom-suggestions.json" {
  const suggestions: SymptomSuggestion[];
  export default suggestions;
}

