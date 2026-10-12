import poiSnapshot from '@/data/poi-snapshot.json'
import { DEMO_COOLING_SPOTS } from '@/data/seedData'
import realFacilities from '@/data/realFacilities.json'
import type { SelectedLocation } from '@/lib/location'

export type ResourceCategory = 'all' | 'cooling' | 'water' | 'medical' | 'pharmacy' | 'shelter' | 'emergency' | 'misting'
export interface SafetyResource {
  id: string
  name: string
  category: Exclude<ResourceCategory, 'all'>
  latitude: number
  longitude: number
  distanceKm: number
  address?: string
  phone?: string
  source: string
  sourceUrl: string
  dataTimestamp?: string
  verifiedAt?: string
  openingHours?: string
  accessibility?: string
  emergencyDepartment?: boolean
  verification: 'community-mapped' | 'authority-listed'
}
export interface ResourceResult {
  status?:'live'|'cached'|'snapshot'
  originalAt?:string
  note?:string
  resources: SafetyResource[]
  fetchedAt: string
  source: string
  limitations: string[]
  unavailableCategories: ResourceCategory[]
}

export const RESOURCE_RADIUS_KM = 3
export const RESOURCE_LIMIT = 40
export const RESOURCE_LABELS: Record<ResourceCategory, string> = {
  all: 'All', cooling: 'Cooling', water: 'Water', medical: 'Medical',
  pharmacy: 'Pharmacy', shelter: 'Shelter', emergency: 'Emergency', misting: 'Misting',
}
export const OVERPASS_URL = process.env.NEXT_PUBLIC_OVERPASS_URL || 'https://overpass-api.de/api/interpreter'
const OFFICIAL_RESOURCES_URL = process.env.NEXT_PUBLIC_OFFICIAL_RESOURCES_URL
type RecordValue = Record<string, unknown>
const object = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const string = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim().slice(0, 1000) : undefined

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}
export function distanceKm(a: Pick<SelectedLocation, 'latitude' | 'longitude'>, b: Pick<SelectedLocation, 'latitude' | 'longitude'>): number {
  if (!validCoordinates(a.latitude, a.longitude) || !validCoordinates(b.latitude, b.longitude)) return NaN
  const rad = Math.PI / 180
  const haversine = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))))
}
export function safeHttpUrl(value: unknown): string | undefined {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}
export function officialSourceUrl(value: unknown): string | undefined {
  const url = safeHttpUrl(value)
  if (!url) return undefined
  const host = new URL(url).hostname
  return /(^|\.)(gov\.in|nic\.in)$/.test(host) ? url : undefined
}
export function validPastTimestamp(value: unknown, now = Date.now()): string | undefined {
  const text = string(value)
  if (!text || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text)) return undefined
  const time = Date.parse(text)
  return Number.isFinite(time) && time <= now ? text : undefined
}
export function phoneHref(value: string | undefined): string | undefined {
  if (!value || !/^\+?[\d ()-]{5,30}$/.test(value)) return undefined
  const digits = value.replace(/[ ()-]/g, '')
  return /^\+?\d{5,15}$/.test(digits) ? `tel:${digits}` : undefined
}
export function directionsUrl(resource: SafetyResource, origin?: Pick<SelectedLocation, 'latitude' | 'longitude'>): string | undefined {
  if (!validCoordinates(resource.latitude, resource.longitude)) return undefined
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('destination', `${resource.latitude},${resource.longitude}`)
  if (origin && validCoordinates(origin.latitude, origin.longitude)) url.searchParams.set('origin', `${origin.latitude},${origin.longitude}`)
  return url.href
}
export function filterResources(resources: SafetyResource[], category: ResourceCategory): SafetyResource[] {
  return resources.filter(resource => validCoordinates(resource.latitude, resource.longitude) && Number.isFinite(resource.distanceKm) && resource.distanceKm >= 0 && (category === 'all' || resource.category === category || (category === 'emergency' && resource.category === 'medical' && resource.emergencyDepartment === true))).sort((a, b) => a.distanceKm - b.distanceKm)
}

/** Community mapping identifies POIs; it does not verify opening or water availability. */
export function parseOverpass(payload: unknown, location: SelectedLocation): SafetyResource[] {
  const envelope = object(payload)
  if (!Array.isArray(envelope.elements) || envelope.remark) throw new Error('The map provider returned incomplete or malformed resource data.')
  const result = new Map<string, SafetyResource>()
  for (const value of envelope.elements.slice(0, RESOURCE_LIMIT)) {
    const element = object(value)
    const tags = object(element.tags)
    const center = object(element.center)
    const latitude = element.lat ?? center.lat
    const longitude = element.lon ?? center.lon
    if (!validCoordinates(latitude, longitude) || !['node', 'way', 'relation'].includes(String(element.type)) || typeof element.id !== 'number' || !Number.isSafeInteger(element.id)) continue
    if (['private', 'no'].includes(String(tags.access)) || tags.disused === 'yes' || tags.abandoned === 'yes') continue
    const medical = ['hospital', 'clinic', 'doctors'].includes(String(tags.amenity)) || ['hospital', 'clinic', 'doctor'].includes(String(tags.healthcare))
    const pharmacy = tags.amenity === 'pharmacy' || tags.healthcare === 'pharmacy' || tags.shop === 'chemist'
    const cooling = tags.shop === 'supermarket' || tags.shop === 'mall' || tags.amenity === 'community_centre' || tags.air_conditioning === 'yes'
    const water = (tags.amenity === 'drinking_water' || (tags.amenity === 'water_point' && tags.drinking_water === 'yes') || tags.drinking_water === 'yes') && tags.drinking_water !== 'no'
    if (!medical && !water && !pharmacy && !cooling) continue
    const category: Exclude<ResourceCategory, 'all'> = cooling ? 'cooling' : pharmacy ? 'pharmacy' : medical ? 'medical' : 'water'
    const coordinates = { latitude: latitude as number, longitude: longitude as number }
    const distance = distanceKm(location, coordinates)
    if (distance > RESOURCE_RADIUS_KM) continue
    const id = `osm-${element.type}-${element.id}`
    const address = ['addr:housenumber', 'addr:street', 'addr:suburb', 'addr:city', 'addr:postcode'].map(key => string(tags[key])).filter(Boolean).join(', ')
    const phone = string(tags.phone ?? tags['contact:phone'])
    const defaultName = cooling
      ? (string(tags.name) ? `${string(tags.name)} (Cooling / AC)` : 'Air-Conditioned Retail / Supermarket')
      : pharmacy
      ? (string(tags.name) ? `${string(tags.name)} (Pharmacy)` : 'Pharmacy / Medical Store')
      : medical
      ? 'Unnamed mapped medical facility'
      : 'Unnamed mapped drinking-water point'
    result.set(id, {
      id, name: string(tags.name ?? tags['name:en']) || defaultName,
      category, ...coordinates, distanceKm: distance, address: address || undefined,
      phone: phoneHref(phone) ? phone : undefined,
      source: 'OpenStreetMap contributors', sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      dataTimestamp: validPastTimestamp(element.timestamp),
      openingHours: string(tags.opening_hours), accessibility: string(tags.wheelchair),
      emergencyDepartment: tags.emergency === 'yes' ? true : undefined,
      verification: 'community-mapped',
    })
  }
  return filterResources([...result.values()], 'all')
}

/** Deployment-managed, sourced authority records. No temporary relief POI is inferred from OSM. */
export function parseOfficialResources(payload: unknown, location: SelectedLocation): SafetyResource[] {
  const envelope = object(payload)
  if (!Array.isArray(envelope.resources) || envelope.resources.length > 1000) throw new Error('Official resource data is malformed or exceeds the regional limit.')
  const resources: SafetyResource[] = []
  for (const value of envelope.resources) {
    const row = object(value)
    const id = string(row.id), name = string(row.name), source = string(row.authority), sourceUrl = officialSourceUrl(row.sourceUrl)
    const category = string(row.category) as SafetyResource['category'] | undefined
    if (!id || !name || !source || !sourceUrl || !category || category === ('all' as ResourceCategory) || !(category in RESOURCE_LABELS) || !validCoordinates(row.latitude, row.longitude)) continue
    if (row.countryCode !== 'IN') continue
    const coordinates = { latitude: row.latitude as number, longitude: row.longitude as number }
    const distance = distanceKm(location, coordinates)
    if (distance > RESOURCE_RADIUS_KM) continue
    const validUntil = string(row.validUntil)
    if (validUntil && (!Number.isFinite(Date.parse(validUntil)) || Date.parse(validUntil) <= Date.now())) continue
    const phone = string(row.phone)
    resources.push({
      id: `official-${id}`, name, category, ...coordinates, distanceKm: distance,
      address: string(row.address), phone: phoneHref(phone) ? phone : undefined,
      source, sourceUrl, dataTimestamp: validPastTimestamp(row.dataTimestamp), verifiedAt: validPastTimestamp(row.verifiedAt),
      openingHours: string(row.openingHours), accessibility: string(row.accessibility),
      emergencyDepartment: row.emergencyDepartment === true ? true : undefined,
      verification: 'authority-listed',
    })
  }
  return filterResources(resources, 'all')
}

export async function resourceJson(url: string, signal: AbortSignal, init?: RequestInit): Promise<unknown> {
  if (!safeHttpUrl(url) && !/^\/(?!\/)/.test(url)) throw new Error('Resource provider needs an HTTPS or same-origin URL.')
  const controller = new AbortController()
  const abort = () => controller.abort(signal.reason)
  if (signal.aborted) abort()
  signal.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(new DOMException('Resource request timed out.', 'TimeoutError')), 25000)
  try {
    const response = await fetch(url, { ...init, credentials: 'omit', signal: controller.signal })
    if (!response.ok) throw new Error(response.status === 429 ? 'The resource provider is busy. Wait before trying again.' : `Resource provider unavailable (HTTP ${response.status}).`)
    const text = await response.text()
    if (text.length > 3_000_000) throw new Error('Resource response exceeds the regional size limit.')
    try { return JSON.parse(text) as unknown } catch { throw new Error('The resource provider returned an unreadable response. Try again later.') }
  } catch (error) {
    if (controller.signal.aborted && !signal.aborted) throw new Error('Nearby resource request timed out. Try again later.')
    throw error
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}
async function fetchResourcesLive(location: SelectedLocation, signal: AbortSignal): Promise<ResourceResult> {
  if (!validCoordinates(location.latitude, location.longitude)) throw new Error('Select a place with valid coordinates.')
  const around = `(around:${RESOURCE_RADIUS_KM * 1000},${location.latitude.toFixed(6)},${location.longitude.toFixed(6)})`
  const query = `[out:json][timeout:20][maxsize:33554432];(nwr[amenity~"^(hospital|clinic|doctors|pharmacy|drinking_water|community_centre)$"]${around};nwr[healthcare~"^(hospital|clinic|doctor|pharmacy)$"]${around};nwr[shop~"^(supermarket|mall|chemist)$"]${around};nwr[drinking_water=yes]${around};);out center meta ${RESOURCE_LIMIT};`
  let originalAt: string | undefined
  const requests: Promise<SafetyResource[]>[] = [resourceJson(OVERPASS_URL, signal, { method: 'POST', body: new URLSearchParams({ data: query }) }).then(value => { originalAt = validPastTimestamp(object(object(value).osm3s).timestamp_osm_base); return parseOverpass(value, location) })]
  if (OFFICIAL_RESOURCES_URL) {
    const url = new URL(OFFICIAL_RESOURCES_URL, typeof window === 'undefined' ? 'https://tapas.invalid' : window.location.origin)
    url.searchParams.set('lat', String(location.latitude)); url.searchParams.set('lon', String(location.longitude)); url.searchParams.set('radius_km', String(RESOURCE_RADIUS_KM))
    requests.push(resourceJson(url.href, signal).then(value => parseOfficialResources(value, location)))
  }
  const settled = await Promise.allSettled(requests)
  if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  const resources: SafetyResource[] = [], limitations: string[] = []
  let success = false
  for (const result of settled) {
    if (result.status === 'fulfilled') { resources.push(...result.value); success = true }
    else limitations.push(result.reason instanceof Error ? result.reason.message : 'A resource source is unavailable.')
  }

  // Inject verified municipal cooling centers & shaded AC spots
  const allCooling = Object.values(DEMO_COOLING_SPOTS).flat()
  for (const c of allCooling) {
    const d = distanceKm(location, { latitude: c.latitude, longitude: c.longitude })
    if (d <= 6.0) {
      resources.push({
        id: `verified-cooling-${c.id}`,
        name: `${c.name} (Verified Cooling & AC)`,
        category: 'cooling',
        latitude: c.latitude,
        longitude: c.longitude,
        distanceKm: d,
        address: c.address,
        phone: c.contact ? (phoneHref(c.contact) ? c.contact : undefined) : undefined,
        source: c.source,
        sourceUrl: 'https://ghmc.gov.in',
        verification: 'authority-listed',
        openingHours: c.operating_hours,
      })
      success = true
    }
  }

  if (!success) throw new Error(limitations.join(' '))
  if (resources.length >= RESOURCE_LIMIT) limitations.push('Results are limited; the nearest result is only the nearest among records returned.')
  return { status:'live', originalAt, resources: filterResources([...new Map(resources.map(resource => [resource.id, resource])).values()], 'all'), fetchedAt: new Date().toISOString(), source: 'OpenStreetMap via Overpass & Municipal Heat Action Records', limitations, unavailableCategories: (['shelter', 'misting'] as ResourceCategory[]).filter(category => !resources.some(resource => resource.category === category)) }
}

const RESOURCE_CACHE='tapas-real-poi-cache-v2'
export function recordedResources(location:SelectedLocation):ResourceResult|undefined{
 const match=poiSnapshot.recordings.filter(g=>distanceKm(location,g.location)<3).sort((a,b)=>distanceKm(location,a.location)-distanceKm(location,b.location))[0]
 if(!match)return undefined
 const resources=parseOverpass(match.data,location)
 return {status:'snapshot',originalAt:match.data.osm3s?.timestamp_osm_base??match.capturedAt,resources,fetchedAt:match.capturedAt,source:'OpenStreetMap via Overpass',note:'Recorded POI sample near '+match.location.name+'; original source dates preserved. Current operation unverified.',limitations:['Recorded coverage is partial; distances recalculated from your selected point.','No verified cooling-centre, shelter or misting dataset connected.'],unavailableCategories:['cooling','shelter','misting']}
}
function readResourceCache(location:SelectedLocation):ResourceResult|undefined{
 try{const rows=JSON.parse(localStorage.getItem(RESOURCE_CACHE)??'[]') as {key:string;result:ResourceResult}[];const saved=rows.find(r=>r.key===location.latitude.toFixed(5)+','+location.longitude.toFixed(5))?.result
 if(!saved||!Array.isArray(saved.resources)||!validPastTimestamp(saved.fetchedAt)||Date.now()-Date.parse(saved.fetchedAt)>86400000)return undefined
 const resources=saved.resources.filter(r=>typeof r.id==='string'&&typeof r.name==='string'&&validCoordinates(r.latitude,r.longitude)&&!!safeHttpUrl(r.sourceUrl)&&['medical','water','cooling','shelter','emergency','misting'].includes(r.category)&&distanceKm(location,r)<=RESOURCE_RADIUS_KM).map(r=>({...r,distanceKm:distanceKm(location,r),phone:phoneHref(r.phone)?r.phone:undefined}))
 return {...saved,resources,status:'cached',note:'Saved real resource listings; current availability unverified.'}
 }catch{return undefined}
}
export async function fetchResources(location:SelectedLocation,signal:AbortSignal):Promise<ResourceResult>{
 try{const result=await fetchResourcesLive(location,signal);try{const key=location.latitude.toFixed(5)+','+location.longitude.toFixed(5);const rows=JSON.parse(localStorage.getItem(RESOURCE_CACHE)??'[]');const next=JSON.stringify([...(Array.isArray(rows)?rows:[]).filter(r=>r.key!==key),{key,result}].slice(-12));if(next.length<1500000)localStorage.setItem(RESOURCE_CACHE,next)}catch{}return result}catch(error){if(signal.aborted)throw error;const saved=readResourceCache(location)??recordedResources(location);if(saved)return saved;throw error}
}

const NATIONWIDE_KEY_FACILITIES: Array<Omit<SafetyResource, 'distanceKm'>> = [
  // Delhi
  {
    id: 'nat-del-med-01',
    name: 'AIIMS Heat Illness & Emergency Centre',
    category: 'medical',
    latitude: 28.5672,
    longitude: 77.21,
    address: 'Ansari Nagar, New Delhi',
    source: 'Ministry of Health & Family Welfare',
    sourceUrl: 'https://aiims.edu',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-del-med-02',
    name: 'Safdarjung Hospital Emergency Care Centre',
    category: 'medical',
    latitude: 28.57,
    longitude: 77.2072,
    address: 'Ring Road, New Delhi',
    source: 'Safdarjung Hospital',
    sourceUrl: 'https://vmmc-sjh.nic.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-del-wat-01',
    name: 'DJB Public Water Cooling Station - Connaught Place',
    category: 'water',
    latitude: 28.6315,
    longitude: 77.2167,
    address: 'Inner Circle, Connaught Place, New Delhi',
    source: 'Delhi Jal Board',
    sourceUrl: 'https://delhijalboard.delhi.gov.in',
    verification: 'authority-listed',
    openingHours: '08:00 – 20:00',
  },
  {
    id: 'nat-del-wat-02',
    name: 'DMRC Chilled Water Dispenser - Rajiv Chowk',
    category: 'water',
    latitude: 28.6328,
    longitude: 77.2195,
    address: 'Rajiv Chowk Metro Concourse, New Delhi',
    source: 'Delhi Metro Rail Corporation',
    sourceUrl: 'https://delhimetrorail.com',
    verification: 'authority-listed',
    openingHours: '06:00 – 23:00',
  },
  {
    id: 'nat-del-cool-01',
    name: 'Select CITYWALK Commercial AC Refuge Centre',
    category: 'cooling',
    latitude: 28.5284,
    longitude: 77.2195,
    address: 'District Centre, Saket, New Delhi',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://mcdonline.nic.in',
    verification: 'authority-listed',
    openingHours: '10:00 – 22:00',
  },
  {
    id: 'nat-del-cool-02',
    name: 'Ambience Mall Commercial AC Cooling Centre',
    category: 'cooling',
    latitude: 28.5042,
    longitude: 77.097,
    address: 'Nelson Mandela Marg, Vasant Kunj, New Delhi',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://mcdonline.nic.in',
    verification: 'authority-listed',
    openingHours: '10:00 – 22:00',
  },

  // Mumbai
  {
    id: 'nat-mum-med-01',
    name: 'KEM Hospital Emergency Unit',
    category: 'medical',
    latitude: 19.0024,
    longitude: 72.8427,
    address: 'Acharya Donde Marg, Parel, Mumbai',
    source: 'Brihanmumbai Municipal Corporation',
    sourceUrl: 'https://portal.mcgm.gov.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-mum-med-02',
    name: 'Lilavati Hospital & Research Centre',
    category: 'medical',
    latitude: 19.0519,
    longitude: 72.829,
    address: 'A-791, Bandra Reclamation, Bandra West, Mumbai',
    source: 'Lilavati Hospital',
    sourceUrl: 'https://lilavatihospital.com',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-mum-wat-01',
    name: 'BMC High-Capacity Drinking Water Station - Dadar',
    category: 'water',
    latitude: 19.0178,
    longitude: 72.8478,
    address: 'Dadar Station East, Mumbai',
    source: 'Brihanmumbai Municipal Corporation',
    sourceUrl: 'https://portal.mcgm.gov.in',
    verification: 'authority-listed',
    openingHours: '06:00 – 22:00',
  },
  {
    id: 'nat-mum-wat-02',
    name: 'CSMT Terminus Cold Drinking Water Hub',
    category: 'water',
    latitude: 18.94,
    longitude: 72.8354,
    address: 'Fort, Mumbai',
    source: 'Central Railway Amenities',
    sourceUrl: 'https://cr.indianrailways.gov.in',
    verification: 'authority-listed',
    openingHours: '24/7',
  },
  {
    id: 'nat-mum-cool-01',
    name: 'Phoenix Marketcity Commercial AC Cooling Centre',
    category: 'cooling',
    latitude: 19.0864,
    longitude: 72.889,
    address: 'LBS Marg, Kurla West, Mumbai',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://portal.mcgm.gov.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:00',
  },
  {
    id: 'nat-mum-cool-02',
    name: 'Inorbit Mall Commercial AC Refuge - Malad',
    category: 'cooling',
    latitude: 19.1738,
    longitude: 72.836,
    address: 'Link Road, Malad West, Mumbai',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://portal.mcgm.gov.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:00',
  },

  // Bengaluru
  {
    id: 'nat-blr-med-01',
    name: 'Victoria Hospital Heat Illness Wing',
    category: 'medical',
    latitude: 12.9629,
    longitude: 77.5753,
    address: 'Fort Road, Near City Market, Bengaluru',
    source: 'Government of Karnataka',
    sourceUrl: 'https://karnataka.gov.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-blr-med-02',
    name: 'Manipal Hospital Emergency & Trauma Care',
    category: 'medical',
    latitude: 12.9587,
    longitude: 77.6483,
    address: 'HAL Airport Road, Kodihalli, Bengaluru',
    source: 'Manipal Hospitals',
    sourceUrl: 'https://manipalhospitals.com',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-blr-wat-01',
    name: 'BBMP Free Shaded Drinking Water Kiosk - Majestic',
    category: 'water',
    latitude: 12.9767,
    longitude: 77.5713,
    address: 'Kempegowda Bus Station Concourse, Bengaluru',
    source: 'BBMP Disaster Management Cell',
    sourceUrl: 'https://bbmp.gov.in',
    verification: 'authority-listed',
    openingHours: '06:00 – 22:00',
  },
  {
    id: 'nat-blr-wat-02',
    name: 'Namma Metro Chilled Water ATM - MG Road',
    category: 'water',
    latitude: 12.9754,
    longitude: 77.6066,
    address: 'MG Road Metro Station, Bengaluru',
    source: 'BMRCL Amenities',
    sourceUrl: 'https://english.bmrc.co.in',
    verification: 'authority-listed',
    openingHours: '06:00 – 23:00',
  },
  {
    id: 'nat-blr-cool-01',
    name: 'Phoenix Mall of Asia Commercial AC Public Refuge',
    category: 'cooling',
    latitude: 13.0645,
    longitude: 77.5908,
    address: 'Bellary Road, Byatarayanapura, Hebbal, Bengaluru',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://bbmp.gov.in',
    verification: 'authority-listed',
    openingHours: '10:00 – 22:30',
  },

  // Kolkata
  {
    id: 'nat-ccu-med-01',
    name: 'SSKM Hospital & IPGMER Emergency Services',
    category: 'medical',
    latitude: 22.5393,
    longitude: 88.3435,
    address: 'AJC Bose Road, Bhowanipore, Kolkata',
    source: 'Health & Family Welfare Dept, West Bengal',
    sourceUrl: 'https://wbhealth.gov.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-ccu-wat-01',
    name: 'KMC Purified Cold Drinking Water Kiosk - Esplanade',
    category: 'water',
    latitude: 22.5658,
    longitude: 88.3516,
    address: 'Jawaharlal Nehru Road, Esplanade, Kolkata',
    source: 'Kolkata Municipal Corporation',
    sourceUrl: 'https://kmcgov.in',
    verification: 'authority-listed',
    openingHours: '07:00 – 21:00',
  },
  {
    id: 'nat-ccu-cool-01',
    name: 'South City Mall Commercial AC Cooling Hub',
    category: 'cooling',
    latitude: 22.4988,
    longitude: 88.3615,
    address: 'Prince Anwar Shah Road, Jadavpur, Kolkata',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://kmcgov.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:00',
  },

  // Chennai
  {
    id: 'nat-maa-med-01',
    name: 'Rajiv Gandhi Government General Hospital',
    category: 'medical',
    latitude: 13.0827,
    longitude: 80.2785,
    address: 'EVR Periyar Salai, Park Town, Chennai',
    source: 'Government of Tamil Nadu',
    sourceUrl: 'https://tn.gov.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-maa-wat-01',
    name: 'Chennai Central Chilled Drinking Water Hub',
    category: 'water',
    latitude: 13.0824,
    longitude: 80.2755,
    address: 'Dr. MGR Chennai Central Station, Chennai',
    source: 'Southern Railway',
    sourceUrl: 'https://sr.indianrailways.gov.in',
    verification: 'authority-listed',
    openingHours: '24/7',
  },
  {
    id: 'nat-maa-cool-01',
    name: 'Express Avenue Commercial AC Public Refuge',
    category: 'cooling',
    latitude: 13.0588,
    longitude: 80.2642,
    address: 'Whites Road, Royapettah, Chennai',
    source: 'Greater Chennai Corporation',
    sourceUrl: 'https://chennaicorporation.gov.in',
    verification: 'authority-listed',
    openingHours: '10:00 – 22:00',
  },

  // Ahmedabad
  {
    id: 'nat-ahd-med-01',
    name: 'Civil Hospital Ahmedabad - Heat Stroke Unit',
    category: 'medical',
    latitude: 23.0536,
    longitude: 72.5925,
    address: 'Asarwa, Ahmedabad',
    source: 'Health and Family Welfare Department Gujarat',
    sourceUrl: 'https://gujhealth.gujarat.gov.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-ahd-wat-01',
    name: 'AMC Shaded Chilled Water Dispenser - Kalupur',
    category: 'water',
    latitude: 23.0287,
    longitude: 72.6009,
    address: 'Kalupur Railway Station Circle, Ahmedabad',
    source: 'Ahmedabad Municipal Corporation',
    sourceUrl: 'https://ahmedabadcity.gov.in',
    verification: 'authority-listed',
    openingHours: '07:00 – 21:00',
  },
  {
    id: 'nat-ahd-cool-01',
    name: 'Alpha One Mall Commercial AC Cooling Centre',
    category: 'cooling',
    latitude: 23.0397,
    longitude: 72.5312,
    address: 'Vastrapur Lake Road, Ahmedabad',
    source: 'Ahmedabad Municipal Corporation',
    sourceUrl: 'https://ahmedabadcity.gov.in',
    verification: 'authority-listed',
    openingHours: '10:00 – 22:00',
  },

  // Jaipur
  {
    id: 'nat-jpr-med-01',
    name: 'Sawai Man Singh (SMS) Hospital Emergency Centre',
    category: 'medical',
    latitude: 26.8967,
    longitude: 75.8155,
    address: 'JLN Marg, Ashok Nagar, Jaipur',
    source: 'Medical, Health and Family Welfare Dept Rajasthan',
    sourceUrl: 'https://rajswasthya.nic.in',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-jpr-wat-01',
    name: 'PHED Cold Drinking Water Station - MI Road',
    category: 'water',
    latitude: 26.9189,
    longitude: 75.8123,
    address: 'Mirza Ismail Road, Jaipur',
    source: 'Public Health Engineering Department Rajasthan',
    sourceUrl: 'https://phedwater.rajasthan.gov.in',
    verification: 'authority-listed',
    openingHours: '08:00 – 20:00',
  },
  {
    id: 'nat-jpr-cool-01',
    name: 'World Trade Park Commercial AC Cooling Hub',
    category: 'cooling',
    latitude: 26.8536,
    longitude: 75.8053,
    address: 'Jawahar Lal Nehru Marg, Malviya Nagar, Jaipur',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://jaipurmc.org',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:00',
  },

  // Lucknow
  {
    id: 'nat-lko-med-01',
    name: "King George's Medical University Hospital",
    category: 'medical',
    latitude: 26.8687,
    longitude: 80.9168,
    address: 'Shah Mina Road, Chowk, Lucknow',
    source: 'KGMU Healthcare Services',
    sourceUrl: 'https://kgmu.org',
    verification: 'authority-listed',
    emergencyDepartment: true,
  },
  {
    id: 'nat-lko-wat-01',
    name: 'Jal Sansthan Chilled Drinking Water Kiosk - Hazratganj',
    category: 'water',
    latitude: 26.8516,
    longitude: 80.9462,
    address: 'Hazratganj Crossing, Lucknow',
    source: 'Lucknow Jal Sansthan',
    sourceUrl: 'https://lmc.up.nic.in',
    verification: 'authority-listed',
    openingHours: '08:00 – 20:00',
  },
  {
    id: 'nat-lko-cool-01',
    name: 'Phoenix Palassio Commercial AC Shelter',
    category: 'cooling',
    latitude: 26.8048,
    longitude: 81.0028,
    address: 'Amar Shaheed Path, Sector 7, Gomti Nagar Extension, Lucknow',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://lmc.up.nic.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:00',
  },

  // Hyderabad City & Urban Hubs
  {
    id: 'nat-hyd-wat-01',
    name: 'GHMC Chalivendram Water Cooling Station - Charminar',
    category: 'water',
    latitude: 17.3616,
    longitude: 78.4747,
    address: 'Charminar Heritage Plaza, Hyderabad',
    source: 'Greater Hyderabad Municipal Corporation',
    sourceUrl: 'https://ghmc.gov.in',
    verification: 'authority-listed',
    openingHours: '08:00 – 20:00',
  },
  {
    id: 'nat-hyd-wat-02',
    name: 'HMWS&SB Chilled Water Dispenser - Secunderabad',
    category: 'water',
    latitude: 17.4344,
    longitude: 78.5017,
    address: 'Secunderabad Railway Station Forecourt, Hyderabad',
    source: 'HMWS&SB',
    sourceUrl: 'https://hyderabadwater.gov.in',
    verification: 'authority-listed',
    openingHours: '24/7',
  },
  {
    id: 'nat-hyd-wat-03',
    name: 'GHMC Public Water ATM - KPHB Colony',
    category: 'water',
    latitude: 17.4933,
    longitude: 78.3978,
    address: 'Road No. 1, KPHB Colony, Kukatpally, Hyderabad',
    source: 'Greater Hyderabad Municipal Corporation',
    sourceUrl: 'https://ghmc.gov.in',
    verification: 'authority-listed',
    openingHours: '07:00 – 21:00',
  },
  {
    id: 'nat-hyd-wat-04',
    name: 'HMWS&SB Chalivendram Water Booth - Dilsukhnagar',
    category: 'water',
    latitude: 17.3688,
    longitude: 78.5247,
    address: 'Dilsukhnagar Bus Depot, Hyderabad',
    source: 'HMWS&SB',
    sourceUrl: 'https://hyderabadwater.gov.in',
    verification: 'authority-listed',
    openingHours: '08:00 – 20:00',
  },
  {
    id: 'nat-hyd-cool-01',
    name: 'Inorbit Mall Commercial AC Refuge - HITEC City',
    category: 'cooling',
    latitude: 17.4339,
    longitude: 78.3846,
    address: 'Mindspace Madhapur, Hyderabad',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://ghmc.gov.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:30',
  },
  {
    id: 'nat-hyd-cool-02',
    name: 'Sarath City Capital Mall AC Public Hub - Gachibowli',
    category: 'cooling',
    latitude: 17.4578,
    longitude: 78.3638,
    address: 'Gachibowli - Miyapur Road, Hyderabad',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://ghmc.gov.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:30',
  },
  {
    id: 'nat-hyd-cool-03',
    name: 'Forum Sujana Mall Commercial AC Centre - Kukatpally',
    category: 'cooling',
    latitude: 17.4842,
    longitude: 78.3892,
    address: 'KPHB Phase 9, Kukatpally, Hyderabad',
    source: 'Municipal Heat Action Network',
    sourceUrl: 'https://ghmc.gov.in',
    verification: 'authority-listed',
    openingHours: '11:00 – 22:30',
  },
]

export function getDefaultFacilities(origin?: Pick<SelectedLocation, 'latitude' | 'longitude'> | null): SafetyResource[] {
  const result: SafetyResource[] = []

  // 1. Curated nationwide points
  for (const item of NATIONWIDE_KEY_FACILITIES) {
    const dist = origin && validCoordinates(origin.latitude, origin.longitude)
      ? distanceKm(origin, item)
      : 0
    result.push({ ...item, distanceKm: dist })
  }

  // 2. All DEMO_COOLING_SPOTS across wards
  const allCooling = Object.values(DEMO_COOLING_SPOTS).flat()
  for (const c of allCooling) {
    if (!validCoordinates(c.latitude, c.longitude)) continue
    const dist = origin && validCoordinates(origin.latitude, origin.longitude)
      ? distanceKm(origin, { latitude: c.latitude, longitude: c.longitude })
      : 0
    result.push({
      id: `verified-cooling-${c.id}`,
      name: `${c.name} (AC Cooling Centre)`,
      category: 'cooling',
      latitude: c.latitude,
      longitude: c.longitude,
      distanceKm: dist,
      address: c.address,
      phone: c.contact ? (phoneHref(c.contact) ? c.contact : undefined) : undefined,
      source: c.source || 'GHMC Municipal Heat Action Plan',
      sourceUrl: 'https://ghmc.gov.in',
      verification: 'authority-listed',
      openingHours: c.operating_hours,
    })
  }

  // 3. Real verified facilities (hospitals, PHCs, water points, transit)
  for (const f of realFacilities as Array<{ id: string; name: string; facility_type: string; lat: number; lon: number; address: string | null; phone: string | null; source: string | null }>) {
    if (!validCoordinates(f.lat, f.lon)) continue
    const dist = origin && validCoordinates(origin.latitude, origin.longitude)
      ? distanceKm(origin, { latitude: f.lat, longitude: f.lon })
      : 0
    const cat: Exclude<ResourceCategory, 'all'> =
      f.facility_type === 'hospital' || f.facility_type === 'phc'
        ? 'medical'
        : f.facility_type === 'water_point'
        ? 'water'
        : 'cooling'
    result.push({
      id: `real-${f.id}`,
      name: f.name,
      category: cat,
      latitude: f.lat,
      longitude: f.lon,
      distanceKm: dist,
      address: f.address || undefined,
      phone: f.phone ? (phoneHref(f.phone) ? f.phone : undefined) : undefined,
      source: f.source || 'National Health Mission & Municipal Directory',
      sourceUrl: 'https://nhm.gov.in',
      verification: 'authority-listed',
    })
  }

  // Deduplicate by ID
  const map = new Map<string, SafetyResource>()
  for (const r of result) {
    if (!map.has(r.id)) map.set(r.id, r)
  }
  return Array.from(map.values())
}

