'use client'

import { useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { Droplets, ExternalLink, Hospital, House, MapPin, Navigation, Phone, Pill, Snowflake, SprayCan } from 'lucide-react'
import type { SelectedLocation } from '@/lib/location'
import { directionsUrl, filterResources, phoneHref, RESOURCE_LABELS, RESOURCE_RADIUS_KM, type ResourceCategory, type SafetyResource } from '@/lib/resources'
import { Button } from '@/components/ui/button'
import { DataProvenance } from '@/components/data/DataProvenance'
import { cn } from '@/lib/utils'

export interface NearbyHelpProps {
  location: SelectedLocation | null
  resources?: SafetyResource[]
  selectedResourceId?: string | null
  onResourceSelect?: (resource: SafetyResource) => void
  category?: ResourceCategory
  onCategoryChange?: (category: ResourceCategory) => void
  isLoading?: boolean
  isError?: boolean
  error?: Error | null
  status?: 'live' | 'cached' | 'snapshot'
  originalAt?: string
  note?: string
  fetchedAt?: string
  limitations?: string[]
  onRetry?: () => void
}
const ICONS = { cooling: Snowflake, water: Droplets, medical: Hospital, pharmacy: Pill, shelter: House, emergency: Hospital, misting: SprayCan }
const categories: ResourceCategory[] = ['all', 'cooling', 'water', 'medical', 'pharmacy', 'shelter', 'emergency', 'misting']

function ResourceCard({ resource, location, selected, onSelect }: { resource: SafetyResource; location: SelectedLocation; selected: boolean; onSelect?: (resource: SafetyResource) => void }) {
  const Icon = ICONS[resource.category]
  const directions = directionsUrl(resource, location)
  const phone = phoneHref(resource.phone)
  const stale = resource.dataTimestamp && Date.now() - Date.parse(resource.dataTimestamp) > 90 * 24 * 60 * 60 * 1000
  return (
    <li data-resource-id={resource.id} className={cn('min-w-0 rounded-lg border bg-card p-3', selected ? 'border-primary ring-1 ring-primary' : 'border-border')}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <button type="button" className="min-h-11 w-full break-words text-left text-sm font-semibold hover:underline" aria-pressed={selected} onClick={() => onSelect?.(resource)}>{resource.name}<span className="sr-only"> — highlight on map</span></button>
          <p className="text-xs tapas-subtext">{RESOURCE_LABELS[resource.category]} · {resource.distanceKm < 0.1 ? '<0.1' : resource.distanceKm.toFixed(1)} km straight-line</p>
          {resource.address ? <p className="mt-1 break-words text-xs tapas-subtext">{resource.address}</p> : null}
          <p className="mt-2 text-xs font-medium">{resource.verification === 'community-mapped' ? 'Community mapped · operational status unverified' : 'Authority listed · current availability unconfirmed'}</p>
          <p className="mt-1 break-words text-xs tapas-subtext">{resource.openingHours ? `Listed hours: ${resource.openingHours}` : 'Opening hours unknown'}{resource.category === 'water' ? ' · Water supply not confirmed' : ''}</p>
          {resource.emergencyDepartment ? <p className="mt-1 text-xs tapas-subtext">Emergency service listed by source; confirm availability.</p> : null}
          {resource.accessibility ? <p className="mt-1 text-xs tapas-subtext">Source accessibility tag: {resource.accessibility}</p> : null}
          {resource.verifiedAt ? <p className="mt-1 text-xs tapas-subtext">Source verification date: {resource.verifiedAt.slice(0, 10)}</p> : <p className="mt-1 text-xs tapas-subtext">Field verification date unavailable</p>}
          {resource.dataTimestamp ? <p className={cn('mt-1 text-xs', stale ? 'text-amber-400' : 'tapas-subtext')}>Record updated {resource.dataTimestamp.slice(0, 10)}{stale ? ' · older than 90 days' : ''}</p> : null}
          <a className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs underline underline-offset-2" href={resource.sourceUrl} target="_blank" rel="noopener noreferrer">{resource.source}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" /></a>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => onSelect?.(resource)}><MapPin aria-hidden="true" /> Show on map</Button>
            {directions ? <Button asChild className="min-h-11"><a href={directions} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden="true" /> Directions<span className="sr-only"> in Google Maps, opens a new tab</span></a></Button> : null}
            {phone ? <Button asChild variant="outline" className="min-h-11"><a href={phone}><Phone aria-hidden="true" />{resource.phone}</a></Button> : null}
          </div>
        </div>
      </div>
    </li>
  )
}

export function NearbyHelp({ location, resources = [], selectedResourceId, onResourceSelect, category: controlledCategory, onCategoryChange, isLoading, isError, error, fetchedAt, status, originalAt, note, limitations = [], onRetry }: NearbyHelpProps) {
  const online = useOnlineStatus()
  const [localCategory, setLocalCategory] = useState<ResourceCategory>('all')
  const category = controlledCategory ?? localCategory
  const filtered = filterResources(resources, category)
  const nearest = filtered[0]
  const selected = filtered.find(resource => resource.id === selectedResourceId)
  // Keep a map-selected card visible even when a dense area has more than 20 records.
  const displayed = selected && !filtered.slice(0, 20).some(resource => resource.id === selected.id) ? [selected, ...filtered.slice(0, 19)] : filtered.slice(0, 20)
  return (
    <section aria-labelledby="nearby-heading" className="min-w-0 rounded-lg border border-border bg-card p-3 sm:p-4" id="nearby-help">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h2 id="nearby-heading" className="text-base font-semibold">Nearby help</h2><p className="mt-1 text-xs tapas-subtext">Mapped places within {RESOURCE_RADIUS_KM} km of {location?.name ?? 'your selected place'}. Coverage may be incomplete.</p></div>
        {nearest && !isLoading ? <Button variant="outline" className="min-h-11" onClick={() => onResourceSelect?.(nearest)}><Navigation aria-hidden="true" />Nearest {category === 'all' ? 'mapped help' : RESOURCE_LABELS[category].toLowerCase()}</Button> : null}
      </div>
      <div aria-label="Resource category" role="group" className="my-3 flex flex-wrap gap-1.5">
        {categories.map(value => <Button key={value} className="min-h-11 px-3" variant={category === value ? 'default' : 'outline'} aria-pressed={category === value} onClick={() => { setLocalCategory(value); onCategoryChange?.(value) }}>{RESOURCE_LABELS[value]}</Button>)}
      </div>
      <p className="mb-3 text-xs tapas-subtext">Proximity uses the selected point, not road distance or travel time. A map listing does not certify a safe, open or free facility. Directions open an external map with the selected coordinates.</p>
      <div role="status" aria-live="polite"><DataProvenance status={isError && status === 'live' ? 'cached' : status ?? 'unavailable'} source="OpenStreetMap via Overpass" timestamp={originalAt ?? fetchedAt} note={note ?? 'Source map records; retrieval is not field verification.'} />
        {!online && fetchedAt ? <p className="mb-2 text-xs font-semibold">Offline · saved resource listings may be stale.</p> : null}
        {!location ? <p className="text-sm tapas-subtext">Choose a location to find nearby medical help and drinking-water points.</p> : isLoading ? <p className="text-sm tapas-subtext">Finding mapped help near {location.name}…</p> : isError ? <p className="text-sm text-amber-400">{error?.message ?? 'Nearby help is unavailable. Check your connection and try again.'}</p> : filtered.length === 0 ? <p className="rounded-md bg-secondary p-3 text-sm">{['cooling', 'shelter', 'misting'].includes(category) ? 'No verified data available for this area.' : `No ${category === 'all' ? 'usable mapped resources' : RESOURCE_LABELS[category].toLowerCase() + ' results'} were returned within ${RESOURCE_RADIUS_KM} km.`} This does not mean no help exists here.</p> : <p className="mb-2 text-xs tapas-subtext">{filtered.length} mapped result{filtered.length === 1 ? '' : 's'}{filtered.length > 20 ? '; showing 20 — use filters or select markers on the map' : ''}. Nearest means nearest among the returned records.</p>}
      </div>
      {isError && onRetry ? <Button variant="outline" className="my-2 min-h-11" onClick={onRetry}>Retry nearby help</Button> : null}
      {location && !isLoading && displayed.length > 0 ? <ul className="grid max-h-[42rem] gap-3 overflow-y-auto overscroll-contain sm:grid-cols-2" data-testid="nearby-resources">{displayed.map(resource => <ResourceCard key={resource.id} resource={resource} location={location} selected={resource.id === selectedResourceId} onSelect={onResourceSelect} />)}</ul> : null}
      {fetchedAt ? <p className="mt-3 text-xs tapas-subtext">Records retrieved {new Date(fetchedAt).toLocaleString('en-IN', { timeZone: location?.timezone ?? 'Asia/Kolkata' })} · {location?.timezone ?? 'Asia/Kolkata'}. Retrieval time is not a field verification.</p> : null}
      {limitations.length > 0 ? <ul className="mt-2 space-y-1 text-xs tapas-subtext">{limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul> : null}
      <p className="mt-3 text-xs tapas-subtext"><a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a>. For a medical emergency in India, <a href="tel:112" className="font-semibold underline">call 112</a>.</p>
    </section>
  )
}
