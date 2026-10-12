import type maplibregl from 'maplibre-gl'

export function updateHeatField(
  map: maplibregl.Map,
  canvas: HTMLCanvasElement,
  bbox: [number, number, number, number]
) {
  const [west, south, east, north] = bbox
  const coords: [[number, number], [number, number], [number, number], [number, number]] = [
    [west, north], // top-left
    [east, north], // top-right
    [east, south], // bottom-right
    [west, south], // bottom-left
  ]

  const existing = map.getSource('heat-field') as any
  if (existing) {
    const existingCanvas = typeof existing.getCanvas === 'function' ? existing.getCanvas() : null
    if (existingCanvas && existingCanvas !== canvas) {
      existingCanvas.width = canvas.width
      existingCanvas.height = canvas.height
      const ctx = existingCanvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, existingCanvas.width, existingCanvas.height)
        ctx.drawImage(canvas, 0, 0)
      }
    }
    existing.setCoordinates(coords)
    map.triggerRepaint()
    return // canvas source re-reads the canvas itself
  }

  map.addSource('heat-field', {
    type: 'canvas',
    canvas: canvas,
    coordinates: coords,
    animate: false,
  } as any)

  // CRITICAL: insert below the basemap's first symbol layer so place
  // names and roads stay readable through the surface.
  const layers = map.getStyle()?.layers || []
  const firstSymbol = layers.find(
    (l) => l.type === 'symbol' || l.id === 'dark_labels' || l.id.includes('label')
  )?.id

  if (!map.getLayer('heat-field-layer')) {
    map.addLayer(
      {
        id: 'heat-field-layer',
        type: 'raster',
        source: 'heat-field',
        paint: {
          'raster-opacity': 0.78,
          'raster-fade-duration': 300,
          'raster-resampling': 'linear',
        },
      },
      firstSymbol
    )
  }
}
