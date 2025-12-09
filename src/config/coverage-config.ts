export interface CoverageRegion {
  region: string;
  counties: string[];
}

/**
 * STATE COVERAGE REGIONS (ALL 22 STATES)
 * ---------------------------------------
 * These county groupings are educational geographic clusters.
 * They do NOT indicate service guarantees. Purely informational.
 */

export const coverageByState: Record<string, CoverageRegion[]> = {

  // --------------------------------------------------
  // ALABAMA
  // --------------------------------------------------
  alabama: [
    { region: "Northern Alabama", counties: ["Madison County", "Limestone County", "Morgan County"] },
    { region: "Central Alabama", counties: ["Jefferson County", "Shelby County", "St. Clair County"] },
    { region: "Southern Alabama", counties: ["Mobile County", "Baldwin County"] }
  ],

  // --------------------------------------------------
  // ARIZONA
  // --------------------------------------------------
  arizona: [
    { region: "Central Arizona", counties: ["Maricopa County", "Pinal County"] },
    { region: "Southern Arizona", counties: ["Pima County", "Santa Cruz County"] },
    { region: "Northern Arizona", counties: ["Coconino County", "Yavapai County"] }
  ],

  // --------------------------------------------------
  // COLORADO
  // --------------------------------------------------
  colorado: [
    { region: "Front Range", counties: ["Denver County", "Arapahoe County", "Jefferson County"] },
    { region: "Northern Colorado", counties: ["Larimer County", "Weld County"] },
    { region: "Southern Colorado", counties: ["El Paso County", "Pueblo County"] }
  ],

  // --------------------------------------------------
  // DELAWARE
  // --------------------------------------------------
  delaware: [
    { region: "New Castle Region", counties: ["New Castle County"] },
    { region: "Central Region", counties: ["Kent County"] },
    { region: "Southern Region", counties: ["Sussex County"] }
  ],

  // --------------------------------------------------
  // FLORIDA
  // --------------------------------------------------
  florida: [
    { region: "South Florida", counties: ["Miami-Dade County", "Broward County", "Palm Beach County"] },
    { region: "Central Florida", counties: ["Orange County", "Osceola County", "Seminole County"] },
    { region: "Tampa Bay Area", counties: ["Hillsborough County", "Pinellas County", "Pasco County"] },
    { region: "North Florida", counties: ["Duval County", "St. Johns County", "Alachua County"] },
    { region: "Panhandle", counties: ["Escambia County", "Santa Rosa County", "Okaloosa County", "Bay County"] }
  ],

  // --------------------------------------------------
  // GEORGIA
  // --------------------------------------------------
  georgia: [
    { region: "Metro Atlanta", counties: ["Fulton County", "Cobb County", "Gwinnett County"] },
    { region: "Coastal Georgia", counties: ["Chatham County", "Glynn County"] },
    { region: "Southern Georgia", counties: ["Lowndes County", "Dougherty County"] }
  ],

  // --------------------------------------------------
  // IDAHO
  // --------------------------------------------------
  idaho: [
    { region: "Southwest Idaho", counties: ["Ada County", "Canyon County"] },
    { region: "Eastern Idaho", counties: ["Bonneville County", "Bannock County"] }
  ],

  // --------------------------------------------------
  // ILLINOIS
  // --------------------------------------------------
  illinois: [
    { region: "Chicagoland", counties: ["Cook County", "DuPage County", "Lake County"] },
    { region: "Central Illinois", counties: ["Sangamon County", "McLean County"] },
    { region: "Southern Illinois", counties: ["Jackson County", "Williamson County"] }
  ],

  // --------------------------------------------------
  // MICHIGAN
  // --------------------------------------------------
  michigan: [
    { region: "Southeast Michigan", counties: ["Wayne County", "Oakland County", "Washtenaw County"] },
    { region: "West Michigan", counties: ["Kent County", "Ottawa County"] },
    { region: "Mid-Michigan", counties: ["Ingham County", "Clinton County"] }
  ],

  // --------------------------------------------------
  // MISSISSIPPI
  // --------------------------------------------------
  mississippi: [
    { region: "Central Mississippi", counties: ["Hinds County", "Rankin County"] },
    { region: "Southern Mississippi", counties: ["Harrison County", "Jackson County"] },
    { region: "Delta Region", counties: ["Washington County", "Bolivar County"] }
  ],

  // --------------------------------------------------
  // NEVADA
  // --------------------------------------------------
  nevada: [
    { region: "Southern Nevada", counties: ["Clark County"] },
    { region: "Northern Nevada", counties: ["Washoe County"] }
  ],

  // --------------------------------------------------
  // NEW MEXICO
  // --------------------------------------------------
  newmexico: [
    { region: "Central New Mexico", counties: ["Bernalillo County", "Sandoval County"] },
    { region: "Northern New Mexico", counties: ["Santa Fe County", "Los Alamos County"] }
  ],

  // --------------------------------------------------
  // NORTH DAKOTA
  // --------------------------------------------------
  northdakota: [
    { region: "Eastern North Dakota", counties: ["Cass County"] },
    { region: "Central North Dakota", counties: ["Burleigh County"] }
  ],

  // --------------------------------------------------
  // OHIO
  // --------------------------------------------------
  ohio: [
    { region: "Central Ohio", counties: ["Franklin County", "Delaware County"] },
    { region: "Northeast Ohio", counties: ["Cuyahoga County", "Lake County"] },
    { region: "Southwest Ohio", counties: ["Hamilton County"] }
  ],

  // --------------------------------------------------
  // OREGON
  // --------------------------------------------------
  oregon: [
    { region: "Portland Metro", counties: ["Multnomah County", "Washington County", "Clackamas County"] },
    { region: "Willamette Valley", counties: ["Marion County", "Linn County"] }
  ],

  // --------------------------------------------------
  // UTAH
  // --------------------------------------------------
  utah: [
    { region: "Wasatch Front", counties: ["Salt Lake County", "Utah County", "Davis County"] },
    { region: "Southern Utah", counties: ["Washington County"] }
  ],

  // --------------------------------------------------
  // VIRGINIA
  // --------------------------------------------------
  virginia: [
    { region: "Hampton Roads", counties: ["Virginia Beach", "Norfolk", "Newport News"] },
    { region: "Central Virginia", counties: ["Richmond City", "Henrico County"] },
    { region: "Northern Virginia", counties: ["Fairfax County", "Loudoun County"] }
  ],

  // --------------------------------------------------
  // WASHINGTON
  // --------------------------------------------------
  washington: [
    { region: "Western Washington", counties: ["King County", "Pierce County"] },
    { region: "Eastern Washington", counties: ["Spokane County"] }
  ],

  // --------------------------------------------------
  // WASHINGTON, DC
  // --------------------------------------------------
  washingtondc: [
    { region: "District Core", counties: ["Ward 1", "Ward 2", "Ward 6"] }
  ],

  // --------------------------------------------------
  // MONTANA
  // --------------------------------------------------
  montana: [
    { region: "South-Central Montana", counties: ["Yellowstone County"] },
    { region: "Western Montana", counties: ["Missoula County"] }
  ],

  // --------------------------------------------------
  // SOUTH DAKOTA
  // --------------------------------------------------
  southdakota: [
    { region: "Eastern South Dakota", counties: ["Minnehaha County", "Lincoln County"] },
    { region: "Western South Dakota", counties: ["Pennington County"] }
  ],

  // --------------------------------------------------
  // OKLAHOMA
  // --------------------------------------------------
  oklahoma: [
    { region: "Central Oklahoma", counties: ["Oklahoma County", "Cleveland County"] },
    { region: "Northeast Oklahoma", counties: ["Tulsa County"] }
  ]
};
