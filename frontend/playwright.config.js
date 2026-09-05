import { defineConfig, devices } from '@playwright/test'

/**
 * Khalsni end-to-end + accessibility + visual harness (defect D10 / Gate 1R).
 *
 * Two ways to run:
 *  1. External servers (fast local iteration): start a seeded Django backend and
 *     a built frontend yourself, then
 *       E2E_BASE_URL=http://127.0.0.1:4319 E2E_API_URL=http://127.0.0.1:8009 npm run e2e
 *  2. Managed servers (CI): leave E2E_BASE_URL unset and Playwright boots both
 *     (Django on 8009 with `seed_demo`, Vite preview on 4319) via `webServer`.
 *
 * Uses the system Chrome (`channel: 'chrome'`) so no browser download is needed.
 */

const API_PORT = process.env.E2E_API_PORT || '8009'
const WEB_PORT = process.env.E2E_WEB_PORT || '4319'
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${WEB_PORT}`
const API_URL = process.env.E2E_API_URL || `http://127.0.0.1:${API_PORT}`
const EXTERNAL = Boolean(process.env.E2E_BASE_URL)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'e2e-results/results.json' }], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60_000,
  expect: { timeout: 12_000 },
  outputDir: 'e2e-results/artifacts',

  use: {
    baseURL: BASE_URL,
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  metadata: { apiUrl: API_URL },

  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'laptop-1280', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'ipad-1024', use: { viewport: { width: 1024, height: 768 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],

  webServer: EXTERNAL
    ? undefined
    : [
        {
          command:
            `python manage.py migrate --noinput && python manage.py seed_demo && ` +
            `python manage.py runserver 127.0.0.1:${API_PORT} --noreload`,
          cwd: '../backend',
          env: {
            POSTGRES_DB: '',
            DJANGO_SQLITE_NAME: '../frontend/e2e-results/e2e_db.sqlite3',
            DJANGO_DEBUG: 'True',
            DJANGO_SECRET_KEY: 'e2e-only-insecure-key',
            DJANGO_ALLOWED_HOSTS: '127.0.0.1,localhost',
            CORS_ALLOWED_ORIGINS: BASE_URL,
            DJANGO_CSRF_TRUSTED_ORIGINS: BASE_URL,
            API_THROTTLE_ANON_RATE: '100000/min',
            API_THROTTLE_USER_RATE: '100000/min',
          },
          port: Number(API_PORT),
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `npm run build -- --mode production && npm run preview -- --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
          cwd: '.',
          env: { VITE_API_BASE_URL: `${API_URL}/api` },
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
})
