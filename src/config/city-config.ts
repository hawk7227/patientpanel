export interface CityEntry {
  name: string;
  slug: string;
}

/**
 * CITY LISTS FOR ALL 22 STATES
 * ----------------------------
 * Used in Fold 8 (Cities We Serve).
 * These are purely geographic, educational, and Ads/YMYL-compliant.
 */

export const cityLists: Record<string, CityEntry[]> = {

  // -------------------------
  // ALABAMA
  // -------------------------
  alabama: [
    { name: "Birmingham", slug: "birmingham" },
    { name: "Montgomery", slug: "montgomery" },
    { name: "Mobile", slug: "mobile" },
    { name: "Huntsville", slug: "huntsville" },
    { name: "Tuscaloosa", slug: "tuscaloosa" },
    { name: "Auburn", slug: "auburn" }
  ],

  // -------------------------
  // ARIZONA
  // -------------------------
  arizona: [
    { name: "Phoenix", slug: "phoenix" },
    { name: "Tucson", slug: "tucson" },
    { name: "Mesa", slug: "mesa" },
    { name: "Chandler", slug: "chandler" },
    { name: "Gilbert", slug: "gilbert" },
    { name: "Scottsdale", slug: "scottsdale" }
  ],

  // -------------------------
  // COLORADO
  // -------------------------
  colorado: [
    { name: "Denver", slug: "denver" },
    { name: "Colorado Springs", slug: "colorado-springs" },
    { name: "Aurora", slug: "aurora" },
    { name: "Fort Collins", slug: "fort-collins" },
    { name: "Lakewood", slug: "lakewood" }
  ],

  // -------------------------
  // DELAWARE
  // -------------------------
  delaware: [
    { name: "Wilmington", slug: "wilmington" },
    { name: "Dover", slug: "dover" },
    { name: "Newark", slug: "newark" }
  ],

  // -------------------------
  // FLORIDA
  // -------------------------
  florida: [
    { name: "Miami", slug: "miami" },
    { name: "Orlando", slug: "orlando" },
    { name: "Tampa", slug: "tampa" },
    { name: "Jacksonville", slug: "jacksonville" },
    { name: "Fort Lauderdale", slug: "fort-lauderdale" },
    { name: "St. Petersburg", slug: "st-petersburg" },
    { name: "Tallahassee", slug: "tallahassee" },
    { name: "Gainesville", slug: "gainesville" },
    { name: "Pensacola", slug: "pensacola" }
  ],

  // -------------------------
  // GEORGIA
  // -------------------------
  georgia: [
    { name: "Atlanta", slug: "atlanta" },
    { name: "Savannah", slug: "savannah" },
    { name: "Augusta", slug: "augusta" },
    { name: "Columbus", slug: "columbus" },
    { name: "Macon", slug: "macon" }
  ],

  // -------------------------
  // IDAHO
  // -------------------------
  idaho: [
    { name: "Boise", slug: "boise" },
    { name: "Meridian", slug: "meridian" },
    { name: "Nampa", slug: "nampa" }
  ],

  // -------------------------
  // ILLINOIS
  // -------------------------
  illinois: [
    { name: "Chicago", slug: "chicago" },
    { name: "Aurora", slug: "aurora" },
    { name: "Naperville", slug: "naperville" },
    { name: "Joliet", slug: "joliet" }
  ],

  // -------------------------
  // MICHIGAN
  // -------------------------
  michigan: [
    { name: "Detroit", slug: "detroit" },
    { name: "Grand Rapids", slug: "grand-rapids" },
    { name: "Ann Arbor", slug: "ann-arbor" },
    { name: "Lansing", slug: "lansing" }
  ],

  // -------------------------
  // MISSISSIPPI
  // -------------------------
  mississippi: [
    { name: "Jackson", slug: "jackson" },
    { name: "Gulfport", slug: "gulfport" },
    { name: "Hattiesburg", slug: "hattiesburg" }
  ],

  // -------------------------
  // NEVADA
  // -------------------------
  nevada: [
    { name: "Las Vegas", slug: "las-vegas" },
    { name: "Henderson", slug: "henderson" },
    { name: "Reno", slug: "reno" }
  ],

  // -------------------------
  // NEW MEXICO
  // -------------------------
  newmexico: [
    { name: "Albuquerque", slug: "albuquerque" },
    { name: "Santa Fe", slug: "santa-fe" },
    { name: "Las Cruces", slug: "las-cruces" }
  ],

  // -------------------------
  // NORTH DAKOTA
  // -------------------------
  northdakota: [
    { name: "Fargo", slug: "fargo" },
    { name: "Bismarck", slug: "bismarck" },
    { name: "Grand Forks", slug: "grand-forks" }
  ],

  // -------------------------
  // OHIO
  // -------------------------
  ohio: [
    { name: "Columbus", slug: "columbus" },
    { name: "Cleveland", slug: "cleveland" },
    { name: "Cincinnati", slug: "cincinnati" },
    { name: "Toledo", slug: "toledo" }
  ],

  // -------------------------
  // OREGON
  // -------------------------
  oregon: [
    { name: "Portland", slug: "portland" },
    { name: "Eugene", slug: "eugene" },
    { name: " Salem", slug: "salem" }
  ],

  // -------------------------
  // UTAH
  // -------------------------
  utah: [
    { name: "Salt Lake City", slug: "salt-lake-city" },
    { name: "Provo", slug: "provo" },
    { name: "Ogden", slug: "ogden" }
  ],

  // -------------------------
  // VIRGINIA
  // -------------------------
  virginia: [
    { name: "Virginia Beach", slug: "virginia-beach" },
    { name: "Richmond", slug: "richmond" },
    { name: "Norfolk", slug: "norfolk" },
    { name: "Newport News", slug: "newport-news" }
  ],

  // -------------------------
  // WASHINGTON
  // -------------------------
  washington: [
    { name: "Seattle", slug: "seattle" },
    { name: "Spokane", slug: "spokane" },
    { name: "Tacoma", slug: "tacoma" }
  ],

  // -------------------------
  // WASHINGTON, DC
  // -------------------------
  washingtondc: [
    { name: "Washington, DC", slug: "washington-dc" },
    { name: "Georgetown", slug: "georgetown" },
    { name: "Capitol Hill", slug: "capitol-hill" }
  ],

  // -------------------------
  // MONTANA
  // -------------------------
  montana: [
    { name: "Billings", slug: "billings" },
    { name: "Missoula", slug: "missoula" },
    { name: "Bozeman", slug: "bozeman" }
  ],

  // -------------------------
  // SOUTH DAKOTA
  // -------------------------
  southdakota: [
    { name: "Sioux Falls", slug: "sioux-falls" },
    { name: "Rapid City", slug: "rapid-city" },
    { name: "Aberdeen", slug: "aberdeen" }
  ],

  // -------------------------
  // OKLAHOMA
  // -------------------------
  oklahoma: [
    { name: "Oklahoma City", slug: "oklahoma-city" },
    { name: "Tulsa", slug: "tulsa" },
    { name: "Norman", slug: "norman" }
  ]
};
