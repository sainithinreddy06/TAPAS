import type { Page, Route } from '@playwright/test'

/** Explicit automated-test fixtures. None is imported by the application. */
export const places = {
  Mumbai: { latitude: 19.076, longitude: 72.8777, id: 1, state: 'Maharashtra' },
  Delhi: { latitude: 28.6139, longitude: 77.209, id: 2, state: 'Delhi' },
  Uncovered: { latitude: 26.1, longitude: 91.1, id: 3, state: 'Assam' },
}

export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function placeUrl(name: keyof typeof places, extra: Record<string, string> = {}): string {
  const point = places[name]
  return `/dashboard?${new URLSearchParams({ lat: String(point.latitude), lon: String(point.longitude), place: name, date: todayInIndia(), ...extra })}`
}

export async function mockProviders(page: Page, options: { holdMumbai?: boolean; nullValues?: boolean; noCoverage?: boolean } = {}) {
  const requests: URL[] = []
  let releaseMumbai: () => void = () => undefined
  const gate = new Promise<void>((resolve) => { releaseMumbai = resolve })
  const source = 'Automated test fixture — not operational data'
  const respond = (route: Route, payload: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) })

  // No live geocoding/POI/map service is used by these browser tests.
  await page.route((url) => url.hostname === 'nominatim.openstreetmap.org' && url.pathname === '/search', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? ''
    if (q === 'Rate limited') return respond(route, {}, 429)
    const entries = Object.entries(places).filter(([name]) => name.toLowerCase().includes(q.toLowerCase()))
    await respond(route, entries.map(([name, point]) => ({lat:String(point.latitude),lon:String(point.longitude),display_name: `${name}, ${point.state}, India`,name,osm_type:'relation',osm_id:point.id,address:{city:name,state:point.state,country_code:'in'}})))
  })

  await page.route((url) => url.hostname === 'nominatim.openstreetmap.org' && url.pathname.startsWith('/reverse'), route => respond(route,{features:[]}))
  await page.route((url) => url.hostname === 'api.open-meteo.com', route => {
    const u=new URL(route.request().url()), date=u.searchParams.get('start_date') ?? todayInIndia()
    const epoch=Date.parse(date+'T12:00:00+05:30')/1000
    const units={time:'unixtime',temperature_2m:'°C',relative_humidity_2m:'%',apparent_temperature:'°C'}
    return respond(route,{latitude:Number(u.searchParams.get('latitude')),longitude:Number(u.searchParams.get('longitude')),utc_offset_seconds:19800,hourly_units:units,hourly:{time:[epoch],temperature_2m:[options.nullValues ? null:36],relative_humidity_2m:[options.nullValues ? null:54],apparent_temperature:[options.nullValues ? null:39]},current_units:units,current:{time:epoch,temperature_2m:options.nullValues ? null:36,relative_humidity_2m:options.nullValues ? null:54,apparent_temperature:options.nullValues ? null:39}})
  })
  await page.route((url) => url.pathname.endsWith('/interpreter'), async (route) => {
    const query = route.request().postData() ?? ''
    const name = query.includes('28.613900') ? 'Delhi' : 'Mumbai'
    const point = places[name]
    await respond(route, { elements: [{ type: 'node', id: point.id, lat: point.latitude + 0.001, lon: point.longitude, tags: { name: `${name} test medical resource`, amenity: 'hospital' } }] })
  })
  await page.route((url) => url.hostname.endsWith('tile.openstreetmap.org'), (route) => route.fulfill({
    contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'),
  }))

  await page.route((url) => /^\/api\/(risk|forecast|occupational|facilities|alerts|test-geometry)(\/|$)/.test(url.pathname), async (route) => {
    const url = new URL(route.request().url())
    requests.push(url)
    const latitude = Number(url.searchParams.get('latitude') ?? url.searchParams.get('lat'))
    const name = Math.abs(latitude - places.Delhi.latitude) < 0.01 ? 'Delhi' : Math.abs(latitude - places.Uncovered.latitude) < 0.01 ? 'Uncovered' : 'Mumbai'
    const date = url.searchParams.get('date') ?? todayInIndia()
    const id = `${name.toUpperCase()}-TEST-WARD`
    const identity = { geographic_id: url.searchParams.get('geographic_id'), latitude, longitude: Number(url.searchParams.get('longitude') ?? url.searchParams.get('lon')), date, source, generated_at: new Date(Date.now() - 60_000).toISOString(), ward_id: id, ward_name: `${name} fixture ward`, city: name }
    const nulls = options.nullValues
    const risk = { ward_id: id, ward_name: `${name} fixture ward`, city: name, date, risk_level: nulls ? null : date === todayInIndia() ? 5 : 3,
      utci_max: nulls ? null : name === 'Delhi' ? 47 : 43, utci_p97: nulls ? null : 39, hot_night: nulls ? null : true,
      consecutive_hot_days: nulls ? null : 2, excess_deaths: nulls ? null : 0.1, excess_deaths_low: nulls ? null : 0,
      excess_deaths_high: nulls ? null : 9, confidence_level: 90, interval_type: 'test interval', model_source: source }

    if (url.pathname === '/api/risk/map') {
      if (options.holdMumbai && name === 'Mumbai') await gate
      const unavailable = options.noCoverage || name === 'Uncovered'
      return respond(route, { ...identity, coverage: unavailable ? 'none' : 'available', wards: unavailable ? [] : [risk], summary: unavailable ? null : risk, methodology: source, run_id: `test-${date}` }).catch(() => undefined)
    }
    if (url.pathname === '/api/test-geometry') {
      const lon = identity.longitude, lat = identity.latitude
      return respond(route, { type: 'FeatureCollection', ...identity, version: 'test-only-1', features: [{ type: 'Feature', properties: { ward_id: id, name: `${name} fixture ward`, city: name }, geometry: { type: 'Polygon', coordinates: [[[lon - 0.01, lat - 0.01], [lon + 0.01, lat - 0.01], [lon + 0.01, lat + 0.01], [lon - 0.01, lat + 0.01], [lon - 0.01, lat - 0.01]]] } }] })
    }
    if (url.pathname.startsWith('/api/risk/')) return respond(route, { ...identity, days: [risk] })
    if (url.pathname.startsWith('/api/forecast/')) return respond(route, { ...identity, baseline_p97: 39, hourly: [{ time: `${date}T12:00:00+05:30`, utci: nulls ? null : 47, baseline_p97: 39, air_temp: nulls ? null : 38, relative_humidity: nulls ? null : 52 }] })
    if (url.pathname.startsWith('/api/occupational/')) return respond(route, { ...identity, hourly: [{ hour: 12, wbgt: nulls ? null : 32, band: 'unexpected-fixture-band', work_pct: null, rest_pct: null }], safe_windows: null, avoid_windows: null, work_rest: null })
    if (url.pathname.startsWith('/api/facilities/')) return respond(route, { ...identity, facilities: [] })
    if (url.pathname.endsWith('/cap')) return respond(route, { error: 'Test CAP source failure' }, 503)
    if (url.pathname === '/api/alerts') return respond(route, { ...identity, alerts: [{ id: `${name}-TEST-ALERT`, ward_id: id, ward_name: `${name} fixture ward`, city: name, risk_level: 5, date,
      issued_at: new Date(Date.now() - 60_000).toISOString(), expires_at: new Date(Date.now() + 3_600_000).toISOString(), headline: `${name} test extreme alert`, advisory_en: 'Automated test advisory; not public-health guidance.' }] })
    return respond(route, {}, 404)
  })

  return { requests, releaseMumbai }
}
