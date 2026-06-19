"use client";

import { useEffect, useMemo, useState } from "react";
import FilterSidebar, { type Filters } from "@/components/FilterSidebar";
import CompareSlot from "@/components/CompareSlot";
import CompareColumnView from "@/components/CompareColumnView";
import {
  decodeShareUrl,
  loadCompare,
  makeId,
  saveCompare,
  type CompareColumn,
  type CompareInput,
} from "@/lib/compareStore";
import { scoreLifestyle } from "@/lib/lifestyle";

const MAX_SLOTS = 5;

type ResolveResponse = {
  input: { raw: string; kind: string };
  picked: { viitepunkt_l: number; viitepunkt_b: number; pikkaadress: string } | null;
  cadastre: { pindala: number; tunnus: string } | null;
  ehr: { ehr_code: string; esmaneKasutus: string | null; energy: { energiaKlass: string | null }[] } | null;
  errors: string[];
};

export default function Home() {
  const [columns, setColumns] = useState<CompareColumn[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [ready, setReady] = useState(false);

  // Load from localStorage + URL share
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("c");
    if (shared) {
      const inputs = decodeShareUrl(shared);
      if (inputs.length > 0) {
        // Hydrate as empty columns with raw inputs; user clicks "Lisa võrdlusesse"
        const initial: CompareColumn[] = inputs.slice(0, MAX_SLOTS).map((raw) => ({
          id: makeId(),
          input: { raw },
          cadastre: null,
          ehr: null,
          lifestyle: {
            park: { stars: 0, label: "—", count: 0 },
            school: { stars: 0, label: "—", count: 0 },
            gym: { stars: 0, label: "—", count: 0 },
            transit: { stars: 0, label: "—", count: 0 },
            shop: { stars: 0, label: "—", count: 0 },
            cafe: { stars: 0, label: "—", count: 0 },
            restaurant: { stars: 0, label: "—", count: 0 },
          },
          fetchedAt: 0,
          errors: [],
        }));
        setColumns(initial);
        setReady(true);
        return;
      }
    }
    setColumns(loadCompare());
    setReady(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!ready) return;
    saveCompare(columns);
  }, [columns, ready]);

  // Filtering
  const filtered = useMemo(() => {
    return columns.filter((col) => {
      const c = col.cadastre;
      const e = col.ehr;
      const price = col.input.manualPrice ?? c?.maks_hind ?? null;
      const area = col.input.manualArea ?? e?.suletud_netopind ?? c?.pindala ?? null;
      const rooms = col.input.manualRooms ?? e?.tubadeArv ?? null;
      const energy = e?.energy[0]?.energiaKlass ?? null;
      if (filters.priceMin != null && price != null && price < filters.priceMin) return false;
      if (filters.priceMax != null && price != null && price > filters.priceMax) return false;
      if (filters.areaMin != null && area != null && area < filters.areaMin) return false;
      if (filters.areaMax != null && area != null && area > filters.areaMax) return false;
      if (filters.roomsMin != null && rooms != null && rooms < filters.roomsMin) return false;
      if (filters.energy?.length) {
        if (!energy || !filters.energy.includes(energy)) return false;
      }
      if (filters.lifestyle?.length) {
        for (const k of filters.lifestyle) {
          const v = col.lifestyle[k as keyof typeof col.lifestyle];
          if (!v || v.stars < 3) return false;
        }
      }
      return true;
    });
  }, [columns, filters]);

  const medianPriceM2 = useMemo(() => {
    const pps: number[] = [];
    for (const col of filtered) {
      const c = col.cadastre;
      const e = col.ehr;
      const price = col.input.manualPrice ?? c?.maks_hind ?? null;
      const area = col.input.manualArea ?? e?.suletud_netopind ?? c?.pindala ?? null;
      if (price != null && area) pps.push(price / area);
    }
    if (pps.length === 0) return null;
    pps.sort((a, b) => a - b);
    return pps[Math.floor(pps.length / 2)];
  }, [filtered]);

  async function resolveSlot(
    raw: string,
    manual?: { price?: number | null; area?: number | null; rooms?: number | null },
  ): Promise<{ ok: boolean; error?: string }> {
    if (!raw.trim()) return { ok: false, error: "Sisesta aadress või ID" };
    try {
      const r = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, manual }),
      });
      if (!r.ok) return { ok: false, error: `Server viga: ${r.status}` };
      const j: ResolveResponse = await r.json();
      const newCol: CompareColumn = {
        id: makeId(),
        input: { raw, manualPrice: manual?.price ?? null, manualArea: manual?.area ?? null, manualRooms: manual?.rooms ?? null },
        cadastre: (j.cadastre as CompareColumn["cadastre"]) ?? null,
        ehr: (j.ehr as CompareColumn["ehr"]) ?? null,
        lifestyle: scoreLifestyle((j.cadastre as CompareColumn["cadastre"]) ?? null, (j.ehr as CompareColumn["ehr"]) ?? null),
        fetchedAt: Date.now(),
        errors: j.errors,
      };
      setColumns((prev) => {
        // Replace the first slot that has the same raw input, otherwise append
        const idx = prev.findIndex((c) => c.input.raw === raw);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newCol;
          return next.slice(0, MAX_SLOTS);
        }
        return [...prev, newCol].slice(0, MAX_SLOTS);
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  function updateSlot(index: number, col: CompareColumn | null) {
    setColumns((prev) => {
      const next = [...prev];
      if (col) next[index] = col;
      else next.splice(index, 1);
      return next;
    });
  }

  function removeColumn(id: string) {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }

  function clearAll() {
    if (!confirm("Eemaldada kõik võrdlused?")) return;
    setColumns([]);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("c");
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function shareUrl() {
    const inputs = columns.map((c) => c.input.raw);
    if (inputs.length === 0) return;
    const b64 = (() => {
      const json = JSON.stringify(inputs);
      if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(json)));
      return Buffer.from(json, "utf-8").toString("base64");
    })();
    const url = new URL(window.location.href);
    url.searchParams.set("c", b64);
    await navigator.clipboard.writeText(url.toString());
    alert("Link kopeeritud!");
  }

  return (
    <>
      {/* ============== TOP BAR ============== */}
      <header className="border-b border-rule bg-paper sticky top-0 z-30">
        <div className="max-w-compare mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <span aria-hidden="true" className="grid place-items-center w-7 h-7 bg-ink text-paper font-display text-[19px] leading-none">
              v
            </span>
            <span className="font-display text-[20px] text-ink tracking-tight">võrdlus</span>
            <span className="hidden sm:inline text-[12px] text-muted ml-2">· Kinnisvara võrdlus</span>
          </a>
          <nav className="flex items-center gap-5 text-[13px] text-ink">
            <button
              onClick={shareUrl}
              disabled={columns.length === 0}
              className="hidden sm:flex items-center gap-1.5 hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
              </svg>
              Salvesta
            </button>
            <button
              onClick={shareUrl}
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" />
              </svg>
              Minu konto
            </button>
          </nav>
        </div>
      </header>

      {/* ============== MASTHEAD ============== */}
      <section className="border-b border-rule">
        <div className="max-w-compare mx-auto px-5 sm:px-8 py-10 sm:py-14">
          <p className="eyebrow">Kinnisvara võrdlus</p>
          <h1 className="display mt-3 text-ink text-balance max-w-[44ch]">
            Võrdle kuni viit kinnisvaraobjekti
            <span className="text-faint"> kõrvuti.</span>
          </h1>
          <p className="mt-4 text-muted max-w-prose text-[15px]">
            Sisesta kuni viis aadressi, kv.ee linki või katastri numbrit. Meie koostame
            kinnistu, ehitise ja energiamärgise andmed kõrvuti, et näeksid, millist
            kodu tasub vaatama minna.
          </p>
        </div>
      </section>

      {/* ============== GRID ============== */}
      <section className="max-w-compare mx-auto px-5 sm:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              matchCount={filtered.length}
              totalCount={columns.length}
            />

            <div className="flex-1 min-w-0 w-full">
            {/* Slots row — always shows up to 5 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {Array.from({ length: MAX_SLOTS }).map((_, i) => (
                <CompareSlot
                  key={i}
                  index={i}
                  column={columns[i] ?? null}
                  onChange={(c) => updateSlot(i, c)}
                  onResolve={resolveSlot}
                />
              ))}
            </div>

            {/* Comparison columns */}
            {filtered.length === 0 ? (
              <EmptyState
                onTryExample={async () => {
                  // Pre-load three example addresses
                  const examples = [
                    "Viljandi mnt 47, Tallinn",
                    "Mustamäe tee 51, Tallinn",
                    "Tartu mnt 84a, Tallinn",
                  ];
                  for (const raw of examples) {
                    await resolveSlot(raw);
                  }
                }}
              />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="display-tight text-[22px] text-ink">
                    Võrdlus · <span className="text-faint">{filtered.length} objekti</span>
                  </h2>
                  <button
                    onClick={clearAll}
                    className="text-[12px] text-muted hover:text-ink transition-colors"
                  >
                    Tühjenda kõik
                  </button>
                </div>
                <div className="overflow-x-auto no-scrollbar -mx-5 sm:-mx-8 px-5 sm:px-8 pb-2">
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${filtered.length}, minmax(220px, 1fr))` }}
                  >
                    {filtered.map((col, i) => (
                      <CompareColumnView
                        key={col.id}
                        column={col}
                        index={i}
                        medianPriceM2={medianPriceM2}
                        onRemove={() => removeColumn(col.id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="border-t border-rule mt-12">
        <div className="max-w-compare mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-baseline gap-2 justify-between text-[12px] text-muted">
          <p>
            <span className="font-display text-ink">võrdlus</span> · Ehitatud vabade Eesti
            avalike andmete peale (In-AKS, Maa-amet X-tee, Ehitisregister). Mitte
            õigus- ega finantsnõustamine.
          </p>
          <p className="eyebrow text-faint">v0.1 · 2026</p>
        </div>
      </footer>
    </>
  );
}

function EmptyState({ onTryExample }: { onTryExample: () => void }) {
  return (
    <div className="rounded-lg border border-rule bg-white p-8 sm:p-12 text-center">
      <p className="eyebrow text-muted">Alusta võrdlust</p>
      <h3 className="display mt-2 text-[28px] text-ink max-w-prose mx-auto">
        Sisesta esimene aadress või klõpsa näidet.
      </h3>
      <p className="mt-3 text-muted max-w-prose mx-auto text-[14.5px]">
        Meie otsime In-AKS registrist, laeme katastri ja ehitise andmed ning
        arvutame iga objekti kohta elustiili hinnangu vahemikus 1–5.
      </p>
      <button
        onClick={onTryExample}
        className="mt-6 bg-ink text-paper text-[12px] font-semibold tracking-wider uppercase
                   px-5 py-3 hover:bg-ink/85 transition-colors"
      >
        Lae 3 näidet (Tallinn)
      </button>
      <p className="mt-4 text-[11.5px] text-faint">
        Või kleebi oma kv.ee link — eraldame aadressi lingi lõpust ja otsime
        üles In-AKS registrist.
      </p>
    </div>
  );
}
