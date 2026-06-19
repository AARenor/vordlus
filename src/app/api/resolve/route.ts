import { NextRequest, NextResponse } from "next/server";
import { getBuilding, getCadastre, searchAddresses, type AksAddress, type CadastreRecord, type EhrBuilding } from "@/lib/estdata";
import { parseUserInput } from "@/lib/parseInput";

export type Resolved = {
  input: { raw: string; kind: string };
  picked: AksAddress | null;
  cadastre: CadastreRecord | null;
  ehr: EhrBuilding | null;
  errors: string[];
};

export async function POST(req: NextRequest) {
  let body: { raw?: string; manual?: { address: string; price?: number | null; area?: number | null; rooms?: number | null } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Vigane päring" }, { status: 400 });
  }

  const parsed = parseUserInput(body.raw ?? "");
  const errors: string[] = [];
  const out: Resolved = {
    input: { raw: body.raw ?? "", kind: parsed.kind },
    picked: null,
    cadastre: null,
    ehr: null,
    errors,
  };

  try {
    // 1) Resolve to a building via In-AKS
    let addr: AksAddress | null = null;

    if (parsed.kind === "tunnus") {
      // Tunnus → use it directly to load cadastre. We don't have EHR code yet.
      try {
        const c = await getCadastre(parsed.tunnus);
        out.cadastre = c;
        // Try EHR via kadastritunnus search: address contains it
        const a = await searchAddresses(c.tais_aadress);
        const m = a.find((x) => x.liik === "E") || a[0] || null;
        addr = m;
      } catch (e) {
        errors.push(`Kadastre: ${(e as Error).message}`);
      }
    } else if (parsed.kind === "ehr") {
      // EHR code → fetch directly
      try {
        const b = await getBuilding(parsed.ehrCode);
        out.ehr = b;
        if (b?.katastriyksused[0]?.katastritunnus) {
          out.cadastre = await getCadastre(b.katastriyksused[0].katastritunnus);
        }
        if (b) addr = await resolveAddressForEhr(b);
      } catch (e) {
        errors.push(`EHR: ${(e as Error).message}`);
      }
    } else if (parsed.kind === "kv-url" || parsed.kind === "address") {
      const query = parsed.kind === "kv-url" ? parsed.address : parsed.address;
      try {
        const results = await searchAddresses(query);
        if (results.length === 0) {
          errors.push("Aadressile ei leitud vastet");
        } else {
          // Prefer EHITISHOONE, otherwise first
          const m = results.find((x) => x.liik === "E") || results[0];
          addr = m;
        }
      } catch (e) {
        errors.push(`In-AKS: ${(e as Error).message}`);
      }

      if (addr) {
        out.picked = addr;
        if (addr.liik === "E" && addr.tunnus) {
          try {
            const b = await getBuilding(addr.tunnus);
            out.ehr = b;
            const ktunnus = b?.katastriyksused[0]?.katastritunnus;
            if (ktunnus) {
              try {
                out.cadastre = await getCadastre(ktunnus);
              } catch (e) {
                errors.push(`Kadastre: ${(e as Error).message}`);
              }
            }
          } catch (e) {
            errors.push(`EHR: ${(e as Error).message}`);
          }
        } else if (addr.tunnus && addr.tunnus.includes(":")) {
          // Non-building with tunnus → try cadastre directly
          try {
            out.cadastre = await getCadastre(addr.tunnus);
          } catch (e) {
            errors.push(`Kadastre: ${(e as Error).message}`);
          }
        }
      }
    }

    if (out.picked == null && addr) out.picked = addr;
  } catch (e) {
    errors.push(`Üldine: ${(e as Error).message}`);
  }

  return NextResponse.json(out, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}

async function resolveAddressForEhr(ehr: EhrBuilding): Promise<AksAddress | null> {
  if (!ehr.taisaadress) return null;
  try {
    const r = await searchAddresses(ehr.taisaadress);
    return r.find((x) => x.liik === "E" && x.tunnus === ehr.ehr_code) || r[0] || null;
  } catch {
    return null;
  }
}
