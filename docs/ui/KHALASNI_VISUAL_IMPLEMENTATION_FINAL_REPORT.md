# Khalsni Visual Implementation Final Report

Date: 2026-09-01

## Implementation Summary

The customer/public visual implementation is complete across the live React/Vite application. The final pass consolidated light Khalsni surfaces, shared radii and shadows, customer portal backgrounds, responsive navigation, image-led catalog cards, RTL/LTR behavior, and dynamic catalog media.

The final acceptance audit used the running frontend at `http://127.0.0.1:5173` and backend at `http://127.0.0.1:8000` with live seeded data.

One additional issue found during acceptance was an unauthenticated `auth/me` request that produced repeated `401` console errors on public pages. Auth bootstrap now skips that request when no access or refresh token exists. Existing authenticated bootstrap behavior remains unchanged.

## Pages Changed

- Homepage and public navigation
- Category listing and category detail
- Service listing, search results, and service detail
- About, FAQ, privacy, contact, login, registration, and request tracking
- Customer dashboard, orders, order creation, order details, profile, and missing-document response pages

## Components Changed

- `PublicPage` shared primitives and public buttons/forms
- `CategoryCard` and `ServiceCard`
- `PublicLayout`
- `DashboardLayout`, `Sidebar`, `Topbar`, and `LanguageSwitcher`
- Customer portal panel and summary surfaces
- Catalog admin image fields and upload handling

## Category Image Implementation

- Category images are optional and nullable.
- Admin category forms support upload, preview, replacement, and removal.
- Multipart API support is implemented through the existing media infrastructure.
- Public API responses include `image` and `image_url`.
- Missing images use the Khalsni fallback visual without broken `<img>` elements.

## Service Image Implementation

- Service images are independent from category images and optional.
- Admin service forms support upload, preview, replacement, and removal.
- Public list, detail, and related-service responses include service image data.
- Frontend fallback order is service image, category image where appropriate, then Khalsni fallback.

## Desktop Validation

Validated live public/customer routes at:

- `1280x720`
- `1366x768`
- `1440x900`
- `1920x1080`

Tablet widths `768px` and `1024px` were also covered. The browser audit recorded zero page-overflow cases and zero broken-image cases. Representative screenshots are in `docs/ui/screenshots/final-acceptance/`.

## Mobile Validation

Validated at:

- `360px`
- `390px`
- `430px`

The previous required mobile widths `375px`, `412px`, `768px` were also verified. Mobile navigation, horizontal catalog rows, forms, customer sidebar, sticky actions, and touch targets were inspected. No page-level horizontal overflow was found.

## RTL Validation

Arabic RTL was validated across the full route audit. English LTR spot checks were run at `390px`, `1024px`, and `1440px`. Text alignment, navigation, cards, search, arrows, and form layout remained usable in both directions.

## Accessibility Validation

- Semantic links, buttons, inputs, and headings were preserved.
- Existing focus-visible indicators remain active.
- Icon-only controls retain accessible labels.
- Image fallback behavior prevents broken image output.
- Customer menu and language controls meet minimum touch dimensions.
- No automated axe/accessibility runner is configured in this repository.

## Test Results

### Frontend

Passed: 42
Failed: 0
Skipped: 0

- `npm run lint` passed.
- `npm run build` passed.
- `npm test -- --run` passed: 22 test files, 42 tests.

### Targeted Backend Catalog Tests

Passed: 31
Failed: 0
Skipped: 0

- `python manage.py test services.tests` passed.
- Category and service image tests covered no-image creation, upload, replacement, removal, API output, and validation.

### Full Backend Suite

Passed: 194
Failed: 2
Skipped: 0
Errors: 1

The three failures are unrelated to this visual implementation:

- Admin order archive transition permission test.
- Order configuration-rule payload test.
- Platform-admin branch deletion assertion.

No backend source files were changed by the visual implementation.

### Browser Acceptance

Passed: 180 route/viewport checks
Failed: 0 overflow cases
Broken images: 0 cases
Failed network requests: 0 after filtering the known background flash-job probe

Admin image API validation passed for category and service upload, replacement, and removal. Admin UI validation confirmed both catalog forms expose file upload controls. The focused post-fix public network check reported no console errors or failed requests.

## Remaining Known Issues

- The full backend suite retains three unrelated existing failures listed above.
- No TypeScript type-check command or formatting-validation script is configured in `frontend/package.json`.
- No automated axe accessibility test or repository E2E test suite is configured; browser validation was performed with Playwright-based acceptance checks.
- Some local seed records contain duplicate Arabic category names. The model correctly rejects updates to those conflicting records; this is existing data quality, not a visual regression.

## Business Workflow Verification

Business workflows changed: none.

The following were preserved and verified through existing tests and route inspection:

- Customer workflow and request creation flow.
- Request statuses and status transitions.
- Provider workflow and relationships.
- Admin workflow and authorization boundaries.
- Authentication and authorization behavior.
- Pricing calculations and public pricing visibility rules.
- Service duration and duration-range rendering.
- Required service documents and document upload flow.
- Customer/provider/admin relationships.

The only functional extension is optional admin-controlled Category and Service image management, including backward-compatible nullable media fields and frontend fallbacks.
