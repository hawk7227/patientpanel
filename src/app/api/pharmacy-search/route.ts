// ═══════════════════════════════════════════════════════════════
// PHARMACY SEARCH
//
// Three modes:
//   1. IP-based bias (default) — reads user IP, geocodes to lat/lng,
//      biases results to their city. No browser permission needed.
//   2. GPS coords (precise) — client passes lat/lng from browser GPS.
//      Returns pharmacies within walking/driving distance.
//   3. Query only (fallback) — no location, returns global results.
// ═══════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q")?.trim();
  const lat  = searchParams.get("lat");
  const lng  = searchParams.get("lng");

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ results: [] });

  try {
    let locationBias = "";

    if (lat && lng) {
      // GPS coords passed from client — precise, 10km radius
      locationBias = `&location=${lat},${lng}&radius=10000`;
    } else {
      // IP-based — read IP from Vercel headers, geocode to lat/lng
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : null;

      if (ip && ip !== "127.0.0.1" && ip !== "::1") {
        try {
          // ip-api.com — free tier, no key, city-level accuracy
          const geoRes  = await fetch(`http://ip-api.com/json/${ip}?fields=lat,lon,status`, { signal: AbortSignal.timeout(1500) });
          const geoData = await geoRes.json();
          if (geoData.status === "success" && geoData.lat && geoData.lon) {
            locationBias = `&location=${geoData.lat},${geoData.lon}&radius=30000`;
          }
        } catch {
          // IP geo failed — fall through to no bias
        }
      }
    }

    const query = encodeURIComponent(`${q} pharmacy`);
    const url   = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&type=pharmacy${locationBias}&key=${apiKey}`;
    const res   = await fetch(url);
    const data  = await res.json();

    if (!data.results) return NextResponse.json({ results: [] });

    const results = (data.results as any[]).slice(0, 6).map((p: any) => ({
      name:    p.name,
      address: p.formatted_address || p.vicinity || "",
      placeId: p.place_id,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[PharmacySearch] Error:", err);
    return NextResponse.json({ results: [] });
  }
}
