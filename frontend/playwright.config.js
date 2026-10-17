import { defineConfig, devices } from '@playwright/test'

/**
 * Khalsni end-to-end + accessibility + visual harness (defect D10 / Gate 1R).
 *
 * Two ways to run:
 *  1. External servers (fast local iteration): start a seeded Django backend and
 *     a built frontend yourself, then
 *       E2E_BASE_URL=http://127.0.0.1:4319 E2E_API_URL=http://127.0.0.1:8009 npm run e2e
 *  2. Managed servers (CI): leave E2E_BASE_URL unset and Playwright boots both
 *     (Django on 8009, Vite preview on 4319) via `webServer`. The backend
 *     command migrates and runs `seed_demo`; with E2E_QA_MODE=1 it also runs
 *     `seed_client_audit_qa` on a fresh database file. Full suite, one command:
 *       CI=1 E2E_QA_MODE=1 KHALSNI_QA_PASSWORD=<12+ chars> E2E_DB_PATH=<throwaway .sqlite3> npx playwright test
 *     (docs/testing/E2E_SETUP.md).
 *
 * Uses the system Chrome (`channel: 'chrome'`) so no browser download is needed.
 */

const API_PORT = process.env.E2E_API_PORT || '8009'
const WEB_PORT = process.env.E2E_WEB_PORT || '4319'
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${WEB_PORT}`
const API_URL = process.env.E2E_API_URL || `http://127.0.0.1:${API_PORT}`
const EXTERNAL = Boolean(process.env.E2E_BASE_URL)
const QA_MODE = process.env.E2E_QA_MODE === '1'
// QA runs start from an empty database so no result depends on an older run;
// E2E_KEEP_DB=1 reuses the file, E2E_FRESH_DB=1 also empties it outside QA mode.
const FRESH_DB = (QA_MODE || process.env.E2E_FRESH_DB === '1') && process.env.E2E_KEEP_DB !== '1'
// The one setup the whole suite needs: schema, the demo accounts most specs
// sign in with, and (QA mode) the client-audit fixtures.
const SEED_COMMANDS = [
  ...(FRESH_DB ? [`python -c "import os; p = os.environ['DJANGO_SQLITE_NAME']; os.path.exists(p) and os.remove(p)"`] : []),
  'python manage.py migrate --noinput',
  'python manage.py seed_demo',
  ...(QA_MODE ? ['python manage.py seed_client_audit_qa --rebuild-owned'] : []),
]

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
    // Tracing is opt-in. `retain-on-failure` writes/zips a trace per failed test
    // into outputDir; on Windows, when a bulk sweep (100+ tests) finalises while
    // its artifact dir is being cleaned, the zip step races and throws
    // `ENOENT ... .playwright-artifacts-*/traces/*.trace` — surfacing as fake
    // failures unrelated to the app. Default off; set PW_TRACE=retain-on-failure
    // (or on) when actively debugging a single spec.
    trace: process.env.PW_TRACE || 'off',
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
            `${SEED_COMMANDS.join(' && ')} && python manage.py runserver 127.0.0.1:${API_PORT} --noreload`,
          cwd: '../backend',
          env: {
            POSTGRES_DB: '',
            DJANGO_SQLITE_NAME: process.env.E2E_DB_PATH || '../frontend/e2e-results/e2e_db.sqlite3',
            DJANGO_DEBUG: 'True',
            DJANGO_SECRET_KEY: 'e2e-only-insecure-key',
            DJANGO_ALLOWED_HOSTS: '127.0.0.1,localhost',
            CORS_ALLOWED_ORIGINS: BASE_URL,
            DJANGO_CSRF_TRUSTED_ORIGINS: BASE_URL,
            API_THROTTLE_ANON_RATE: '100000/min',
            API_THROTTLE_USER_RATE: '100000/min',
            API_THROTTLE_AUTH_LOGIN_RATE: '100000/min',
            API_THROTTLE_AUTH_REGISTER_RATE: '100000/min',
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
