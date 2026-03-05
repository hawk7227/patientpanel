// US States data for service pages
// Content structure based on https://medazonhealth.com/private/uti-std/florida/

export interface StateData {
  slug: string;
  name: string;
  abbreviation: string;
  majorCities: string[];
  zipClusters: Record<string, string[]>;
  pharmacyNote: string;
  teleheathStatute: string;
  coverageRegions: {
    name: string;
    counties: string[];
  }[];
  telehealthRegions: string[];
}

export const STATES: Record<string, StateData> = {
  florida: {
    slug: "florida",
    name: "Florida",
    abbreviation: "FL",
    majorCities: [
      "Miami",
      "Orlando",
      "Tampa",
      "Jacksonville",
      "Fort Lauderdale",
      "St. Petersburg",
      "Tallahassee",
      "Gainesville",
      "Sarasota",
      "Pensacola",
    ],
    zipClusters: {
      Miami: ["33101", "33130", "33147", "33150", "33161"],
      Orlando: ["32801", "32803", "32806", "32811", "32822"],
      Tampa: ["33602", "33603", "33609", "33611", "33629"],
      Jacksonville: ["32202", "32204", "32205", "32207", "32210"],
      "Fort Lauderdale": ["33301", "33304", "33308", "33312", "33316"],
      "St. Petersburg": ["33701", "33704", "33705", "33707", "33713"],
      Tallahassee: ["32301", "32303", "32308", "32311", "32312"],
      Gainesville: ["32601", "32605", "32607", "32608", "32653"],
      Sarasota: ["34231", "34232", "34233", "34234", "34236"],
      Pensacola: ["32501", "32502", "32503", "32504", "32507"],
    },
    pharmacyNote: "Prescriptions can be sent to Publix, CVS, Walgreens, Walmart, or independent Florida pharmacies.",
    teleheathStatute: "Florida Statute § 456.47",
    coverageRegions: [
      {
        name: "South Florida",
        counties: ["Miami-Dade County", "Broward County", "Palm Beach County"],
      },
      {
        name: "Central Florida",
        counties: ["Orange County", "Osceola County", "Seminole County", "Polk County"],
      },
      {
        name: "Tampa Bay Region",
        counties: ["Hillsborough County", "Pinellas County", "Pasco County"],
      },
      {
        name: "North Florida",
        counties: ["Duval County", "St. Johns County", "Alachua County"],
      },
      {
        name: "Florida Panhandle",
        counties: ["Escambia County", "Santa Rosa County", "Okaloosa County", "Bay County"],
      },
      {
        name: "Gulf Coast",
        counties: ["Sarasota County", "Manatee County", "Lee County", "Collier County"],
      },
    ],
    telehealthRegions: [
      "South Florida (Miami, Fort Lauderdale, West Palm Beach)",
      "Central Florida (Orlando, Kissimmee, Lakeland)",
      "Tampa Bay Region (Tampa, St. Petersburg, Clearwater)",
      "North Florida (Jacksonville, Tallahassee)",
      "Panhandle (Pensacola, Panama City)",
    ],
  },
};

export const STATE_SLUGS = Object.keys(STATES);

export function getStateBySlug(slug: string): StateData | undefined {
  return STATES[slug.toLowerCase()];
}
