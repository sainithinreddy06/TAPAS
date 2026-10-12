export type FieldBounds = [west: number, south: number, east: number, north: number]
export interface GridSpec {
  points: { lat: number; lon: number }[]
  cols: number
  rows: number
  bbox: FieldBounds
}

export const sampleAxis = (zoom: number) => zoom <= 4 ? 14 : zoom <= 6 ? 13 : zoom <= 8 ? 12 : zoom <= 10 ? 11 : 10
export const zoomBand = (zoom: number) => [4, 6, 8, 10, 16].find(limit => zoom <= limit) ?? 16

export function validBounds(bbox: FieldBounds): boolean {
  const [w, s, e, n] = bbox
  return bbox.every(Number.isFinite) && w < e && s < n && w >= -180 && e <= 180 && s > -85 && n < 85
}

/** Shared request extent: quarter-degree cache cells and a minimum model-support halo.
 * At ward zoom, a smaller screen does not imply a finer weather model. */
export function samplingBounds(bbox: FieldBounds): FieldBounds {
  if (!validBounds(bbox)) throw new Error('Invalid heat-field bounds')
  const [w, s, e, n] = bbox
  const cx = (w + e) / 2, cy = (s + n) / 2
  const dx = Math.max((e - w) * .6, .25), dy = Math.max((n - s) * .6, .25)
  return [
    Math.max(58, Math.floor((cx - dx) * 4) / 4),
    Math.max(4, Math.floor((cy - dy) * 4) / 4),
    Math.min(103, Math.ceil((cx + dx) * 4) / 4),
    Math.min(39, Math.ceil((cy + dy) * 4) / 4),
  ]
}

export function buildSampleGrid(bbox: FieldBounds, zoom: number): GridSpec {
  if (!validBounds(bbox)) throw new Error('Invalid heat-field bounds')
  const [west, south, east, north] = bbox, n = sampleAxis(zoom)
  const points: GridSpec['points'] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) points.push({
    lat: south + r / (n - 1) * (north - south),
    lon: west + c / (n - 1) * (east - west),
  })
  return { points, cols: n, rows: n, bbox }
}

export const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
export const inverseMercatorY = (y: number) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI

/** CanvasSource stretches its image in Web Mercator, not linear latitude. */
export function latitudeAtRow(y: number, h: number, bbox: FieldBounds): number {
  const south = mercatorY(bbox[1]), north = mercatorY(bbox[3])
  return inverseMercatorY(north - y / (h - 1) * (north - south))
}

export function fieldPosition(bbox: FieldBounds, w: number, h: number, lat: number, lon: number): [number, number] {
  return [(lon - bbox[0]) / (bbox[2] - bbox[0]) * (w - 1),
    (mercatorY(bbox[3]) - mercatorY(lat)) / (mercatorY(bbox[3]) - mercatorY(bbox[1])) * (h - 1)]
}
