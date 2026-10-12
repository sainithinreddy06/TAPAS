export interface SamplePoint {
  id?: string
  name?: string
  latitude: number
  longitude: number
  temperature?: number | null
  humidity?: number | null
  apparent?: number | null
  wind?: number | null
  heatIndex?: number | null
  mrt?: number | null
  time?: string
}

export interface Probe {
  lat: number
  lon: number
  value: number | null
  nearest: SamplePoint | null
  distanceKm: number | null
}

/** Bilinear sample of the interpolated field at an arbitrary lat/lon. */
export function probeField(
  field: Float32Array,
  w: number,
  h: number,
  bbox: [number, number, number, number],
  lat: number,
  lon: number
): number | null {
  const [west, south, east, north] = bbox
  if (lat < south || lat > north || lon < west || lon > east) return null

  const fx = ((lon - west) / (east - west)) * (w - 1)
  const fy = ((north - lat) / (north - south)) * (h - 1)
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(fx)))
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(fy)))
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = Math.min(y0 + 1, h - 1)
  const tx = fx - x0
  const ty = fy - y0

  const v00 = field[y0 * w + x0]
  const v10 = field[y0 * w + x1]
  const v01 = field[y1 * w + x0]
  const v11 = field[y1 * w + x1]
  if ([v00, v10, v01, v11].some(isNaN)) return null

  return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dl = (lat2 - lat1) * rad
  const dn = (lon2 - lon1) * rad
  const a =
    Math.sin(dl / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dn / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

export function nearestPoint<T extends { latitude: number; longitude: number }>(
  points: T[],
  lat: number,
  lon: number
): { point: T; distanceKm: number } | null {
  let result: { point: T; distanceKm: number } | null = null
  for (const point of points) {
    const distance = distanceKm(lat, lon, point.latitude, point.longitude)
    if (!result || distance < result.distanceKm) {
      result = { point, distanceKm: distance }
    }
  }
  return result
}
