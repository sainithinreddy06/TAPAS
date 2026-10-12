import { colourFor, type HeatMetric } from './colormap'

export function renderField(
  field: Float32Array,
  w: number,
  h: number,
  metric: HeatMetric,
  landMask?: Uint8Array,
  targetCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const big = targetCanvas || document.createElement('canvas')
  big.width = w * 6
  big.height = h * 6

  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d')
  if (!sctx) return big
  const img = sctx.createImageData(w, h)

  for (let i = 0; i < w * h; i++) {
    const v = field[i]
    const o = i * 4

    if (isNaN(v) || (landMask && landMask[i] === 0)) {
      img.data[o + 3] = 0 // transparent
      continue
    }

    const [r, g, b] = colourFor(v, metric)
    img.data[o] = r
    img.data[o + 1] = g
    img.data[o + 2] = b
    img.data[o + 3] = 200 // ~78% — basemap reads through
  }
  sctx.putImageData(img, 0, 0)

  // Upscale with the browser's bilinear filter — far cheaper than
  // interpolating at full resolution, and visually smooth.
  const bctx = big.getContext('2d')
  if (!bctx) return big
  bctx.imageSmoothingEnabled = true
  bctx.imageSmoothingQuality = 'high'
  bctx.clearRect(0, 0, big.width, big.height)
  bctx.drawImage(small, 0, 0, big.width, big.height)

  return big
}
