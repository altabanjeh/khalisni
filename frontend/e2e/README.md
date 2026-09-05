# Khalsni E2E + accessibility suite

Reproducible end-to-end coverage that replaces the previous ad-hoc,
screenshot-only verification (defect D10 / A11Y-1 in `docs/audit/`).

## Run locally

```bash
cd frontend
npm ci
npx playwright install --with-deps chromium
npm run e2e            # headless
npm run e2e:ui         # interactive
```

`playwright.config.js` boots its own throwaway backend (`manage.py migrate` +
`seed_demo` on port 8009) and a production preview of the frontend (port 4319),
so the specs run against real APIs and real seeded data — not the vitest mock
layer.

## What is covered now

| Spec | Journey / check |
|---|---|
| `public.spec.js` | public routes load, zero console errors, no horizontal overflow at 1440 / 768 / 390, service-discovery click-path to the request CTA, 404 page, RTL/LTR direction |
| `a11y.spec.js` | axe (WCAG 2.0/2.1/2.2 A + AA) on the primary public routes; fails on any serious/critical violation |

## To be added (tracked in `docs/audit/KHALSNI_REMEDIATION_PLAN.md`)

- Authenticated fixtures (login as seeded customer / employee / provider / admin).
- J04–J20 journeys: order creation + document upload, employee review, missing-doc
  cycle, provider execution, final-document delivery, admin archive.
- Per-role negative authorization matrix (forbidden route + API per role).
- axe sweep of authenticated screens.
