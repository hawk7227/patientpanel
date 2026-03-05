import { setOptions } from "@googlemaps/js-api-loader";

let optionsSet = false;

export function ensureGoogleMapsOptions() {
  if (!optionsSet && typeof window !== "undefined") {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      v: "weekly",
    });
    optionsSet = true;
  }
}

