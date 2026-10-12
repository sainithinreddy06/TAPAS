import landGeoJSON from '@/data/india-land-mask.json'

const landMaskCache = new Map<string, Uint8Array>()

/**
 * Builds a binary land mask (1 = land, 0 = ocean) rasterized onto a w × h grid.
 */
export function buildLandMask(
  landGeoJSONData: any,
  bbox: [number, number, number, number],
  w: number,
  h: number
): Uint8Array {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return new Uint8Array(w * h).fill(1)
  ctx.fillStyle = '#fff'

  const [west, south, east, north] = bbox
  const toPx = (lon: number, lat: number): [number, number] => [
    ((lon - west) / (east - west)) * w,
    ((north - lat) / (north - south)) * h,
  ]

  const features =
    landGeoJSONData.type === 'FeatureCollection'
      ? landGeoJSONData.features
      : landGeoJSONData.type === 'Feature'
      ? [landGeoJSONData]
      : landGeoJSONData.geometry
      ? [{ geometry: landGeoJSONData.geometry }]
      : []

  for (const f of features) {
    if (!f.geometry) continue
    const polys =
      f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates]
        : f.geometry.type === 'MultiPolygon'
        ? f.geometry.coordinates
        : []

    for (const rings of polys) {
      ctx.beginPath()
      rings.forEach((ring: number[][]) => {
        ring.forEach(([lon, lat]: number[], i: number) => {
          const [x, y] = toPx(lon, lat)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.closePath()
      })
      ctx.fill('evenodd')
    }
  }

  const data = ctx.getImageData(0, 0, w, h).data
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0
  return mask
}

/**
 * Recompute only when the bbox changes materially. Cache by rounded bbox.
 */
export function getCachedLandMask(
  bbox: [number, number, number, number],
  w = 150,
  h = 150
): Uint8Array {
  const [w0, s0, e0, n0] = bbox
  const key = `${Math.floor(w0 * 4) / 4},${Math.floor(s0 * 4) / 4},${Math.ceil(e0 * 4) / 4},${Math.ceil(n0 * 4) / 4}_${w}x${h}`
  if (landMaskCache.has(key)) {
    return landMaskCache.get(key)!
  }
  const mask = buildLandMask(landGeoJSON, bbox, w, h)
  landMaskCache.set(key, mask)
  return mask
}

export const getOrBuildLandMask = getCachedLandMask
