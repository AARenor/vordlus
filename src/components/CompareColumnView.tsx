"use client";

import { type CompareColumn } from "@/lib/compareStore";
import { SCORE_LABELS, type ScoreKey } from "@/lib/scores";
import { ageOf, fmtM2, fmtMoney, fmtYear } from "@/lib/estdata";

const Icon = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg
    className="inline-block align-[-2px] mr-1 text-current"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
const IconDoor = <Icon d="M3 22h18M5 22V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18M14 12h.01" />;
const IconRuler = <Icon d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01M15 14h.01" />;
const IconSun = <Icon d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />;

function PhotoFor({ id }: { id: string }) {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cls = ["bg-stone-300", "bg-amber-200", "bg-slate-300", "bg-stone-200"][sum % 4];
  return (
    <div className={`relative w-full aspect-[4/3] ${cls}`}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 150" preserveAspectRatio="none">
        <path d="M30 90 L70 50 L110 90 L110 130 L30 130 Z" fill="rgba(0,0,0,0.10)" />
        <path d="M72 52 L72 40 L110 90" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
        <rect x="42" y="100" width="14" height="14" fill="rgba(255,255,255,0.35)" />
        <rect x="86" y="100" width="14" height="14" fill="rgba(255,255,255,0.35)" />
        <circle cx="155" cy="105" r="14" fill="rgba(0,0,0,0.10)" />
        <rect x="153" y="105" width="4" height="20" fill="rgba(0,0,0,0.10)" />
        <circle cx="170" cy="40" r="10" fill="rgba(255,255,255,0.45)" />
      </svg>
    </div>
  );
}

function EnergyPill({ k }: { k: string | null }) {
  if (!k) return <span className="text-muted">—</span>;
  const good = ["A", "B", "C"].includes(k);
  return (
    <span
      className={`inline-block min-w-[24px] text-center text-[11px] font-bold uppercase px-1.5 py-0.5 rounded-sm
                     ${good ? "bg-energyA text-white" : k === "D" || k === "E" ? "bg-energyC text-white" : "bg-ink text-paper"}`}
    >
      {k}
    </span>
  );
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-px">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < value ? "text-ink" : "text-rule2"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1l2.5 6 6.5.6-5 4.5 1.5 6.4L10 15l-5.5 3.5L6 12 1 7.6 7.5 7z" />
        </svg>
      ))}
    </span>
  );
}

type Props = {
  column: CompareColumn;
  index: number;
  medianPriceM2: number | null;
  onRemove: () => void;
};

export default function CompareColumnView({ column, index, medianPriceM2, onRemove }: Props) {
  const c = column.cadastre;
  const e = column.ehr;
  const addr = c?.tais_aadress || e?.taisaadress || column.input.raw;
  const county = (addr?.match(/,\s*([A-ZÜÖÄÕ][^,]*maakond)/) || [])[1] ?? "";
  const city = (addr?.match(/,\s*([^,]+linn(?:osa)?)/) || [])[1] ?? "";

  // Price & area
  const price = column.input.manualPrice != null ? column.input.manualPrice : c?.maks_hind ?? null;
  const areaM2 =
    column.input.manualArea != null
      ? column.input.manualArea
      : e?.suletud_netopind ?? c?.pindala ?? null;
  const rooms = column.input.manualRooms ?? e?.tubadeArv ?? null;
  const terraceM2 =
    column.input.manualArea && e?.suletud_netopind
      ? Math.max(0, column.input.manualArea - e.suletud_netopind)
      : null;
  const pricePerM2 = price != null && areaM2 ? Math.round(price / areaM2) : null;
  const diffVsMedian =
    pricePerM2 != null && medianPriceM2 != null && medianPriceM2 > 0
      ? (pricePerM2 - medianPriceM2) / medianPriceM2
      : null;
  const priceColor =
    diffVsMedian == null
      ? undefined
      : diffVsMedian > 0.05
        ? "#9A1B1B"
        : diffVsMedian < -0.05
          ? "#166534"
          : undefined;

  // Build the 4 scores
  const { fairValue, tco, appreciation, lifestyle, overall, overallLabel } = column.scores;
  const scoreRows: { key: ScoreKey; value: number; reason: string; tone: "good" | "warn" | "bad" | "neutral" }[] = [
    { key: "fairValue", value: fairValue.score, reason: fairValue.reason, tone: fairValue.score >= 4 ? "good" : fairValue.score <= 2 ? "bad" : "neutral" },
    { key: "tco", value: tco.score, reason: tco.reason, tone: tco.score >= 4 ? "good" : tco.score <= 2 ? "bad" : "neutral" },
    { key: "appreciation", value: appreciation.score, reason: appreciation.reason, tone: appreciation.score >= 4 ? "good" : appreciation.score <= 2 ? "bad" : "neutral" },
    { key: "lifestyle", value: lifestyle.score, reason: lifestyle.reason, tone: lifestyle.score >= 4 ? "good" : lifestyle.score <= 2 ? "bad" : "neutral" },
  ];

  return (
    <div className="bg-white border border-rule overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="relative">
        <PhotoFor id={column.id} />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 grid place-items-center bg-white/90 backdrop-blur
                     border border-rule text-ink text-[12px] hover:bg-ink hover:text-paper transition-colors"
          aria-label="Eemalda võrdlusest"
        >
          ✕
        </button>
        <span className="absolute top-2 left-2 text-[10px] font-semibold tracking-wider uppercase bg-white/90 backdrop-blur px-2 py-0.5 text-ink">
          #{String(index + 1).padStart(2, "0")}
        </span>
        {overall > 0 && (
          <span className="absolute bottom-2 right-2 bg-ink text-paper text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5">
            {overall.toFixed(1)} / 5 · {overallLabel}
          </span>
        )}
      </div>

      {/* Name + location */}
      <div className="px-4 pt-3.5 pb-3">
        <p className="display-tight text-[16px] text-ink leading-[1.2] line-clamp-2 min-h-[2.6em]">
          {addr}
        </p>
        <p className="mt-1 text-[11.5px] text-muted">
          {city}
          {county ? ` · ${county}` : ""}
        </p>
      </div>

      {/* Key metrics */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-[11px] text-muted">
        <div title="Toad">
          {IconDoor}
          <span className="text-ink font-semibold tabnum">{rooms ?? "—"}</span>
        </div>
        <div title="Pindala">
          {IconRuler}
          <span className="text-ink font-semibold tabnum">{areaM2 ? `${areaM2} m²` : "—"}</span>
        </div>
        <div title="Terrass">
          {IconSun}
          <span className="text-ink font-semibold tabnum">
            {terraceM2 != null && terraceM2 > 0 ? `${terraceM2} m²` : "—"}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="px-4 pt-3 pb-4 border-t border-rule">
        <p className="display text-[26px] leading-none tabnum" style={{ color: priceColor }}>
          {price != null ? fmtMoney(price) : "—"}
        </p>
        <p className="mt-1.5 text-[11px] text-muted">
          {pricePerM2 != null ? (
            <>
              <span className="tabnum">{fmtMoney(pricePerM2)}</span> / m²
            </>
          ) : (
            "—"
          )}
          {diffVsMedian != null && (
            <span className="ml-2" style={{ color: priceColor }}>
              ({diffVsMedian > 0 ? "+" : ""}
              {(diffVsMedian * 100).toFixed(1)}%)
            </span>
          )}
        </p>
        {price != null && c?.maks_hind === price && (
          <p className="mt-1 text-[9.5px] text-faint">★ Maa-amet 2022 maksustamisväärtus</p>
        )}
      </div>

      {/* The 4 scores — the comparison core */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted mb-2.5">Skoorid</p>
        <ul className="space-y-2">
          {scoreRows.map((s) => {
            const l = SCORE_LABELS[s.key];
            const tone =
              s.tone === "good" ? "bg-emerald-50" :
              s.tone === "bad" ? "bg-red-50" :
              "bg-paper";
            return (
              <li key={s.key} className={`rounded ${tone} px-2.5 py-1.5`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11.5px] font-semibold text-ink">{l.title}</span>
                  <Stars value={s.value} />
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted leading-snug">{s.reason}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Data table — just the key facts */}
      <div className="border-t border-rule">
        <table className="w-full text-[11.5px]">
          <tbody>
            <Row label="Valmimisaasta" value={fmtYear(e?.esmaneKasutus ?? e?.ehAlustKp)} />
            <Row label="Energiamärgis" value={<EnergyPill k={e?.energy[0]?.energiaKlass ?? null} />} />
            <Row
              label="Korruseid"
              value={e?.minKorrusteArv != null ? `${e.minKorrusteArv}${e.maxKorrusteArv && e.maxKorrusteArv !== e.minKorrusteArv ? `–${e.maxKorrusteArv}` : ""}` : "—"}
            />
            <Row label="Küte" value={e?.energy[0]?.kytteTyypTxt ?? "—"} />
            <Row label="Omandivorm" value={c?.omvorm ?? "—"} />
            <Row label="Maksustamisväärtus" value={c?.maks_hind != null ? fmtMoney(c.maks_hind) : "—"} />
            <Row label="Katastri nr" value={c?.tunnus ?? "—"} mono />
            <Row label="EHR kood" value={e?.ehr_code ?? "—"} mono />
            <Row label="Kasutusluba" value={fmtYear(e?.esmaneKasutus)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <tr className="border-b border-rule last:border-b-0">
      <td className="px-4 py-2.5 text-muted align-top whitespace-nowrap">{label}</td>
      <td className={`px-4 py-2.5 text-right text-ink align-top ${mono ? "font-mono text-[11px]" : ""}`}>{value}</td>
    </tr>
  );
}
