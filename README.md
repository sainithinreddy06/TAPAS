# TAPAS — Thermal Analytics & Public-health Advisory System

An India-ready public heat-safety frontend prototype. Place discovery, public weather, nearby mapped help and official reference guidance work independently of TAPAS scientific coverage. Fallbacks replay genuine provider recordings with explicit Snapshot labels and original timestamps; no invented science or ward boundaries enter operational views.

## Run

Use Node and npm, then `npm install` and `npm run dev`. On Windows PowerShell use `npm.cmd` when script execution policy blocks `npm.ps1`. Copy `.env.example` to `.env.local` only when you want to configure providers. Existing `NEXT_PUBLIC_DEMO_FALLBACK` settings are ignored. `/` redirects to `/dashboard`.

`npm run build` produces the production app and service worker; `npm start` serves it. The existing Inter font is downloaded by Next at build time and self-hosted in the built assets, so the initial build needs access to Google Fonts. HTTPS or localhost is needed for location access, service workers and install prompts.

## Location and data scope

The root LocationProvider owns coordinates, display context, selected ward and an India Standard Time date. The URL preserves `lat`, `lon`, `place`, `date`, and optional `ward` across pages and reloads. A URL label does not verify jurisdiction. Reverse geocoding can supply administrative context without moving the selected point. Every scientific query key includes point identity and date; requests are cancellable, and previous-location placeholders are disabled. Coordinate identity is `point:<latitude to 5 decimals>:<longitude to 5 decimals>`.

Search supports named places, districts, localities, mapped six-digit PIN codes and latitude/longitude. Nominatim returns live OSM results, not a hand-maintained city list. Search requires Enter or Search to respect the public Nominatim ban on autocomplete; calls share a 1.1-second rate gate and include the browser Referer. PIN/address coverage varies. The India viewport is a geographic filter, not a legal-boundary assertion. Geolocation is requested only on the user's action.

Weather comes from Open-Meteo's weather models. Air temperature, relative humidity and apparent temperature use the same valid time. Today's model current values or the selected date's midday hourly forecast are labelled accordingly. UTCI, WBGT, risk and mortality are never derived from apparent temperature or fabricated from absent data.

## Provider configuration and use limits

| Variable | Default / purpose |
| --- | --- |
| NEXT_PUBLIC_API_URL | Empty: scoped TAPAS scientific data unavailable. Existing local configuration remains respected. |
| NEXT_PUBLIC_GEOMETRY_URL | Empty: no scientific boundary layer; selected-place basemap remains usable. |
| NEXT_PUBLIC_GEOCODER_URL | Nominatim public endpoint. Explicit submission, minimum 3 characters, cancellable, rate limited to one call per 1.1 seconds. |
| NEXT_PUBLIC_WEATHER_URL | Open-Meteo forecast endpoint. Public noncommercial prototype tier, 10-minute query freshness. Review licensing/limits for deployment. |
| NEXT_PUBLIC_OVERPASS_URL | Overpass API. Bounded 3 km query, at most 40 OSM results, 15-minute freshness, no retry storm or map-pan fetches. |
| NEXT_PUBLIC_OFFICIAL_RESOURCES_URL | Optional sourced regional relief inventory. |
| NEXT_PUBLIC_OFFICIAL_INFORMATION_URL | Optional authority notices/programmes with jurisdiction and validity. |
| NEXT_PUBLIC_MAP_TILE_URL | OSM raster tile template. Normal interactive loading; no offline prefetch or bulk tile download. Update attribution if changing provider. |

All NEXT_PUBLIC values are public bundle configuration. Do not put secret credentials in them. Public endpoints can throttle, fail, or lack coverage. Production volume needs appropriate service agreements or self-hosting. Provider documentation: [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/), [Open-Meteo API](https://open-meteo.com/en/docs), [Open-Meteo terms](https://open-meteo.com/en/terms), [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

## Scientific API adapter contract

`src/lib/client.ts` validates source payloads before display or persistence. `src/lib/types.ts` describes normalized UI types. Requests carry `geographic_id`, `latitude`, `longitude`, `timezone`, and selected `date` where relevant. Responses must echo the requested geographic ID, or matching numeric coordinates, and date; supplied contradictory identity is rejected. Ward endpoints must also match `ward_id`.

| Endpoint | Envelope and use |
| --- | --- |
| GET /api/risk/map | `wards`, optional `summary`, `coverage`, `methodology`, `run_id`. Ranking derives from these same rows. |
| GET /api/risk/{ward_id}?days=5 | `days`; each row must match the ward and have its own valid date. |
| GET /api/forecast/{ward_id} | `hourly` with timezone-qualified times, nullable UTCI/WBGT/temperature/humidity/baseline fields. |
| GET /api/occupational/{ward_id} | `hourly`, nullable `safe_windows`, `avoid_windows`, `work_rest`; work/rest percentages must be consistent. |
| GET /api/facilities/{ward_id} | `facilities`; missing distance/verification remains unknown. |
| GET /api/alerts?level=1&limit=200 | `alerts`; issue and expiry control validity display, Level 5 remains distinct. |
| GET /api/alerts/{id}/cap | Genuine CAP 1.2 XML with matching identifier and required metadata. No generated substitute. |

Source metadata: `source`, timezone-qualified `generated_at` or `issued_at`, optional `valid_until`. Scientific numeric fields accept finite numbers only; null, numeric strings and invalid levels remain unavailable. Mortality uncertainty is displayed only when interval bounds contain the supplied estimate; no fixed confidence level or publication is assumed. No work/rest schedule is inferred. Scientific model validation and secure role-based authentication remain external dependencies; frontend demo-role guards do not provide security; About makes no published hindcast or official-authority claims.

The geometry endpoint receives point identity/coordinates and returns `type: FeatureCollection`, `geographic_id`, `source`, `version`, and Polygon/MultiPolygon features with stable `properties.ward_id`. Limits: 500 features, 100,000 vertices, 3 MB JSON text, and regional coordinates within five degrees of the selected point. Duplicate identities, invalid coordinates and unclosed rings are rejected. These bounds support regional payloads, not a country-wide monolithic geometry download. Production national coverage requires a genuine regional boundary/risk association service; none is bundled.

## Nearby and official information

Medical facilities and drinking-water POIs come from OpenStreetMap via Overpass. Names, coordinates, source links and actual source metadata are shown where present. Straight-line distance is computed from the selected point. Directions open Google Maps with real coordinates. Neither distance nor source opening-hours tags imply current availability. Emergency filtering includes medical POIs only when the source lists emergency service. Generic clinics are not claimed to be official cooling centres.

Optional authority resources require `resources` rows with `id`, `name`, `category`, numeric `latitude`/`longitude`, `countryCode: IN`, `authority` and an HTTPS `.gov.in`/`.nic.in` `sourceUrl`. Optional `validUntil`, `verifiedAt`, `dataTimestamp`, `phone`, `openingHours`, `accessibility` are validated. Expired records are discarded. Cooling, shelter and misting remain unavailable without these sourced records. No hospital capacity, free water, operational misting or live opening is invented.

Optional official information returns `items` with `id`, `title`, `summary`, `authority`, official `sourceUrl`, `kind: reference|advisory|programme`, and `scope` (`countryCode`, optional `state`, `district`, `locality`). Active notices/programmes require valid `issuedAt`, `validFrom`, `validUntil`; location context and selected date must match. The frontend cannot authenticate an authority merely from a claimed URL; deployments must curate and govern this feed. Built-in NCDC, IMD and NDMA links are national references, never asserted active local programmes. India emergency 112 opens a dialler; there is no dispatch integration.

## Offline and installation

Serwist precaches all seven route shells, scripts, styles, icons and static first-aid content. Exactly one registration owner handles worker updates. Install UI appears only for a real browser `beforeinstallprompt`; iOS shows Safari instructions. Worker updates require the user's Update and reload action and preserve the URL.

The API adapter caches only successfully validated scientific, geometry and weather JSON. It revalidates cached payloads, preserves retrieval time and marks fallback provenance. Cache: at most 24 entries, 24-hour retention, less than 2 MB serialized text. Provider failures, including malformed responses, may use previously validated cache entries; each cached payload is independently revalidated. Real POIs persist in a separate bounded 12-entry, 24-hour, 1.5 MB cache with original retrieval and map timestamps. Weather then falls back to bundled recordings; POIs have a partial Mumbai recording. Locations outside recorded or cached coverage show explicit absence. Notice lists remain memory-only. Tiles are not bulk-cached or prefetched. This is not complete offline map coverage.

Offline navigation preserves selected URL parameters and can open precached routes not visited by the user. Unknown routes use a static offline page. Browser storage can be evicted; device installation and standalone behavior require real-device testing. Development disables the worker.

## Verification

- `npm run lint`, `npm run typecheck`, `npx tsc --noEmit -p tsconfig.sw.json`
- `npm test`: source validation, missing science, mortality uncertainty, official applicability, resources, offline notices and install events.
- `npm run test:e2e`: deterministic fixtures isolated under `src/tests/e2e`; none is imported by the application. Starts a local development server.
- Set `PLAYWRIGHT_CHANNEL=chrome` or `msedge` to use an installed browser, or run `npm run test:e2e:install` for bundled Chromium.
- Production PWA: build/start on a separate port; set `PLAYWRIGHT_BASE_URL=http://localhost:3100`, `PLAYWRIGHT_PWA=1`, and run `npm run test:e2e -- pwa.spec.ts`.
- Optional public-provider smoke checks use `PLAYWRIGHT_LIVE=1` and `liveProviders.spec.ts`; these depend on live services.

See `FRONTEND_COMPLETION.md` for the actual results, changed-file inventory, mobile coverage and remaining external dependencies for this implementation.

## Independent heat layer and recorded fallbacks

The default national map has 68 Open-Meteo model points in two batched requests. Zoom 6–9 samples up to 40 points; zoom 10+ up to 25. A Natural Earth land mask excludes offshore request points and is not an official political boundary. Viewport changes debounce 500 ms; TanStack Query keys include zoom band, rounded bounds and date, with 15-minute freshness and abortable requests. Graduated circles use Heat Index categories, or a clearly named air-temperature palette. Grey means Heat Index unavailable/outside its domain.

The NOAA Rothfusz regression and both humidity adjustments are in src/lib/thermal/index.ts. Sources: [NWS Heat Index](https://www.weather.gov/safety/heat-index) and [WPC equation](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml). Inputs use explicit Celsius/Fahrenheit conversion, the NWS applicability screen, finite guards and a 26.7–58°C temperature domain. Extreme displays cap at >55°C. No UTCI polynomial/MRT or WBGT estimation is shipped; therefore radiation and night-effect tests cannot validate those unimplemented calculations. They remain unavailable unless supplied by the scoped scientific API. General advice is sourced in src/lib/content/precautions.ts from [NDMA Annexure 4](https://nidm.gov.in/PDF/pubs/NDMA/27.pdf), prioritised editorially by the real category, never a clinical work limit.

Capture script scripts/capture-weather.cjs saved 98 genuine locations (68 grid + 30 cities) on 7 September 2026. src/data/weather-snapshot.json holds original provider responses, request coordinates, source URLs and retrieval times; heat-snapshot.json is its compact derived index. The provider is Open-Meteo best-match models, not an asserted ECMWF-only dataset. Display coordinates and valid times come from the response. A local snapshot is used only within 10 km of the original model grid point and explicitly states that distance; dates are never rewritten to today. POI recording scripts/capture-poi.cjs saved 40 raw Mumbai records; Hyderabad and Karimnagar attempts returned 504/429, so no records were invented. Raw count is not guaranteed usable count after proximity/tag validation.

## Demo roles

/login offers Mandal Officer and District Authority tabs, a demo-credential autofill button, and public citizen entry. Use officer@tapas.gov.in or collector@tapas.gov.in with password tapas2026. Arrow keys, Home and End select the login role; entered credentials determine the authenticated role. /officer and /authority provide operational demonstration dashboards, including seeded scenarios and demo API routes. The shared location, date and ward persist through login, home and sign-out navigation. Protected links open the matching login role; sessions persist on reload. Entering /dashboard clears the demo session, while explicit Sign out returns home. Storage failures are shown when an existing session cannot be cleared. src/lib/auth/demoAuth.ts uses localStorage for this frontend demonstration only; it does not provide secure authentication. Never place private data behind these guards.
