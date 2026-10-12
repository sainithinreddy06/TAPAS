# TAPAS API contract — for the Session 2 backend

This is the implementation spec for the backend that Session 2 builds in
`backend_BT/`. The frontend already validates every response against this
contract (`src/lib/client.ts`); a response that doesn't match is rejected and
the UI shows "Unavailable," never a fabricated value. Read `README.md`
("Scientific API adapter contract" and "Provider configuration") for the
prose version — this file is the implementer-facing spec with the exact
shapes and worked examples.

## Two separate data paths — don't reimplement the first one

TAPAS pulls from two independent sources. Session 2 only builds the second.

1. **Direct-to-provider adapters (already built, frontend-only, no backend
   involved).** Weather (Open-Meteo), geocoding (Nominatim), and nearby
   medical/water facilities (Overpass/OSM) are fetched straight from the
   browser in `src/lib/weather.ts`, `src/lib/geocoding.ts`,
   `src/lib/resources.ts`, `src/lib/heatGrid.ts`. These work today with zero
   backend and power the citizen dashboard, the heatmap, and search. **Do not
   rebuild these as backend endpoints** — there is nothing for Session 2 to
   do here.
2. **TAPAS scientific backend (Session 2's actual scope).** Ward-level heat
   risk, mortality estimates, occupational work/rest guidance, verified
   facility inventories, and alerts. This is the genuinely absent piece —
   `FRONTEND_COMPLETION.md` lists it under "Remaining external dependencies."
   The frontend already has a full, validated client for it
   (`src/lib/client.ts`, `src/lib/types.ts`); it is simply pointed at nothing
   (`NEXT_PUBLIC_API_URL=""`) until Session 2 runs.

## Wiring it up

Set `NEXT_PUBLIC_API_URL` (and `NEXT_PUBLIC_GEOMETRY_URL` for ward polygons)
in `frontend_FT/.env.local` to the backend's base URL. No frontend code
changes — `src/lib/client.ts` already builds every request against `BASE`.

Every request the frontend sends includes `geographic_id`, `latitude`,
`longitude`, `timezone`, and (where relevant) `date` as query params.
**Every response must echo back a matching `geographic_id` (or matching
numeric `latitude`/`longitude`), and matching `date`/`ward_id` where
applicable** — `validateIdentity` in `src/lib/client.ts` rejects anything
that doesn't, on the theory that a response for the wrong place is worse
than no response.

## Endpoints

### `GET /api/risk/map`

Params: `geographic_id`, `latitude`, `longitude`, `timezone`, `date`.

```jsonc
{
  "source": "TAPAS risk model v1",          // required
  "generated_at": "2026-09-09T03:00:00Z",   // ISO 8601, required
  "city": "Hyderabad",
  "wards": [ /* WardRisk[], see below */ ],
  "summary": { /* one WardRisk, optional — used when no ward is selected */ },
  "coverage": "available",                   // "available" | "none"
  "methodology": "https://...",              // optional link/description
  "run_id": "opt-run-id"
}
```

### `GET /api/risk/{ward_id}?days=5`

Params as above plus `days`. Response: `{ ward_id, ward_name, city, generated_at, days: WardRisk[] }` — every row's `ward_id` and `date` must match the request; `days` rows must each carry their own valid date (a 5-day series, not one row repeated).

### `GET /api/forecast/{ward_id}`

Response: `{ ward_id, ward_name, city, generated_at, baseline_p97, hourly: ForecastHour[] }` — 48 hourly steps, timezone-qualified `time`.

### `GET /api/occupational/{ward_id}?date=`

Response: `{ ward_id, ward_name, date, hourly: OccupationalHour[], safe_windows, avoid_windows, work_rest }`. `work_pct + rest_pct` must sum to 100 (±0.01) per hour and in `work_rest`, or the frontend discards the pair back to unavailable rather than show an inconsistent split.

### `GET /api/facilities/{ward_id}`

Response: `{ ward_id, facilities: Facility[] }`.

### `GET /api/alerts?level=&limit=&date=`

Response: `{ alerts: Alert[] }`. `issued_at`/`expires_at` drive validity display; Level 5 must stay visually distinct downstream, so don't collapse it into "High."

### `GET /api/alerts/{id}/cap`

Returns genuine **CAP 1.2 XML** (`Content-Type: application/xml`), namespace `urn:oasis:names:tc:emergency:cap:1.2`, with an `<identifier>` matching `{id}`. The frontend parses and rejects anything that doesn't parse or doesn't match — no synthetic CAP document is ever generated client-side.

### Ward geometry — `NEXT_PUBLIC_GEOMETRY_URL`

Request: point identity/coordinates. Response: a GeoJSON `FeatureCollection` with `geographic_id`, `source`, `version`, and Polygon/MultiPolygon features carrying a stable `properties.ward_id`. Limits enforced client-side: 500 features, 100,000 vertices, 3 MB of JSON text, coordinates within 5° of the requested point (this is a regional-payload endpoint, not a country-wide download). Duplicate ward IDs, malformed coordinates, and unclosed rings are rejected.

## Response envelope rules (apply to every endpoint above)

- `source` (string) and a timezone-qualified `generated_at` or `issued_at` are required; `valid_until` is optional.
- Numeric scientific fields (`utci_max`, `heat_index_max`, `excess_deaths`, …) accept **finite numbers or `null` only** — no numeric strings, no `NaN`/`Infinity`, no sentinel zeros for "no data." `null` renders as "Unavailable," never as `0` or `Low`.
- Mortality uncertainty (`excess_deaths_low`/`_high`) is only displayed if the interval actually contains the point estimate — don't send bounds that don't bracket the central value.
- Don't infer or backfill a work/rest schedule server-side if the underlying WBGT is missing; send `null` and let the frontend say so.

## Reference types (`src/lib/types.ts`)

```typescript
export type RiskLevel = 1 | 2 | 3 | 4 | 5

export interface WardRisk {
  ward_id: string; ward_name: string; city: string; date: string       // YYYY-MM-DD
  risk_level: RiskLevel | null
  utci_max: number | null            // peak UTCI, °C
  utci_p97: number | null            // ward 97th-percentile UTCI climatology
  utci_percentile?: number | null
  heat_index_max?: number | null
  hot_night: boolean | null
  consecutive_hot_days: number | null
  excess_deaths: number | null; excess_deaths_low: number | null; excess_deaths_high: number | null
  confidence_level?: number | null; interval_type?: string | null; model_source?: string | null
}

export interface ForecastHour {
  time: string; utci: number | null; baseline_p97: number | null
  wbgt?: number | null; air_temp?: number | null; relative_humidity?: number | null; heat_index?: number | null
}

export interface OccupationalHour {
  hour: number; wbgt: number | null; band: 'safe' | 'caution' | 'warning' | 'danger' | null
  work_pct: number | null; rest_pct: number | null
}

export interface Facility {
  id: string; name: string
  type: 'cooling_centre' | 'hospital' | 'phc' | 'water_point' | 'shelter'
  distance_km: number | null; last_verified: string | null   // ISO date
  address?: string; capacity?: number; phone?: string; latitude?: number; longitude?: number
}

export interface Alert {
  id: string; ward_id: string; ward_name: string; city: string
  risk_level: RiskLevel | null; date: string; issued_at: string | null; expires_at?: string | null
  headline: string; advisory_en: string; advisory_hi: string; advisory_te: string
  ward_count?: number
}
```

The full definitions (including `RiskMapResponse`, `WardRiskSeries`,
`OccupationalResponse`, `WardFeatureProperties`) live in `src/lib/types.ts` —
that file, not this document, is the source of truth if the two ever
disagree. The parsing and identity-validation logic that enforces all of the
above is `src/lib/client.ts`; read `normaliseWardRisk`, `normaliseOccupational`,
and `validateIdentity` before implementing so response shapes match on the
first try.

## What "done" looks like

Point `NEXT_PUBLIC_API_URL` at the running backend, open `/dashboard`, and
the "Optional ward science and boundary coverage" panel should switch from
"Ward risk service unavailable" to live ward rows — no frontend change
required beyond the env var.
