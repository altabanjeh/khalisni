# Interaction Defects

## VAL-001

Severity: MAJOR

Persona: Admin

Route: `/admin/users`

Viewport: 1024

Language: English LTR

Steps:
1. Log in as admin.
2. Switch language to English.
3. Open `/admin/users`.

Expected: Page shell, headings, explanatory copy, filters, table labels, and row actions render consistently in English.

Actual: Top shell is English, but main page content and row actions remain Arabic.

Evidence/screenshot: `docs/khalsni-saas-uiux-validation/screenshots/admin-users-en-1024.png`

Likely source: Admin page-local hardcoded Arabic strings in `frontend/src/pages/admin/AdminUsersRolesPage.jsx`.

Recommended fix: Move page-local admin users copy into language-aware strings and use `isArabic`/locale dictionaries consistently.

Regression risk: Moderate, because tests assert Arabic action labels in places and should be updated to cover both languages.

## VAL-002

Severity: MAJOR

Persona: Admin

Route: `/admin/services`

Viewport: 1024

Language: Arabic RTL

Steps:
1. Log in as admin.
2. Use Arabic.
3. Open `/admin/services`.

Expected: Arabic admin services table headers, status labels, actions, empty/fallback values, and localized data all render coherently.

Actual: Several table labels/actions/statuses are English, and some category/service values render as `???`.

Evidence/screenshot: `docs/khalsni-saas-uiux-validation/screenshots/admin-services-ar-1024.png`

Likely source: Hardcoded English table column labels/actions and placeholder fallbacks in `frontend/src/pages/admin/ServicesManagementPage.jsx`.

Recommended fix: Localize all admin service-management table columns, filter values, actions, and fallback values; replace `???` with explicit localized missing-data labels.

Regression risk: Moderate, because admin service management has broad tests around dynamic required-information schema.

## VAL-003

Severity: MAJOR

Persona: Admin

Route: `/admin`, `/admin/public-site/*`, `/admin/services`, `/admin/rules`

Viewport: 1024/1440

Language: Arabic and English

Steps:
1. Log in as admin.
2. Navigate across representative admin configuration screens.

Expected: Admin IA groups frequent operations and configuration tasks into predictable sections.

Actual: Admin route family is functional but broad and dense, with many top-level peers and mixed resource-management concerns.

Evidence/screenshot: `docs/khalsni-saas-uiux-validation/screenshots/admin-dashboard-ar-1440.png`; route inventory `frontend/src/routes/AppRoutes.jsx:207-229`.

Likely source: Flat admin navigation and resource routes.

Recommended fix: Group admin navigation into operations, catalog/services, public site, accounts/providers, finance, governance, and help.

Regression risk: Moderate, because navigation changes affect role discovery and protected routes.

## Validation Gaps

- Full browser order submission was not completed.
- Full keyboard traversal was not completed.
- No automated WCAG scan was run.
- Full destructive admin action testing was intentionally not performed.

