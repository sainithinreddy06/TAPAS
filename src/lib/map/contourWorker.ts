import { idwGrid } from './interpolate'
import { buildContours } from './contours'
import type { FeatureCollection, MultiPolygon } from 'geojson'

export interface ContourRequest {
  points: { lat: number; lon: number; value: number }[]
  bbox: [number, number, number, number]
  metric: string
  cols?: number
  rows?: number
  power?: number
}

/**
 * Asynchronously computes IDW grid and isotherm contour bands.
 * Runs non-blocking on a macro-task so the map UI remains 60fps interactive.
 */
export function computeContoursAsync(
  req: ContourRequest
): Promise<FeatureCollection<MultiPolygon>> {
  return new Promise((resolve) => {
    // Schedule on macro-task to avoid blocking user pan/zoom gestures
    setTimeout(() => {
      try {
        if (!req.points || req.points.length === 0) {
          resolve({ type: 'FeatureCollection', features: [] })
          return
        }
        const cols = req.cols ?? 160
        const rows = req.rows ?? 160
        const power = req.power ?? 2
        const grid = idwGrid(req.points, req.bbox, cols, rows, power)
        const contoursGeoJSON = buildContours(grid, cols, rows, req.bbox, req.metric)
        resolve(contoursGeoJSON)
      } catch (err) {
        console.error('Contour calculation error:', err)
        resolve({ type: 'FeatureCollection', features: [] })
      }
    }, 0)
  })
}
