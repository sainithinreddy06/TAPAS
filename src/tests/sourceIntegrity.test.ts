import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normaliseWardRisk, normaliseOccupational, numberOrNull, safeHttpUrl, validateIdentity, validatedRequest } from '@/lib/api'
import { coordinateLocation, locationKey, readLocationParams } from '@/lib/location'
import { parsePhoton, parseCoordinateQuery } from '@/lib/geocoding'
import { parseGeometry } from '@/lib/geometry'
import { parseWeather } from '@/lib/weather'
const location=coordinateLocation(19.076,72.8777), date='2026-09-07', fetchedAt='2026-09-07T12:00:00Z'
const identity={geographic_id:locationKey(location),date}
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks()})
describe('source integrity',()=>{
 it('preserves nullable and malformed scientific fields, and accepts Level 5',()=>{
  const row=normaliseWardRisk({ward_id:'test',date,risk_level:5,utci_max:null,excess_deaths:'0',hot_night:'false'})
  expect(row.risk_level).toBe(5);expect(row.utci_max).toBeNull();expect(row.excess_deaths).toBeNull();expect(row.hot_night).toBeNull()
  expect(numberOrNull('42')).toBeNull();expect(numberOrNull(Infinity)).toBeNull()
 })
 it('rejects wrong or contradictory place and date identity',()=>{
  expect(()=>validateIdentity(identity,location,date)).not.toThrow()
  expect(()=>validateIdentity({...identity,latitude:28,longitude:77},location,date)).toThrow()
  expect(()=>validateIdentity({...identity,date:'2026-09-08'},location,date)).toThrow()
  expect(()=>validateIdentity({date},location,date)).toThrow()
 })
 it('missing occupational schedule is never fabricated',()=>{
  const data=normaliseOccupational({ward_id:'test',date,hourly:[{hour:12,wbgt:31,band:'unknown',work_pct:75,rest_pct:75}]})
  expect(data.safe_windows).toBeNull();expect(data.work_rest).toBeNull();expect(data.hourly[0].work_pct).toBeNull();expect(data.hourly[0].band).toBeNull()
 })
 it('untrusted protocols are rejected',()=>{
  expect(()=>safeHttpUrl('javascript:alert(1)')).toThrow();expect(()=>safeHttpUrl('https://user:password@example.com')).toThrow()
 })
 it('caches only validated data and never mixes selections',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({value:42}),{status:200}))
  const parse=(v:unknown,time:string,fromCache:boolean)=>({value:(v as {value:number}).value,time,fromCache})
  const url=new URL('https://example.com/data?point=A')
  const fresh=await validatedRequest(url,parse);expect(fresh.fromCache).toBe(false)
  fetch.mockRejectedValue(new TypeError('offline'))
  const cached=await validatedRequest(url,parse);expect(cached.fromCache).toBe(true);expect(cached.time).toBe(fresh.time)
  await expect(validatedRequest(new URL('https://example.com/data?point=B'),parse)).rejects.toThrow()
 })
})
describe('geographic scope',()=>{
 it('coordinates remain usable without implying verified jurisdiction',()=>{
  expect(parseCoordinateQuery('19.076, 72.8777')?.latitude).toBe(19.076)
  expect(()=>parseCoordinateQuery('72.8777, 19.076')).toThrow()
  expect(readLocationParams(new URLSearchParams('lat=19.076&lon=72.8777&place=Delhi'))?.countryCode).toBe('')
 })
 it('geocoder filters non-India and invalid coordinates',()=>{
  const feature=(code:string,lat:number)=>({properties:{name:'Test',countrycode:code,osm_id:1,osm_type:'R'},geometry:{type:'Point',coordinates:[72.8777,lat]}})
  expect(parsePhoton({features:[feature('IN',19.076),feature('GB',19.076),feature('IN',NaN)]})).toHaveLength(1)
 })
 it('requires sourced versioned boundaries and rejects duplicated feature identity',()=>{
  const feature={type:'Feature',properties:{ward_id:'test'},geometry:{type:'Polygon',coordinates:[[[72.8,19],[72.9,19],[72.9,19.1],[72.8,19]]]}}
  const payload={...identity,type:'FeatureCollection',source:'Test authority fixture',version:'1',features:[feature]}
  expect(parseGeometry(payload,location).features).toHaveLength(1)
  expect(()=>parseGeometry({...payload,source:null},location)).toThrow()
  expect(()=>parseGeometry({...payload,features:[feature,feature]},location)).toThrow()
 })
})
it('weather checks units, grid and dates without fabricating missing readings',()=>{
 const payload={latitude:location.latitude,longitude:location.longitude,utc_offset_seconds:19800,hourly_units:{time:'unixtime',temperature_2m:'°C',relative_humidity_2m:'%',apparent_temperature:'°C'},hourly:{time:[Date.parse(date+'T12:00:00+05:30')/1000],temperature_2m:[null],relative_humidity_2m:[50],apparent_temperature:[37]}}
 const weather=parseWeather(payload,location,date,fetchedAt,false);expect(weather.hourly[0].temperature).toBeNull();expect(weather.hourly[0].humidity).toBe(50)
 expect(()=>parseWeather({...payload,latitude:28},location,date,fetchedAt,false)).toThrow()
 expect(()=>parseWeather(payload,location,'2026-09-08',fetchedAt,false)).toThrow()
 expect(()=>parseWeather({...payload,hourly_units:{...payload.hourly_units,temperature_2m:'°F'}},location,date,fetchedAt,false)).toThrow()
})
