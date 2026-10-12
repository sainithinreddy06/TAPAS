import { expect, test } from '@playwright/test'
test('live India-wide search and genuine weather/resource fallback',async({page},testInfo)=>{
 test.skip(process.env.PLAYWRIGHT_LIVE!=='1','Opt-in public provider checks')
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto('/dashboard')
 const search=page.getByRole('combobox',{name:'Find your place in India'})
 for(const city of ['Hyderabad','Mumbai','Karimnagar']){
  await search.fill(city);await search.press('Enter');await page.getByRole('option',{name:new RegExp(city)}).first().click()
  await expect(page.getByRole('region',{name:'Selected location'})).toContainText(city)
  await expect(page.getByTestId('kpi-grid').getByText(/\d+\.\d+°C/).first()).toBeVisible({timeout:30000})
  await expect.poll(async()=>Number(await page.getByTestId('heat-layer').getAttribute('data-rendered-points')),{timeout:15000}).toBeGreaterThan(0)
  await testInfo.attach(city+'-conditions',{body:await page.getByRole('region',{name:'Heat and weather conditions'}).innerText(),contentType:'text/plain'})
  if(city==='Mumbai'){
   await expect(page.locator('#nearby-help').getByRole('link',{name:/Directions in Google Maps/}).first()).toBeVisible({timeout:30000})
   await testInfo.attach('Mumbai-nearby-provenance',{body:await page.locator('#nearby-help').innerText(),contentType:'text/plain'})
  }
 }
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:'artifacts/qa/citizen-390.png'});await page.getByTestId('heat-map').screenshot({path:'artifacts/qa/local-map-390.png'})
 await page.goto('/login');await page.screenshot({path:'artifacts/qa/login-390.png'})
 await page.getByRole('button',{name:'Use Demo Account · Higher Authority'}).click();await expect(page.getByTestId('national-ranking')).toBeVisible();await page.screenshot({path:'artifacts/qa/authority-390.png'})
 expect(errors).toEqual([])
})
