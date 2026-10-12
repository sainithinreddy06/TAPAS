import { ApiError, record, safeHttpUrl, validatedRequest, validateIdentity, provenance, textOrNull } from '@/lib/api'
import { locationKey, validCoordinates, type SelectedLocation } from '@/lib/location'
import type { WardCollection } from '@/lib/types'
export function parseGeometry(payload: unknown, location: SelectedLocation): WardCollection {
  const r = record(payload)
  validateIdentity(r, location)
  if (r.type !== 'FeatureCollection' || !Array.isArray(r.features) || r.features.length > 500 || !textOrNull(r.version) || !textOrNull(r.source)) throw new ApiError('A versioned, sourced regional boundary collection is required.', undefined, undefined, 'invalid')
  let vertices = 0
  const ids = new Set<string>()
  for (const raw of r.features) {
    const f = record(raw), p = record(f.properties), g = record(f.geometry)
    if (f.type !== 'Feature' || typeof p.ward_id !== 'string' || !p.ward_id || ids.has(p.ward_id) || !['Polygon','MultiPolygon'].includes(String(g.type))) throw new ApiError('Invalid or duplicate regional boundary.', undefined, undefined, 'invalid')
    ids.add(p.ward_id)
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    if (!Array.isArray(polygons) || !polygons.length) throw new ApiError('Invalid polygon.', undefined, undefined, 'invalid')
    for (const polygon of polygons) {
      if (!Array.isArray(polygon) || !polygon.length) throw new ApiError('Invalid polygon rings.', undefined, undefined, 'invalid')
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4) throw new ApiError('Invalid boundary ring.', undefined, undefined, 'invalid')
        for (const point of ring) {
          if (!Array.isArray(point) || !validCoordinates(point[1], point[0]) || ++vertices > 100000) throw new ApiError('Invalid or oversized regional coordinates.', undefined, undefined, 'invalid')
          if (Math.abs(point[1] - location.latitude) > 5 || Math.abs(point[0] - location.longitude) > 5) throw new ApiError('Boundaries exceed the selected regional extent.', undefined, undefined, 'invalid')
        }
        if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) throw new ApiError('Boundary ring is not closed.', undefined, undefined, 'invalid')
      }
    }
  }
  return r as unknown as WardCollection
}
export async function fetchGeometry(location: SelectedLocation, signal?: AbortSignal): Promise<WardCollection> {
  const endpoint = process.env.NEXT_PUBLIC_GEOMETRY_URL
  if (!endpoint) throw new ApiError('Verified administrative boundaries are not connected for this area.', undefined, undefined, 'configuration')
  const url = safeHttpUrl(endpoint)
  url.searchParams.set('geographic_id', locationKey(location)); url.searchParams.set('latitude', String(location.latitude)); url.searchParams.set('longitude', String(location.longitude))
  return validatedRequest(url, (payload, fetchedAt, cached) => ({ ...parseGeometry(payload, location), provenance: provenance(record(payload), location, fetchedAt, cached) }), signal)
}
