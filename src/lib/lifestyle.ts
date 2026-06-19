// Deterministic lifestyle scoring for the comparison matrix.
// v1: derived from cadastral id + build year + energy class.
// Real version: distance-based POI lookups (parks, schools, gyms, transit).
// Kept here so the UI works; replace `scoreLifestyle` body when the POI
// data is wired in.

import type { CadastreRecord, EhrBuilding } from "./estdata";

export type LifestyleKey = "park" | "school" | "gym" | "transit" | "shop" | "quiet";

export type Lifestyle = Record<LifestyleKey, number>; // 0–5

export const LIFESTYLE_LABELS: Record<LifestyleKey, string> = {
  park: "Park lähedal",
  school: "Kool lähedal",
  gym: "Spordisaal lähedal",
  transit: "Ühistransport",
  shop: "Pood lähedal",
  quiet: "Vaikne piirkond",
};

export function scoreLifestyle(c: CadastreRecord | null, e: EhrBuilding | null): Lifestyle {
  // v1: deterministic score from a stable hash of the cadastral id,
  // slightly biased by build year (older = quieter, more walkable).
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

  // Older buildings: +1 to park & quiet, -1 to gym/transit
  const ageBonus: Partial<Record<LifestyleKey, number>> = built
    ? built < 1950
      ? { park: 1, quiet: 1, transit: -1 }
      : built < 1990
        ? { quiet: 1 }
        : built > 2010
          ? { gym: 1, transit: 1, quiet: -1 }
          : {}
    : {};

  function scoreFor(key: LifestyleKey): number {
    const base = 2 + Math.floor(rng(key.charCodeAt(0) + key.length) * 4); // 2–5
    const adjusted = Math.max(0, Math.min(5, base + (ageBonus[key] ?? 0)));
    return adjusted;
  }

  return {
    park: scoreFor("park"),
    school: scoreFor("school"),
    gym: scoreFor("gym"),
    transit: scoreFor("transit"),
    shop: scoreFor("shop"),
    quiet: scoreFor("quiet"),
  };
}
