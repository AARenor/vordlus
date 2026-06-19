"use client";

import { useState } from "react";

export type Filters = {
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  roomsMin?: number;
  roomsMax?: number;
  county?: string;
  energyClass?: string[]; // ["A","B","C"]
  lifestyle?: string[]; // ["park","school","gym","transit","shop","quiet"]
};

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  matchCount: number;
};

const LIFESTYLE_OPTIONS: { key: string; label: string }[] = [
  { key: "park", label: "Park lähedal" },
  { key: "school", label: "Kool lähedal" },
  { key: "gym", label: "Spordisaal lähedal" },
  { key: "transit", label: "Ühistransport" },
  { key: "shop", label: "Pood lähedal" },
  { key: "quiet", label: "Vaikne piirkond" },
];

const COUNTIES = [
  "Harju maakond",
  "Tartu maakond",
  "Pärnu maakond",
  "Ida-Viru maakond",
  "Lääne-Viru maakond",
];

function Accordion({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="border-b border-rule">
      <summary className="flex items-center justify-between py-3.5 cursor-pointer group">
        <span className="eyebrow text-ink group-hover:text-accent transition-colors">{title}</span>
        <svg className="chevron w-3 h-3 text-muted" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 2l4 4-4 4" />
        </svg>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value?: number; onChange: (n: number | undefined) => void; suffix?: string }) {
  return (
    <div>
      <label className="eyebrow text-faint">{label}</label>
      <div className="mt-1.5 flex items-center gap-1.5">
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="0"
          className="w-full bg-field border border-rule px-2 py-1.5 text-[13px] font-mono
                     focus:border-ink outline-none transition-colors"
        />
        {suffix && <span className="text-[11px] text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

export default function FilterSidebar({ filters, onChange, matchCount }: Props) {
  function update(patch: Partial<Filters>) {
    onChange({ ...filters, ...patch });
  }
  function toggleLifestyle(key: string) {
    const cur = filters.lifestyle ?? [];
    const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    update({ lifestyle: next.length ? next : undefined });
  }
  function toggleEnergy(klass: string) {
    const cur = filters.energyClass ?? [];
    const next = cur.includes(klass) ? cur.filter((k) => k !== klass) : [...cur, klass];
    update({ energyClass: next.length ? next : undefined });
  }

  return (
    <aside className="w-full lg:w-[260px] xl:w-[280px] shrink-0">
      <div className="lg:sticky lg:top-20">
        <div className="rounded-lg border border-rule bg-white p-5">
          <p className="eyebrow text-muted">Filtrid</p>
          <h2 className="display-tight text-[22px] mt-1 text-ink">Piira otsingut</h2>

          <div className="mt-4">
            <Accordion title="Hind">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Min" value={filters.priceMin} onChange={(n) => update({ priceMin: n })} suffix="€" />
                <NumberField label="Maks" value={filters.priceMax} onChange={(n) => update({ priceMax: n })} suffix="€" />
              </div>
            </Accordion>
            <Accordion title="Suurus">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Min" value={filters.areaMin} onChange={(n) => update({ areaMin: n })} suffix="m²" />
                <NumberField label="Maks" value={filters.areaMax} onChange={(n) => update({ areaMax: n })} suffix="m²" />
              </div>
            </Accordion>
            <Accordion title="Toad">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Min" value={filters.roomsMin} onChange={(n) => update({ roomsMin: n })} />
                <NumberField label="Maks" value={filters.roomsMax} onChange={(n) => update({ roomsMax: n })} />
              </div>
            </Accordion>
            <Accordion title="Asukoht">
              <div>
                <label className="eyebrow text-faint">Maakond</label>
                <select
                  value={filters.county ?? ""}
                  onChange={(e) => update({ county: e.target.value || undefined })}
                  className="mt-1.5 w-full bg-field border border-rule px-2 py-1.5 text-[13px]
                             focus:border-ink outline-none transition-colors"
                >
                  <option value="">Kõik maakonnad</option>
                  {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </Accordion>
            <Accordion title="Energiamärgis">
              <div className="flex flex-wrap gap-1.5">
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((k) => {
                  const active = (filters.energyClass ?? []).includes(k);
                  const good = ["A", "B", "C"].includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleEnergy(k)}
                      className={`w-8 h-8 text-[12px] font-semibold border transition-colors
                                  ${active
                                    ? good ? "bg-energyA border-energyA text-white" : "bg-ink border-ink text-paper"
                                    : "bg-field border-rule text-muted hover:border-ink hover:text-ink"}`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </Accordion>
            <Accordion title="Elustiil" defaultOpen={true}>
              <ul className="space-y-1.5">
                {LIFESTYLE_OPTIONS.map((o) => {
                  const active = (filters.lifestyle ?? []).includes(o.key);
                  return (
                    <li key={o.key}>
                      <button
                        onClick={() => toggleLifestyle(o.key)}
                        className="w-full flex items-center gap-2 text-left py-1 text-[13px] text-ink hover:text-accent transition-colors"
                      >
                        <span className={`shrink-0 w-4 h-4 grid place-items-center border
                                         ${active ? "bg-energyA border-energyA" : "bg-field border-rule2"}`}>
                          {active && (
                            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M2 6l3 3 5-6" />
                            </svg>
                          )}
                        </span>
                        <span>{o.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Accordion>
          </div>

          <div className="mt-6 pt-4 border-t border-rule">
            <button
              className="w-full bg-ink text-paper text-[12px] font-semibold tracking-wider uppercase
                         py-3 hover:bg-ink/85 transition-colors"
            >
              Kuva ({matchCount}) tulemust
            </button>
            <button
              onClick={() => onChange({})}
              className="w-full mt-2 text-[11px] text-muted hover:text-ink transition-colors"
            >
              Tühjenda filtrid
            </button>
          </div>
        </div>

        <p className="mt-3 text-[10.5px] text-faint leading-snug px-2">
          Filtrid rakenduvad koheselt võrdlustabelile. Hinna ja m² vahemikud
          põhinevad katastri ja EHR andmetel.
        </p>
      </div>
    </aside>
  );
}
