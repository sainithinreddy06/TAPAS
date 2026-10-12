import { expect, test } from '@playwright/test'

test.describe('production PWA', () => {
  test.skip(process.env.PLAYWRIGHT_PWA !== '1', 'Set PLAYWRIGHT_PWA=1 and target a production server; development intentionally disables the worker.')

  test('serves a valid standalone manifest and actual icon dimensions', async ({ request }) => {
    const response = await request.get('/manifest.json')
    expect(response.ok()).toBe(true)
    const manifest = await response.json()
    expect(manifest.name).toContain('Thermal Analytics & Public-health Advisory System')
    expect(manifest.start_url).toBe('/dashboard')
    expect(manifest.display).toBe('standalone')
    expect(manifest.scope).toBe('/')
    for (const size of [192, 512]) {
      const icon = await request.get(`/icons/icon-${size}.png`)
      expect(icon.ok()).toBe(true)
      const png = await icon.body()
      expect(png.subarray(1, 4).toString()).toBe('PNG')
      expect(png.readUInt32BE(16)).toBe(size)
      expect(png.readUInt32BE(20)).toBe(size)
    }
  })

  test('prepares once, then reopens the selected route and an unvisited route offline', async ({ page, context }) => {
    await page.goto('/dashboard')
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    const registrations = await page.evaluate(async () => {
      return (await navigator.serviceWorker.getRegistrations()).map((entry) => entry.scope)
    })
    expect(registrations).toHaveLength(1)

    await context.setOffline(true)
    await page.goto('/dashboard?lat=28.6139&lon=77.2090&place=Delhi', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByTestId('offline-banner')).toContainText('No internet connection')
    await expect(page.getByRole('region', {name: 'Selected location'})).toContainText('Delhi')
    expect(new URL(page.url()).searchParams.get('lat')).toBe('28.6139')

    // This route was never visited by the user: its HTML must have been saved
    // during installation, along with the chunks needed to hydrate it.
    await page.goto('/occupational', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Occupational heat exposure/i })).toBeVisible()
    await expect(page.getByTestId('offline-banner')).toBeVisible()
    await expect(page.getByText('Continuous work permissible all day', { exact: true })).toHaveCount(0)

    await page.goto('/unavailable-offline-page', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'This page is unavailable offline' })).toBeVisible()
    await context.setOffline(false)
  })

  test('revalidates a saved weather response offline and keeps another place on its own genuine snapshot', async ({page,context}) => {
    await page.goto('/dashboard')
    await page.evaluate(async()=>{await navigator.serviceWorker.ready})
    await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true)
    const date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
    await page.evaluate(({date})=>{
      const url=new URL('https://api.open-meteo.com/v1/forecast'), fields='temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m'
      for(const [k,v] of Object.entries({latitude:'28.6139',longitude:'77.209',start_date:date,end_date:date,hourly:fields,current:fields,timezone:'Asia/Kolkata',timeformat:'unixtime',temperature_unit:'celsius',wind_speed_unit:'ms'}))url.searchParams.set(k,v)
      const units={time:'unixtime',temperature_2m:'°C',relative_humidity_2m:'%',apparent_temperature:'°C'}
      const payload={latitude:28.6139,longitude:77.209,utc_offset_seconds:19800,hourly_units:units,hourly:{time:[Date.parse(date+'T12:00:00+05:30')/1000],temperature_2m:[37],relative_humidity_2m:[50],apparent_temperature:[40]}}
      localStorage.setItem('tapas-validated-source-cache-v1',JSON.stringify([{url:url.href,payload,fetchedAt:new Date(Date.now()-3600000).toISOString()}]))
    },{date})
    await context.setOffline(true)
    await page.goto(`/dashboard?lat=28.6139&lon=77.209&place=Delhi&date=${date}`,{waitUntil:'domcontentloaded'})
    await expect(page.getByTestId('kpi-grid')).toContainText('37.0°C')
    await expect(page.getByRole('region',{name:'Heat and weather conditions'}).getByTestId('data-provenance')).toContainText('CACHED')
    await page.goto(`/dashboard?lat=19.076&lon=72.8777&place=Mumbai&date=${date}`,{waitUntil:'domcontentloaded'})
    await expect(page.getByRole('region',{name:'Selected location'})).toContainText('Mumbai')
    await expect(page.getByTestId('kpi-grid')).not.toContainText('37.0°C')
    await context.setOffline(false)
  })
})
