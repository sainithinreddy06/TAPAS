import { expect, test, type Page } from '@playwright/test'
import { entryQuery, mockEntryProviders } from './thermal-entry-fixtures'

test.use({ serviceWorkers: 'block' })

const sessionRole = (page: Page) => page.evaluate(() => localStorage.getItem('tapas-demo-role-v1'))
const officerHeading = (page: Page) => page.getByRole('heading', { name: /^Mandal Operational Control/ })
const authorityHeading = (page: Page) => page.getByRole('heading', { name: 'District Authority Regional Heat Command', exact: true })

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

for (const [role, width] of [['officer', 1280], ['authority', 390]] as const) {
  test(`${role} session ends when entering the citizen dashboard from home at ${width}px`, async ({ page }) => {
    await mockEntryProviders(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`/login?role=${role}&${entryQuery}`)
    await useDemoCredentials(page, role === 'officer' ? 'officer@tapas.gov.in' : 'collector@tapas.gov.in')
    await expect(role === 'officer' ? officerHeading(page) : authorityHeading(page)).toBeVisible()
    await expect.poll(() => sessionRole(page)).toBe(role)

    await page.getByRole('link', { name: 'Return to TAPAS Home', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Citizen', exact: true })).toBeVisible()
    assertSelection(page.url(), '/')
    await expect.poll(() => sessionRole(page)).toBe(role)
    await page.getByRole('link', { name: 'Open Dashboard', exact: true }).click()
    await assertCitizenDashboard(page)

    await page.goto(`/${role}?${entryQuery}`)
    await expect(page).toHaveURL(/\/login\?/)
    assertSelection(page.url(), '/login', role)
  })
}

function assertSelection(url: string, pathname: string, role?: 'officer' | 'authority', query = entryQuery) {
  const target = new URL(url)
  expect(target.pathname).toBe(pathname)
  expect(Object.fromEntries(target.searchParams)).toEqual({
    ...Object.fromEntries(new URLSearchParams(query)),
    ...(role ? { role } : {}),
  })
}

async function assertCitizenDashboard(page: Page, query = entryQuery) {
  await expect(page).toHaveURL(/\/dashboard\?/)
  assertSelection(page.url(), '/dashboard', undefined, query)
  await expect.poll(() => sessionRole(page)).toBeNull()

  const params = new URLSearchParams(query)
  if (page.viewportSize()!.width < 1024 && params.has('ward')) {
    // A preserved ward opens its detail sheet on mobile. Dismissing the sheet
    // intentionally clears that ward before continuing through the navigation.
    const panel = page.getByRole('dialog')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('complementary')).toHaveAttribute('aria-label', /^Ward detail:/)
    await panel.getByRole('button', { name: 'Close ward panel', exact: true }).click()
    await expect(panel).toBeHidden()
    params.delete('ward')
  }

  await expect(page.getByRole('heading', { name: 'India Heat Risk & Response Platform', exact: true })).toBeVisible()
  assertSelection(page.url(), '/dashboard', undefined, params.toString())
  return params.toString()
}

async function useDemoCredentials(page: Page, email: string) {
  await page.getByRole('button', { name: new RegExp(`^Demo access.*${email.replaceAll('.', '\\.')}`) }).click()
  await expect(page.getByLabel('Officer ID or email', { exact: true })).toHaveValue(email)
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('tapas2026')
  await page.getByRole('button', { name: 'Secure sign in', exact: true }).click()
}

async function openMobileMenu(page: Page) {
  const menu = page.getByRole('button', { name: 'Toggle navigation menu', exact: true })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
}

test('failed storage removal keeps sign-out honest and citizen entry accessible', async ({ page }) => {
  await mockEntryProviders(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem('tapas-demo-role-v1', 'officer')
    Storage.prototype.removeItem = () => { throw new DOMException('Storage removal disabled for test', 'SecurityError') }
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const message = 'Could not clear the demo session. Allow site storage and try again.'

  await page.goto(`/officer?${entryQuery}`)
  await expect(officerHeading(page)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.locator('#navbar-sign-out-error')).toHaveText(message)
  await expect(page.locator('#navbar-sign-out-error')).toHaveAttribute('role', 'alert')
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveAttribute('aria-describedby', 'navbar-sign-out-error')
  assertSelection(page.url(), '/officer')
  await expect(officerHeading(page)).toBeVisible()
  await expect.poll(() => sessionRole(page)).toBe('officer')

  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'India Heat Risk & Response Platform', exact: true })).toBeVisible()
  assertSelection(page.url(), '/dashboard')
  await expect(page.locator('main').getByRole('alert').filter({ hasText: message })).toBeVisible()
  await expect.poll(() => sessionRole(page)).toBe('officer')
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const width of [320, 360, 375, 390, 412, 1280]) {
  test(`role sessions, citizen entry and responsive dashboards at ${width}px`, async ({ page }) => {
    await mockEntryProviders(page)
    await page.setViewportSize({ width, height: 844 })

    await page.goto(`/officer?${entryQuery}`)
    await expect(page).toHaveURL(/\/login\?/)
    assertSelection(page.url(), '/login', 'officer')
    await expect(page.getByRole('tab', { name: 'Mandal Officer', exact: true })).toHaveAttribute('aria-selected', 'true')
    await noOverflow(page)
    await useDemoCredentials(page, 'officer@tapas.gov.in')
    await expect(officerHeading(page)).toBeVisible()
    assertSelection(page.url(), '/officer')
    await expect.poll(() => sessionRole(page)).toBe('officer')
    await noOverflow(page)
    await page.reload()
    await expect(officerHeading(page)).toBeVisible()

    if (width < 1024) await openMobileMenu(page)
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
    const citizenQuery = await assertCitizenDashboard(page)
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0)
    if (width < 1024) await expect(page.getByRole('button', { name: 'Toggle navigation menu', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await noOverflow(page)

    if (width < 640) await openMobileMenu(page)
    const login = page.getByRole('link', { name: 'Officer sign in', exact: true })
    assertSelection(new URL((await login.getAttribute('href'))!, page.url()).href, '/login', 'officer', citizenQuery)
    await login.click()
    await page.getByRole('tab', { name: 'District Authority', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'District Authority', exact: true })).toHaveAttribute('aria-selected', 'true')
    await useDemoCredentials(page, 'collector@tapas.gov.in')
    await expect(authorityHeading(page)).toBeVisible()
    assertSelection(page.url(), '/authority', undefined, citizenQuery)
    await expect.poll(() => sessionRole(page)).toBe('authority')
    await expect(page.getByRole('region', { name: 'Mandal-Level Command Priority Index', exact: true }).getByRole('row').nth(1)).toBeVisible()
    await noOverflow(page)
    await page.reload()
    await expect(authorityHeading(page)).toBeVisible()
    await expect.poll(() => sessionRole(page)).toBe('authority')
    if (width < 640) await openMobileMenu(page)
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page).toHaveURL(/\/login\?/)
    assertSelection(page.url(), '/login', 'authority', citizenQuery)
    await expect.poll(() => sessionRole(page)).toBeNull()

    await page.goto(`/authority?${entryQuery}`)
    await expect(page).toHaveURL(/\/login\?/)
    assertSelection(page.url(), '/login', 'authority')
    await expect(page.getByRole('tab', { name: 'District Authority', exact: true })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('link', { name: 'Public heat advisory', exact: true }).click()
    await assertCitizenDashboard(page)
  })
}
