# Prioritized UI/UX Backlog

Counts:
- P0: 0
- P1: 6
- P2: 10
- P3: 3

## Wave 0 - Broken Interactions / Routes / Safety

No P0 blocker was confirmed during this audit.

## Wave 1 - Foundations / Shells

ID: KSA-UX-001
Area: Runtime coverage
Route: Protected customer, employee, admin, provider routes
Persona: Customer / Employee / Admin / Provider
Evidence: `frontend/src/routes/AppRoutes.jsx:176-238`; `docs/khalsni-saas-uiux-audit/screenshots/admin-protected-redirect-1440.png`
Problem: Protected routes are source/test confirmed, but not browser-screenshot audited after authenticated login.
User impact: Visual or workflow regressions in operational portals can ship unnoticed.
Business impact: Staff/customer request handling quality may degrade after transformation.
Severity: P1
Effort: M
Recommended solution: Add authenticated route sweep with stable demo users and screenshots for each role.
Dependencies: Test login data and browser automation.
Acceptance criteria: Screenshots exist for every protected route at desktop and mobile widths.

ID: KSA-UX-002
Area: Localization
Route: `/services`, `/`
Persona: Public / Customer
Evidence: `docs/khalsni-saas-uiux-audit/screenshots/services-en-1024.png`; `frontend/src/utils/servicePresentation.js:4-52`
Problem: English/LTR UI can still display Arabic service/category content when English fields are missing.
User impact: English users see mixed-language service discovery and may not understand requirements.
Business impact: Lower trust and conversion for English-speaking customers.
Severity: P1
Effort: M
Recommended solution: Add content completeness checks and fallback policy for public service data.
Dependencies: Service/category English data governance.
Acceptance criteria: Public English screenshots contain no unexpected Arabic service data except proper names.

ID: KSA-UX-003
Area: Admin information architecture
Route: `/admin`
Persona: Admin
Evidence: `frontend/src/routes/AppRoutes.jsx:125-153`
Problem: Admin sidebar exposes 22 top-level links, mixing operations, public-site management, configuration, reporting, payments, audit, and help.
User impact: Admin users must scan too many peer-level choices for common tasks.
Business impact: Slower setup, more training, higher configuration error risk.
Severity: P1
Effort: L
Recommended solution: Group admin navigation into Operations, Services, Public site, Accounts, Finance, Governance, and Help.
Dependencies: Navigation/content approval.
Acceptance criteria: Admin users can find common tasks in one predictable group with active states preserved.

ID: KSA-UX-004
Area: Accessibility
Route: All
Persona: All
Evidence: `frontend/package.json:7-12`; no axe/playwright package found.
Problem: No automated accessibility scan or keyboard-route audit exists.
User impact: Keyboard, focus, contrast, and dialog issues may remain undiscovered.
Business impact: Compliance and support risk.
Severity: P1
Effort: M
Recommended solution: Add noninvasive accessibility audit tooling and manual keyboard checklist.
Dependencies: QA tooling decision.
Acceptance criteria: At least public/auth and critical protected flows have WCAG-oriented scan and manual keyboard results.

ID: KSA-UX-005
Area: Staff/admin data-dense UI
Route: Admin and employee table routes
Persona: Staff / Admin
Evidence: `frontend/src/components/DataTable.jsx:24-137`; `frontend/src/routes/AppRoutes.jsx:188-229`
Problem: Tables are shared and responsive, but dense operational screens still rely heavily on wide tables, horizontal scrolling, and row actions.
User impact: Reviewing orders, users, providers, and documents can be slower on smaller screens.
Business impact: Operational throughput can drop as request volume grows.
Severity: P1
Effort: L
Recommended solution: Convert the highest-volume queues to work-queue layouts with priority, status, owner, and next action.
Dependencies: Staff workflow priority decisions.
Acceptance criteria: Employee/admin queues expose next action and status without horizontal scanning on laptop and mobile.

ID: KSA-UX-006
Area: Feedback and permission states
Route: Protected routes
Persona: All authenticated personas
Evidence: `frontend/src/routes/ProtectedRoute.jsx`; unauthenticated redirect screenshots in `docs/khalsni-saas-uiux-audit/screenshots/`
Problem: Redirect behavior is confirmed, but permission denied/session expiry UX needs explicit screen-level validation.
User impact: Users may not understand whether they are logged out, unauthorized, or blocked by role.
Business impact: More support requests and failed task completion.
Severity: P1
Effort: M
Recommended solution: Audit and standardize auth-expired, forbidden, network error, and retry states.
Dependencies: Existing auth API behavior.
Acceptance criteria: Each protected persona gets a clear recovery path for expired/forbidden access.

## Wave 2 - Public / Auth

ID: KSA-UX-007
Area: Public service discovery
Route: `/services`
Persona: Public
Evidence: `docs/khalsni-saas-uiux-audit/screenshots/services-en-1024.png`
Problem: Category sections and service cards are visually clear, but repeated generic category names reduce browse confidence when content is sparse.
User impact: Users may not quickly distinguish which authority/request type they need.
Business impact: Lower service discovery conversion.
Severity: P2
Effort: M
Recommended solution: Require meaningful category names/descriptions and show high-signal metadata first.
Dependencies: CMS/service data cleanup.
Acceptance criteria: Each visible category has distinct localized title, description, and service count.

ID: KSA-UX-008
Area: Auth
Route: `/login`, `/register`, password recovery
Persona: Public / Customer / Staff
Evidence: `frontend/src/pages/public/LoginPage.test.jsx`; `docs/khalsni-saas-uiux-audit/screenshots/login-en-1024.png`
Problem: Login behavior is tested, but first-use onboarding and role expectations need clearer audit coverage for all personas.
User impact: Staff/provider/customer users may not know the correct portal context after login failures or role mismatch.
Business impact: Authentication support overhead.
Severity: P2
Effort: S
Recommended solution: Standardize role-aware helper text and failure recovery copy.
Dependencies: Auth copy review.
Acceptance criteria: Login failures and role redirects explain the next action without exposing sensitive details.

## Wave 3 - Customer

ID: KSA-UX-009
Area: Customer request workspace
Route: `/customer/orders/:id`, `/customer/orders/:id/missing-docs`
Persona: Customer
Evidence: `frontend/src/pages/customer/MissingDocumentsResponsePage.test.jsx`; `frontend/src/routes/AppRoutes.jsx:178-180`
Problem: Missing-document upload flow is tested, but complete visual validation of order detail status, documents, and next actions is incomplete.
User impact: Customers may miss what is required next if visual hierarchy regresses.
Business impact: Delayed request completion.
Severity: P2
Effort: M
Recommended solution: Add customer order workspace screenshot and next-action checklist.
Dependencies: Authenticated E2E data.
Acceptance criteria: Customer order detail always shows current status, missing items, last update, and next action.

ID: KSA-UX-010
Area: Uploads
Route: Customer and provider upload screens
Persona: Customer / Provider
Evidence: `frontend/src/components/FileUploader.jsx:46-182`
Problem: Upload component validates type/size and shows selected files, but strings are hardcoded and need full bilingual validation.
User impact: English/LTR users may see Arabic validation or upload guidance.
Business impact: Upload failure confusion and support load.
Severity: P2
Effort: S
Recommended solution: Move uploader strings into the localization system and validate both directions.
Dependencies: Locale keys.
Acceptance criteria: Upload hint, validation, selected file text, and remove labels localize in Arabic and English.

## Wave 4 - Staff / Provider

ID: KSA-UX-011
Area: Employee work queue
Route: `/employee/orders`
Persona: Employee / Support
Evidence: `frontend/src/pages/employee/EmployeeOrderReviewPage.test.jsx`; `frontend/src/routes/AppRoutes.jsx:188-194`
Problem: Review workflow is tested, but queue prioritization and next-action visibility need visual validation.
User impact: Staff may spend extra time locating urgent or actionable work.
Business impact: Slower request processing.
Severity: P2
Effort: M
Recommended solution: Audit queue columns against real staff workflow and promote status/age/next action.
Dependencies: Staff workflow confirmation.
Acceptance criteria: Review queue makes priority, status, owner, age, and next action scan-friendly.

ID: KSA-UX-012
Area: Provider workflow
Route: `/provider/orders`, `/provider/orders/:id`
Persona: Provider
Evidence: `frontend/src/pages/provider/ProviderOrderDetailsPage.test.jsx`; `frontend/src/routes/AppRoutes.jsx:235-238`
Problem: Provider detail upload behavior is tested, but provider dashboard/list visual evidence is incomplete.
User impact: Providers may not know which assigned request needs action first.
Business impact: Third-party processing delays.
Severity: P2
Effort: M
Recommended solution: Add provider queue visual audit with status and required action states.
Dependencies: Provider demo data.
Acceptance criteria: Provider list/detail show assignment status, due/age, upload state, and completion action clearly.

## Wave 5 - Admin

ID: KSA-UX-013
Area: Admin forms and modals
Route: `/admin/users`, `/admin/provider-services`
Persona: Admin
Evidence: `frontend/src/pages/admin/AdminUsersRolesPage.jsx:485-599`; `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx:233-352`
Problem: Modal/table interaction has been stabilized, but similar patterns across other admin forms need a consistency audit.
User impact: Admin users may encounter inconsistent edit/create behavior across management screens.
Business impact: Configuration errors and training overhead.
Severity: P2
Effort: M
Recommended solution: Audit every admin create/edit/delete modal against one interaction checklist.
Dependencies: Admin route E2E coverage.
Acceptance criteria: All admin modals share close, save, disabled, destructive, validation, and focus behavior.

ID: KSA-UX-014
Area: Destructive actions
Route: Admin soft-delete screens
Persona: Admin / Support
Evidence: `frontend/src/pages/admin/AdminUsersRolesPage.jsx:602-615`; `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx:323-352`
Problem: Soft-delete and restore dialogs exist, but copy/localization is inconsistent in some admin restore flows.
User impact: Admins may be uncertain whether an item is hidden, disabled, deleted, or restored.
Business impact: Accidental operational data visibility changes.
Severity: P2
Effort: S
Recommended solution: Standardize destructive and restore copy in both languages.
Dependencies: Terminology decision for delete/disable/hide.
Acceptance criteria: Every destructive dialog states object, consequence, reversibility, and required confirmation consistently.

ID: KSA-UX-015
Area: Admin public-site tooling
Route: `/admin/public-site/*`
Persona: Admin
Evidence: `frontend/src/routes/AppRoutes.jsx:215-219`
Problem: Public site management is split across multiple peer-level admin routes without an audited task sequence.
User impact: Admins may not know whether to edit content, ads, theme, or preview first.
Business impact: Public content changes may be incomplete or inconsistent.
Severity: P2
Effort: M
Recommended solution: Create a guided public-site management IA and preview/publish checklist.
Dependencies: CMS workflow decision.
Acceptance criteria: Admin public-site route group communicates edit, preview, and publish order.

## Wave 6 - Responsive / RTL / Accessibility

ID: KSA-UX-016
Area: Table directionality
Route: All DataTable routes
Persona: Staff / Admin / Provider / Customer
Evidence: `frontend/src/components/DataTable.jsx:102-104`; `docs/khalsni-saas-uiux-audit/screenshots/services-en-1024.png`
Problem: Table header alignment is hardcoded right, which should be reviewed for English/LTR contexts.
User impact: English users may see dense tabular information aligned against LTR expectations.
Business impact: Reduced scan speed in operational portals.
Severity: P3
Effort: S
Recommended solution: Make table alignment direction-aware where appropriate.
Dependencies: Design-system decision.
Acceptance criteria: RTL and LTR tables both align labels and values predictably.

ID: KSA-UX-017
Area: Mobile navigation
Route: DashboardLayout routes
Persona: All authenticated personas
Evidence: `frontend/src/layouts/DashboardLayout.jsx:7-24`
Problem: Mobile dashboard layout has a sidebar toggle, but protected mobile screenshots were not captured.
User impact: Sidebar, topbar, and dense forms may be difficult to use on 390px.
Business impact: Field staff/customer mobile usage risk.
Severity: P2
Effort: M
Recommended solution: Add mobile screenshots and touch-target audit for each protected role.
Dependencies: Authenticated browser sweep.
Acceptance criteria: Protected role navigation and top task work at 390px without overlap or hidden primary actions.

ID: KSA-UX-018
Area: Screenshot evidence
Route: Public representative routes
Persona: Public
Evidence: `docs/khalsni-saas-uiux-audit/screenshots/`
Problem: Public screenshot coverage is representative, not exhaustive across all public/auth routes and all breakpoints.
User impact: Lower risk than protected areas, but route-specific regressions can still be missed.
Business impact: Public conversion quality can regress.
Severity: P3
Effort: S
Recommended solution: Capture all public/auth routes at 1440, 1024, and 390 in Arabic and English.
Dependencies: Headless browser script.
Acceptance criteria: Screenshot manifest lists every public/auth route by viewport and language.

## Wave 7 - Polish / Performance

ID: KSA-UX-019
Area: Performance evidence
Route: All
Persona: All
Evidence: `frontend/vite.config.js:14-24`; `docs/khalsni-saas-uiux-audit/12-performance-feedback-states.md`
Problem: Build chunking exists, but no route-level performance measurements were recorded during audit.
User impact: Slow routes or layout shifts may not be visible from static screenshots.
Business impact: Lower perceived quality and conversion.
Severity: P3
Effort: M
Recommended solution: Add Lighthouse or browser performance snapshots for public home, services, login, customer dashboard, employee queue, admin users.
Dependencies: Stable local data and browser automation.
Acceptance criteria: Each critical route has load, visual completeness, and major chunk observations recorded.
