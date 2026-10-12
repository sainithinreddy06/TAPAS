import { ApiError, numberOrNull, record, safeHttpUrl, validatedRequest } from '@/lib/api'
import { locationKey, type SelectedLocation } from '@/lib/location'
import type { DataProvenance } from '@/lib/types'
import { nearestSnapshot } from './heatGrid'
import { todayIso, toIsoDate } from '@/lib/utils'
export interface WeatherReading { time: string; temperature: number | null; humidity: number | null; apparent: number | null; wind?: number | null }
export interface WeatherResult { date: string; current: WeatherReading | null; hourly: WeatherReading[]; provenance: DataProvenance }
export function parseWeather(payload: unknown, location: SelectedLocation, date: string, fetchedAt: string, fromCache: boolean): WeatherResult {
  const r = record(payload), lat = numberOrNull(r.latitude), lon = numberOrNull(r.longitude)
  if (lat === null || lon === null || Math.abs(lat - location.latitude) > .5 || Math.abs(lon - location.longitude) > .5 || r.utc_offset_seconds !== 19800) throw new ApiError('Weather grid or timezone does not match the selection.', undefined, undefined, 'invalid')
  const h = record(r.hourly), units = record(r.hourly_units)
  if (units.time !== 'unixtime' || units.temperature_2m !== '°C' || units.relative_humidity_2m !== '%' || units.apparent_temperature !== '°C' || !Array.isArray(h.time) || h.time.length > 48) throw new ApiError('Invalid weather units or hourly data.', undefined, undefined, 'invalid')
  const fields = ['temperature_2m','relative_humidity_2m','apparent_temperature'] as const
  for (const field of fields) if (!Array.isArray(h[field]) || h[field].length !== h.time.length) throw new ApiError('Incomplete hourly weather arrays.', undefined, undefined, 'invalid')
  const hourly = h.time.map((value, i) => {
    const epoch = numberOrNull(value, 0, 4102444800)
    if (epoch === null) throw new ApiError('Invalid weather time.', undefined, undefined, 'invalid')
    const time = new Date(epoch * 1000).toISOString()
    if (toIsoDate(new Date(time)) !== date) throw new ApiError('Weather date does not match the selection.', undefined, undefined, 'invalid')
    return {time, temperature:numberOrNull((h.temperature_2m as unknown[])[i], -100, 70), humidity:numberOrNull((h.relative_humidity_2m as unknown[])[i],0,100), apparent:numberOrNull((h.apparent_temperature as unknown[])[i],-120,100),wind:units.wind_speed_10m==='m/s'&&Array.isArray(h.wind_speed_10m)?numberOrNull(h.wind_speed_10m[i],0,150):null}
  })
  let current: WeatherReading | null = null
  if (r.current && r.current_units) {
    const c = record(r.current), u = record(r.current_units), epoch = numberOrNull(c.time,0,4102444800)
    if (epoch !== null && u.time === 'unixtime' && u.temperature_2m === '°C' && u.relative_humidity_2m === '%' && u.apparent_temperature === '°C' && toIsoDate(new Date(epoch * 1000)) === date) current = {time:new Date(epoch * 1000).toISOString(),temperature:numberOrNull(c.temperature_2m,-100,70),humidity:numberOrNull(c.relative_humidity_2m,0,100),apparent:numberOrNull(c.apparent_temperature,-120,100),wind:u.wind_speed_10m==='m/s'?numberOrNull(c.wind_speed_10m,0,150):null}
  }
  return {date,current,hourly,provenance:{status:fromCache?'cached':'live',originalAt:current?.time ?? hourly[0]?.time ?? null,source:'Open-Meteo · weather model output',issuedAt:null,fetchedAt,fromCache,geographicId:locationKey(location),validUntil:null,latitude:lat,longitude:lon,note:`Provider model grid: ${lat.toFixed(4)}, ${lon.toFixed(4)}. Valid time is distinct from retrieval time.`}}
}
export function weatherReading(data: WeatherResult | undefined): {reading: WeatherReading | null; label: string} {
  if (!data) return {reading:null,label:'Weather unavailable'}
  if (data.provenance.status === 'snapshot') return {reading:data.current ?? data.hourly[0] ?? null,label:'Recorded model conditions'}
  if (data.date === todayIso() && data.current) return {reading:data.current,label:'Current model conditions'}
  const noon = `${data.date}T12:00:00+05:30`, target = Date.parse(noon)
  const reading = [...data.hourly].sort((a,b)=>Math.abs(Date.parse(a.time)-target)-Math.abs(Date.parse(b.time)-target))[0] ?? null
  return {reading,label:'Midday hourly forecast'}
}
export async function fetchWeather(location: SelectedLocation, date: string, signal?: AbortSignal): Promise<WeatherResult> {
  const url = safeHttpUrl(process.env.NEXT_PUBLIC_WEATHER_URL || 'https://api.open-meteo.com/v1/forecast')
  const fields = 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m'
  for (const [k,v] of Object.entries({latitude:String(location.latitude),longitude:String(location.longitude),start_date:date,end_date:date,hourly:fields,current:fields,timezone:'Asia/Kolkata',timeformat:'unixtime',temperature_unit:'celsius',wind_speed_unit:'ms'})) url.searchParams.set(k,v)
  try { return await validatedRequest(url,(payload,fetchedAt,cached)=>parseWeather(payload,location,date,fetchedAt,cached),signal) } catch(error) { if(signal?.aborted)throw error;const saved=weatherSnapshot(location,date);if(saved)return saved;throw error }
}

export function weatherSnapshot(location: SelectedLocation, date: string): WeatherResult | undefined {
 const saved=nearestSnapshot(location,date);if(!saved?.point)return undefined
 const p=saved.point,reading={time:p.time,temperature:p.temperature,humidity:p.humidity,apparent:p.apparent,wind:p.wind}
 return {date:toIsoDate(new Date(p.time)),current:reading,hourly:[reading],provenance:{status:'snapshot',source:'Open-Meteo best-match weather models',issuedAt:null,originalAt:p.time,fetchedAt:saved.capturedAt,fromCache:false,geographicId:locationKey(location),validUntil:null,latitude:p.latitude,longitude:p.longitude,note:'Recorded nearby model point ('+saved.distance.toFixed(1)+' km from selection), not current conditions. Original coordinates: '+p.latitude.toFixed(4)+', '+p.longitude.toFixed(4)}}
}
