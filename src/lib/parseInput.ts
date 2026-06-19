// Parse user input — URL (kv.ee / city24.ee), address, cadastral id, EHR code.
//
// Estonian real-estate portals are all Cloudflare-gated + ToS-restricted
// (kv.ee, city24.ee, kinnisvara24.ee share the same owner: Baltic Classifieds
// Group). We can NOT scrape them. What we DO: extract the address from
// URL slugs, or ask the user to paste an address when the URL is just an ID.
//
// Recognized patterns:
//   kv.ee/12345                   → bare ID (no address in URL; ask user)
//   kv.ee/12345-tartu-mnt-47-nomme → slug contains "tartu mnt 47 nomme" → "Tartu mnt 47, Nõmme"
//   kv.ee/en/12345-foo            → same
//   city24.ee/kinnisvara/korterid-muugiks/tallinn/9876  → "Tallinn"
//   city24.ee/en/...              → same
//   78401:001:0215                → cadastral id
//   120221727                     → EHR building id
//   "Viljandi mnt 47, Tallinn"     → address (free text)

export type ParsedInput =
  | {
      kind: "kv-url";
      portal: "kv.ee" | "city24.ee";
      listingId: string;
      address: string | null; // null when URL has no slug (user must paste address)
      raw: string;
    }
  | { kind: "address"; address: string; raw: string }
  | { kind: "tunnus"; tunnus: string; raw: string }
  | { kind: "ehr"; ehrCode: string; raw: string }
  | { kind: "empty" };

const KV_BARE_RE = /^(?:https?:\/\/)?(?:www\.)?kv\.ee\/(?:[a-z]{2}\/)?(\d+)\/?$/i;
const KV_SLUG_RE = /^(?:https?:\/\/)?(?:www\.)?kv\.ee\/(?:[a-z]{2}\/)?(\d+)-(.+?)\/?$/i;
const CITY24_RE = /^(?:https?:\/\/)?(?:www\.)?city24\.ee\/(?:[a-z]{2}\/)?kinnisvara\/[a-z-]+\/([a-z-]+)\/(\d+)\/?$/i;
const CITY24_SIMPLE_RE = /^(?:https?:\/\/)?(?:www\.)?city24\.ee\/(?:[a-z]{2}\/)?kinnisvara\/[a-z-]+\/([a-z-]+)\/?$/i;
const TUNNUS_RE = /^\d{5}:\d{3}:\d{4}$/;
const EHR_RE = /^\d{8,12}$/;

const ESTONIAN_CITY_MAP: Record<string, string> = {
  tallinn: "Tallinn",
  tartu: "Tartu",
  parnu: "Pärnu",
  narva: "Narva",
  haapsalu: "Haapsalu",
  rakvere: "Rakvere",
  viljandi: "Viljandi",
  kuressaare: "Kuressaare",
  võru: "Võru",
  valga: "Valga",
  jõhvi: "Jõhvi",
  paide: "Paide",
  rapla: "Rapla",
};

// Common Estonian street suffix → normalized form
const STREET_HINTS: Record<string, string> = {
  mnt: "mnt",
  pst: "pst",
  tee: "tee",
  sk: "sk",
  tn: "tn",
};

// Convert kebab-case slug to Estonian address string
// "tartu-mnt-47-nomme-tallinn" → "Tartu mnt 47, Nõmme, Tallinn"
function slugToAddress(slug: string): string {
  const parts = slug.toLowerCase().split("-").filter(Boolean);
  if (parts.length === 0) return "";

  // Try to identify a number (street number)
  let numberIdx = parts.findIndex((p) => /^\d+[a-z]?$/.test(p));
  if (numberIdx === -1) numberIdx = parts.length; // no explicit number

  // Capitalize the first part of the street name (everything before the number)
  const street: string[] = [];
  for (let i = 0; i < numberIdx; i++) {
    const p = parts[i];
    if (STREET_HINTS[p] !== undefined) {
      street.push(p); // keep suffixes lowercase
    } else {
      street.push(p.charAt(0).toUpperCase() + p.slice(1));
    }
  }
  let streetStr = street.join(" ");
  if (numberIdx < parts.length) {
    streetStr += " " + parts[numberIdx];
  }

  // The remaining parts are: district + city
  // Last part is usually the city; previous is the district.
  const rest: string[] = [];
  for (let i = numberIdx + 1; i < parts.length; i++) {
    const p = parts[i];
    if (ESTONIAN_CITY_MAP[p]) {
      rest.push(ESTONIAN_CITY_MAP[p]);
    } else {
      rest.push(p.charAt(0).toUpperCase() + p.slice(1));
    }
  }

  return [streetStr, ...rest].filter(Boolean).join(", ");
}

export function parseUserInput(raw: string): ParsedInput {
  const text = raw.trim();
  if (!text) return { kind: "empty" };

  // kv.ee URL with slug
  let m = text.match(KV_SLUG_RE);
  if (m) {
    const addr = slugToAddress(m[2]);
    return {
      kind: "kv-url",
      portal: "kv.ee",
      listingId: m[1],
      address: addr || null,
      raw: text,
    };
  }

  // kv.ee bare ID
  m = text.match(KV_BARE_RE);
  if (m) {
    return { kind: "kv-url", portal: "kv.ee", listingId: m[1], address: null, raw: text };
  }

  // city24.ee URL
  m = text.match(CITY24_RE);
  if (m) {
    const city = ESTONIAN_CITY_MAP[m[1]] || (m[1].charAt(0).toUpperCase() + m[1].slice(1));
    return { kind: "kv-url", portal: "city24.ee", listingId: m[2], address: city, raw: text };
  }
  m = text.match(CITY24_SIMPLE_RE);
  if (m) {
    const city = ESTONIAN_CITY_MAP[m[1]] || (m[1].charAt(0).toUpperCase() + m[1].slice(1));
    return { kind: "kv-url", portal: "city24.ee", listingId: "", address: city, raw: text };
  }

  // tunnus
  if (TUNNUS_RE.test(text)) return { kind: "tunnus", tunnus: text, raw: text };

  // EHR
  if (EHR_RE.test(text) && /^\d+$/.test(text)) return { kind: "ehr", ehrCode: text, raw: text };

  // free text → address
  return { kind: "address", address: text, raw: text };
}

// Human-readable label for what we parsed
export function parsedLabel(p: ParsedInput): string {
  switch (p.kind) {
    case "kv-url":
      return p.address
        ? `${p.portal === "kv.ee" ? "kv.ee" : "city24.ee"} · ${p.address}`
        : `${p.portal === "kv.ee" ? "kv.ee" : "city24.ee"} · ID ${p.listingId} (aadress puudub URL-ist — kleesti aadress käsitsi)`;
    case "address":
      return p.address;
    case "tunnus":
      return `Katastri nr · ${p.tunnus}`;
    case "ehr":
      return `EHR kood · ${p.ehrCode}`;
    case "empty":
      return "";
  }
}
