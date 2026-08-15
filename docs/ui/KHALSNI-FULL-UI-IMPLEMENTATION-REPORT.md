# KHALSNI Full UI Implementation Report

Date: 2026-08-15

## Summary

The public-to-customer journey has been moved further onto the shared Khalsni UI foundation without replacing backend workflows or creating static catalog data. The largest changes are the new data-driven homepage, functional service/category search with suggestions, service information page cleanup, selected-service handoff into the request form, review-before-submit summary, and clearer request responsibility/status language in the customer portal.

Validation evidence in this pass:

- `npm run build` PASS on 2026-08-15.
- `npm run lint` PASS on 2026-08-15.
- `npm run test` PASS on 2026-08-15: 20 files / 35 tests.
- Catalog/admin domain inspection completed against `ServicesManagementPage`, `ServiceCategoryManagementPage`, and service/catalog API functions.
- Mobile/RTL QA was code-level only in this pass; no Playwright/browser screenshots were completed, so mobile and RTL are not marked PASS.

## Route Coverage

| Route | Old UI Removed | New System Applied | Mobile Tested | RTL Tested | Status |
| ----- | -------------- | ------------------ | ------------- | ---------- | ------ |
| `/` | Yes | Yes: new light homepage, hero, functional search, category worlds, special request, how-it-works | PARTIAL | PARTIAL | PASS |
| `/services` | Partial | Yes: shared public shell, filters, service/category listings | PARTIAL | PARTIAL | PARTIAL |
| `/services/category/:slug` | Partial | Yes: shared public shell and light category listing styles | PARTIAL | PARTIAL | PARTIAL |
| `/services/:slug` | Yes | Yes: service information, documents, price/duration, CTA | PARTIAL | PARTIAL | PASS |
| `/create-order` | Not changed in this pass | Existing public order entry remains | BLOCKED | BLOCKED | PARTIAL |
| `/customer/orders/new` | Partial | Yes: selected-service carryover, clearer hierarchy, review section, document upload retained | PARTIAL | PARTIAL | PARTIAL |
| `/customer/orders` | Partial | Yes: request listing includes customer-readable current responsibility | PARTIAL | PARTIAL | PARTIAL |
| `/customer/orders/:id` | Partial | Yes: top status block, responsibility card, existing timeline/actions preserved | PARTIAL | PARTIAL | PARTIAL |
| `/customer/orders/:id/missing-docs` | Not changed in this pass | Existing workflow retained | BLOCKED | BLOCKED | PARTIAL |
| `/track-order` | Not changed in this pass | Existing public tracking route retained | BLOCKED | BLOCKED | PARTIAL |
| `/customer` | Foundation only | Shared dashboard shell from earlier foundation | PARTIAL | PARTIAL | PARTIAL |
| `/customer/profile` | Foundation only | Shared dashboard shell from earlier foundation | PARTIAL | PARTIAL | PARTIAL |
| `/admin/service-categories` | Inspected | Existing admin category model supports names/descriptions/visibility/order | Not applicable | Not applicable | PARTIAL |
| `/admin/services` | Inspected | Existing admin service model supports category, visibility/order, names/descriptions, price, duration, documents, fields | Not applicable | Not applicable | PARTIAL |

## Requirement Traceability

| Requirement | Implementation | Affected File | Tests | Status |
| ----------- | -------------- | ------------- | ----- | ------ |
| Public homepage hierarchy | Header/footer remain in `PublicLayout`; homepage now includes hero, search, trust strip, categories, special request, how-it-works, mobile portal promotion | `frontend/src/pages/public/HomePage.jsx` | `npm run build` | PASS |
| Functional hero search | Searches real service/category Arabic and English names/descriptions; suggestions, keyboard navigation, loading and empty special-request state | `frontend/src/pages/public/HomePage.jsx` | `npm run build`, `npm run lint`, `npm run test` | PASS |
| Category visual worlds | Real categories from API; presentation image/icon fallback only; real service subset shown per category | `frontend/src/pages/public/HomePage.jsx` | `npm run build`, `npm run lint`, `npm run test` | PASS |
| Category images | Consistent public image ratio/crop/overlay/lazy loading for category sections | `frontend/src/pages/public/HomePage.jsx` | `npm run build`, `npm run lint` | PASS |
| Service slider/list | Horizontal service chip list per category using real services | `frontend/src/pages/public/HomePage.jsx` | `npm run build`, `npm run lint` | PASS |
| Service information page | Shows service title, description, documents, price, duration, notes/prereqs where configured, and Start Request CTA | `frontend/src/pages/public/ServiceDetailsPage.jsx` | `npm run build`, `npm run lint`, `npm run test` | PASS |
| Request form visual cleanup | Shared light cards/radius, selected service carryover, visible review summary | `frontend/src/pages/customer/CustomerCreateOrderPage.jsx` | `npm run build` | PARTIAL |
| Request stepper | Updated to service/customer/documents/review/submit labels; still reflects a single existing form, not a rebuilt wizard | `frontend/src/pages/customer/CustomerCreateOrderPage.jsx` | `npm run build` | PARTIAL |
| Document upload UX | Existing `FileUploader` retains large upload target, filename, type/size validation, remove action; status/progress is limited to local selected state | `frontend/src/components/FileUploader.jsx`, `frontend/src/pages/customer/CustomerCreateOrderPage.jsx` | `npm run build` | PARTIAL |
| Review before submit | Added review cards for service, customer info, documents, price, duration with edit jump actions | `frontend/src/pages/customer/CustomerCreateOrderPage.jsx` | `npm run build`, `npm run lint`, `npm run test` | PASS |
| My Requests modernization | Added current responsibility badge to table and mobile cards | `frontend/src/pages/customer/MyOrdersPage.jsx` | `npm run build`, `npm run lint`, `npm run test` | PASS |
| Request details/tracking | Added prominent `حالة طلبك الآن`, responsibility summary, and action card when supported | `frontend/src/pages/customer/CustomerOrderDetailsPage.jsx` | `npm run build` | PARTIAL |
| Public and portal consistency | Key journey routes now use shared blue/navy/light card system; some secondary public/auth routes still contain legacy utility classes | Multiple frontend files | `npm run build`, `rg text-white frontend/src/pages/public` audit | PARTIAL |
| Admin service management | Existing admin implementation inspected; model already exposes most requested catalog/service management capabilities | `frontend/src/pages/admin/ServicesManagementPage.jsx`, `frontend/src/pages/shared/ServiceCategoryManagementPage.jsx` | Code inspection | PARTIAL |
| Bilingual QA | New homepage/service-detail strings include AR/EN branches; older route strings and mojibake literals remain in some files | Multiple frontend files | Code inspection | PARTIAL |
| Mobile UX | Layouts use responsive grids/scrolling and touch-sized controls; required 320/360/390/430 browser pass not completed | Multiple frontend files | Build only | PARTIAL |
| Footer | Shared public footer from foundation remains; no fabricated contacts or legal/social links added | `frontend/src/layouts/PublicLayout.jsx` | Build | PARTIAL |
| Special request | Search zero-results and homepage special request use existing missing-service API | `frontend/src/pages/public/HomePage.jsx` | `npm run build`, `npm run lint`, `npm run test` | PASS |
| Accessibility | Search uses combobox/listbox roles, keyboard controls, labels, focus rings; full WCAG audit not completed | `frontend/src/pages/public/HomePage.jsx`, shared controls | Build/code inspection | PARTIAL |
| Performance | Reused existing assets, lazy-loaded category images, no heavy animation/dependency added | `frontend/src/pages/public/HomePage.jsx` | Build bundle output | PASS |

## Known Gaps

- Full browser-based mobile QA at 320px, 360px, 390px, and 430px was not completed in this pass.
- Some public/auth/supporting pages still have legacy dark utility classes and need a focused cleanup pass.
- Several existing Arabic literals appear mojibake in source display/output; this requires a separate encoding/content cleanup to satisfy strict bilingual QA.
- Upload progress/preview depends on existing system support and was not fabricated.
- `/create-order`, `/track-order`, and `/customer/orders/:id/missing-docs` were not materially redesigned in this pass.
