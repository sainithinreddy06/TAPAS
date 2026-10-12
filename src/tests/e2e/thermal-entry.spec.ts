import { expect, test, type Page } from '@playwright/test'
import { entryQuery, mockEntryProviders } from './thermal-entry-fixtures'

test.use({ serviceWorkers: 'block' })

const scene = (page: Page) => page.locator('[data-mode="explore"][data-role]')
const choose = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
const roleHeadings = {
  citizen: 'Citizen',
  officer: 'Mandal Officer',
  authority: 'District Authority',
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}
async function signIn(page: Page, email: string) {
  await page.getByLabel('Officer ID or email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill('tapas2026')
  await page.getByRole('button', { name: 'Secure sign in', exact: true }).click()
}
function assertSelection(url: string, pathname: string, role?: string) {
  const target = new URL(url)
  expect(target.pathname).toBe(pathname)
  expect(Object.fromEntries(target.searchParams)).toEqual({ ...Object.fromEntries(new URLSearchParams(entryQuery)), ...(role ? { role } : {}) })
}

test('one persistent scene follows role buttons, keyboard and rapid selections without fetching again', async ({ page }) => {
  const fixtures = await mockEntryProviders(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`/?${entryQuery}`)
  await expect(page.getByRole('heading', { name: roleHeadings.citizen, exact: true })).toBeVisible()
  await expect(page.getByText('Illustrative thermal scene', { exact: false }).first()).toBeVisible()
  await expect.poll(() => fixtures.weatherRequests).toBeGreaterThan(0)
  const requests = fixtures.weatherRequests
  await scene(page).evaluate(element => element.setAttribute('data-identity-check', 'persistent'))
  const citizen = choose(page, 'Citizen')
  await citizen.focus()
  await citizen.press('ArrowRight')
  await expect(choose(page, 'Mandal Officer')).toBeFocused()
  await expect(scene(page)).toHaveAttribute('data-role', 'officer')
  await choose(page, 'Mandal Officer').press('End')
  await expect(choose(page, 'District Authority')).toBeFocused()
  await expect(scene(page)).toHaveAttribute('data-role', 'authority')
  await choose(page, 'District Authority').press('ArrowRight')
  await expect(scene(page)).toHaveAttribute('data-role', 'authority')
  await choose(page, 'District Authority').press('Home')
  await expect(scene(page)).toHaveAttribute('data-role', 'citizen')
  await choose(page, 'Mandal Officer').click()
  await choose(page, 'Citizen').click()
  await choose(page, 'District Authority').click()
  await expect(page.getByRole('heading', { name: roleHeadings.authority, exact: true })).toBeVisible()
  await expect(scene(page)).toHaveAttribute('data-identity-check', 'persistent')
  expect(fixtures.weatherRequests).toBe(requests)
  expect(errors).toEqual([])
})

for (const [role, name, cta, pathname] of [
  ['citizen', 'Citizen', 'Open Dashboard', '/dashboard'],
  ['officer', 'Mandal Officer', 'Officer Login', '/login'],
  ['authority', 'District Authority', 'Authority Login', '/login'],
] as const) test(`${role} entry preserves the exact destination and selection query`, async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/?${entryQuery}`)
  await choose(page, name).click()
  const link = page.getByRole('link', { name: cta, exact: true })
  assertSelection(new URL((await link.getAttribute('href'))!, page.url()).href, pathname, role === 'citizen' ? undefined : role)
  await link.click()
  await expect(page).toHaveURL(new RegExp(`${pathname}\\?`))
  assertSelection(page.url(), pathname, role === 'citizen' ? undefined : role)
  if (role !== 'citizen') {
    await expect(page.locator('[data-mode="access"][data-role]')).toHaveAttribute('data-role', role)
    await page.goBack()
    await expect(choose(page, 'Citizen')).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('button', { name: 'Secure sign in', exact: true })).toBeVisible()
  }
})

for (const [weather, city] of [['success', 'Delhi'], ['skip-first', 'Hyderabad'], ['missing', null], ['failure', null], ['partial', 'Delhi']] as const) {
  test(`reference weather: ${weather}`, async ({ page }) => {
    await mockEntryProviders(page, weather)
    await page.goto(`/?${entryQuery}`)
    const reference = page.getByLabel('Reference weather', { exact: true })
    if (city) {
      await expect(reference).toContainText(city)
      await expect(reference).toContainText('Open-Meteo')
      await expect(reference).toContainText('36')
      await expect(reference.locator('time')).toHaveAttribute('datetime', /T06:30:00.000Z$/)
      if (weather !== 'partial') {
        await expect(reference).toContainText('54')
        await expect(reference).toContainText('3.5')
      } else await expect(reference).toContainText(/unavailable/i)
    } else await expect(reference).toContainText(/unavailable/i)
    await expect(page.getByRole('heading', { name: roleHeadings.citizen, exact: true })).toBeVisible()
    await expect(reference).not.toContainText('42°C')
  })
}

for (const role of ['officer', 'authority'] as const) test(`${role} credentials, errors, session persistence and sign-out remain intact`, async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/login?role=${role}&${entryQuery}`)
  await expect(page.locator('[data-mode="access"][data-role]')).toHaveAttribute('data-role', role)
  const submit = page.getByRole('button', { name: 'Secure sign in', exact: true })
  await submit.click()
  await expect(page.getByText('Please enter your officer credentials.', { exact: true })).toBeVisible()
  await page.getByLabel('Officer ID or email', { exact: true }).fill('invalid@example.test')
  await page.getByLabel('Password', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: 'Show password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password', exact: true }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password')
  await submit.click()
  await expect(page.getByText('Invalid credentials. Check the hinted officer access credentials below.', { exact: true })).toBeVisible()
  await signIn(page, role === 'officer' ? 'officer@tapas.gov.in' : 'collector@tapas.gov.in')
  await expect(page).toHaveURL(new RegExp(`/${role}\\?`))
  assertSelection(page.url(), `/${role}`)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tapas-demo-role-v1'))).toBe(role)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  expect(await page.evaluate(() => localStorage.getItem('tapas-demo-role-v1'))).toBeNull()
  await page.goto(`/${role}?${entryQuery}`)
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('link', { name: /Public heat advisory/ }).click()
  await expect(page).toHaveURL(/\/dashboard\?/)
})

test('default login remains officer and entered credentials determine the authenticated role', async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/login?${entryQuery}`)
  await expect(page.getByRole('heading', { name: 'Officer Access', exact: true })).toBeVisible()
  await expect(page.getByLabel('Officer ID or email', { exact: true })).toHaveAttribute('placeholder', 'officer@tapas.gov.in')
  await signIn(page, 'collector@tapas.gov.in')
  await expect(page).toHaveURL(/\/authority\?/)
})

test('access tabs support roving keyboard focus and connected panels while preserving selection', async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/login?${entryQuery}&context=field-visit`)
  const officer = choose(page, 'Mandal Officer')
  const authority = choose(page, 'District Authority')
  const panel = page.getByRole('tabpanel')

  const assertAccessRole = async (role: 'officer' | 'authority') => {
    const selected = role === 'officer' ? officer : authority
    const other = role === 'officer' ? authority : officer
    await expect(selected).toBeFocused()
    await expect(selected).toHaveAttribute('id', `access-tab-${role}`)
    await expect(selected).toHaveAttribute('aria-selected', 'true')
    await expect(selected).toHaveAttribute('tabindex', '0')
    await expect(other).toHaveAttribute('aria-selected', 'false')
    await expect(other).toHaveAttribute('tabindex', '-1')
    await expect(selected).toHaveAttribute('aria-controls', 'access-panel')
    await expect(other).toHaveAttribute('aria-controls', 'access-panel')
    await expect(panel).toHaveAttribute('id', 'access-panel')
    await expect(panel).toHaveAttribute('aria-labelledby', `access-tab-${role}`)
    await expect(panel.getByLabel('Officer ID or email', { exact: true })).toBeVisible()
    await expect(panel.getByRole('heading', { name: role === 'officer' ? 'Officer Access' : 'Authority Command Access', exact: true })).toBeVisible()
    await expect(page.locator('[data-mode="access"][data-role]')).toHaveAttribute('data-role', role)
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
      ...Object.fromEntries(new URLSearchParams(entryQuery)), context: 'field-visit', role,
    })
  }

  await officer.focus()
  await expect(officer).toHaveAttribute('tabindex', '0')
  await expect(authority).toHaveAttribute('tabindex', '-1')
  await officer.press('ArrowRight')
  await assertAccessRole('authority')
  await authority.press('ArrowRight')
  await assertAccessRole('authority')
  await authority.press('Home')
  await assertAccessRole('officer')
  await officer.press('ArrowLeft')
  await assertAccessRole('officer')
  await officer.press('End')
  await assertAccessRole('authority')
  await authority.press('ArrowLeft')
  await assertAccessRole('officer')
  await officer.press('Tab')
  await expect(page.getByLabel('Officer ID or email', { exact: true })).toBeFocused()
})

test('access tabs update demo email hints, preserve custom input, and clear validation errors', async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/login?${entryQuery}`)
  const email = page.getByLabel('Officer ID or email', { exact: true })
  const password = page.getByLabel('Password', { exact: true })
  const officer = choose(page, 'Mandal Officer')
  const authority = choose(page, 'District Authority')

  await expect(email).toHaveValue('')
  await page.getByRole('button', { name: 'Secure sign in', exact: true }).click()
  await expect(page.locator('#access-error')).toHaveText('Please enter your officer credentials.')
  await authority.click()
  await expect(email).toHaveValue('collector@tapas.gov.in')
  await expect(email).toHaveAttribute('placeholder', 'collector@tapas.gov.in')
  await expect(email).toHaveAttribute('aria-invalid', 'false')
  await expect(page.locator('#access-error')).toHaveCount(0)
  assertSelection(page.url(), '/login', 'authority')
  await officer.click()
  await expect(email).toHaveValue('officer@tapas.gov.in')
  await expect(email).toHaveAttribute('placeholder', 'officer@tapas.gov.in')
  await email.fill('custom.person@example.test')
  await password.fill('custom password')
  await authority.click()
  await expect(email).toHaveValue('custom.person@example.test')
  await expect(password).toHaveValue('custom password')
  await officer.click()
  await expect(email).toHaveValue('custom.person@example.test')
  await expect(password).toHaveValue('custom password')
  await email.clear()
  await authority.click()
  await expect(email).toHaveValue('collector@tapas.gov.in')
  await expect(authority).toHaveAttribute('aria-selected', 'true')
  assertSelection(page.url(), '/login', 'authority')
})

test('rapid access role changes keep automatic email aligned and preserve custom credentials', async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/login?${entryQuery}`)
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible()
  const email = page.getByLabel('Officer ID or email', { exact: true })
  const password = page.getByLabel('Password', { exact: true })

  const switchRapidly = async (roles: Array<'officer' | 'authority'>) => {
    // Dispatch within one browser task so URL transitions cannot settle
    // between clicks, reproducing rapid input instead of waiting it away.
    await page.evaluate(nextRoles => {
      for (const role of nextRoles) document.getElementById(`access-tab-${role}`)!.click()
    }, roles)
    const finalRole = roles[roles.length - 1]
    await expect(choose(page, finalRole === 'officer' ? 'Mandal Officer' : 'District Authority')).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(url => url.searchParams.get('role') === finalRole)
    assertSelection(page.url(), '/login', finalRole)
  }

  await switchRapidly(['authority', 'officer', 'authority', 'officer'])
  await expect(email).toHaveValue('officer@tapas.gov.in')
  await switchRapidly(['authority', 'officer', 'authority'])
  await expect(email).toHaveValue('collector@tapas.gov.in')
  await email.fill('custom.person@example.test')
  await password.fill('custom password')
  await switchRapidly(['officer', 'authority', 'officer'])
  await expect(email).toHaveValue('custom.person@example.test')
  await expect(password).toHaveValue('custom password')
})

test('blocked browser storage explains demo sign-in failure and still allows citizen entry', async ({ page }) => {
  await mockEntryProviders(page)
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage disabled for test', 'SecurityError') }
    Storage.prototype.removeItem = () => { throw new DOMException('Storage disabled for test', 'SecurityError') }
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`/login?role=officer&${entryQuery}`)
  await signIn(page, 'officer@tapas.gov.in')
  await expect(page.locator('#access-error')).toHaveText('Demo sign-in needs browser storage. Allow site storage and try again.')
  await expect(page).toHaveURL(/\/login\?/)
  await expect(page.getByRole('button', { name: 'Secure sign in', exact: true })).toBeEnabled()
  await page.getByRole('link', { name: 'Public heat advisory', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard\?/)
  await expect(page.getByRole('heading', { name: 'India Heat Risk & Response Platform', exact: true })).toBeVisible()
  assertSelection(page.url(), '/dashboard')
  expect(errors).toEqual([])
})

for (const [width, height] of [[320, 844], [390, 844], [768, 1024], [1280, 900], [1440, 900], [844, 390]]) {
  test(`entry and access remain usable at ${width} by ${height}`, async ({ page }) => {
    await mockEntryProviders(page)
    await page.setViewportSize({ width, height })
    await page.goto(`/?${entryQuery}`)
    for (const name of ['Citizen', 'Mandal Officer', 'District Authority']) {
      await choose(page, name).click()
      await noOverflow(page)
      const box = await choose(page, name).boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }
    await page.getByRole('heading', { name: 'How TAPAS Works', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: 'How TAPAS Works', exact: true })).toBeVisible()
    await page.getByRole('heading', { name: 'Why TAPAS is Different', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('heading', { name: 'Why TAPAS is Different', exact: true })).toBeVisible()
    await page.goto(`/login?role=authority&${entryQuery}`)
    await expect(page.locator('[data-mode="access"][data-role]')).toBeVisible()
    await page.getByRole('button', { name: 'Secure sign in', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Secure sign in', exact: true })).toBeVisible()
    await noOverflow(page)
  })
}

test('reduced motion produces static art and immediate role changes', async ({ page }) => {
  await mockEntryProviders(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/?${entryQuery}`)
  await choose(page, 'District Authority').click()
  await expect(scene(page)).toHaveAttribute('data-role', 'authority')
  const activeAnimations = await scene(page).evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)
  expect(activeAnimations).toBe(0)
})

test('horizontal touch swipes change role while vertical gestures leave it unchanged', async ({ page }) => {
  await mockEntryProviders(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/?${entryQuery}`)
  const artwork = page.getByTestId('thermal-swipe-area')
  await artwork.scrollIntoViewIfNeeded()
  const box = await artwork.boundingBox()
  expect(box).not.toBeNull()
  const x = Math.min(330, box!.x + box!.width * .75)
  const y = Math.min(700, Math.max(100, box!.y + box!.height * .5))
  const input = await page.context().newCDPSession(page)
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 160, y: y + 3 }] })
  await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(scene(page)).toHaveAttribute('data-role', 'officer')
  await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y }] })
  await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 198, y: y - 140 }] })
  await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(scene(page)).toHaveAttribute('data-role', 'officer')
  await input.detach()
})

for (const width of [390, 1280]) test(`200 percent text zoom keeps entry controls and login form reachable at ${width}px`, async ({ page }) => {
  await mockEntryProviders(page)
  await page.setViewportSize({ width, height: 844 })
  await page.goto(`/?${entryQuery}`)
  const title = page.getByRole('heading', { name: 'Citizen', exact: true })
  const initialFont = await title.evaluate(element => parseFloat(getComputedStyle(element).fontSize))
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  const enlargedFont = await title.evaluate(element => parseFloat(getComputedStyle(element).fontSize))
  expect(enlargedFont).toBeGreaterThan(initialFont)
  await choose(page, 'District Authority').click()
  await noOverflow(page)
  await page.getByRole('link', { name: 'Authority Login', exact: true }).click()
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await page.getByRole('button', { name: 'Secure sign in', exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Secure sign in', exact: true })).toBeVisible()
  await noOverflow(page)
  if (width === 390) {
    const menu = page.getByRole('button', { name: 'Toggle navigation menu', exact: true })
    await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('navigation', { name: 'Mobile', exact: true })).toBeVisible()
    await noOverflow(page)
    const login = page.getByRole('link', { name: 'Officer sign in', exact: true })
    await expect(login).toBeVisible()
    await login.focus()
    await login.press('Escape')
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(menu).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Mobile', exact: true })).toBeHidden()
  }
})



test('previous and next controls stop at the ends, and motion can pause and resume', async ({ page }) => {
  await mockEntryProviders(page)
  await page.goto(`/?${entryQuery}`)
  const previous = page.getByRole('button', { name: 'Previous experience', exact: true })
  const next = page.getByRole('button', { name: 'Next experience', exact: true })
  await expect(previous).toBeDisabled()
  await next.click()
  await expect(scene(page)).toHaveAttribute('data-role', 'officer')
  await next.click()
  await expect(scene(page)).toHaveAttribute('data-role', 'authority')
  await expect(next).toBeDisabled()
  await previous.click()
  await expect(scene(page)).toHaveAttribute('data-role', 'officer')
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
  await expect(scene(page)).toHaveAttribute('data-paused', 'true')
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click()
  await expect(scene(page)).toHaveAttribute('data-paused', 'false')
  await page.getByRole('heading', { name: 'Why TAPAS is Different', exact: true }).scrollIntoViewIfNeeded()
  await expect(scene(page)).toHaveAttribute('data-paused', 'true')
  await page.evaluate(() => scrollTo(0, 0))
  await expect(scene(page)).toHaveAttribute('data-paused', 'false')
})

