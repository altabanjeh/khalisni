# KHALSNI — UI/UX Discovery Audit

Gate 1 · 2026-09-05 · HEAD `574753e`

## Gate 2 round 2 addendum (2026-09-05) — UI defects remediated & re-verified

Route matrix re-run after the fixes: **73/73 checks pass, axe 10/10 routes clean, 0 overflow, 0 console errors.**

| ID | Fix | Verification |
|---|---|---|
| **D-A11Y-1** | `--khalsni-public-text-muted` `#98a2b3`→`#5b6470` in `publicSiteDefaults.js` (the inline override) + `--kh-text-subtle` in `index.css` + `Topbar` role label `slate-500`→`slate-600` | axe: `/`, `/services`, `/admin`, `/employee` now **0 serious/critical** (was 10/7/1/1) |
| **D-UX1** | `LanguageSwitcher` rendered in `PublicLayout` header + mobile drawer (reusable component, rule 15) | runtime: public "English" button visible; click → `<html dir>` flips to `ltr`; screenshot `public-home-ar-1440-r2.png` |
| **D-UX2** | homepage "services by category": fixed-width scroll rail → `grid gap-4 sm:grid-cols-2` | cards fill the row (2-up), wrap, 0 overflow. *Residual (minor, inherent):* a category with a single service shows one empty grid cell — acceptable grid behaviour, not the original "rail with large gap" defect |
| **U7 (partial)** | `.field` primitive → logical inline padding; shared search-input pattern (9 screens) + shared components → `text-start`/`start-*`/`border-e` | lint clean; RTL (`dir=rtl`) + LTR route matrix re-verified |

Still open (design decision / subjective polish, deferred): U1–U6, U8–U13 (box-in-box density, radius-scale unification, plain-vs-photographic heroes, repeated info, gray-overuse) and **C-VIS1** (2026-08-05 dark reference vs light-direction chain — `BLOCKED_PRODUCT_DECISION`).

---

## Gate 1R runtime addendum (2026-09-05) — this section supersedes the honesty caveat below

A committed Playwright harness (`frontend/e2e/`, system Chrome) was executed against a live seeded stack. Results:

- **Route runtime matrix: 73/73 checks passed** (all 57 routes × role surfaces + responsive sub-matrix). Every route: HTTP 200, real render, **0 console errors, 0 failed requests, 0 5xx, 0 horizontal overflow**. See `KHALSNI_ROUTE_RUNTIME_MATRIX.md`.
- **Responsive:** 5 routes × {1440, 1280, 1024, 768, 390} = 25/25, **0 overflow**.
- **RTL:** `dir=rtl` on every route in Arabic (default) — runtime-confirmed.
- **English LTR:** forcing `localStorage['khalisni-language']='en'` → `dir=ltr`, `lang=en`, English nav + page bodies, **0 overflow** on 7 public routes. Dashboard `LanguageSwitcher` flips `dir` rtl→ltr.
- **Accessibility (axe WCAG 2.2 AA):** 10 routes; 6 clean; **1 root-cause serious `color-contrast`** issue (~19 nodes across `/`, `/services`, `/employee`, `/admin`) — `D-A11Y-1`; **0 critical**. See `KHALSNI_ACCESSIBILITY_RUNTIME_AUDIT.md`.
- **Screenshots:** deterministic AR + EN, 1440 + 390, public + admin + customer families — `frontend/e2e-results/screenshots/`. Compared to reference images in `KHALSNI_VISUAL_CONFORMANCE_MATRIX.md`.

**New runtime-evidenced UI findings:** `D-A11Y-1` (card-label contrast 2.44:1), `D-UX1` (no language switcher on the public site), `D-UX2` ("services by category" section renders cards left-flush with large empty space ≥1024px). `C-VIS1` (2026-08-05 dark reference vs light-direction chain — recommend written product confirmation).

**Carry-forward from 2026-08-30 (U1–U13), re-checked against live screenshots:** box-in-box `ServiceCard` and `ServicesPage` counters, plain-white boxed heroes vs photographic navy bands, price/duration repeated on the service-detail page, radius-scale drift between public and dashboard, light footer vs dark-navy reference footer — **all still visually present** in the live build (P2 UX). A6's "consolidation" did not fully close them.

---

## Scope & honesty statement (Gate 1 — retained for history)

Reference images are **accessible** (see `KHALSNI_SOURCE_OF_TRUTH.md` §2). However, **no live browser session, screenshot capture, responsive sweep, RTL/LTR runtime check, or axe/accessibility run was performed in this gate** — none of those runners are committed to the repo. This audit therefore:
1. inventories every route from `frontend/src/routes/AppRoutes.jsx`;
2. records the design-system wiring visible in source;
3. **carries forward** the findings of the two most recent UI documents — `docs/ui/KHALSNI_CUSTOMER_UI_AUDIT.md` (2026-08-30) and `docs/ui/KHALASNI_VISUAL_IMPLEMENTATION_FINAL_REPORT.md` (2026-09-01) — and reconciles them with `docs/khalsni-final-acceptance/` (2026-09-04);
4. defers pixel-level reference-image conformance, interaction testing, and per-component state review to a dedicated UI/UX gate.

---

## 1. Route inventory (≈57 routes)

### Public (`PublicLayout`) — 14
| Route | Component | Notes |
|---|---|---|
| `/` | `HomePage` | hero + real search + category cards + service cards + how-it-works + missing-service CTA + help CTA + updates + footer (A6 redesign). |
| `/services` | `ServicesPage` | list + search. HIGH finding: box-in-box counters (Aug-30). |
| `/services/category/:slug` | `ServiceCategoryPage` (lazy) | category → services (CE6). |
| `/services/:slug` | `ServiceDetailsPage` | overview, required docs, pricing, delivery, related/prereq/recommended, CTA. **D2 fee leak lives here.** Aug-30: price/duration repeated in 3 places. |
| `/create-order` | `CreateOrderPage` (lazy) | public order entry funnel. |
| `/track-order` | `TrackOrderPage` (lazy) | order number + phone. |
| `/about` `/contact` `/faq` `/privacy` | static pages (lazy) | content pages. |
| `/login` `/register` `/forgot-password` `/reset-password/:token` | auth pages | `?next=` honoured; Aug-30: boxed heroes feel "admin-like". |

### Customer (`ProtectedRoute roles=['customer']` + `DashboardLayout`) — 7
`/customer`, `/customer/orders/new`, `/customer/orders`, `/customer/orders/:id`, `/customer/orders/:id/missing-docs`, `/customer/profile`, `/customer/manual`.
Aug-30: dashboard pages use larger radii/shadows than public (`rounded-[2rem]`, `rounded-3xl`) → inconsistent with the public token scale.

### Employee/Support (`roles=['employee','support']`) — 7 + 2 support-only
`/employee`, `/employee/orders`, `/employee/orders/:id`, `/employee/missing-service-requests`, `/employee/documents/verify`, `/employee/reports`, `/employee/manual`; support-only: `/employee/service-categories`, `/employee/service-relations`.

### Admin (`roles=['admin']`) — 24
`/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/rules`, `/admin/cms`, `/admin/service-categories`, `/admin/services`, `/admin/service-relations`, `/admin/public-site`, `/admin/public-site/content`, `/admin/public-site/advertisements`, `/admin/public-site/theme`, `/admin/public-site/preview`, `/admin/missing-service-requests`, `/admin/users`, `/admin/providers`, `/admin/provider-services`, `/admin/payments`, `/admin/reports`, `/admin/notifications`, `/admin/audit`, `/admin/help-guides`, `/admin/manual`.

### Provider (`roles=['provider']`) — 4
`/provider`, `/provider/orders`, `/provider/orders/:id`, `/provider/manual`.

### Fallback
`*` → `<Navigate to="/" replace />` (no 404 page — every unknown path silently redirects home).

**Modals/drawers** (not routes): `AdminSoftDeleteModal`, mobile nav drawer, floating contact action, sticky mobile submit bars.

---

## 2. Design-system wiring (from source)

- Tailwind 3 + a light "Khalsni" token set; shared public primitives (`PublicPage`, `PublicHero`, `PublicButton`/`PublicLinkButton`, `PublicCard`, `PublicSearchInput`), `CategoryCard`, `ServiceCard`, `StatusBadge`.
- `DashboardLayout` + `Sidebar` + `Topbar` + `LanguageSwitcher` for the 4 authenticated portals; per-role nav-link arrays in `AppRoutes.jsx` with `lucide-react` icons.
- Brand: `KHALASNI_LOGO.pdf`; official logo assets referenced per A6.
- i18n: `LanguageContext` with `t(key, fallbackArabic)` pattern and ar/en dictionaries in `src/locales/`; RTL is the default direction.
- Catalog images: `CategoryCard`/`ServiceCard` render `image_url` with a Khalsni fallback (no broken `<img>`), per A6.

---

## 3. Findings — reconciled across the three latest UI docs

### Resolved since the Aug-30 audit (per A6 2026-09-01 + A7 2026-09-04)
- Service & Category images now exposed in public + admin serializers and forms; 31 catalog tests; fallbacks in place. (Aug-30 CRITICAL → **RESOLVED**.)
- Homepage/services legacy dark-blue states replaced with the light redesign. (Aug-30 CRITICAL → **RESOLVED** in source; runtime deployment parity still asserted only by prior screenshots.)
- Unauthenticated `auth/me` 401 console spam on public pages fixed (A6).

### Open / unverified at HEAD (carry-forward, treat as P2 UX unless noted)
| # | Finding | Source | Gate-1 status |
|---|---|---|---|
| U1 | `ServiceCard` is box-in-box (header box + icon chip + category pill + 2 stat boxes + trust box + CTA) → tall, low marketplace polish | Aug-30 HIGH | unverified; A6 claims cards "rebuilt" — needs runtime check |
| U2 | `ServicesPage` nests counters in a bordered block inside `PublicHero` (boxes in boxes) | Aug-30 HIGH | unverified |
| U3 | `ServiceDetailsPage` repeats price + duration in overview stats, price strip, and sticky summary | Aug-30 HIGH | unverified; **compounded by D2** |
| U4 | `HomePage` retains hardcoded category-image matching/fallback logic alongside dynamic images | Aug-30 HIGH | unverified |
| U5 | `CategoryCard` renders category image as very low-opacity background → not truly "image-led" | Aug-30 HIGH | A6 says "image-led catalog cards" delivered — conflicting claims, needs runtime check |
| U6 | Inconsistent border-radius scale: public `radius-lg/xl` vs customer dashboard `rounded-[2rem]`/`rounded-3xl`/nested rounded panels | Aug-30 HIGH | unverified; token unification is the fix |
| U7 | RTL/LTR inconsistency — components force right alignment + physical icon positions instead of logical properties | Aug-30 HIGH | **P2, borderline P1** for an Arabic-first product; no automated RTL test exists |
| U8 | Over-use of gray/slate (`bg-slate-50`, `text-slate-*`) for secondary surfaces across cards/tables/panels | Aug-30 MEDIUM | unverified |
| U9 | Inconsistent card heights / image ratios not centralized (`min-h-[14rem]` vs `min-h-44` vs `min-h-32` vs content-driven) | Aug-30 MEDIUM | unverified |
| U10 | Search UX split between a bespoke homepage combobox and `PublicSearchInput` | Aug-30 MEDIUM | unverified |
| U11 | Button styling duplicated in page files instead of always using `PublicButton`/`PublicLinkButton` | Aug-30 MEDIUM | unverified |
| U12 | Customer dashboard visually diverges from public pages (larger radii/shadows) | Aug-30 MEDIUM | unverified |
| U13 | Floating contact action can overlap mobile content / customer sticky submit | Aug-30 MEDIUM | unverified |
| U14 | No 404 page — `*` route silently redirects to `/` (user loses context on a bad link) | Gate-1 (this review) | confirmed in `AppRoutes.jsx` |
| U15 | `App.css` starter/demo CSS, `assets/vite.svg` + `react.svg`, Vite-template `frontend/README.md`, some hardcoded labels not in locale keys | Aug-30 LOW | confirmed present |

### Accessibility (baseline review only — A7 `09_ACCESSIBILITY_REVIEW.md` = PARTIAL)
- Present: semantic links/buttons/inputs, focus-visible styles, accessible labels on icon-only controls, image fallbacks, headings, min touch-target treatment on menu/language controls.
- **Missing:** any automated axe run, keyboard-flow test, contrast audit, screen-reader label verification, modal focus-trap verification. WCAG 2.2 AA conformance is **unproven**. Per the task brief, accessibility failures that prevent use are release blockers — none *confirmed*, but none *ruled out*.

### Responsive (A6 = prior live evidence; A7 `08` = PARTIAL)
- A6 reports 180 route/viewport checks (1280/1366/1440/1920 desktop; 360/390/430 + 375/412/768 mobile) with 0 overflow, 0 broken images.
- Not reproducible this gate (no runner). Treat as **prior evidence, not current proof**.

### Reference-image conformance (task §13)
- **BLOCKED for this gate** in the sense of *not performed* (not *inaccessible*). The design references in `image/`, `imges/`, `docs/khalsni-*/after/` were catalogued but not diffed pixel-by-pixel against the running UI. A6 asserts the customer/public visual implementation "conforms to the supplied Khalsni reference images and design requirements"; that assertion is **not independently verified here**.

---

## 4. UX-quality quick read (heuristic, source-level)

| Question | Read |
|---|---|
| Primary action obvious on each screen? | Public CTAs ("Request service", "Track order") are explicit; admin CRUD pages inventoried but not individually assessed. |
| Destructive actions protected? | Yes — `AdminSoftDeleteModal` + re-entered admin password + audit. |
| State communicated (loading/empty/error)? | A5/A6 report empty/loading/error states added; `RouteErrorBoundary` catches route errors; per-component coverage not verified this gate. |
| Information repeated unnecessarily? | Yes on `ServiceDetailsPage` (U3). |
| First-time user can follow the workflow? | Public "how it works" section + help CTA + in-app manual (`/…/manual`) support this. |
| Unnecessary complexity in admin forms? | A1/CE8 pushed derived values to the backend; grouped forms per A6. Not individually assessed. |

---

## 5. UI findings summary

| ID | Severity | Finding |
|---|---|---|
| D2 | MEDIUM (also security) | public service-detail leaks related-service raw fees — see Security Audit |
| U7 | P2 (borderline P1) | RTL/LTR inconsistency in an Arabic-first product; no automated RTL coverage |
| U1–U6, U8–U13 | P2 | design-system inconsistency & box-in-box density (carry-forward from 2026-08-30; A6 claims several fixed — needs a runtime reconciliation pass) |
| U14 | P2 | no 404 page; unknown routes silently redirect home |
| A11Y-1 | P2 (any confirmed blocker → P0) | no automated accessibility evidence; WCAG 2.2 AA unproven |
| U15 | P3 | template/starter cruft (`App.css`, `vite.svg`, `react.svg`, `frontend/README.md`), some hardcoded labels |
