# Khalsni Public Homepage Visual Comparison

Date: 2026-07-27

## Actual Render Path

- Actual public URL: `http://127.0.0.1:5173/`
- Route definition: `frontend/src/routes/AppRoutes.jsx`
- Route: `<Route path="/" element={<HomePage />} />`
- Layout: `frontend/src/layouts/PublicLayout.jsx`
- Homepage component: `frontend/src/pages/public/HomePage.jsx`
- Shared cards: `frontend/src/components/CategoryCard.jsx`, `frontend/src/components/ServiceCard.jsx`

## APIs And Data Reused

- `api.getPublicHomepage()` through `PublicSiteContext`
- `api.getPublicTheme()` through `PublicSiteContext`
- `api.getServices()`
- `api.getPublicServiceCategories()`
- `api.createPublicMissingServiceRequest()`
- Existing routes: `/services`, `/services?search=`, `/track-order`, `/faq`, `/contact`, `/login`, `/register`

## Screenshots

- Desktop before: `docs/khalsni-public-homepage/before/desktop-1440.png`
- Mobile before: `docs/khalsni-public-homepage/before/mobile-390.png`
- Desktop after: `docs/khalsni-public-homepage/after/desktop-1440.png`
- Mobile after: `docs/khalsni-public-homepage/after/mobile-390.png`

## Major Visual Differences

- Header changed from a glass-panel navigation block to a compact white public-service header with redesigned brand treatment, active nav pills, auth actions, language control, and mobile menu.
- Hero changed from a dark navy full-width panel to a light public-service hero with soft blue background, large headline, real service search, direct CTAs, and an operational summary panel.
- Category presentation changed to large image-capable category cards using real category records when the API returns them.
- Service cards were rebuilt as reusable public cards with stronger icon treatment, real service name/description, real duration and pricing widgets, and a clear request CTA.
- Section rhythm changed to separated public sections: categories, available services, how-it-works, missing service CTA, help CTA, and public updates.
- Footer changed from a compact glass footer to a structured navy footer with identity, service links, support links, contact details, and copyright.
- Mobile layout now uses a drawer-style header and compact hero/card sizing for the 390px viewport.

## Verification

- Arabic RTL: PASS for captured public root at 390px and 1440px.
- English LTR: FAIL to fully verify in browser during this pass; the existing language architecture is reused, but no English screenshot was captured.
- Production build before edits: PASS.
- Relevant public tests before edits: PASS, 4 files / 5 tests.
- Production build after edits: PASS.
- Relevant public tests after edits: PASS, 4 files / 5 tests.

## Runtime Blockers

- The expected `docs/khalsni-ui-references/` folder was not present.
- Local Django `/api/health/` worked, but `/api/services/`, `/api/services/categories/`, and login-related API checks returned 500 in this local runtime. The homepage therefore shows clean empty states in screenshots instead of populated service/category cards.
- No backend code, schema, migrations, or seed data were changed to work around those API/runtime issues.
