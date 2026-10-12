import { idwGrid } from './interpolate'
import { buildContours } from './contours'

addEventListener('message', (event: MessageEvent) => {
  const { points, bbox, metric, cols = 160, rows = 160, power = 2, id } = event.data

  try {
    const grid = idwGrid(points, bbox, cols, rows, power)
    const contoursGeoJSON = buildContours(grid, cols, rows, bbox, metric)

    postMessage({
      id,
      success: true,
      contoursGeoJSON,
    })
  } catch (error: any) {
    postMessage({
      id,
      success: false,
      error: error?.message || 'Interpolation failed',
    })
  }
})
