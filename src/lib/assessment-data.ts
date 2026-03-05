// src/lib/assessment-data.ts

export const STATE_CONFIG: Record<string, any> = {
    alabama: {
      name: 'Alabama',
      abbrev: 'AL',
      timezone: 'America/Chicago',
      timezoneAbbrev: 'CT',
      cities: 'Birmingham, Montgomery, Mobile & Huntsville',
      citiesArray: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa', 'Hoover', 'Dothan', 'Auburn'],
      regions: [{name: 'North Alabama', counties: 'Madison, Limestone, Morgan'}, {name: 'Central Alabama', counties: 'Jefferson, Shelby, Tuscaloosa'}, {name: 'South Alabama', counties: 'Mobile, Baldwin, Houston'}],
      zips: [{city: 'Birmingham', codes: ['35201', '35203', '35205']}, {city: 'Montgomery', codes: ['36101', '36104', '36106']}, {city: 'Mobile', codes: ['36601', '36602', '36604']}]
    },
    arizona: {
      name: 'Arizona',
      abbrev: 'AZ',
      timezone: 'America/Phoenix',
      timezoneAbbrev: 'MST',
      cities: 'Phoenix, Tucson, Mesa & Scottsdale',
      citiesArray: ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Chandler', 'Gilbert', 'Glendale', 'Tempe'],
      regions: [{name: 'Phoenix Metro', counties: 'Maricopa County'}, {name: 'Tucson Area', counties: 'Pima County'}, {name: 'Northern Arizona', counties: 'Coconino, Yavapai'}],
      zips: [{city: 'Phoenix', codes: ['85001', '85003', '85004']}, {city: 'Tucson', codes: ['85701', '85702', '85705']}, {city: 'Mesa', codes: ['85201', '85202', '85203']}]
    },
    colorado: {
      name: 'Colorado',
      abbrev: 'CO',
      timezone: 'America/Denver',
      timezoneAbbrev: 'MT',
      cities: 'Denver, Colorado Springs, Aurora & Fort Collins',
      citiesArray: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Boulder'],
      regions: [{name: 'Denver Metro', counties: 'Denver, Arapahoe, Adams'}, {name: 'Front Range', counties: 'El Paso, Larimer, Boulder'}, {name: 'Western Slope', counties: 'Mesa, Garfield, Eagle'}],
      zips: [{city: 'Denver', codes: ['80201', '80202', '80203']}, {city: 'Colorado Springs', codes: ['80901', '80903', '80904']}, {city: 'Aurora', codes: ['80010', '80011', '80012']}]
    },
    delaware: {
      name: 'Delaware',
      abbrev: 'DE',
      timezone: 'America/New_York',
      timezoneAbbrev: 'ET',
      cities: 'Wilmington, Dover, Newark & Middletown',
      citiesArray: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Bear', 'Glasgow', 'Brookside', 'Hockessin'],
      regions: [{name: 'Northern Delaware', counties: 'New Castle County'}, {name: 'Central Delaware', counties: 'Kent County'}, {name: 'Southern Delaware', counties: 'Sussex County'}],
      zips: [{city: 'Wilmington', codes: ['19801', '19802', '19803']}, {city: 'Dover', codes: ['19901', '19904']}, {city: 'Newark', codes: ['19711', '19713']}]
    },
    florida: {
      name: 'Florida',
      abbrev: 'FL',
      timezone: 'America/New_York',
      timezoneAbbrev: 'ET',
      cities: 'Tampa, Miami, Orlando & Jacksonville',
      citiesArray: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg', 'Tallahassee', 'Gainesville', 'Sarasota', 'Pensacola', 'West Palm Beach'],
      regions: [{name: 'South Florida', counties: 'Miami-Dade, Broward, Palm Beach'}, {name: 'Central Florida', counties: 'Orange, Osceola, Seminole, Polk'}, {name: 'Tampa Bay', counties: 'Hillsborough, Pinellas, Pasco'}, {name: 'North Florida', counties: 'Duval, St. Johns, Alachua'}, {name: 'Panhandle', counties: 'Escambia, Santa Rosa, Okaloosa'}, {name: 'Gulf Coast', counties: 'Sarasota, Manatee, Lee, Collier'}],
      zips: [{city: 'Miami', codes: ['33101', '33130', '33147']}, {city: 'Orlando', codes: ['32801', '32803', '32806']}, {city: 'Tampa', codes: ['33602', '33603', '33609']}, {city: 'Jacksonville', codes: ['32202', '32204', '32205']}, {city: 'Fort Lauderdale', codes: ['33301', '33304', '33308']}]
    },
    georgia: {
      name: 'Georgia',
      abbrev: 'GA',
      timezone: 'America/New_York',
      timezoneAbbrev: 'ET',
      cities: 'Atlanta, Savannah, Augusta & Macon',
      citiesArray: ['Atlanta', 'Savannah', 'Augusta', 'Macon', 'Columbus', 'Athens', 'Sandy Springs', 'Roswell'],
      regions: [{name: 'Metro Atlanta', counties: 'Fulton, DeKalb, Cobb, Gwinnett'}, {name: 'Coastal Georgia', counties: 'Chatham, Glynn, Camden'}, {name: 'Central Georgia', counties: 'Bibb, Houston, Richmond'}],
      zips: [{city: 'Atlanta', codes: ['30301', '30303', '30305']}, {city: 'Savannah', codes: ['31401', '31404', '31405']}, {city: 'Augusta', codes: ['30901', '30904', '30906']}]
    },
    idaho: {
      name: 'Idaho',
      abbrev: 'ID',
      timezone: 'America/Boise',
      timezoneAbbrev: 'MT',
      cities: 'Boise, Meridian, Nampa & Idaho Falls',
      citiesArray: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Caldwell', 'Pocatello', 'Coeur d\'Alene', 'Twin Falls'],
      regions: [{name: 'Treasure Valley', counties: 'Ada, Canyon'}, {name: 'North Idaho', counties: 'Kootenai, Bonner'}, {name: 'Eastern Idaho', counties: 'Bonneville, Bannock'}],
      zips: [{city: 'Boise', codes: ['83701', '83702', '83703']}, {city: 'Idaho Falls', codes: ['83401', '83402', '83404']}, {city: 'Meridian', codes: ['83642', '83646']}]
    },
    illinois: {
      name: 'Illinois',
      abbrev: 'IL',
      timezone: 'America/Chicago',
      timezoneAbbrev: 'CT',
      cities: 'Chicago, Aurora, Naperville & Rockford',
      citiesArray: ['Chicago', 'Aurora', 'Naperville', 'Rockford', 'Joliet', 'Springfield', 'Peoria', 'Elgin'],
      regions: [{name: 'Chicago Metro', counties: 'Cook, DuPage, Lake, Will'}, {name: 'Central Illinois', counties: 'Sangamon, McLean, Peoria'}, {name: 'Southern Illinois', counties: 'St. Clair, Madison, Jackson'}],
      zips: [{city: 'Chicago', codes: ['60601', '60602', '60603']}, {city: 'Aurora', codes: ['60502', '60503', '60504']}, {city: 'Springfield', codes: ['62701', '62702', '62703']}]
    },
    michigan: {
      name: 'Michigan',
      abbrev: 'MI',
      timezone: 'America/Detroit',
      timezoneAbbrev: 'ET',
      cities: 'Detroit, Grand Rapids, Ann Arbor & Lansing',
      citiesArray: ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing', 'Flint', 'Dearborn', 'Warren', 'Sterling Heights'],
      regions: [{name: 'Southeast Michigan', counties: 'Wayne, Oakland, Macomb'}, {name: 'West Michigan', counties: 'Kent, Ottawa, Muskegon'}, {name: 'Mid-Michigan', counties: 'Ingham, Genesee, Washtenaw'}],
      zips: [{city: 'Detroit', codes: ['48201', '48202', '48203']}, {city: 'Grand Rapids', codes: ['49501', '49503', '49504']}, {city: 'Ann Arbor', codes: ['48103', '48104', '48105']}]
    },
    mississippi: {
      name: 'Mississippi',
      abbrev: 'MS',
      timezone: 'America/Chicago',
      timezoneAbbrev: 'CT',
      cities: 'Jackson, Gulfport, Southaven & Biloxi',
      citiesArray: ['Jackson', 'Gulfport', 'Southaven', 'Biloxi', 'Hattiesburg', 'Olive Branch', 'Tupelo', 'Meridian'],
      regions: [{name: 'Central Mississippi', counties: 'Hinds, Rankin, Madison'}, {name: 'Gulf Coast', counties: 'Harrison, Jackson, Hancock'}, {name: 'North Mississippi', counties: 'DeSoto, Lee, Lowndes'}],
      zips: [{city: 'Jackson', codes: ['39201', '39202', '39203']}, {city: 'Gulfport', codes: ['39501', '39503', '39507']}, {city: 'Biloxi', codes: ['39530', '39531', '39532']}]
    },
    montana: {
      name: 'Montana',
      abbrev: 'MT',
      timezone: 'America/Denver',
      timezoneAbbrev: 'MT',
      cities: 'Billings, Missoula, Great Falls & Bozeman',
      citiesArray: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena', 'Kalispell', 'Havre'],
      regions: [{name: 'South Central', counties: 'Yellowstone, Gallatin'}, {name: 'Western Montana', counties: 'Missoula, Flathead, Lewis and Clark'}, {name: 'North Central', counties: 'Cascade, Hill'}],
      zips: [{city: 'Billings', codes: ['59101', '59102', '59105']}, {city: 'Missoula', codes: ['59801', '59802', '59803']}, {city: 'Great Falls', codes: ['59401', '59404', '59405']}]
    },
    nevada: {
      name: 'Nevada',
      abbrev: 'NV',
      timezone: 'America/Los_Angeles',
      timezoneAbbrev: 'PT',
      cities: 'Las Vegas, Henderson, Reno & North Las Vegas',
      citiesArray: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City', 'Fernley', 'Elko'],
      regions: [{name: 'Southern Nevada', counties: 'Clark County'}, {name: 'Northern Nevada', counties: 'Washoe County'}, {name: 'Rural Nevada', counties: 'Elko, Lyon, Carson City'}],
      zips: [{city: 'Las Vegas', codes: ['89101', '89102', '89104']}, {city: 'Henderson', codes: ['89002', '89011', '89012']}, {city: 'Reno', codes: ['89501', '89502', '89503']}]
    },
    newmexico: {
      name: 'New Mexico',
      abbrev: 'NM',
      timezone: 'America/Denver',
      timezoneAbbrev: 'MT',
      cities: 'Albuquerque, Las Cruces, Rio Rancho & Santa Fe',
      citiesArray: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington', 'Clovis', 'Hobbs'],
      regions: [{name: 'Central New Mexico', counties: 'Bernalillo, Sandoval, Valencia'}, {name: 'Southern New Mexico', counties: 'Doña Ana, Otero, Chaves'}, {name: 'Northern New Mexico', counties: 'Santa Fe, San Juan, Rio Arriba'}],
      zips: [{city: 'Albuquerque', codes: ['87101', '87102', '87104']}, {city: 'Las Cruces', codes: ['88001', '88005', '88011']}, {city: 'Santa Fe', codes: ['87501', '87505', '87507']}]
    },
    northdakota: {
      name: 'North Dakota',
      abbrev: 'ND',
      timezone: 'America/Chicago',
      timezoneAbbrev: 'CT',
      cities: 'Fargo, Bismarck, Grand Forks & Minot',
      citiesArray: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston', 'Dickinson', 'Mandan'],
      regions: [{name: 'Eastern North Dakota', counties: 'Cass, Grand Forks'}, {name: 'Central North Dakota', counties: 'Burleigh, Ward'}, {name: 'Western North Dakota', counties: 'Williams, Stark'}],
      zips: [{city: 'Fargo', codes: ['58102', '58103', '58104']}, {city: 'Bismarck', codes: ['58501', '58503', '58504']}, {city: 'Grand Forks', codes: ['58201', '58202', '58203']}]
    },
    ohio: {
      name: 'Ohio',
      abbrev: 'OH',
      timezone: 'America/New_York',
      timezoneAbbrev: 'ET',
      cities: 'Columbus, Cleveland, Cincinnati & Toledo',
      citiesArray: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton'],
      regions: [{name: 'Central Ohio', counties: 'Franklin, Delaware, Licking'}, {name: 'Northeast Ohio', counties: 'Cuyahoga, Summit, Stark'}, {name: 'Southwest Ohio', counties: 'Hamilton, Montgomery, Butler'}],
      zips: [{city: 'Columbus', codes: ['43201', '43202', '43204']}, {city: 'Cleveland', codes: ['44101', '44102', '44103']}, {city: 'Cincinnati', codes: ['45201', '45202', '45203']}]
    },
    oklahoma: {
      name: 'Oklahoma',
      abbrev: 'OK',
      timezone: 'America/Chicago',
      timezoneAbbrev: 'CT',
      cities: 'Oklahoma City, Tulsa, Norman & Broken Arrow',
      citiesArray: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Moore', 'Midwest City'],
      regions: [{name: 'Central Oklahoma', counties: 'Oklahoma, Cleveland, Canadian'}, {name: 'Northeast Oklahoma', counties: 'Tulsa, Rogers, Wagoner'}, {name: 'Southwest Oklahoma', counties: 'Comanche, Grady'}],
      zips: [{city: 'Oklahoma City', codes: ['73101', '73102', '73103']}, {city: 'Tulsa', codes: ['74101', '74103', '74104']}, {city: 'Norman', codes: ['73069', '73071', '73072']}]
    },
    oregon: {
      name: 'Oregon',
      abbrev: 'OR',
      timezone: 'America/Los_Angeles',
      timezoneAbbrev: 'PT',
      cities: 'Portland, Salem, Eugene & Gresham',
      citiesArray: ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton', 'Bend', 'Medford'],
      regions: [{name: 'Portland Metro', counties: 'Multnomah, Washington, Clackamas'}, {name: 'Willamette Valley', counties: 'Marion, Lane, Linn'}, {name: 'Southern Oregon', counties: 'Jackson, Josephine, Douglas'}],
      zips: [{city: 'Portland', codes: ['97201', '97202', '97203']}, {city: 'Salem', codes: ['97301', '97302', '97303']}, {city: 'Eugene', codes: ['97401', '97402', '97403']}]
    },
    southdakota: {
      name: 'South Dakota',
      abbrev: 'SD',
      timezone: 'America/Chicago',
      timezoneAbbrev: 'CT',
      cities: 'Sioux Falls, Rapid City, Aberdeen & Brookings',
      citiesArray: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre'],
      regions: [{name: 'Southeast South Dakota', counties: 'Minnehaha, Lincoln'}, {name: 'Western South Dakota', counties: 'Pennington, Meade'}, {name: 'Northeast South Dakota', counties: 'Brown, Codington'}],
      zips: [{city: 'Sioux Falls', codes: ['57101', '57103', '57104']}, {city: 'Rapid City', codes: ['57701', '57702', '57703']}, {city: 'Aberdeen', codes: ['57401', '57402']}]
    },
    utah: {
      name: 'Utah',
      abbrev: 'UT',
      timezone: 'America/Denver',
      timezoneAbbrev: 'MT',
      cities: 'Salt Lake City, West Valley City, Provo & West Jordan',
      citiesArray: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'Ogden', 'St. George'],
      regions: [{name: 'Wasatch Front', counties: 'Salt Lake, Utah, Davis, Weber'}, {name: 'Southern Utah', counties: 'Washington, Iron'}, {name: 'Northern Utah', counties: 'Cache, Box Elder'}],
      zips: [{city: 'Salt Lake City', codes: ['84101', '84102', '84103']}, {city: 'Provo', codes: ['84601', '84604', '84606']}, {city: 'Ogden', codes: ['84401', '84403', '84404']}]
    },
    virginia: {
      name: 'Virginia',
      abbrev: 'VA',
      timezone: 'America/New_York',
      timezoneAbbrev: 'ET',
      cities: 'Virginia Beach, Norfolk, Chesapeake & Richmond',
      citiesArray: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton', 'Roanoke'],
      regions: [{name: 'Hampton Roads', counties: 'Virginia Beach, Norfolk, Chesapeake'}, {name: 'Northern Virginia', counties: 'Fairfax, Arlington, Loudoun'}, {name: 'Central Virginia', counties: 'Richmond City, Henrico, Chesterfield'}],
      zips: [{city: 'Virginia Beach', codes: ['23451', '23452', '23453']}, {city: 'Norfolk', codes: ['23501', '23502', '23503']}, {city: 'Richmond', codes: ['23219', '23220', '23221']}]
    },
    washington: {
      name: 'Washington',
      abbrev: 'WA',
      timezone: 'America/Los_Angeles',
      timezoneAbbrev: 'PT',
      cities: 'Seattle, Spokane, Tacoma & Vancouver',
      citiesArray: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton'],
      regions: [{name: 'Puget Sound', counties: 'King, Pierce, Snohomish'}, {name: 'Eastern Washington', counties: 'Spokane, Yakima, Benton'}, {name: 'Southwest Washington', counties: 'Clark, Cowlitz, Lewis'}],
      zips: [{city: 'Seattle', codes: ['98101', '98102', '98103']}, {city: 'Spokane', codes: ['99201', '99202', '99203']}, {city: 'Tacoma', codes: ['98401', '98402', '98403']}]
    },
    dc: {
      name: 'Washington, DC',
      abbrev: 'DC',
      timezone: 'America/New_York',
      timezoneAbbrev: 'ET',
      cities: 'Washington, DC Metro Area',
      citiesArray: ['Downtown DC', 'Capitol Hill', 'Georgetown', 'Dupont Circle', 'Adams Morgan', 'U Street', 'Navy Yard', 'Foggy Bottom'],
      regions: [{name: 'Northwest DC', counties: 'Georgetown, Dupont, Adams Morgan'}, {name: 'Northeast DC', counties: 'Capitol Hill, H Street'}, {name: 'Southwest/Southeast DC', counties: 'Navy Yard, Anacostia, Capitol Riverfront'}],
      zips: [{city: 'Downtown', codes: ['20001', '20002', '20003']}, {city: 'Northwest', codes: ['20007', '20008', '20009']}, {city: 'Northeast', codes: ['20017', '20018', '20019']}]
    }
  };
  
  export const FAQS = [
    { q: "Is the health assessment really free?", a: "Yes, completely free! Our AI-powered assessment helps you understand your symptoms. You only pay if you decide to book a visit with our provider." },
    { q: "How long does the assessment take?", a: "About 2 minutes. Just chat with our AI about what's bothering you, and you'll get personalized guidance on next steps." },
    { q: "Is my information kept private?", a: "Absolutely. All conversations are encrypted and HIPAA-compliant. Nothing goes on insurance records." },
    { q: "What conditions can you help with?", a: "We treat 50+ conditions including UTI, anxiety, depression, weight loss, skin issues, STD testing, erectile dysfunction, and more." },
    { q: "How much does a visit cost?", a: "All visits are $189 for a full private consultation. This includes video visits, phone calls, or asynchronous options." },
    { q: "Do I need to be on video?", a: "No! We offer multiple visit types including phone calls and our 'Get Seen Without Being Seen' asynchronous option." }
  ];
  
  export const CONDITIONS_LIST = [
    { id: 'uti', label: 'UTIs', color: 'red' },
    { id: 'weight-loss', label: 'Weight Loss', color: 'teal' },
    { id: 'anxiety', label: 'Anxiety', color: 'purple' },
    { id: 'depression', label: 'Depression', color: 'indigo' },
    { id: 'cold-flu', label: 'Cold & Flu', color: 'blue' },
    { id: 'skin', label: 'Skin Issues', color: 'yellow' },
    { id: 'std', label: 'STD Testing', color: 'pink' },
    { id: 'ed', label: 'Erectile Dysfunction', color: 'orange' },
    { id: 'birth-control', label: 'Birth Control', color: 'rose' },
    { id: 'hair-loss', label: 'Hair Loss', color: 'amber' },
    { id: 'allergies', label: 'Allergies', color: 'green' },
    { id: 'sinus', label: 'Sinus Infections', color: 'cyan' },
  ];
  
  export const EXPANDED_CONDITIONS = [
    { id: 'bronchitis', label: 'Bronchitis', color: 'blue' },
    { id: 'strep', label: 'Strep Throat', color: 'red' },
    { id: 'ear-infection', label: 'Ear Infections', color: 'orange' },
    { id: 'pink-eye', label: 'Pink Eye', color: 'pink' },
    { id: 'cough', label: 'Cough', color: 'cyan' },
    { id: 'sore-throat', label: 'Sore Throat', color: 'amber' },
    { id: 'semaglutide', label: 'Semaglutide', color: 'teal' },
    { id: 'tirzepatide', label: 'Tirzepatide', color: 'green' },
    { id: 'stress', label: 'Stress', color: 'purple' },
    { id: 'insomnia', label: 'Insomnia', color: 'indigo' },
    { id: 'acne', label: 'Acne', color: 'yellow' },
    { id: 'eczema', label: 'Eczema', color: 'orange' },
    { id: 'psoriasis', label: 'Psoriasis', color: 'amber' },
    { id: 'rashes', label: 'Rashes', color: 'red' },
    { id: 'cold-sores', label: 'Cold Sores', color: 'rose' },
    { id: 'shingles', label: 'Shingles', color: 'pink' },
    { id: 'hives', label: 'Hives', color: 'purple' },
    { id: 'athletes-foot', label: 'Athlete\'s Foot', color: 'green' },
    { id: 'ringworm', label: 'Ringworm', color: 'green' },
    { id: 'std-treatment', label: 'STD Treatment', color: 'pink' },
    { id: 'herpes', label: 'Herpes', color: 'rose' },
    { id: 'chlamydia', label: 'Chlamydia', color: 'red' },
    { id: 'gonorrhea', label: 'Gonorrhea', color: 'orange' },
    { id: 'pe', label: 'Premature Ejaculation', color: 'blue' },
    { id: 'low-t', label: 'Low Testosterone', color: 'cyan' },
    { id: 'yeast', label: 'Yeast Infections', color: 'purple' },
    { id: 'bv', label: 'Bacterial Vaginosis', color: 'indigo' },
    { id: 'emergency-contraception', label: 'Emergency Contraception', color: 'violet' },
    { id: 'menstrual', label: 'Menstrual Issues', color: 'pink' },
    { id: 'acid-reflux', label: 'Acid Reflux', color: 'amber' },
    { id: 'nausea', label: 'Nausea', color: 'yellow' },
    { id: 'diarrhea', label: 'Diarrhea', color: 'green' },
    { id: 'constipation', label: 'Constipation', color: 'green' },
    { id: 'headaches', label: 'Headaches', color: 'red' },
    { id: 'migraines', label: 'Migraines', color: 'purple' },
    { id: 'motion-sickness', label: 'Motion Sickness', color: 'blue' },
    { id: 'smoking', label: 'Smoking Cessation', color: 'teal' },
    { id: 'asthma', label: 'Asthma', color: 'cyan' },
    { id: 'blood-pressure', label: 'High Blood Pressure', color: 'rose' },
    { id: 'cholesterol', label: 'High Cholesterol', color: 'orange' },
    { id: 'thyroid', label: 'Thyroid Issues', color: 'teal' },
    { id: 'gout', label: 'Gout', color: 'indigo' },
  ];