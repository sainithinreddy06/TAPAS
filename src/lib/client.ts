/** Validated frontend transport. No scientific values are generated here. */
import type { SelectedLocation } from './location'
import { locationKey } from './location'
import { clampRiskLevel } from './utils'
import type { Alert, AlertsResponse, DataProvenance, FacilitiesResponse, Facility, ForecastHour, HindcastResponse, OccupationalResponse, OccupationalWindow, RiskMapResponse, WardForecast, WardRisk, WardRiskSeries } from './types'

export const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''
export type ErrorKind = 'configuration' | 'network' | 'timeout' | 'rate-limit' | 'invalid' | 'no-coverage' | 'offline'
export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly url?: string, readonly kind: ErrorKind = 'network') { super(message); this.name = 'ApiError' }
}
export type Json = Record<string, unknown>
export function record(value: unknown): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('The data provider returned an invalid object.', undefined, undefined, 'invalid')
  return value as Json
}
export function numberOrNull(value: unknown, min = -Infinity, max = Infinity): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
}
export function textOrNull(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null }
export function timestamp(value: unknown): string | null {
  const s = textOrNull(value)
  return s && /T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(s) && Number.isFinite(Date.parse(s)) ? s : null
}
export function isoDate(value: unknown): string | null {
  const s = textOrNull(value)
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const date = new Date(`${s}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s ? s : null
}
function requiredText(value: unknown, field: string): string {
  const s = textOrNull(value)
  if (!s) throw new ApiError(`The response is missing ${field}.`, undefined, undefined, 'invalid')
  return s
}
export function list(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload
  const r = record(payload)
  for (const key of keys) if (Array.isArray(r[key])) return r[key] as unknown[]
  throw new ApiError('The provider returned an invalid list.', undefined, undefined, 'invalid')
}
export function safeHttpUrl(value: string): URL {
  const url = new URL(value, typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new ApiError('Provider URL must use HTTPS (HTTP is allowed only on localhost).', undefined, undefined, 'configuration')
  return url
}
export async function fetchJson(url: string | URL, signal?: AbortSignal, init?: RequestInit): Promise<unknown> {
  const target = safeHttpUrl(String(url)), controller = new AbortController()
  const cancel = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', cancel, { once: true }); if (signal?.aborted) cancel()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, 12000)
  try {
    const response = await fetch(target, { ...init, headers: { Accept: 'application/json', ...init?.headers }, signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new ApiError(response.status === 429 ? 'Provider rate limit reached. Please try again later.' : response.status === 404 ? 'No data coverage is available for this request.' : `Data request failed (${response.status}).`, response.status, target.href, response.status === 429 ? 'rate-limit' : response.status === 404 ? 'no-coverage' : 'network')
    const body = await response.text()
    if (body.length > 3_000_000) throw new ApiError('Dataset exceeds the supported regional size.', undefined, undefined, 'invalid')
    try { return JSON.parse(body) } catch { throw new ApiError('Provider returned malformed JSON.', undefined, undefined, 'invalid') }
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError')
    if (error instanceof ApiError) throw error
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    throw new ApiError(timedOut ? 'The data request timed out.' : offline ? 'Offline — no usable cached data for this selection.' : 'Unable to reach the data provider.', undefined, target.href, timedOut ? 'timeout' : offline ? 'offline' : 'network')
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel) }
}

const CACHE_KEY = 'tapas-validated-source-cache-v1'
type CacheEntry = { url: string; payload: unknown; fetchedAt: string }
function cacheEntries(): CacheEntry[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); return Array.isArray(data) ? data.filter((e): e is CacheEntry => Boolean(e && typeof e.url === 'string' && timestamp(e.fetchedAt) && Date.now() - Date.parse(e.fetchedAt) < 86400000)).slice(-24) : [] } catch { return [] }
}
/** Only validated responses enter cache; cached raw payloads are revalidated on read. */
export async function validatedRequest<T>(url: URL, parse: (payload: unknown, fetchedAt: string, fromCache: boolean) => T, signal?: AbortSignal): Promise<T> {
  try {
    const payload = await fetchJson(url, signal), fetchedAt = new Date().toISOString(), result = parse(payload, fetchedAt, false)
    try {
      const serialized = JSON.stringify([...cacheEntries().filter(e => e.url !== url.href), { url: url.href, payload, fetchedAt }].slice(-24))
      if (serialized.length < 2_000_000) localStorage.setItem(CACHE_KEY, serialized)
    } catch { /* Private browsing/quota does not invalidate genuine data. */ }
    return result
  } catch (error) {
    if (signal?.aborted || !(error instanceof ApiError) || error.kind === 'configuration') throw error
    const cached = cacheEntries().find(e => e.url === url.href)
    if (cached) return parse(cached.payload, cached.fetchedAt, true)
    throw error
  }
}
export function validateIdentity(r: Json, location: SelectedLocation, date?: string, wardId?: string): void {
  const loc = r.location && typeof r.location === 'object' ? r.location as Json : r
  const id = r.geographic_id ?? loc.geographic_id
  const lat = numberOrNull(loc.latitude ?? loc.lat), lon = numberOrNull(loc.longitude ?? loc.lon)
  const coordsMatch = lat !== null && lon !== null && Math.abs(lat - location.latitude) < 0.0001 && Math.abs(lon - location.longitude) < 0.0001
  if ((id !== undefined && id !== locationKey(location)) || ((lat !== null || lon !== null) && !coordsMatch) || (id === undefined && !coordsMatch)) throw new ApiError('Response location could not be verified. Data was not displayed.', undefined, undefined, 'invalid')
  if (date && r.date !== date) throw new ApiError('Response date does not match the selected date.', undefined, undefined, 'invalid')
  if (wardId && r.ward_id !== wardId) throw new ApiError('Response ward does not match the selection.', undefined, undefined, 'invalid')
}
export function provenance(r: Json, location: SelectedLocation, fetchedAt: string, fromCache: boolean): DataProvenance {
  return { source: textOrNull(r.source), issuedAt: timestamp(r.generated_at ?? r.issued_at), fetchedAt, geographicId: locationKey(location), fromCache, validUntil: timestamp(r.valid_until) }
}
export function normaliseWardRisk(raw: unknown, expectedDate?: string): WardRisk {
  const r = record(raw), date = isoDate(r.date)
  if (!date || (expectedDate && date !== expectedDate)) throw new ApiError('Invalid risk date.', undefined, undefined, 'invalid')
  return { ward_id: requiredText(r.ward_id, 'ward identity'), ward_name: textOrNull(r.ward_name) ?? requiredText(r.ward_id, 'ward identity'), city: textOrNull(r.city) ?? '', date,
    risk_level: clampRiskLevel(r.risk_level), utci_max: numberOrNull(r.utci_max), utci_p97: numberOrNull(r.utci_p97), utci_percentile: numberOrNull(r.utci_percentile, 0, 100), heat_index_max: numberOrNull(r.heat_index_max),
    hot_night: typeof r.hot_night === 'boolean' ? r.hot_night : null, consecutive_hot_days: Number.isInteger(r.consecutive_hot_days) ? numberOrNull(r.consecutive_hot_days, 0) : null,
    excess_deaths: numberOrNull(r.excess_deaths, 0), excess_deaths_low: numberOrNull(r.excess_deaths_low, 0), excess_deaths_high: numberOrNull(r.excess_deaths_high, 0),
    confidence_level: numberOrNull(r.confidence_level, 0, 100), interval_type: textOrNull(r.interval_type), model_source: textOrNull(r.model_source) }
}
function windows(value: unknown): OccupationalWindow[] | null {
  if (value === null || value === undefined) return null
  return list(value, []).map(raw => { const r = record(raw), start = textOrNull(r.start), end = textOrNull(r.end)
    if (!start || !end || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(end) || start >= end) throw new ApiError('Invalid work window.', undefined, undefined, 'invalid')
    return { start, end }
  })
}
export function normaliseOccupational(payload: unknown): OccupationalResponse {
  const r = record(payload), date = isoDate(r.date)
  if (!date) throw new ApiError('Invalid occupational date.', undefined, undefined, 'invalid')
  const hourly = list(r.hourly, []).map(raw => {
    const h = record(raw), hour = numberOrNull(h.hour, 0, 23)
    if (hour === null || !Number.isInteger(hour)) throw new ApiError('Invalid hourly timestamp.', undefined, undefined, 'invalid')
    const band = ['safe', 'caution', 'warning', 'danger'].includes(String(h.band)) ? h.band as 'safe' | 'caution' | 'warning' | 'danger' : null
    let work = numberOrNull(h.work_pct, 0, 100), rest = numberOrNull(h.rest_pct, 0, 100)
    if (work === null || rest === null || Math.abs(work + rest - 100) > 0.01) { work = null; rest = null }
    return { hour, wbgt: numberOrNull(h.wbgt), band, work_pct: work, rest_pct: rest }
  }).sort((a, b) => a.hour - b.hour)
  let workRest: OccupationalResponse['work_rest'] = null
  if (r.work_rest) {
    const w = record(r.work_rest), work = numberOrNull(w.work_pct, 0, 100), rest = numberOrNull(w.rest_pct, 0, 100), range = windows([w.window])?.[0]
    if (work !== null && rest !== null && Math.abs(work + rest - 100) < 0.01 && range) workRest = { window: range, work_pct: work, rest_pct: rest }
  }
  return { ward_id: requiredText(r.ward_id, 'ward identity'), ward_name: textOrNull(r.ward_name) ?? String(r.ward_id), date, hourly, safe_windows: windows(r.safe_windows), avoid_windows: windows(r.avoid_windows), work_rest: workRest }
}
function requestUrl(path: string, location: SelectedLocation, date?: string, extra?: Record<string, string>): URL {
  if (!BASE) throw new ApiError('TAPAS scientific data is not connected for this area.', undefined, undefined, 'configuration')
  const url = safeHttpUrl(`${BASE}${path}`)
  for (const [key, value] of Object.entries({ geographic_id: locationKey(location), latitude: String(location.latitude), longitude: String(location.longitude), timezone: location.timezone, ...extra })) url.searchParams.set(key, value)
  if (date) url.searchParams.set('date', date)
  return url
}
function scoped<T extends object>(path: string, location: SelectedLocation, date: string | undefined, parse: (r: Json) => T, signal?: AbortSignal, wardId?: string, extra?: Record<string, string>): Promise<T & { provenance: DataProvenance }> {
  return validatedRequest(requestUrl(path, location, date, extra), (payload, fetchedAt, fromCache) => {
    const r = record(payload); validateIdentity(r, location, date, wardId)
    const result = parse(r), metadata = provenance(r, location, fetchedAt, fromCache)
    if ('alerts' in result && Array.isArray(result.alerts)) result.alerts = result.alerts.map(alert => ({...alert, provenance: metadata}))
    return { ...result, provenance: metadata }
  }, signal)
}
export const api = {
  riskMap: (date: string, location: SelectedLocation, signal?: AbortSignal): Promise<RiskMapResponse> => scoped('/api/risk/map', location, date, r => ({ city: textOrNull(r.city) ?? '', date, generated_at: timestamp(r.generated_at), wards: list(r, ['wards']).map(w => normaliseWardRisk(w, date)), summary: r.summary ? normaliseWardRisk(r.summary, date) : null, coverage: r.coverage === 'none' ? 'none' as const : 'available' as const, methodology: textOrNull(r.methodology), run_id: textOrNull(r.run_id) }), signal),
  wardForecast: (wardId: string, location: SelectedLocation, date: string, signal?: AbortSignal): Promise<WardForecast> => scoped(`/api/forecast/${encodeURIComponent(wardId)}`, location, date, r => {
    const hourly: ForecastHour[] = list(r, ['hourly']).map(raw => { const h = record(raw), time = timestamp(h.time); if (!time) throw new ApiError('Forecast timestamp missing or invalid.', undefined, undefined, 'invalid'); return { time, utci: numberOrNull(h.utci), baseline_p97: numberOrNull(h.baseline_p97), wbgt: numberOrNull(h.wbgt), air_temp: numberOrNull(h.air_temp), relative_humidity: numberOrNull(h.relative_humidity, 0, 100), heat_index: numberOrNull(h.heat_index) } }).sort((a, b) => a.time.localeCompare(b.time))
    return { ward_id: wardId, ward_name: textOrNull(r.ward_name) ?? wardId, city: textOrNull(r.city) ?? '', generated_at: timestamp(r.generated_at), baseline_p97: numberOrNull(r.baseline_p97), hourly }
  }, signal, wardId),
  wardRisk: (wardId: string, days: number, location: SelectedLocation, date: string, signal?: AbortSignal): Promise<WardRiskSeries> => scoped(`/api/risk/${encodeURIComponent(wardId)}`, location, date, r => ({ ward_id: wardId, ward_name: textOrNull(r.ward_name) ?? wardId, city: textOrNull(r.city) ?? '', generated_at: timestamp(r.generated_at), days: list(r, ['days']).map(raw => { const row = normaliseWardRisk(raw); if (row.ward_id !== wardId) throw new ApiError('Wrong ward in risk series.', undefined, undefined, 'invalid'); return row }) }), signal, wardId, { days: String(days) }),
  occupational: (wardId: string, date: string, location: SelectedLocation, signal?: AbortSignal): Promise<OccupationalResponse> => scoped(`/api/occupational/${encodeURIComponent(wardId)}`, location, date, normaliseOccupational, signal, wardId),
  facilities: (wardId: string, location: SelectedLocation, signal?: AbortSignal): Promise<FacilitiesResponse> => scoped(`/api/facilities/${encodeURIComponent(wardId)}`, location, undefined, r => ({ ward_id: wardId, facilities: list(r, ['facilities']).map(raw => {
    const f = record(raw); return { id: requiredText(f.id, 'facility ID'), name: requiredText(f.name, 'facility name'), type: requiredText(f.type, 'facility type') as Facility['type'], distance_km: numberOrNull(f.distance_km, 0), last_verified: isoDate(f.last_verified), address: textOrNull(f.address) ?? undefined, capacity: numberOrNull(f.capacity, 0) ?? undefined, phone: textOrNull(f.phone) ?? undefined }
  }) }), signal, wardId),
  alerts: (level: number, limit: number, location: SelectedLocation, date: string, signal?: AbortSignal): Promise<AlertsResponse> => scoped('/api/alerts', location, date, r => ({ alerts: list(r, ['alerts']).map(raw => {
    const a = record(raw), alertDate = isoDate(a.date); if (!alertDate) throw new ApiError('Invalid alert date.', undefined, undefined, 'invalid')
    return { id: requiredText(a.id, 'alert ID'), ward_id: requiredText(a.ward_id, 'alert ward'), ward_name: textOrNull(a.ward_name) ?? String(a.ward_id), city: textOrNull(a.city) ?? '', risk_level: clampRiskLevel(a.risk_level), date: alertDate, issued_at: timestamp(a.issued_at), expires_at: timestamp(a.expires_at), headline: textOrNull(a.headline) ?? '', advisory_en: textOrNull(a.advisory_en) ?? '', advisory_hi: textOrNull(a.advisory_hi) ?? '', advisory_te: textOrNull(a.advisory_te) ?? '', ward_count: numberOrNull(a.ward_count, 0) ?? undefined } satisfies Alert
  }) }), signal, undefined, { level: String(level), limit: String(limit) }),
  capXml: async (alertId: string): Promise<string> => {
    if (!BASE) throw new ApiError('Official alert export is not connected.', undefined, undefined, 'configuration')
    const url = safeHttpUrl(`${BASE}/api/alerts/${encodeURIComponent(alertId)}/cap`), res = await fetch(url, { signal: AbortSignal.timeout(12000), cache: 'no-store', headers: { Accept: 'application/xml' } })
    if (!res.ok) throw new ApiError(`Official alert export failed (${res.status}).`, res.status)
    const xml = await res.text()
    if (xml.length > 500000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new ApiError('Invalid CAP document.', undefined, undefined, 'invalid')
    const parsed = new DOMParser().parseFromString(xml, 'application/xml')
    if (parsed.querySelector('parsererror') || parsed.documentElement.namespaceURI !== 'urn:oasis:names:tc:emergency:cap:1.2' || parsed.getElementsByTagNameNS('*', 'identifier')[0]?.textContent !== alertId) throw new ApiError('CAP export does not match the requested alert.', undefined, undefined, 'invalid')
    return xml
  },
  hindcast: async (): Promise<HindcastResponse> => { throw new ApiError('Validation results are not connected.', undefined, undefined, 'configuration') },
}
export type Api = typeof api
