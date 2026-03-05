export interface StateConfig {
  name: string;          // short code
  displayName: string;   // human-readable name
  address: string;       // provider business address
  license?: string;      // DEA / state license (optional)
  fallback?: boolean;    // indicates fallback state
}

export const states: Record<string, StateConfig> = {

  // ----------------------------------
  //  STABLE LICENSED ADDRESSES
  // ----------------------------------

  alabama: {
    name: "alabama",
    displayName: "Alabama",
    address: "110 Turpin Vice Rd, Uniontown, AL 36786",
    license: "MH5939042"
  },

  arizona: {
    name: "arizona",
    displayName: "Arizona",
    address: "6040 N Camelback Manor Dr, Paradise Valley, AZ",
    license: "MH5939042"
  },

  colorado: {
    name: "colorado",
    displayName: "Colorado",
    address: "1176 S Fulton St, Denver, CO 80247"
  },

  florida: {
    name: "florida",
    displayName: "Florida",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308"
  },

  georgia: {
    name: "georgia",
    displayName: "Georgia",
    address: "1000 Parkwood Circle SE Suite 900, Atlanta, GA 30339"
  },

  illinois: {
    name: "illinois",
    displayName: "Illinois",
    address: "111 East Maple Street, Cobden, IL 62920"
  },

  michigan: {
    name: "michigan",
    displayName: "Michigan",
    address: "455 E Eisenhower Pkwy Suite 300, Ann Arbor, MI"
  },

  mississippi: {
    name: "mississippi",
    displayName: "Mississippi",
    address: "1440 Hwy 1 South, Greenville, MS 38701"
  },

  oregon: {
    name: "oregon",
    displayName: "Oregon",
    address: "10121 SE Sunnyside Rd Suite 300, Clackamas, OR"
  },

  nevada: {
    name: "nevada",
    displayName: "Nevada",
    address: "304 S Jones Blvd, Las Vegas, NV 89107"
  },

  newmexico: {
    name: "newmexico",
    displayName: "New Mexico",
    address: "4801 Lang Ave NE Unit 100, Cedarvale, NM 87019"
  },

  virginia: {
    name: "virginia",
    displayName: "Virginia",
    address: "11815 Fountain Way Suite 300, Newport News, VA 23606"
  },

  washington: {
    name: "washington",
    displayName: "Washington",
    address: "400 Union Ave SE, Olympia, WA 98501"
  },

  washingtondc: {
    name: "washingtondc",
    displayName: "Washington, DC",
    address: "712 H St NE, Washington, DC 20002"
  },

  utah: {
    name: "utah",
    displayName: "Utah",
    address: "2795 E Cottonwood Parkway Suite 300, Salt Lake City, UT"
  },

  // ----------------------------------
  //  STATES WITHOUT VERIFIED ADDRESS
  //  → USE FLORIDA ADDRESS AS FALLBACK
  // ----------------------------------

  idaho: {
    name: "idaho",
    displayName: "Idaho",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308",
    fallback: true
  },

  northdakota: {
    name: "northdakota",
    displayName: "North Dakota",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308",
    fallback: true
  },

  ohio: {
    name: "ohio",
    displayName: "Ohio",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308",
    fallback: true
  },

  montana: {
    name: "montana",
    displayName: "Montana",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308",
    fallback: true
  },

  southdakota: {
    name: "southdakota",
    displayName: "South Dakota",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308",
    fallback: true
  },

  oklahoma: {
    name: "oklahoma",
    displayName: "Oklahoma",
    address: "2700 NE 62ND Street, Fort Lauderdale, FL 33308",
    fallback: true
  }
};

