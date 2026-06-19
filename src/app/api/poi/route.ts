// Server-side proxy to OpenStreetMap Overpass API for lifestyle POI scoring.
// Uses overpass.osm.ch as the public mirror (overpass-api.de returns 406 for
// our User-Agent). Counts POIs within a configurable radius from a WGS84 point.

import { NextRequest, NextResponse } from "next/server";

const OVERPASS = "https://overpass.osm.ch/api/interpreter";

// amenity / shop / leisure tag → Estonian label
const POI_QUERIES: { key: string; label: string; query: string }[] = [
  { key: "park", label: "Park lähedal", query: `node["leisure"="park"](around:RADIUS,LAT,LON);way["leisure"="park"](around:RADIUS,LAT,LON);` },
  { key: "school", label: "Kool lähedal", query: `node["amenity"~"^(school|kindergarten|college)$"](around:RADIUS,LAT,LON);way["amenity"~"^(school|kindergarten|college)$"](around:RADIUS,LAT,LON);` },
  { key: "gym", label: "Spordisaal lähedal", query: `node["leisure"="fitness_centre"](around:RADIUS,LAT,LON);way["leisure"="fitness_centre"](around:RADIUS,LAT,LON);node["sport"="gym"](around:RADIUS,LAT,LON);` },
  { key: "transit", label: "Ühistransport", query: `node["public_transport"="platform"](around:RADIUS,LAT,LON);node["highway"="bus_stop"](around:RADIUS,LAT,LON);node["railway"="station"](around:RADIUS,LAT,LON);node["railway"="tram_stop"](around:RADIUS,LAT,LON);` },
  { key: "shop", label: "Pood lähedal", query: `node["shop"~"^(supermarket|convenience)$"](around:RADIUS,LAT,LON);way["shop"~"^(supermarket|convenience)$"](around:RADIUS,LAT,LON);` },
  { key: "cafe", label: "Kohvik lähedal", query: `node["amenity"="cafe"](around:RADIUS,LAT,LON);way["amenity"="cafe"](around:RADIUS,LAT,LON);` },
  { key: "restaurant", label: "Restoran lähedal", query: `node["amenity"="restaurant"](around:RADIUS,LAT,LON);way["amenity"="restaurant"](around:RADIUS,LAT,LON);` },
];

function scoreFromCount(n: number): { stars: number; label: string } {
  // Convert count to 1–5 stars with a sensible curve
  // 0 → 1, 1–2 → 2, 3–5 → 3, 6–10 → 4, 11+ → 5
  if (n <= 0) return { stars: 1, label: "ei leitud" };
  if (n <= 2) return { stars: 2, label: `${n} lähedal` };
  if (n <= 5) return { stars: 3, label: `${n} lähedal` };
  if (n <= 10) return { stars: 4, label: `${n} lähedal` };
  return { stars: 5, label: `${n} lähedal` };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const radius = Math.min(Math.max(Number(searchParams.get("radius") ?? 800), 200), 3000);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat ja lon on kohustuslikud" }, { status: 400 });
  }

  // Build one big Overpass query — each subquery in its own union block
  // separated by `;`. (The previous attempt of joining `(...)(...)` was
  // rejected as a parse error by the overpass.osm.ch backend.)
  const blocks = POI_QUERIES.map(
    (p) =>
      `(${p.query.replace("RADIUS", String(radius)).replace("LAT", String(lat)).replace("LON", String(lon))});`,
  ).join("");

  const q = `[out:json][timeout:15];${blocks}out tags center;`;

  try {
    const r = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": "vordlus/0.2 (vordlus.vercel.app)" },
      body: q,
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Overpass ${r.status}` }, { status: r.status });
    }
    const j = await r.json();
    const elements = j.elements ?? [];

    // Group by tag-key
    // Each element has its tags; we count by matching which query produced it.
    // Overpass doesn't tell us which sub-query matched, so we bucket by tag presence.
    const result: Record<string, { count: number; stars: number; label: string }> = {};
    for (const poi of POI_QUERIES) {
      result[poi.key] = { count: 0, stars: 1, label: "ei leitud" };
    }

    for (const el of elements) {
      const tags = el.tags ?? {};
      if (tags.leisure === "park") result.park.count++;
      else if (tags.amenity === "school" || tags.amenity === "kindergarten" || tags.amenity === "college") result.school.count++;
      else if (tags.leisure === "fitness_centre" || tags.sport === "gym") result.gym.count++;
      else if (tags.public_transport === "platform" || tags.highway === "bus_stop" || tags.railway === "station" || tags.railway === "tram_stop") result.transit.count++;
      else if (tags.shop === "supermarket" || tags.shop === "convenience") result.shop.count++;
      else if (tags.amenity === "cafe") result.cafe.count++;
      else if (tags.amenity === "restaurant") result.restaurant.count++;
    }

    for (const k of Object.keys(result)) {
      const s = scoreFromCount(result[k].count);
      result[k].stars = s.stars;
      result[k].label = s.label;
    }

    return NextResponse.json(
      {
        lat,
        lon,
        radius,
        pois: result,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
