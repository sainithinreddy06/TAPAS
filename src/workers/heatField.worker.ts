/// <reference lib="webworker" />

export interface HeatFieldWorkerMsg {
  id?: number
  samples: { lat: number; lon: number; value: number | null }[]
  bbox: [number, number, number, number]
  outW: number // 150
  outH: number // 150
  power: number // 2.5
}

export interface HeatFieldWorkerResponse {
  id?: number
  field: Float32Array
  outW: number
  outH: number
  durationMs?: number
  error?: string
}

self.onmessage = (e: MessageEvent<HeatFieldWorkerMsg>) => {
  const started = performance.now()
  const { id, samples, bbox, outW, outH, power } = e.data
  const [west, south, east, north] = bbox

  const valid = samples.filter((s) => s.value != null && Number.isFinite(s.value)) as {
    lat: number
    lon: number
    value: number
  }[]

  const field = new Float32Array(outW * outH)

  if (valid.length < 3) {
    field.fill(NaN)
    ;(self as any).postMessage({ id, field, outW, outH, durationMs: performance.now() - started }, [field.buffer])
    return
  }

  // Influence radius: roughly 1.6× the mean sample spacing.
  // Too large smears the field flat; too small produces bullseyes.
  const spanLat = north - south
  const spanLon = east - west
  const meanSpacing = Math.sqrt((spanLat * spanLon) / valid.length)
  const radius = meanSpacing * 1.6
  const radiusSq = radius * radius

  for (let y = 0; y < outH; y++) {
    const lat = north - (y / (outH - 1)) * spanLat
    const cosLat = Math.cos((lat * Math.PI) / 180)

    for (let x = 0; x < outW; x++) {
      const lon = west + (x / (outW - 1)) * spanLon

      let num = 0
      let den = 0
      let exact = NaN

      for (let i = 0; i < valid.length; i++) {
        const s = valid[i]
        const dLat = lat - s.lat
        const dLon = (lon - s.lon) * cosLat
        const d2 = dLat * dLat + dLon * dLon

        if (d2 < 1e-10) {
          exact = s.value
          break
        }
        if (d2 > radiusSq) continue // outside influence

        const w = 1 / Math.pow(d2, power / 2)
        num += w * s.value
        den += w
      }

      field[y * outW + x] = !isNaN(exact) ? exact : den > 0 ? num / den : NaN
    }
  }

  ;(self as any).postMessage(
    { id, field, outW, outH, durationMs: performance.now() - started },
    [field.buffer]
  )
}

export {}
