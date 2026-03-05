/**
 * Convert latitude/longitude to timezone for US locations
 * This is a simple approximation for US-based telehealth services
 * For more accuracy, consider using the 'geo-tz' npm package
 */

interface TimezoneResult {
  timezone: string;
  abbreviation: string;
}

export function getTimezoneFromCoordinates(lat: number, lng: number): TimezoneResult {
  // Arizona special case (no DST) - check first
  // Arizona roughly: lat 31.3-37, lng -114.8 to -109
  if (lat >= 31.3 && lat <= 37 && lng >= -114.8 && lng <= -109) {
    return { timezone: "America/Phoenix", abbreviation: "MST" };
  }

  // US timezone boundaries (approximate longitude-based)
  // These are rough boundaries - for production, use geo-tz library
  
  // Hawaii: west of -154
  if (lng < -154) {
    return { timezone: "Pacific/Honolulu", abbreviation: "HST" };
  }
  
  // Alaska: -170 to -130 and lat > 54
  if (lng >= -170 && lng < -130 && lat > 54) {
    return { timezone: "America/Anchorage", abbreviation: "AKST" };
  }
  
  // Pacific: -125 to -115
  if (lng >= -125 && lng < -115) {
    return { timezone: "America/Los_Angeles", abbreviation: "PST" };
  }
  
  // Mountain: -115 to -102
  if (lng >= -115 && lng < -102) {
    return { timezone: "America/Denver", abbreviation: "MST" };
  }
  
  // Central: -102 to -87
  if (lng >= -102 && lng < -87) {
    return { timezone: "America/Chicago", abbreviation: "CST" };
  }
  
  // Eastern: -87 to -67
  if (lng >= -87 && lng <= -67) {
    return { timezone: "America/New_York", abbreviation: "EST" };
  }

  // Default fallback - Eastern time (covers most US population)
  return { timezone: "America/New_York", abbreviation: "EST" };
}

/**
 * Alternative: Use Google's Timezone API for accurate results
 * Requires GOOGLE_MAPS_API_KEY with Timezone API enabled
 */
export async function getTimezoneFromGoogleAPI(
  lat: number, 
  lng: number, 
  apiKey: string
): Promise<TimezoneResult> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === "OK") {
      return {
        timezone: data.timeZoneId,
        abbreviation: data.timeZoneName,
      };
    }
    
    // Fallback to coordinate-based lookup
    return getTimezoneFromCoordinates(lat, lng);
  } catch (error) {
    console.error("Error fetching timezone from Google API:", error);
    return getTimezoneFromCoordinates(lat, lng);
  }
}
