"use client";

import { type CompareColumn } from "@/lib/compareStore";
import { LIFESTYLE_LABELS } from "@/lib/lifestyle";
import { ageOf, fmtM2, fmtMoney, fmtYear } from "@/lib/estdata";

// Tiny inline SVG icons (no external dependency)
const I = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg className="inline-block align-[-2px] mr-1" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d={d} />
  </svg>
);
const IconDoor = <I d="M3 22h18M5 22V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18M14 12h.01" />;
const IconRuler = <I d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01M15 14h.01" />;
const IconSun = <I d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />;

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < value ? "star-on" : "star-off"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1l2.5 6 6.5.6-5 4.5 1.5 6.4L10 15l-5.5 3.5L6 12 1 7.6 7.5 7z" />
        </svg>
      ))}
    </span>
  );
}

function PhotoFor({ id }: { id: string }) {
  // Deterministic photo tone from id
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cls = ["photo", "photo-warm", "photo-cool", "photo-stone"][sum % 4];
  return (
    <div className={`relative w-full aspect-[4/3] ${cls}`}>
      {/* minimal architectural illustration: roof + window + tree */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 150" preserveAspectRatio="none">
        {/* house silhouette */}
        <path d="M30 90 L70 50 L110 90 L110 130 L30 130 Z" fill="rgba(0,0,0,0.10)" />
        <path d="M72 52 L72 40 L110 90" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" />
        {/* windows */}
        <rect x="42" y="100" width="14" height="14" fill="rgba(255,255,255,0.35)" />
        <rect x="86" y="100" width="14" height="14" fill="rgba(255,255,255,0.35)" />
        {/* tree */}
        <circle cx="155" cy="105" r="14" fill="rgba(0,0,0,0.10)" />
        <rect x="153" y="105" width="4" height="20" fill="rgba(0,0,0,0.10)" />
        {/* sun */}
        <circle cx="170" cy="40" r="10" fill="rgba(255,255,255,0.45)" />
      </svg>
    </div>
  );
}

function EnergyPill({ k }: { k: string | null }) {
  if (!k) return <span className="text-muted">—</span>;
  const good = ["A", "B", "C"].includes(k);
  return (
    <span className={`inline-block min-w-[24px] text-center text-[11px] font-bold uppercase px-1.5 py-0.5 rounded-sm
                     ${good ? "bg-energyA text-white" : k === "D" || k === "E" ? "bg-energyC text-white" : "bg-ink text-paper"}`}>
      {k}
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
  const price =
    column.input.manualPrice != null
      ? column.input.manualPrice
      : c?.maks_hind ?? null;
  const areaM2 =
    column.input.manualArea != null
      ? column.input.manualArea
      : e?.suletud_netopind ?? c?.pindala ?? null;
  const rooms = column.input.manualRooms ?? e?.tubadeArv ?? null;
  const terraceM2 = column.input.manualArea && c ? Math.max(0, column.input.manualArea - (e?.suletud_netopind ?? 0)) : null;

  const pricePerM2 = price != null && areaM2 ? Math.round(price / areaM2) : null;
  const diffVsMedian =
    pricePerM2 != null && medianPriceM2 != null && medianPriceM2 > 0
      ? (pricePerM2 - medianPriceM2) / medianPriceM2
      : null;

  // Lifestyle
  const l = column.lifestyle;

  return (
    <div className="bg-white border border-rule overflow-hidden flex flex-col">
      {/* Photo */}
      <div className="relative">
        <PhotoFor id={column.id} />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 grid place-items-center bg-white/85 backdrop-blur
                     border border-rule text-ink text-[12px] hover:bg-ink hover:text-paper transition-colors"
          aria-label="Eemalda võrdlusest"
        >
          ✕
        </button>
        <span className="absolute top-2 left-2 eyebrow text-[10px] bg-white/85 backdrop-blur px-2 py-0.5 text-ink">
          #{String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Name + location */}
      <div className="px-4 pt-3.5 pb-3">
        <p className="display-tight text-[17px] text-ink leading-[1.15] line-clamp-2 min-h-[2.6em]">
          {addr}
        </p>
        <p className="mt-1 text-[11.5px] text-muted">
          {city}{county ? ` · ${county}` : ""}
        </p>
      </div>

      {/* Key metrics with icons */}
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
          <span className="text-ink font-semibold tabnum">{terraceM2 != null && terraceM2 > 0 ? `${terraceM2} m²` : "—"}</span>
        </div>
      </div>

      {/* Price (large, color-coded) */}
      <div className="px-4 pt-3 pb-4 border-t border-rule">
        <p className="display text-[28px] leading-none tabnum"
           style={{ color: diffVsMedian == null ? undefined : diffVsMedian > 0.05 ? "#9A1B1B" : diffVsMedian < -0.05 ? "#166534" : undefined }}>
          {price != null ? fmtMoney(price) : "—"}
        </p>
        <p className="mt-1.5 text-[11.5px] text-muted">
          {pricePerM2 != null ? <><span className="tabnum">{fmtMoney(pricePerM2)}</span> / m²</> : "—"}
          {diffVsMedian != null && (
            <span className="ml-2" style={{ color: diffVsMedian > 0.05 ? "#9A1B1B" : diffVsMedian < -0.05 ? "#166534" : undefined }}>
              ({diffVsMedian > 0 ? "+" : ""}{(diffVsMedian * 100).toFixed(1)}%)
            </span>
          )}
        </p>
      </div>

      {/* Star ratings matrix */}
      <div className="px-4 pb-4">
        <p className="eyebrow text-faint mb-2.5">Elustiil</p>
        <ul className="space-y-1.5">
          {Object.entries(LIFESTYLE_LABELS).map(([k, label]) => (
            <li key={k} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-muted">{label}</span>
              <Stars value={l[k as keyof typeof l] ?? 0} />
            </li>
          ))}
        </ul>
      </div>

      {/* Data table (borderless) */}
      <div className="border-t border-rule">
        <table className="w-full text-[12px]">
          <tbody>
            <Row label="Valmimisaasta" value={fmtYear(e?.esmaneKasutus ?? e?.ehAlustKp)} />
            <Row label="Energiamärgis" value={<EnergyPill k={e?.energy[0]?.energiaKlass ?? null} />} />
            <Row label="Korruseid" value={e?.minKorrusteArv != null ? `${e.minKorrusteArv}${e.maxKorrusteArv && e.maxKorrusteArv !== e.minKorrusteArv ? `–${e.maxKorrusteArv}` : ""}` : "—"} />
            <Row label="Küte" value={e?.energy[0]?.kytteTyypTxt ?? "—"} />
            <Row label="Kasutusluba" value={fmtYear(e?.esmaneKasutus)} />
            <Row label="Omandivorm" value={c?.omvorm ?? "—"} />
            <Row label="Maksustamisväärtus" value={c?.maks_hind != null ? fmtMoney(c.maks_hind) : "—"} />
            <Row label="Katastri nr" value={c?.tunnus ?? "—"} mono />
            <Row label="EHR kood" value={e?.ehr_code ?? "—"} mono />
            <Row label="Parkimine" value="—" />
            <Row label="MyFitness" value="—" />
            <Row label="Ühistransport" value="—" />
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
