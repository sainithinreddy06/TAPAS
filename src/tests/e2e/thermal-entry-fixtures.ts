import type { Page } from '@playwright/test'
import { mockProviders, todayInIndia } from './fixtures'

export const entryDate = todayInIndia()
export const entryQuery = new URLSearchParams({
  lat: '19.07600', lon: '72.87770', place: 'Mumbai', date: entryDate, ward: 'MUMBAI-TEST-WARD',
}).toString()

/** Valid multi-city weather responses for entry tests only; shared provider fixtures stay unchanged. */
export async function mockEntryProviders(page: Page, weather: 'success' | 'missing' | 'failure' | 'skip-first' | 'partial' = 'success') {
  await page.clock.setFixedTime(new Date(`${entryDate}T12:00:00+05:30`))
  const providers = await mockProviders(page)
  // Existing dashboards use Esri tiles as well as OSM. Keep this suite local.
  await page.route(url => url.hostname.endsWith('arcgisonline.com'), route => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'),
  }))
  let weatherRequests = 0
  await page.route(url => url.hostname === 'api.open-meteo.com', async route => {
    weatherRequests += 1
    if (weather === 'failure') return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Automated weather failure"}' })
    const url = new URL(route.request().url())
    const latitudes = (url.searchParams.get('latitude') ?? '19.076').split(',').map(Number)
    const longitudes = (url.searchParams.get('longitude') ?? '72.8777').split(',').map(Number)
    const requestedDate = url.searchParams.get('start_date') ?? entryDate
    const time = Date.parse(`${requestedDate}T12:00:00+05:30`) / 1000
    const units = { time: 'unixtime', temperature_2m: '°C', relative_humidity_2m: '%', apparent_temperature: '°C', wind_speed_10m: 'm/s' }
    const rows = latitudes.map((latitude, index) => ({
      latitude, longitude: longitudes[index], utc_offset_seconds: 19800,
      current_units: units,
      current: {
        time: weather === 'skip-first' && index === 0 ? time - 86400 : time,
        temperature_2m: weather === 'missing' ? null : 36,
        relative_humidity_2m: weather === 'missing' || weather === 'partial' ? null : 54,
        apparent_temperature: weather === 'missing' ? null : 39,
        wind_speed_10m: weather === 'missing' || weather === 'partial' ? null : 3.5,
      },
      ...(weather === 'skip-first' && index === 0 ? {} : {
        hourly_units: units,
        hourly: { time: [time], temperature_2m: [36], relative_humidity_2m: [54], apparent_temperature: [39], wind_speed_10m: [3.5] },
      }),
    }))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(rows.length === 1 ? rows[0] : rows) })
  })
  return { ...providers, get weatherRequests() { return weatherRequests } }
}
