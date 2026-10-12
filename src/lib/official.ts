import type { SelectedLocation } from '@/lib/location'
import { officialSourceUrl, resourceJson, validPastTimestamp } from '@/lib/resources'

export interface OfficialInformation {
  id: string
  title: string
  summary: string
  authority: string
  sourceUrl: string
  kind: 'reference' | 'advisory' | 'programme'
  scope: { countryCode: string; state?: string; district?: string; locality?: string }
  issuedAt?: string
  validFrom?: string
  validUntil?: string
  reviewedAt?: string
}
export const OFFICIAL_INFORMATION_URL = process.env.NEXT_PUBLIC_OFFICIAL_INFORMATION_URL

/** Curated official reference links, not evidence of an active local warning or scheme. */
export const NATIONAL_REFERENCES: OfficialInformation[] = [
  {
    id: 'ncdc-heat-guidance', title: 'Heatwave health precautions',
    summary: 'National public-health guidance for the public, families and outdoor workers.',
    authority: 'National Centre for Disease Control · Ministry of Health & Family Welfare',
    sourceUrl: 'https://ncdc.mohfw.gov.in/uploads/pdf/heat2.pdf', kind: 'reference',
    scope: { countryCode: 'IN' }, reviewedAt: '2026-09-07',
  },
  {
    id: 'ndma-sachet', title: 'SACHET official disaster alerts',
    summary: 'Open the NDMA portal and check the affected area and validity of any warning.',
    authority: 'National Disaster Management Authority',
    sourceUrl: 'https://sachet.ndma.gov.in/', kind: 'reference', scope: { countryCode: 'IN' }, reviewedAt: '2026-09-07',
  },
  {
    id: 'imd-heatwave-guide', title: 'Understand official heatwave warnings',
    summary: 'IMD explains heatwave warnings, health effects and actions for the public.',
    authority: 'India Meteorological Department',
    sourceUrl: 'https://internal.imd.gov.in/section/nhac/dynamic/FAQ_heat_wave.pdf',
    kind: 'reference', scope: { countryCode: 'IN' }, reviewedAt: '2026-09-07',
  },
]
const normal = (value: string | undefined) => value?.trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ')
const isoDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value

export function officialApplies(item: OfficialInformation, location: SelectedLocation, selectedDate: string): boolean {
  if (!isoDate(selectedDate) || normal(item.scope.countryCode) !== normal(location.countryCode)) return false
  for (const field of ['state', 'district', 'locality'] as const) {
    // Missing administrative context cannot establish a local match.
    if (item.scope[field] && (!location[field] || normal(item.scope[field]) !== normal(location[field]))) return false
  }
  if (item.kind === 'reference') return true
  if (!item.issuedAt || !validPastTimestamp(item.issuedAt) || !isoDate(item.validFrom) || !isoDate(item.validUntil)) return false
  return item.validFrom <= selectedDate && selectedDate <= item.validUntil
}

export function parseOfficialInformation(payload: unknown): OfficialInformation[] {
  if (!payload || typeof payload !== 'object' || !('items' in payload) || !Array.isArray(payload.items) || payload.items.length > 500) throw new Error('Official information returned an invalid regional collection.')
  const items: OfficialInformation[] = []
  for (const value of payload.items as unknown[]) {
    if (!value || typeof value !== 'object') continue
    const row = value as Record<string, unknown>
    const text = (key: string) => typeof row[key] === 'string' && row[key].trim() ? row[key].trim().slice(0, 2000) : undefined
    const id = text('id'), title = text('title'), summary = text('summary'), authority = text('authority'), sourceUrl = officialSourceUrl(row.sourceUrl)
    if (!id || !title || !summary || !authority || !sourceUrl || !['advisory', 'programme', 'reference'].includes(String(row.kind))) continue
    if (!row.scope || typeof row.scope !== 'object') continue
    const rawScope = row.scope as Record<string, unknown>
    if (rawScope.countryCode !== 'IN') continue
    if (['state', 'district', 'locality'].some(key => rawScope[key] !== undefined && (typeof rawScope[key] !== 'string' || !(rawScope[key] as string).trim()))) continue
    const scope: OfficialInformation['scope'] = { countryCode: 'IN' }
    for (const field of ['state', 'district', 'locality'] as const) if (typeof rawScope[field] === 'string') scope[field] = rawScope[field].trim()
    const kind = row.kind as OfficialInformation['kind']
    const issuedAt = validPastTimestamp(row.issuedAt)
    if (kind !== 'reference' && (!issuedAt || !isoDate(row.validFrom) || !isoDate(row.validUntil) || row.validFrom > row.validUntil)) continue
    items.push({ id, title, summary, authority, sourceUrl, kind, scope, issuedAt, validFrom: isoDate(row.validFrom) ? row.validFrom : undefined, validUntil: isoDate(row.validUntil) ? row.validUntil : undefined })
  }
  return items
}

export async function fetchOfficialInformation(location: SelectedLocation, selectedDate: string, signal: AbortSignal): Promise<OfficialInformation[]> {
  if (!OFFICIAL_INFORMATION_URL) return []
  const url = new URL(OFFICIAL_INFORMATION_URL, window.location.origin)
  url.searchParams.set('country', location.countryCode)
  url.searchParams.set('lat', String(location.latitude))
  url.searchParams.set('lon', String(location.longitude))
  url.searchParams.set('date', selectedDate)
  if (location.state) url.searchParams.set('state', location.state)
  if (location.district) url.searchParams.set('district', location.district)
  if (location.locality) url.searchParams.set('locality', location.locality)
  return parseOfficialInformation(await resourceJson(url.href, signal)).filter(item => officialApplies(item, location, selectedDate))
}
