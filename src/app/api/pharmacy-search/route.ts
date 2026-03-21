// ═══════════════════════════════════════════════════════════════
// PHARMACY SEARCH — Google Places Text Search (server-side)
// No browser location permission required — uses query only.
// Returns pharmacy name + address + phone from Google Places API.
// ═══════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ results: [] });

  try {
    const query = encodeURIComponent(`${q} pharmacy`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&type=pharmacy&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results) return NextResponse.json({ results: [] });

    const results = (data.results as any[]).slice(0, 6).map((p: any) => ({
      name: p.name,
      address: p.formatted_address || p.vicinity || "",
      placeId: p.place_id,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[PharmacySearch] Error:", err);
    return NextResponse.json({ results: [] });
  }
}
