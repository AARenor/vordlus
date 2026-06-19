# võrdlus

**Kinnisvara võrdlus.** Võrdle kuni viit Eesti kinnisvaraobjekti kõrvuti: hind, energiamärgis, kasutusluba, pindala, naabruskond.

🔗 **Live demo:** [https://juured.vercel.app/vordlus](https://juured.vercel.app/vordlus) (will be deployed)

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** with custom warm-grey Nordic palette
- **Fraunces** (display serif) + **Inter Tight** (body) + **JetBrains Mono** (numbers)
- **4 serverless API routes** for CORS-safe same-origin proxying
- **localStorage** persistence + base64 URL share for comparison sets
- **Zero backend database** — all data from public Estonian open APIs in real time

## Live data sources (all free, no auth)

| Source | URL | Used for |
|---|---|---|
| **In-AKS** | `https://aks.geoportaal.ee/inaks/inaadress/gazetteer` | Address → ADS_OID + WGS84 |
| **Cadastre X-Road** | `https://cadastrepublic.kataster.ee/api/xroad/valid/{tunnus}` | Parcel area, tax value, land use, ownership |
| **EHR (Ehitisregister)** | `https://livekluster.ehr.ee/api/building/v2/buildingData?ehr_code={code}` | Build year, energy class, kasutusluba, floor count, heating |
| **kv.ee** | (not scraped — Cloudflare-gated) | We extract address hints from URL slugs only |

The comparison fetches data **per address**: In-AKS → building → kadastritunnus → cadastre. Same chain as juured.com.

## How to run

```bash
npm install
npm run dev
# open http://localhost:3011
```

## Project layout

```
src/
  app/
    layout.tsx              # global
    page.tsx                # the comparison dashboard
    globals.css             # editorial typography
    api/
      inaks/route.ts        # GET proxy → aks.geoportaal.ee
      cadastre/[tunnus]/    # GET proxy → cadastrepublic.kataster.ee
      ehr/[ehrCode]/        # GET proxy → livekluster.ehr.ee
      resolve/route.ts      # POST orchestrator: input → In-AKS → EHR → cadastre
  components/
    FilterSidebar.tsx       # left sidebar with accordions
    CompareSlot.tsx         # 5 paste slots
    CompareColumnView.tsx   # the comparison column
  lib/
    estdata.ts              # typed API adapters
    parseInput.ts           # parses user input (kv URL, address, tunnus, ehr)
    compareStore.ts         # localStorage + URL share
    lifestyle.ts            # 1–5 star scoring (deterministic stub; replace with POI-based)
  types/
    proj4.d.ts              # ambient type for proj4
```

## Features

- 5 paste slots, each accepts a kv.ee URL, an Estonian address, a cadastral id (`78401:001:0215`), or an EHR building id
- 5-column side-by-side comparison with photo, name, location, metrics (rooms / m² / terrace), price (color-coded vs market), €/m²
- Lifestyle star matrix (Park / School / Gym / Transit / Shop / Quiet) per property
- Borderless data table with all cadastral + EHR facts side-by-side
- Filter sidebar: price, area, rooms, county, energy class (A–H), lifestyle checklist
- "Salvesta" (Save) and "Minu konto" (My Account) header buttons — placeholder for v2 (no real auth)
- localStorage persistence + base64 URL share for sharing comparison sets
- Mobile-responsive: filters collapse to top, columns scroll horizontally
- All Estonian, no English

## Roadmap (v2+)

- Real lifestyle scores via distance-to-POI (parks, schools, transit)
- Pre-rendered architectural photos or `Maa-amet orthophoto` overlays
- Real AVM (median closed €/m² per micro-area from Maa-amet htraru via WFS)
- Save / share to server (instead of just localStorage)
- True accounts with saved comparisons

## License

Code: MIT. Data attribution: In-AKS, Maa-amet X-Road, Ehitisregister.
