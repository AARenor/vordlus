// kv.ee URL → address hint. We do NOT scrape kv.ee (Cloudflare-gated, ToS).
// We DO extract any address-like string from the URL slug, so the user can
// paste a kv.ee link and we'll still resolve the property via In-AKS.

export type ParsedInput =
  | { kind: "kv-url"; address: string; kvId: string; raw: string }
  | { kind: "address"; address: string; raw: string }
  | { kind: "tunnus"; tunnus: string; raw: string }
  | { kind: "ehr"; ehrCode: string; raw: string }
  | { kind: "empty" };

const KV_URL_RE = /^(?:https?:\/\/)?(?:www\.)?kv\.ee\/(?:[a-z]{2}\/)?(\d+)/i;
const TUNNUS_RE = /^\d{5}:\d{3}:\d{4}$/;
const EHR_RE = /^\d{8,12}$/;

// Slug often contains address, e.g. /123-tartu-mnt-47-nomme-tallinn
// We try to extract Estonian street + city tokens.
function extractAddressFromSlug(slug: string): string {
  // Remove leading id
  let s = slug.replace(/^\d+-/, "").replace(/\/$/, "");
  // Replace - with space, drop common stopwords
  s = s.replace(/-/g, " ");
  s = s.replace(/\b(tartu|maakond|linnosa|vald)\b/gi, (m) => m.toLowerCase());
  return s.trim();
}

export function parseUserInput(raw: string): ParsedInput {
  const text = raw.trim();
  if (!text) return { kind: "empty" };
  // kv.ee URL
  const m = text.match(KV_URL_RE);
  if (m) {
    const kvId = m[1];
    const slug = text.split("/").pop() ?? "";
    const addr = extractAddressFromSlug(slug);
    return { kind: "kv-url", address: addr || slug, kvId, raw: text };
  }
  // Tunnus
  if (TUNNUS_RE.test(text)) return { kind: "tunnus", tunnus: text, raw: text };
  // EHR
  if (EHR_RE.test(text) && /^\d+$/.test(text)) return { kind: "ehr", ehrCode: text, raw: text };
  // Fallback: address
  return { kind: "address", address: text, raw: text };
}
