import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL
if (CHANNEL && CHANNEL !== 'chrome' && CHANNEL !== 'msedge') {
  throw new Error('PLAYWRIGHT_CHANNEL must be chrome or msedge when using an installed browser.')
}

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(CHANNEL ? { channel: CHANNEL } : {}) } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // Browser tests intercept these requests with explicit test fixtures.
        // This setting affects only a server started by Playwright.
        env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? BASE_URL, NEXT_PUBLIC_GEOMETRY_URL: `${BASE_URL}/api/test-geometry` },
      },
})
