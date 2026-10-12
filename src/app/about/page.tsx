import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { APP_LONG_NAME, APP_NAME } from '@/lib/constants'
import { NATIONAL_REFERENCES } from '@/lib/official'

const capabilities = [
  ['Place discovery', 'Search and selected coordinates are independent of scientific coverage. A place can be located even when TAPAS has no heat-risk data for it.'],
  ['Scientific conditions', 'Heat Index uses the NOAA Rothfusz equation and humidity adjustments within its domain. UTCI and WBGT remain unavailable without validated additional inputs or a supplied scientific feed. Model air temperature and apparent temperature have separate labels.'],
  ['Risk map', 'An independent Open-Meteo layer shows 68 national model points and up to 40 regional or 25 city samples. Genuine recordings preserve source coordinates and valid times when live data fails. These samples are not nationwide ward-level scientific coverage.'],
  ['Nearby help', 'OpenStreetMap supplies community-mapped medical and drinking-water POIs through Overpass. Their opening, current water supply and emergency capacity are not independently verified. Distances are straight-line from the selected point.'],
  ['Official support', 'National government guidance is presented as reference material. Local programmes, relief facilities and active notices require sourced records with geographic applicability and validity.'],
  ['Offline use', 'Previously cached data may be stale. Bundled genuine weather recordings and partial Mumbai POIs remain labelled Snapshot. Unvisited map tiles and unrecorded resources need a connection. Installation and storage behaviour depend on the browser.'],
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7 px-3 py-6 sm:px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-[var(--line-soft)] pb-6">
        <Image
          src="/tapas-emblem.png"
          alt="TAPAS Official Emblem"
          width={72}
          height={72}
          className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_2px_12px_rgba(242,184,75,0.2)]"
          priority
        />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ink-high)]">About {APP_NAME}</h1>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">{APP_LONG_NAME}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-mid)]">
            TAPAS (Earlier Warnings. Safer Lives.) is an extreme-heat early warning and public-health advisory system for India, built for Smart India Hackathon 2026 (SIH26083).
          </p>
        </div>
      </header>
      <section aria-labelledby="coverage-heading" className="rounded-lg border border-border bg-card p-4"><h2 id="coverage-heading" className="text-base font-semibold">What the prototype can establish</h2><dl className="mt-3 space-y-4">{capabilities.map(([title, text]) => <div key={title}><dt className="text-sm font-semibold">{title}</dt><dd className="mt-1 text-sm leading-relaxed tapas-subtext">{text}</dd></div>)}</dl></section>
      <section aria-labelledby="honesty-heading"><h2 id="honesty-heading" className="text-base font-semibold">Reading the data responsibly</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed"><li>Unavailable data does not mean low risk or permission to work.</li><li>Source issue time, record update time and retrieval time describe different things. Fetching an old record does not make it newly verified.</li><li>Mortality values, when supplied, are model estimates with uncertainty. They are not observed deaths. Scientific methodology and calibration require source validation.</li><li>Map listings can be incomplete. A generic clinic or drinking-water POI is not an official heat-relief centre.</li><li>Risk categories supplied by TAPAS data are not automatically the same as IMD warning categories.</li><li>Citizen, Mandal Officer and Higher Authority views share the same source-backed data. Role sessions are browser-only demos, not secure authentication or official emergency dispatch.</li></ul></section>
      <section aria-labelledby="official-sources-heading"><h2 id="official-sources-heading" className="text-base font-semibold">Official reference sources</h2><ul className="mt-3 space-y-3">{NATIONAL_REFERENCES.map(source => <li key={source.id} className="rounded-lg border border-border bg-card p-3"><a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-2">{source.title}<ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a><p className="text-xs tapas-subtext">{source.authority}</p><p className="mt-2 text-sm">{source.summary}</p><p className="mt-2 text-xs tapas-subtext">Reference checked {source.reviewedAt}; this is not a local active notice.</p></li>)}</ul></section>
      <section aria-labelledby="dependencies-heading" className="rounded-lg border border-border bg-secondary p-4"><h2 id="dependencies-heading" className="text-base font-semibold">Coverage and validation still needed</h2><p className="mt-2 text-sm leading-relaxed">A national risk feed, sourced regional boundaries, model validation, verified cooling and relief inventories, current facility availability and local official programme feeds remain data dependencies. TAPAS does not manufacture these datasets. No nationwide ward coverage or published model-validation result is claimed by this frontend.</p><p className="mt-3 text-xs font-medium">PAN-INDIA DATA DEPENDENCY</p><p className="mt-1 text-xs">BACKEND/DATA DEPENDENCY — NOT PART OF CURRENT FRONTEND IMPLEMENTATION</p></section>
      <footer className="text-xs tapas-subtext">Smart India Hackathon 2026 prototype. Map data: <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors, ODbL</a>. Resource provider: <a className="underline" href="https://wiki.openstreetmap.org/wiki/Overpass_API" target="_blank" rel="noopener noreferrer">Overpass API</a> by default; deployments may configure another provider.</footer>
    </div>
  )
}
