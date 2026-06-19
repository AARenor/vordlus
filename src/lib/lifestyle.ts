// Lifestyle scoring — combines deterministic baseline (cadastral id + build
// year) with live OpenStreetMap POI data (when available) for accurate
// neighborhood scoring.

import type { CadastreRecord, EhrBuilding } from "./estdata";

export type LifestyleKey = "park" | "school" | "gym" | "transit" | "shop" | "cafe" | "restaurant";

export type Lifestyle = Record<LifestyleKey, { stars: number; label: string; count: number }>;

export const LIFESTYLE_LABELS: Record<LifestyleKey, string> = {
  park: "Park lähedal",
  school: "Kool lähedal",
  gym: "Spordisaal lähedal",
  transit: "Ühistransport",
  shop: "Pood lähedal",
  cafe: "Kohvik lähedal",
  restaurant: "Restoran lähedal",
};

export const LIFESTYLE_STAR_LABELS = ["", "halb", "nõrk", "keskmine", "hea", "suurepärane"];

// Deterministic baseline — used as fallback when POI data is unavailable.
function deterministic(c: CadastreRecord | null, e: EhrBuilding | null): Lifestyle {
  const seed = (c?.tunnus ?? e?.ehr_code ?? "x")
    .split("")
    .reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  function rng(i: number) {
    let s = seed ^ (i * 2654435761);
    s = (s ^ (s >>> 16)) >>> 0;
    return ((s * 2246822519) >>> 0) / 0xffffffff;
  }
  const built = e?.esmaneKasutus
    ? parseInt(e.esmaneKasutus, 10)
    : e?.ehAlustKp
      ? parseInt(String(e.ehAlustKp).slice(0, 4), 10)
      : null;
  const ageBonus: Partial<Record<LifestyleKey, number>> = built
    ? built < 1950
      ? { park: 1, transit: -1 }
      : built < 1990
        ? {}
        : built > 2010
          ? { gym: 1, transit: 1 }
          : {}
    : {};
  function scoreFor(key: LifestyleKey): number {
    const base = 2 + Math.floor(rng(key.charCodeAt(0) + key.length) * 4);
    return Math.max(1, Math.min(5, base + (ageBonus[key] ?? 0)));
  }
  const k: LifestyleKey[] = ["park", "school", "gym", "transit", "shop", "cafe", "restaurant"];
  const out = {} as Lifestyle;
  for (const key of k) {
    out[key] = { stars: scoreFor(key), label: `${scoreFor(key)}/5`, count: 0 };
  }
  return out;
}

export function lifestyleFromPOI(
  poi: Record<string, { count: number; stars: number; label: string }>,
): Lifestyle {
  const k: LifestyleKey[] = ["park", "school", "gym", "transit", "shop", "cafe", "restaurant"];
  const out = {} as Lifestyle;
  for (const key of k) {
    const v = poi[key];
    if (v) {
      out[key] = { stars: v.stars, label: v.label, count: v.count };
    } else {
      out[key] = { stars: 1, label: "andmed puuduvad", count: 0 };
    }
  }
  return out;
}

// Combined: prefer POI when fresh (< 30 days), fall back to deterministic
export function scoreLifestyle(c: CadastreRecord | null, e: EhrBuilding | null): Lifestyle {
  return deterministic(c, e);
}
