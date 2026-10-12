export interface SelectedLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  countryCode: string
  state?: string
  district?: string
  locality?: string
  postalCode?: string
  granularity?: string
  timezone: string
  source: string
  bounds?: [number, number, number, number]
}

export const INDIA_BOUNDS: [number, number, number, number] = [68, 6, 98, 38]
export const INDIA_TIMEZONE = 'Asia/Kolkata'

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

/** A viewport check, not a claim of administrative jurisdiction. */
export function withinIndiaViewport(lat: number, lon: number): boolean {
  return validCoordinates(lat, lon) && lon >= 68 && lon <= 98 && lat >= 6 && lat <= 38
}

export function coordinateLocation(latitude: number, longitude: number): SelectedLocation {
  if (!withinIndiaViewport(latitude, longitude)) throw new Error('Enter latitude, longitude within the India map region. Check the coordinate order.')
  return { id: `coords:${latitude.toFixed(5)},${longitude.toFixed(5)}`, name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    latitude, longitude, countryCode: '', timezone: INDIA_TIMEZONE, source: 'Entered coordinates' }
}

export function locationKey(location: SelectedLocation | null): string {
  return location ? `point:${location.latitude.toFixed(5)}:${location.longitude.toFixed(5)}` : 'unselected'
}

export function locationContext(location: SelectedLocation): string {
  return Array.from(new Set([location.locality, location.district, location.state, location.countryCode === 'IN' ? 'India' : 'Country not verified'].filter(Boolean))).join(', ')
}

export function readLocationParams(params: URLSearchParams): SelectedLocation | null {
  if (!params.has('lat') || !params.has('lon')) return null
  const latitude = Number(params.get('lat')), longitude = Number(params.get('lon'))
  if (!withinIndiaViewport(latitude, longitude)) return null
  const base = coordinateLocation(latitude, longitude)
  // URL labels are user supplied. They must never establish an official programme's jurisdiction.
  return { ...base, name: params.get('place')?.slice(0, 180) || base.name, source: 'Shared coordinates' }
}

export function selectionParams(location: SelectedLocation | null, date: string, wardId: string | null): string {
  const params = new URLSearchParams()
  if (location) {
    params.set('lat', location.latitude.toFixed(5)); params.set('lon', location.longitude.toFixed(5))
    params.set('place', location.name)
  }
  params.set('date', date)
  if (location && wardId) params.set('ward', wardId)
  return params.toString()
}
