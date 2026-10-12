/**
 * Landing-page hero ticker. Reuses the same batched Open-Meteo request shape
 * and point parser as the national heat grid (src/lib/heatGrid.ts) so the
 * "Right now" readings are genuine model output, not a second bespoke API.
 */
import { ApiError, fetchJson, safeHttpUrl } from '@/lib/api'
import { parseHeatPoint, type GridRequest, type HeatPoint } from '@/lib/heatGrid'
import { todayIso } from '@/lib/utils'

/** Coordinates only — display names are real cities, not a search restriction. */
export const TICKER_CITIES: GridRequest[] = [
  { name: 'Delhi', latitude: 28.6139, longitude: 77.209 },
  { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { name: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
  { name: 'Nagpur', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
]

export async function fetchTickerReadings(signal?: AbortSignal): Promise<HeatPoint[]> {
  const date = todayIso()
  const url = safeHttpUrl(process.env.NEXT_PUBLIC_WEATHER_URL || 'https://api.open-meteo.com/v1/forecast')
  const fields = 'temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,cloud_cover'
  for (const [k, v] of Object.entries({
    latitude: TICKER_CITIES.map((c) => c.latitude).join(','),
    longitude: TICKER_CITIES.map((c) => c.longitude).join(','),
    current: fields,
    timezone: 'Asia/Kolkata',
    timeformat: 'unixtime',
    wind_speed_unit: 'ms',
  })) url.searchParams.set(k, v)

  const payload = await fetchJson(url, signal)
  const rows = Array.isArray(payload) ? payload : [payload]
  if (rows.length !== TICKER_CITIES.length) throw new ApiError('Ticker batch count mismatch.', undefined, undefined, 'invalid')
  return rows.map((row, i) => parseHeatPoint(row, TICKER_CITIES[i], date)).filter((p): p is HeatPoint => !!p)
}
