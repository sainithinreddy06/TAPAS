'use client'

import { useQuery } from '@tanstack/react-query'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ExternalLink, Landmark } from 'lucide-react'
import type { SelectedLocation } from '@/lib/location'
import { fetchOfficialInformation, NATIONAL_REFERENCES, officialApplies, OFFICIAL_INFORMATION_URL, type OfficialInformation } from '@/lib/official'

function OfficialCard({ item }: { item: OfficialInformation }) {
  return <li className="min-w-0 rounded-md border border-border bg-card p-3"><p className="text-[11px] font-medium uppercase tracking-wide tapas-subtext">{item.kind === 'reference' ? 'National reference · not an active local notice' : `${item.kind} · ${[item.scope.locality, item.scope.district, item.scope.state].filter(Boolean).join(', ') || 'India'}`}</p><h3 className="mt-1 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs tapas-subtext">{item.authority}</p><p className="mt-2 text-sm leading-relaxed">{item.summary}</p>{item.issuedAt ? <p className="mt-2 text-xs tapas-subtext">Issued {item.issuedAt.slice(0, 10)}</p> : null}{item.validFrom && item.validUntil ? <p className="mt-1 text-xs tapas-subtext">Valid {item.validFrom} to {item.validUntil}</p> : <p className="mt-1 text-xs tapas-subtext">Reference material; no current local validity asserted.</p>}<a className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-medium underline underline-offset-2" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Read official source<ExternalLink className="h-3 w-3" aria-hidden="true" /></a></li>
}

export function OfficialHelp({ location, selectedDate }: { location: SelectedLocation | null; selectedDate: string }) {
  const online = useOnlineStatus()
  const query = useQuery({
    queryKey: ['official-information', OFFICIAL_INFORMATION_URL, location?.id, location?.latitude, location?.longitude, location?.state, location?.district, location?.locality, selectedDate],
    queryFn: ({ signal }) => location ? fetchOfficialInformation(location, selectedDate, signal) : Promise.resolve([]),
    enabled: Boolean(location && OFFICIAL_INFORMATION_URL), staleTime: 15 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: false, refetchOnWindowFocus: false,
  })
  const applicable = (query.data ?? []).filter(item => location && officialApplies(item, location, selectedDate))
  const references = NATIONAL_REFERENCES
  return <section aria-labelledby="official-heading" className="min-w-0 rounded-lg border border-border bg-card p-3 sm:p-4"><h2 id="official-heading" className="flex items-center gap-2 text-base font-semibold"><Landmark className="h-4 w-4 text-primary" aria-hidden="true" />Official information and support</h2><p className="mt-1 text-xs tapas-subtext">{location ? `${location.name} · ${selectedDate}` : 'India · national reference information'}</p><div role="status" className="my-3 rounded-md bg-secondary p-3 text-sm">{query.isFetching ? 'Checking applicable official information…' : query.isError ? 'Local official information could not be loaded. Check the authority links below.' : applicable.length ? `${applicable.length} source-linked item(s) match the selected area and date.` : 'No verified local programme or active advisory data is available here. Check official sources for current local announcements.'}</div>{!online ? <p className="mb-2 text-xs font-semibold">Offline: saved notices may be stale; external sources need a connection.</p> : null}{applicable.length ? <ul className="mb-3 grid gap-3 sm:grid-cols-2">{applicable.map(item => <OfficialCard key={item.id} item={item} />)}</ul> : null}<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{references.map(item => <OfficialCard key={item.id} item={item} />)}</ul></section>
}
