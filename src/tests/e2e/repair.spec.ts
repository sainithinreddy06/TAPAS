import {expect,test} from '@playwright/test'
test('cold national map paints recorded real points when provider is blocked',async({page})=>{
 await page.route('https://api.open-meteo.com/**',route=>route.abort())
 const started=Date.now();await page.goto('/dashboard',{waitUntil:'domcontentloaded'})
 const layer=page.getByTestId('heat-layer');await expect(layer).toHaveAttribute('data-point-count','68',{timeout:3000});await expect(layer).toHaveAttribute('data-status','snapshot')
 await expect.poll(async()=>Number(await layer.getAttribute('data-rendered-points')),{timeout:3000}).toBeGreaterThan(20)
 const elapsed=Date.now()-started;console.log('Cold national heat painted in '+elapsed+' ms');if(process.env.PLAYWRIGHT_PWA==='1')expect(elapsed).toBeLessThan(3000)
 await page.getByTestId('heat-map').screenshot({path:'artifacts/qa/repaired-national-heat.png'})
})
test('selected-city snapshot keeps source time and responds to location',async({page})=>{
 await page.route('https://api.open-meteo.com/**',route=>route.abort());await page.route('https://nominatim.openstreetmap.org/**',route=>route.abort())
 await page.goto('/dashboard?lat=17.384&lon=78.4564&place=Hyderabad')
 await expect(page.getByTestId('kpi-grid')).toContainText('SNAPSHOT')
 await expect(page.getByTestId('kpi-grid')).toContainText(/\d+\.\d+°C/)
 const before=await page.getByTestId('kpi-grid').textContent()
 await page.goto('/dashboard?lat=19.07283&lon=72.88261&place=Mumbai');await expect(page.getByTestId('kpi-grid')).toContainText('SNAPSHOT')
 expect(await page.getByTestId('kpi-grid').textContent()).not.toBe(before)
})
