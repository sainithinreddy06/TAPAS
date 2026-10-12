import { expect, test } from '@playwright/test'
import { mockProviders, placeUrl } from './fixtures'
test('unselected dashboard is explicit and keyboard search populates genuine source slots', async ({page})=>{
 await mockProviders(page); await page.goto('/dashboard')
 await expect(page.getByTestId('kpi-grid')).toContainText('Unavailable')
 const search=page.getByRole('combobox',{name:'Find your place in India'})
 await search.fill('Mumbai');await search.press('Enter');await expect(page.getByRole('option',{name:/Mumbai/})).toBeVisible();await search.press('ArrowDown');await search.press('Enter')
 await expect(page).toHaveURL(/lat=19.07600/);await expect(page.getByTestId('kpi-grid')).toContainText('36.0°C')
 await expect(page.getByTestId('ward-risk-list')).toContainText('Mumbai fixture ward — Level 5')
 await expect(page.getByTestId('nearby-resources')).toContainText('Mumbai test medical resource')
})
test('rapid place change ignores an older delayed response',async({page})=>{
 const {releaseMumbai}=await mockProviders(page,{holdMumbai:true});await page.goto(placeUrl('Mumbai'))
 const search=page.getByRole('combobox',{name:'Find your place in India'});await search.fill('Delhi');await search.press('Enter');await page.getByRole('option',{name:/Delhi/}).click()
 await expect(page.getByTestId('ward-risk-list')).toContainText('Delhi fixture ward');releaseMumbai()
 await expect(page.getByTestId('ward-risk-list')).not.toContainText('Mumbai');await expect(page.getByTestId('kpi-grid')).toContainText('47.0°C')
})
test('day changes replace risk values and navigation preserves selection',async({page})=>{
 await mockProviders(page);await page.goto(placeUrl('Delhi'))
 await expect(page.getByTestId('ward-risk-list')).toContainText('Level 5');await page.getByTestId('day-tick-1').click();await expect(page.getByTestId('ward-risk-list')).toContainText('Level 3')
 const date=new URL(page.url()).searchParams.get('date');await page.getByRole('link',{name:'Occupational',exact:true}).click();await expect(page.getByRole('combobox',{name:'Forecast date'})).toHaveValue(date!)
 expect(new URL(page.url()).searchParams.get('lat')).toBe('28.61390')
 await page.getByRole('link',{name:'Alerts',exact:true}).click();await expect(page.getByRole('combobox',{name:'Selected date'})).toHaveValue(date!)
 await page.goBack();await expect(page.getByRole('heading',{name:/Occupational heat exposure/})).toBeVisible()
})
test('uncovered places remain searchable without fabricated risk or relief centres',async({page})=>{
 await mockProviders(page);await page.goto(placeUrl('Uncovered'));await expect(page.getByTestId('kpi-grid')).toContainText('NOAA Heat Index category');await expect(page.getByTestId('ward-risk-list')).toBeEmpty()
 await page.getByRole('button',{name:'Cooling',exact:true}).click();await expect(page.getByText('No verified data available for this area.',{exact:false})).toBeVisible()
 await expect(page.getByRole('link',{name:/Call 112/})).toHaveAttribute('href','tel:112')
})
test('missing occupational inputs never become permission to work',async({page})=>{
 await mockProviders(page,{nullValues:true});await page.goto(placeUrl('Mumbai',{ward:'MUMBAI-TEST-WARD'}));await page.getByRole('link',{name:'Occupational',exact:true}).click()
 await expect(page.getByTestId('work-schedule')).toContainText('unavailable');await expect(page.getByText('Continuous work permissible all day',{exact:true})).toHaveCount(0)
})
test('Level 5 is visible and failed CAP export downloads nothing',async({page})=>{
 await mockProviders(page);await page.goto(placeUrl('Delhi'));await page.getByRole('link',{name:'Alerts',exact:true}).click()
 await page.getByRole('combobox',{name:'Risk level'}).selectOption('5');await expect(page.getByTestId('alert-card')).toContainText('Level 5')
 const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));await page.getByTestId('cap-download').click();await expect(page.getByText('CAP export failed',{exact:true})).toBeVisible();expect(downloads).toEqual([])
})
test('offline outage notice can be dismissed and returns on another outage',async({page,context})=>{
 await mockProviders(page);await page.goto('/dashboard');await expect(page.getByTestId('heat-map')).toBeVisible();await context.setOffline(true)
 const banner=page.getByTestId('offline-banner');await expect(banner).toContainText('No internet connection');await banner.getByRole('button',{name:/Dismiss/}).click();await expect(banner).toBeHidden();await context.setOffline(false);await context.setOffline(true);await expect(banner).toBeVisible();await context.setOffline(false)
})
for(const width of [320,360,375,390,412,768,1280]) test(`responsive routes at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await mockProviders(page);await page.goto(placeUrl('Delhi'))
 for(const route of ['Dashboard','Occupational','Alerts','About']){
  if(route!=='Dashboard') await page.getByRole('link',{name:route,exact:true}).click()
  await expect(page.getByRole('main')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
 }
})

test('search errors and denied geolocation keep manual selection usable',async({page})=>{
 await mockProviders(page)
 await page.addInitScript(()=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_ok:unknown,error:(value:{code:number})=>void)=>error({code:1})},configurable:true}))
 await page.goto('/dashboard');await page.getByRole('button',{name:'Use current location',exact:true}).click()
 await expect(page.getByText('Location permission denied.',{exact:false})).toBeVisible()
 const search=page.getByRole('combobox',{name:'Find your place in India'})
 await search.fill('Rate limited');await search.press('Enter');await expect(page.getByText('Provider rate limit reached.',{exact:false})).toBeVisible()
 await search.fill('no-matching-place');await search.press('Enter');await expect(page.getByText('No matching Indian place found.',{exact:false})).toBeVisible()
 await search.fill('72.8777, 19.076');await search.press('Enter');await expect(page.getByText('Enter latitude, longitude within the India map region.',{exact:false})).toBeVisible()
 await search.fill('19.076, 72.8777');await search.press('Enter');await page.getByRole('listbox',{name:'Indian places'}).getByRole('option').click();await expect(page).toHaveURL(/lat=19.07600/)
})

test('nearby filters and selected cards stay synchronized with map controls',async({page})=>{
 await mockProviders(page);await page.goto(placeUrl('Delhi'))
 await expect(page.getByText('Regional boundaries loaded',{exact:false})).toBeVisible()
 await expect(page.getByRole('checkbox',{name:'Nearby help (1)'})).toBeVisible()
 await page.getByRole('button',{name:'Delhi test medical resource — highlight on map'}).click()
 await expect(page.locator('[data-resource-id="osm-node-2"] button').first()).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('link',{name:/Directions in Google Maps/})).toHaveAttribute('href',/destination=28.6149/)
 await page.getByRole('button',{name:'Water',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Nearby help (0)'})).toBeVisible()
 await expect(page.locator('[data-resource-id="osm-node-2"]')).toHaveCount(0)
})
