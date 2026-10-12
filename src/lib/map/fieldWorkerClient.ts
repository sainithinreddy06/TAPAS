import type { HeatFieldWorkerMsg, HeatFieldWorkerResponse } from '@/workers/heatField.worker'

let workerInstance: Worker | null = null
let nextJobId = 1
const pendingJobs = new Map<
  number,
  {
    resolve: (res: Float32Array) => void
    reject: (err: any) => void
  }
>()

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../../workers/heatField.worker.ts', import.meta.url)
      )
      workerInstance.onmessage = (e: MessageEvent<HeatFieldWorkerResponse>) => {
        const { id, field, error } = e.data
        if (id && pendingJobs.has(id)) {
          const { resolve, reject } = pendingJobs.get(id)!
          pendingJobs.delete(id)
          if (error) reject(new Error(error))
          else resolve(field)
        }
      }
      workerInstance.onerror = (err) => {
        console.warn('HeatField WebWorker error, falling back to direct thread:', err)
      }
    } catch {
      workerInstance = null
    }
  }
  return workerInstance
}

/** Synchronous fallback calculation if worker cannot be initialized */
export function computeHeatFieldDirect(
  samples: { lat: number; lon: number; value: number | null }[],
  bbox: [number, number, number, number],
  outW = 150,
  outH = 150,
  power = 2.5
): Float32Array {
  const [west, south, east, north] = bbox
  const valid = samples.filter((s) => s.value != null && Number.isFinite(s.value)) as {
    lat: number
    lon: number
    value: number
  }[]

  const field = new Float32Array(outW * outH)
  if (valid.length < 3) {
    field.fill(NaN)
    return field
  }

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
        if (d2 > radiusSq) continue

        const w = 1 / Math.pow(d2, power / 2)
        num += w * s.value
        den += w
      }

      field[y * outW + x] = !isNaN(exact) ? exact : den > 0 ? num / den : NaN
    }
  }

  return field
}

/**
 * Asynchronously dispatches IDW interpolation to Web Worker (or direct thread fallback).
 */
export function computeHeatFieldAsync(
  samples: { lat: number; lon: number; value: number | null }[],
  bbox: [number, number, number, number],
  outW = 150,
  outH = 150,
  power = 2.5
): Promise<Float32Array> {
  const worker = getWorker()
  if (!worker) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(computeHeatFieldDirect(samples, bbox, outW, outH, power))
      }, 0)
    })
  }

  return new Promise((resolve, reject) => {
    const id = nextJobId++
    pendingJobs.set(id, { resolve, reject })
    const msg: HeatFieldWorkerMsg = { id, samples, bbox, outW, outH, power }
    worker.postMessage(msg)
  })
}
