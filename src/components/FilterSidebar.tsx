"use client";

import { useId } from "react";

export type Filters = {
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  roomsMin?: number;
  energy?: string[]; // ["A","B",...]
  lifestyle?: string[]; // ["park","school","gym","transit","shop","quiet"]
};

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  matchCount: number;
  totalCount: number;
};

const LIFESTYLE_LABELS: { key: string; label: string }[] = [
  { key: "park", label: "Park lähedal" },
  { key: "school", label: "Kool lähedal" },
  { key: "gym", label: "Spordisaal lähedal" },
  { key: "transit", label: "Ühistransport" },
  { key: "shop", label: "Pood lähedal" },
  { key: "quiet", label: "Vaikne piirkond" },
];

const ENERGY = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

function FieldNumber({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-semibold text-faint uppercase tracking-[0.1em] mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="—"
          className="w-full bg-white border border-rule px-2.5 py-1.5 pr-7 text-[13px] font-mono
                     focus:border-ink focus:ring-0 outline-none transition-colors"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FilterSidebar({ filters, onChange, matchCount, totalCount }: Props) {
  function update(patch: Partial<Filters>) {
    onChange({ ...filters, ...patch });
  }
  function toggleEnergy(klass: string) {
    const cur = filters.energy ?? [];
    update({ energy: cur.includes(klass) ? cur.filter((k) => k !== klass) : [...cur, klass] });
  }
  function toggleLifestyle(key: string) {
    const cur = filters.lifestyle ?? [];
    update({ lifestyle: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
  }
  function clearAll() {
    onChange({});
  }
  const hasFilters =
    (filters.priceMin != null) || (filters.priceMax != null) ||
    (filters.areaMin != null) || (filters.areaMax != null) ||
    (filters.roomsMin != null) ||
    (filters.energy?.length ?? 0) > 0 ||
    (filters.lifestyle?.length ?? 0) > 0;

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="lg:sticky lg:top-20">
        <div className="bg-white border border-rule rounded-lg overflow-hidden">
          {/* Header — clear & informative */}
          <div className="px-5 pt-5 pb-3 border-b border-rule">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">Filtrid</p>
            <h2 className="mt-1 display-tight text-[19px] text-ink leading-tight">
              {matchCount === totalCount
                ? <>Kõik <span className="text-faint">({totalCount})</span></>
                : <><span className="text-ink">{matchCount}</span> <span className="text-faint">/ {totalCount}</span></>}
            </h2>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Price */}
            <div>
              <p className="eyebrow text-muted mb-2">Hind</p>
              <div className="grid grid-cols-2 gap-2">
                <FieldNumber label="Alates" value={filters.priceMin} onChange={(n) => update({ priceMin: n })} suffix="€" />
                <FieldNumber label="Kuni"  value={filters.priceMax} onChange={(n) => update({ priceMax: n })} suffix="€" />
              </div>
            </div>

            {/* Size */}
            <div>
              <p className="eyebrow text-muted mb-2">Pindala</p>
              <div className="grid grid-cols-2 gap-2">
                <FieldNumber label="Alates" value={filters.areaMin} onChange={(n) => update({ areaMin: n })} suffix="m²" />
                <FieldNumber label="Kuni"  value={filters.areaMax} onChange={(n) => update({ areaMax: n })} suffix="m²" />
              </div>
            </div>

            {/* Rooms — just min, max is rarely useful */}
            <div>
              <p className="eyebrow text-muted mb-2">Toad</p>
              <div className="grid grid-cols-3 gap-1.5">
                {["1", "2", "3", "4", "5+"].map((n) => {
                  const v = n === "5+" ? 5 : Number(n);
                  const active = filters.roomsMin === v;
                  return (
                    <button
                      key={n}
                      onClick={() => update({ roomsMin: active ? undefined : v })}
                      className={`py-1.5 text-[13px] font-semibold border transition-colors
                                  ${active
                                    ? "bg-ink text-paper border-ink"
                                    : "bg-white border-rule text-muted hover:border-ink hover:text-ink"}`}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => update({ roomsMin: undefined })}
                  className="py-1.5 text-[11px] text-faint hover:text-ink"
                >
                  Kõik
                </button>
              </div>
            </div>

            {/* Energy class — letter toggles with clear color coding */}
            <div>
              <p className="eyebrow text-muted mb-2">Energiamärgis</p>
              <div className="flex flex-wrap gap-1">
                {ENERGY.map((k) => {
                  const active = (filters.energy ?? []).includes(k);
                  const good = ["A", "B", "C"].includes(k);
                  const mid = ["D", "E"].includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleEnergy(k)}
                      title={k}
                      className={`w-9 h-9 text-[12px] font-bold border transition-all
                                  ${active
                                    ? good
                                      ? "bg-energyA border-energyA text-white"
                                      : mid
                                        ? "bg-energyC border-energyC text-white"
                                        : "bg-ink border-ink text-paper"
                                    : "bg-white border-rule text-muted hover:border-ink hover:text-ink"}`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10.5px] text-faint">A–C = roheline energiamärgis (rohelaen)</p>
            </div>

            {/* Lifestyle — proper checkboxes with green checkmarks */}
            <div>
              <p className="eyebrow text-muted mb-2">Elustiil</p>
              <ul className="space-y-1.5">
                {LIFESTYLE_LABELS.map((o) => {
                  const active = (filters.lifestyle ?? []).includes(o.key);
                  return (
                    <li key={o.key}>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleLifestyle(o.key)}
                          className="sr-only peer"
                        />
                        <span className={`shrink-0 w-4 h-4 grid place-items-center border transition-colors
                                         ${active
                                           ? "bg-energyA border-energyA"
                                           : "bg-white border-rule2 group-hover:border-ink"}`}>
                          {active && (
                            <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M2 6l3 3 5-6" />
                            </svg>
                          )}
                        </span>
                        <span className="text-[13px] text-ink group-hover:text-accent transition-colors">
                          {o.label}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Footer — single clear action */}
          <div className="px-5 py-4 border-t border-rule bg-paper/50">
            <button
              disabled={!hasFilters}
              onClick={clearAll}
              className="text-[11.5px] text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {hasFilters ? "✕ Tühjenda kõik filtrid" : "Filtrid tühjad"}
            </button>
          </div>
        </div>

        {/* Quick stats card — context, not a CTA */}
        <div className="mt-3 px-2 text-[10.5px] text-faint leading-snug">
          Filtrid rakenduvad koheselt. Andmed pärinevad katastri (Maa-amet X-tee)
          ja ehitise (Ehitisregister) registritest.
        </div>
      </div>
    </aside>
  );
}
