import { contours } from 'd3-contour'
import type { FeatureCollection, MultiPolygon } from 'geojson'
import mask from '@/data/india-land-mask.json'

// UTCI thresholds — the official stress categories, not arbitrary steps
export const UTCI_BANDS = [9, 26, 32, 38, 46]
// Heat Index thresholds — NOAA categories
export const HI_BANDS = [27, 32, 41, 54]

function isInsideLand(lon: number, lat: number): boolean {
  const ring = mask.geometry.coordinates[0] as number[][]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function buildContours(
  grid: Float32Array,
  cols: number,
  rows: number,
  bbox: [number, number, number, number],
  metric: string
): FeatureCollection<MultiPolygon> {
  const [west, south, east, north] = bbox
  const isHi = metric === 'heat_index' || metric === 'heatIndex'
  const thresholds = isHi ? HI_BANDS : UTCI_BANDS

  const lonSpan = east - west
  const latSpan = north - south
  const isWideView = lonSpan > 8 || latSpan > 8
  const dx = lonSpan / cols
  const dy = latSpan / rows

  const values = new Float32Array(grid.length)
  for (let r = 0; r < rows; r++) {
    const lat = south + (r + 0.5) * dy
    const rowOffset = r * cols
    for (let c = 0; c < cols; c++) {
      const lon = west + (c + 0.5) * dx
      const idx = rowOffset + c
      if (isWideView && !isInsideLand(lon, lat)) {
        values[idx] = NaN
      } else {
        values[idx] = grid[idx]
      }
    }
  }

  const rawContours = contours()
    .size([cols, rows])
    .thresholds(thresholds)(Array.from(values))

  const features = rawContours.map((c, idx) => {
    const threshold = thresholds[idx] ?? c.value
    const level = idx + 1 // Level 1 to 5
    const label = !isHi
      ? level === 1
        ? 'No thermal stress (9–26°C)'
        : level === 2
        ? 'Moderate heat stress (26–32°C)'
        : level === 3
        ? 'Strong heat stress (32–38°C)'
        : level === 4
        ? 'Very strong heat stress (38–46°C)'
        : 'Extreme heat stress (> 46°C)'
      : level === 1
      ? 'Caution (27–32°C)'
      : level === 2
      ? 'Extreme Caution (32–41°C)'
      : level === 3
      ? 'Danger (41–54°C)'
      : 'Extreme Danger (> 54°C)'

    const transformedCoordinates: number[][][][] = c.coordinates.map((poly) =>
      poly.map((ring) =>
        ring.map(([gx, gy]) => [
          west + (gx / cols) * lonSpan,
          south + (gy / rows) * latSpan,
        ])
      )
    )

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'MultiPolygon' as const,
        coordinates: transformedCoordinates,
      },
      properties: {
        threshold,
        level,
        label,
        metric,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}
