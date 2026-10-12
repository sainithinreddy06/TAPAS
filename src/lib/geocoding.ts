import { ApiError, fetchJson, list, numberOrNull, record, safeHttpUrl, textOrNull, validatedRequest } from './api'
import { coordinateLocation, INDIA_TIMEZONE, type SelectedLocation, withinIndiaViewport } from './location'

// Public Nominatim: explicit submit and a shared one-request-per-second queue.
export const GEOCODER_URL = process.env.NEXT_PUBLIC_GEOCODER_URL || 'https://nominatim.openstreetmap.org'
export function parseCoordinateQuery(query: string): SelectedLocation | null {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  return match ? coordinateLocation(Number(match[1]), Number(match[2])) : null
}
export function parsePhoton(payload: unknown): SelectedLocation[] {
  return list(payload, ['features']).flatMap(raw => {
    const feature = record(raw), properties = record(feature.properties), geometry = record(feature.geometry)
    if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return []
    const longitude = numberOrNull(geometry.coordinates[0]), latitude = numberOrNull(geometry.coordinates[1])
    if (latitude === null || longitude === null || !withinIndiaViewport(latitude, longitude) || String(properties.countrycode).toUpperCase() !== 'IN') return []
    const name = textOrNull(properties.name) ?? textOrNull(properties.city) ?? textOrNull(properties.state)
    if (!name) return []
    const extent = properties.extent
    const bounds: SelectedLocation['bounds'] = Array.isArray(extent) && extent.length === 4 && extent.every(v => typeof v === 'number' && Number.isFinite(v)) && extent[0] <= longitude && longitude <= extent[2] && extent[3] <= latitude && latitude <= extent[1] && extent[0] >= -180 && extent[2] <= 180 && extent[3] >= -90 && extent[1] <= 90 ? [extent[0], extent[3], extent[2], extent[1]] : undefined
    return [{ id: `osm:${String(properties.osm_type)}:${String(properties.osm_id)}`, name, latitude, longitude, countryCode: 'IN', state: textOrNull(properties.state) ?? undefined, district: textOrNull(properties.county ?? properties.district) ?? undefined, locality: textOrNull(properties.city ?? properties.locality) ?? undefined, postalCode: textOrNull(properties.postcode) ?? undefined, granularity: textOrNull(properties.type) ?? undefined, timezone: INDIA_TIMEZONE, source: 'Photon / OpenStreetMap', bounds }]
  }).slice(0, 8)
}

// Public Nominatim prohibits autocomplete. Calls occur only after explicit submission.
// https://operations.osmfoundation.org/policies/nominatim/ ; browser sends its Referer.
let lastRequest=0
let queue:Promise<void>=Promise.resolve()
async function rateSlot(signal?:AbortSignal){
 const previous=queue;let release!:()=>void;queue=new Promise<void>(resolve=>{release=resolve})
 await previous
 try {if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const delay=Math.max(0,1100-(Date.now()-lastRequest));if(delay)await new Promise<void>(resolve=>setTimeout(resolve,delay));if(signal?.aborted)throw new DOMException('Cancelled','AbortError');lastRequest=Date.now()} finally {release()}
}
export function parseNominatim(payload:unknown,cached=false):SelectedLocation[]{
 const rows=Array.isArray(payload)?payload:[payload]
 return rows.flatMap(raw=>{const r=record(raw),address=r.address?record(r.address):{},latitude=typeof r.lat==='string'?Number(r.lat):NaN,longitude=typeof r.lon==='string'?Number(r.lon):NaN
 if(!withinIndiaViewport(latitude,longitude)||address.country_code!=='in'||!textOrNull(r.display_name))return []
 const bounds=Array.isArray(r.boundingbox)?r.boundingbox.map(Number):[]
 return [{id:'nominatim:'+String(r.osm_type)+':'+String(r.osm_id),name:textOrNull(r.name)??String(r.display_name).split(',')[0],latitude,longitude,countryCode:'IN',state:textOrNull(address.state)??undefined,district:textOrNull(address.state_district??address.county)??undefined,locality:textOrNull(address.city??address.town??address.village)??undefined,postalCode:textOrNull(address.postcode)??undefined,timezone:INDIA_TIMEZONE,source:cached?'Cached Nominatim / OpenStreetMap':'Nominatim / OpenStreetMap',bounds:bounds.length===4&&bounds.every(Number.isFinite)&&bounds[0]<=latitude&&latitude<=bounds[1]&&bounds[2]<=longitude&&longitude<=bounds[3]?[bounds[2],bounds[0],bounds[3],bounds[1]] as [number,number,number,number]:undefined}]
 }).slice(0,8)
}
export async function searchLocations(query:string,signal?:AbortSignal):Promise<SelectedLocation[]>{
 const coordinate=parseCoordinateQuery(query);if(coordinate)return [coordinate]
 if(/^[\d\s,.-]+$/.test(query)&&!/^\d{6}$/.test(query))throw new ApiError('Use latitude, longitude in that order, for example 19.0760, 72.8777.',undefined,undefined,'invalid')
 await rateSlot(signal)
 const url=safeHttpUrl(GEOCODER_URL.replace(/\/$/,'')+'/search');url.search=new URLSearchParams({q:query.trim(),countrycodes:'in',format:'jsonv2',limit:'8',addressdetails:'1'}).toString()
 return validatedRequest(url,(payload,_time,cached)=>parseNominatim(payload,cached),signal)
}
export async function reverseLocation(latitude:number,longitude:number,signal?:AbortSignal):Promise<SelectedLocation|null>{
 if(!withinIndiaViewport(latitude,longitude))return null
 await rateSlot(signal)
 const url=safeHttpUrl(GEOCODER_URL.replace(/\/$/,'')+'/reverse');url.search=new URLSearchParams({lat:String(latitude),lon:String(longitude),format:'jsonv2',addressdetails:'1'}).toString()
 const match=parseNominatim(await fetchJson(url,signal))[0]
 return match?{...match,latitude,longitude,bounds:undefined}:null
}
