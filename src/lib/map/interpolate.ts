/**
 * IDW (inverse distance weighting) interpolation onto a regular grid.
 * Power=2 is standard for meteorological fields.
 */
export function idwGrid(
  points: { lat: number; lon: number; value: number }[],
  bbox: [number, number, number, number], // [west, south, east, north]
  cols = 160,
  rows = 160,
  power = 2
): Float32Array {
  const [west, south, east, north] = bbox
  const grid = new Float32Array(cols * rows)
  if (points.length === 0) return grid

  const dx = (east - west) / cols
  const dy = (north - south) / rows
  const nPoints = points.length

  let sumAll = 0
  for (let i = 0; i < nPoints; i++) sumAll += points[i].value
  const meanVal = sumAll / nPoints

  for (let r = 0; r < rows; r++) {
    const lat = south + (r + 0.5) * dy
    const rowOffset = r * cols
    for (let c = 0; c < cols; c++) {
      const lon = west + (c + 0.5) * dx
      let sumW = 0
      let sumVal = 0
      let exact = false

      for (let i = 0; i < nPoints; i++) {
        const p = points[i]
        const d2 = (lon - p.lon) * (lon - p.lon) + (lat - p.lat) * (lat - p.lat)

        if (d2 < 1e-8) {
          grid[rowOffset + c] = p.value
          exact = true
          break
        }

        const w = 1 / Math.pow(d2, power / 2)
        sumW += w
        sumVal += w * p.value
      }

      if (!exact) {
        grid[rowOffset + c] = sumW > 0 ? sumVal / sumW : meanVal
      }
    }
  }

  return grid
}
