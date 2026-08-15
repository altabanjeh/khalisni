# KHALSNI — PRODUCTION UI TRANSFORMATION IMPLEMENTATION PROMPT

## ROLE

Act as a senior frontend architect, senior React engineer, UX/UI systems designer, accessibility engineer, and integration-focused full-stack engineer.

You are working inside the EXISTING **Khalsni** repository.

Your job is to implement the new Khalsni user experience discussed in the approved UI references while preserving the current domain model, backend behavior, API contracts, authorization rules, data, and operational capabilities.

This is **NOT** a rebuild.

The existing application is the source of truth. The new UI must sit on top of the existing Khalsni platform and reuse its real data and workflows.

---

# 0 — READ THIS BEFORE CHANGING CODE

Before implementation, read and treat as required context:

```text
docs/khalsni-system-discovery/system-discovery-audit.md
docs/khalsni-system-discovery/runtime-verification.md
docs/khalsni-system-discovery/erd.mmd
```

Then inspect the actual current source referenced by those reports, especially:

```text
frontend/src/routes/AppRoutes.jsx
frontend/src/index.css
frontend/tailwind.config.js
frontend/src/context/LanguageContext.jsx
frontend/src/utils/i18n.js
frontend/src/locales/ar.json
frontend/src/locales/en.json
frontend/src/api/
frontend/src/components/
frontend/src/pages/public/
frontend/src/pages/customer/
frontend/src/pages/employee/
frontend/src/pages/admin/
frontend/src/pages/provider/

backend/services/
backend/orders/
backend/documents/
backend/payment/
backend/notifications/
backend/public_site/
backend/help_guides/
backend/workflow/
backend/core/
```

Do not trust documentation over executable code. Verify important assumptions in current source before implementation.

---

# 1 — CONFIRMED CURRENT FOUNDATION TO PRESERVE

The discovery currently identifies Khalsni as:

```text
Backend
- Python 3.12
- Django 5.1
- Django REST Framework
- JWT/session-compatible authentication
- PostgreSQL in configured environments / SQLite fallback

Web
- React 19
- Vite
- React Router 7
- Tailwind CSS 3.4
- Lucide React
- React Hook Form
- Axios

Mobile
- React Native / Expo
```

The web application already has:

- public routes
- customer portal routes
- employee/support routes
- admin routes
- provider routes
- Arabic/English support
- RTL/LTR handling
- Tailwind
- Lucide
- API clients
- reusable components
- service categories
- services
- required-document definitions
- service/document requirements
- order tracking
- order status logs
- pricing
- duration configuration
- payments as records
- notifications
- audit history
- soft deletion
- guarded admin deletion

**Do not replace these systems with parallel implementations.**

---

# 2 — NON-NEGOTIABLE IMPLEMENTATION RULES

## DO NOT rebuild Khalsni

Do not create parallel models or alternate concepts such as:

```text
NewService
NewRequest
NewCategory
NewDocumentRegistry
NewWorkflow
```

when an existing Khalsni concept already performs that function.

Use the existing domain.

## DO NOT rewrite the backend for visual convenience

The UI must adapt to the current backend.

Backend changes are allowed only when all of these are true:

1. the UI requires information that genuinely cannot be obtained through an existing safe API;
2. the change is small and backward-compatible;
3. it introduces no database migration;
4. it does not break mobile or existing clients;
5. it has backend tests.

If a database/schema migration appears necessary, STOP that part and document it as a blocker. Do not silently perform a domain migration as part of this UI task.

## DO NOT upgrade the stack unnecessarily

Do not upgrade:

- React
- Vite
- React Router
- Tailwind
- Django
- DRF
- Node
- Python

merely to implement the redesign.

The current React + Vite + Tailwind + Lucide stack is sufficient.

## shadcn/ui

shadcn/ui may be used selectively **only if it integrates cleanly with the existing Vite/Tailwind setup without requiring a framework or Tailwind upgrade**.

Use it as a source of accessible primitives, not as a new identity.

If adopting it creates migration conflict, implement equivalent reusable primitives using the existing Tailwind setup instead.

Never introduce two competing design systems.

## No fake functionality

Do not add UI that pretends functionality exists.

Examples:

- no fake online payment form when no real payment initiation flow exists;
- no fake chat when there is no customer-safe messaging API;
- no fabricated 60% progress indicator;
- no fake notifications;
- no hardcoded request timelines;
- no hardcoded service prices;
- no hardcoded service durations;
- no fake document status;
- no hardcoded demo service data in production pages.

Every displayed business value must come from Khalsni data or a clearly defined static presentation label.

## Security boundaries must remain authoritative

Never expose:

- internal staff notes
- deleted records
- another customer's order
- private document URLs
- admin-only actions
- provider-only actions
- hidden internal audit data

because the new UI makes them visually convenient.

Backend authorization remains authoritative.

---

# 3 — UI REFERENCE RULE

The supplied Khalsni reference screenshots define the visual direction.

If the screenshots are available in the repository or attached to the coding session, inspect them directly.

Recommended location:

```text
docs/khalsni-ui-references/
```

If they are not available, use the visual specification in this prompt as the authoritative fallback.

Do not clone another brand's identity or copy proprietary logos/assets.

Reproduce the interaction quality, information hierarchy, spacing, card language, page structure, and service-platform UX in Khalsni's own identity.

---

# 4 — TARGET KHALSNI VISUAL LANGUAGE

The interface must be:

- Arabic-first
- clean
- light
- professional
- trustworthy
- service-oriented
- spacious
- responsive
- accessible
- visually consistent across public/customer/staff/admin portals

Avoid:

- dark dashboard aesthetics
- orange-heavy themes
- excessive gradients
- giant shadows
- glassmorphism
- gaming-style UI
- excessive animation
- tiny text
- overly dense admin tables on mobile
- decorative icons with inconsistent styles

Use **Lucide React** consistently for interface icons.

Do not mix Font Awesome/Material/Lucide styles on redesigned pages unless an existing legacy page cannot safely be migrated in this task.

---

# 5 — DESIGN TOKENS

Create or consolidate one semantic Khalsni token layer.

Do not scatter raw colors across pages.

The reference screenshots are approximately based on this visual family:

```text
Page background:       #FBFCFD
Primary navy:          #021E52
Secondary navy:        #0B2D6B
Action blue:           #0F55DA
Deep action blue:      #093CA2
Soft blue surface:     #EEF4FF
Border:                #DFE3EC
Muted surface:         #F5F7FA
Muted text:            #586D93
Primary text:          #162033
White:                 #FFFFFF
```

These are starting design tokens, not page-level magic numbers.

If direct screenshot inspection shows a better calibrated value, adjust the token globally rather than changing individual pages.

Preserve or map existing semantic success/warning/danger colors so business states remain consistent.

Use semantic names such as:

```text
--kh-bg
--kh-surface
--kh-surface-muted
--kh-primary
--kh-primary-hover
--kh-navy
--kh-text
--kh-text-muted
--kh-border
--kh-success
--kh-warning
--kh-danger
```

Map them into Tailwind configuration or existing CSS variables using the project's current pattern.

---

# 6 — TYPOGRAPHY

Use one coherent Arabic/Latin typography system.

Requirements:

- excellent Arabic readability
- matching English appearance
- strong numeric readability
- proper RTL punctuation/spacing
- clear heading hierarchy
- no inconsistent fonts between portals

Prefer an Arabic UI family such as IBM Plex Sans Arabic or Noto Sans Arabic if it can be included locally and safely using the repository's dependency/static-asset conventions.

Do not add a runtime dependency on a third-party CDN solely for fonts.

If the project already has a suitable local Arabic font, reuse it.

Create consistent typography levels:

```text
Display
Page title
Section title
Card title
Body
Small body
Metadata
Caption
Button
```

---

# 7 — SPACING / SHAPE SYSTEM

Use a consistent spacing scale based on Tailwind.

Target visual language:

```text
Card radius:        roughly 12–16px
Input radius:       roughly 10–12px
Button radius:      roughly 10–12px
Border:             subtle 1px
Shadow:             very light / restrained
Desktop max-width:  consistent across public pages
Section spacing:    generous
Card padding:       comfortable
```

Avoid arbitrary one-off spacing.

---

# 8 — RESPONSIVE REQUIREMENTS

Support at minimum:

```text
~360px mobile
~390px mobile
768px tablet
1024px laptop
1440px desktop
```

Requirements:

- no horizontal overflow
- tables become cards/scroll containers appropriately
- public cards reflow naturally
- portal sidebar becomes drawer/mobile navigation
- forms remain usable on narrow screens
- steppers remain understandable on mobile
- Arabic content does not clip
- buttons have usable touch targets
- long service names wrap safely

---

# 9 — ACCESSIBILITY

Target WCAG 2.2 AA behavior for redesigned interfaces.

Implement:

- semantic headings
- labelled form controls
- visible keyboard focus
- logical tab order
- keyboard-operable dialogs/menus
- ARIA only where semantic HTML is insufficient
- sufficient color contrast
- accessible validation errors
- status changes that are understandable without color alone
- descriptive icon-button labels
- reduced-motion respect
- accessible loading/skeleton states

Do not remove outlines without replacing them with an accessible focus indicator.

---

# 10 — DIRECTION / LOCALIZATION

Arabic is the default experience.

Use the existing LanguageContext/i18n architecture.

Requirements:

```text
Arabic → dir="rtl"
English → dir="ltr"
```

Do not create separate duplicated Arabic and English page implementations.

Do not hardcode new bilingual conditionals throughout page components.

New copy should go through the existing locale system unless it is dynamic backend data.

Consolidate touched legacy inline Arabic/English strings into the locale dictionaries where practical.

Do not attempt a repository-wide unrelated translation refactor.

---

# 11 — COMPONENT ARCHITECTURE

Before rebuilding pages, create/reuse a coherent primitive/component layer.

Respect existing project structure; do not move everything only to satisfy this suggested naming.

The final component system should include equivalents of:

## Foundations

```text
Button
IconButton
Input
Textarea
Select
Checkbox
Radio
Switch
Label
FormField
Card
Badge
Alert
Dialog
Sheet/Drawer
Dropdown
Tabs
Accordion
Tooltip
Skeleton
EmptyState
Pagination
```

## Khalsni domain components

```text
KhalsniLogo / BrandMark wrapper
LanguageSwitcher
PublicHeader
PublicFooter
PortalSidebar
PortalMobileNav
PageHeader

CategoryCard
ServiceCard
ServiceSearch
ServiceFilterBar
ServiceSummaryCard
ServicePriceDisplay
ServiceDurationDisplay
ServiceAuthorityDisplay
RequiredDocumentList

ApplicationStepper
ApplicationSection
ReviewSummary

OrderStatusBadge
OrderStageStepper
OrderTimeline
OrderTimelineItem
OrderSummaryCard
OrderDocumentCard
MissingDocumentCard
PaymentSummary
CustomerUpdateCard

DashboardStatCard
QuickActionCard
NotificationItem

StaffWorkQueue
StaffOrderHeader
StaffActionPanel
```

Reuse shared components across public/customer/staff/admin areas where their meaning is genuinely shared.

Do not create visually identical copies inside every page directory.

---

# 12 — CANONICAL STATUS PRESENTATION

The backend workflow is authoritative.

The discovery identified states including:

```text
NEW
UNDER_REVIEW
WAITING_CUSTOMER
ASSIGNED
IN_PROGRESS
WAITING_GOVERNMENT
READY_FOR_DELIVERY
COMPLETED
REJECTED
CANCELLED
ARCHIVED
```

Verify the exact current enum/rules before coding.

Create one centralized frontend presentation mapping for:

- translated label
- badge style
- icon
- customer-safe description
- terminal/active status

Do not duplicate status color/label logic across pages.

Do not invent transitions in the frontend.

For progress visualization:

- use real status/status-history data;
- use stages or "X of Y stages" only where semantically valid;
- do not fabricate percentage completion.

---

# 13 — PUBLIC SITE IMPLEMENTATION

## 13.1 Public Header

Implement a clean public header with:

- Khalsni brand
- Services
- Track Request
- Help/FAQ where appropriate
- language switch
- login/register or authenticated portal action
- mobile drawer

Keep navigation concise.

## 13.2 Homepage `/`

Transform the existing homepage into the primary service-discovery experience.

Recommended structure:

```text
Header

Hero
- strong Khalsni service message
- prominent service search
- optional concise supporting text

Service Categories
- large visual category cards
- image when category has one
- Lucide/custom icon fallback
- category name
- concise description where useful

Popular / Featured Services
- reusable ServiceCard grid

How Khalsni Works
- Discover
- Submit
- Track
- Complete

Custom / Missing Service CTA
- connect to existing MissingServiceRequest capability

Trust/support area where real content exists

Footer
```

The category section should visually resemble the reference screenshots: spacious image-backed cards with controlled overlays and a clean blue/navy identity.

Use actual:

```text
ServiceCategory
image
icon
color
display order
visibility
```

Do not download random production imagery from the internet.

When a category has no image, render an intentional branded fallback using its icon/color.

## 13.3 Services `/services`

Implement:

- search
- category filtering
- clean category navigation
- service cards
- price display from backend
- duration display from backend
- loading state
- empty state
- error state
- responsive layout

Preserve current query/filter behavior when possible.

## 13.4 Category Experience

Provide a real category-focused experience.

Preferred route if it fits existing routing cleanly:

```text
/services/category/:slug
```

Otherwise use an existing route/query approach.

Do not break `/services`.

Category page should contain:

```text
Category hero/banner
Category name
Description
Service count
Popular/featured services if real data supports it
All services
Related categories/services where real data exists
FAQ/support link
Missing-service CTA
```

Use existing category/service APIs where possible.

If no dedicated category-detail endpoint exists, derive the page from safe existing public APIs rather than forcing a backend rewrite.

## 13.5 Service Detail `/services/:slug`

Build a rich service-detail page.

Include only supported real data:

```text
Service title
Description
Category
Responsible authority if available
Duration
Pricing
Required documents
Requirements/instructions
Related services
Availability/publication state
Apply CTA
```

Layout:

```text
Main content
+
sticky/desktop service summary card
```

On mobile, summary becomes part of the normal flow.

Pricing must respect backend public-visibility controls.

Do not reveal hidden fee components.

---

# 14 — SERVICE CARD

Create one canonical ServiceCard.

It should support real variants such as:

```text
icon/image
title
short description
price/price range/starting price
duration
category
CTA
```

Use existing structured pricing/duration data.

No hardcoded `"15 JD"` or `"3 days"` except in tests/fixtures.

Cards must maintain equal visual rhythm without forcing equal text height through truncation that hides essential information.

---

# 15 — APPLICATION WIZARD

Transform the existing service order/application experience into a clear step-based workflow.

Use the existing route or route family; do not create a duplicate ordering system.

The wizard should derive steps from actual service requirements.

Possible steps:

```text
1. Request Information
2. Documents
3. Review
4. Payment — only if a real customer payment action exists/is required
5. Confirmation
```

Important:

**Do not force five steps for every service.**

Build the step list from actual applicable capabilities.

## Request Information

Use existing profile data where safe.

Render service-specific fields from the existing service configuration such as:

```text
required_information_schema
```

Verify its exact structure in code before implementation.

Support appropriate controls:

```text
text
number
phone
email
date
select
radio
checkbox
textarea
```

Use current validation rules and React Hook Form where appropriate.

Do not hardcode service-specific forms.

## Documents

Build from actual ServiceRequiredDocument / document-definition data.

Display:

- document name
- required/optional
- instructions
- allowed formats
- size limit
- upload state
- replace/retry where supported

Do not bypass backend file validation.

## Review

Show an accurate summary of:

- service
- entered information
- uploaded documents
- pricing visible to customer
- duration
- any customer-visible terms

## Payment

The discovery did not confirm a live payment gateway.

Therefore:

- render an actionable online payment step only if the current backend exposes a real configured customer payment flow;
- otherwise omit the payment action or present the actual existing payment instructions/status;
- never create a fake credit-card form.

## Confirmation

After successful creation show:

- real order number
- service
- submitted time
- current status
- tracking action
- link to customer order workspace

Do not generate client-side fake order numbers.

---

# 16 — PUBLIC ORDER TRACKING `/track-order`

Redesign the existing tracking experience.

Use the current secure verification contract.

Do not weaken it to "order number only" if the existing API requires additional verification.

Display only customer-safe public tracking data.

Recommended structure:

```text
Tracking lookup
↓
Order reference
Service
Current status
Last update
Expected completion if real
Timeline/stages if returned safely
Next customer action if applicable
Support action
```

Do not show:

- internal notes
- staff-only identity/details
- private audit payloads
- hidden documents
- admin actions

Do not show arbitrary progress percentages.

---

# 17 — CUSTOMER PORTAL SHELL

Create a coherent authenticated customer shell.

Desktop:

```text
Sidebar
+
top utility/header
+
content
```

Mobile:

```text
compact header
+
drawer/bottom-friendly navigation
```

Primary navigation:

```text
Dashboard
New Request
My Requests
Profile
Manual / Help
Notifications when available
Logout
```

Use real existing routes.

Do not create dead navigation items.

---

# 18 — CUSTOMER DASHBOARD `/customer`

Redesign using real data.

Recommended:

```text
Welcome / context header

Summary cards
- active requests
- waiting for customer
- completed
- notifications if supported

Quick actions
- New Request
- Track/View Requests

Recent Requests

Important Updates / Notifications

Help card
```

Do not calculate metrics client-side from incomplete paginated data if a dashboard API already exists.

---

# 19 — MY REQUESTS `/customer/orders`

Implement:

- clear list/table/card hybrid
- order number
- service
- status
- submitted date
- expected completion where available
- next action
- search/filter if backend supports it
- responsive cards on mobile
- loading/empty/error states

Use status badges from the central status presentation system.

---

# 20 — CUSTOMER REQUEST WORKSPACE `/customer/orders/:id`

This is one of the highest-priority screens.

Transform the current order detail page into a coherent case/request workspace.

Recommended structure:

```text
Order Header
- order number
- service
- status
- created date
- expected completion
- primary permitted action

Progress / Status
- real stage display
- status history/timeline

Overview
- request summary
- submitted information where safely available
- price/payment summary

Documents
- uploaded documents
- verification status
- missing documents
- requested replacements
- allowed actions

Updates / Communication
- customer-visible notifications/notes/messages only

Support / Help
```

Use tabs only if they improve comprehension on smaller screens. Do not hide essential status information behind tabs.

## Messaging safety

The discovery confirmed OrderNote/notification capabilities but did not prove a complete two-way customer chat contract.

Therefore:

- inspect the current APIs and permissions;
- expose only records explicitly designed as customer-visible;
- never display internal staff notes;
- if no customer-safe two-way message endpoint exists, implement an **Updates** panel instead of fake chat;
- document the messaging gap for a later backend feature.

---

# 21 — MISSING DOCUMENT FLOW

Integrate the existing missing-document request capability into the request workspace.

Customer should clearly see:

```text
what document is missing
why it is needed
deadline if real
allowed formats
status
upload/replace action
```

Reuse existing customer missing-document route/API.

Do not create a second document-upload system.

---

# 22 — CUSTOMER PROFILE / HELP / MANUAL

Bring these existing pages into the same design system.

Do not expand their business scope.

Focus on:

- typography
- forms
- cards
- responsive layout
- validation
- navigation consistency
- RTL/LTR

---

# 23 — EMPLOYEE / SUPPORT EXPERIENCE

Do not rebuild employee business logic.

Apply the same Khalsni system to:

```text
/employee
/employee/orders
/employee/orders/:id
/employee/documents/verify
/employee/missing-service-requests
/employee/reports
```

Prioritize:

- work queue clarity
- filters
- status visibility
- customer/order identification
- document review
- allowed workflow actions
- internal notes separation
- consistent action hierarchy
- responsive behavior

Backend workflow rules remain authoritative.

If the frontend currently duplicates allowed-transition logic, reduce visual duplication where safely possible and consume backend-provided capability/rule data when already available.

Do not create new workflow rules in JavaScript.

---

# 24 — PROVIDER EXPERIENCE

Preserve provider functionality and routes.

Bring the provider shell and order pages into the shared design language where practical.

Do not change provider authorization or assignment rules.

---

# 25 — ADMIN EXPERIENCE

The admin system contains many features.

Do not replace it with a new dashboard framework.

Create/modernize the shared admin shell and primitives first, then migrate high-value screens.

Priority:

```text
Admin Dashboard
Services
Categories
Required Document Definitions
Service Required Documents
Service Relations
Orders
Users/Roles
Providers
Public Site Configuration
Notifications
Payments
Audit
Help Guides
```

For service management, make configuration understandable through logical sections/tabs such as:

```text
Basic Information
Category & Publication
Pricing
Duration
Required Documents
Application Information
Relations
Provider Assignment
Public Presentation
```

Only expose fields that actually exist.

Do not invent a new workflow configurator in this UI task because workflow rules are currently code-defined.

Instead show workflow information read-only where useful, or retain existing workflow-rule management if it already exists.

---

# 26 — DELETE UX

Khalsni already has guarded deletion/soft-delete behavior.

Do not replace it.

For entities using the existing guarded delete API:

- provide a visible Delete action only to roles allowed by backend permissions;
- use a clear destructive confirmation dialog;
- collect current password only when the existing backend contract requires it;
- show the consequence;
- show backend validation/error messages;
- refresh/hide the deleted entity after success.

Do not perform client-side pseudo-delete.

Do not expose delete actions to unauthorized roles.

---

# 27 — SEARCH EXPERIENCE

Implement a consistent search visual pattern.

Public service search should support real backend capabilities such as:

- service name
- category
- filters already supported

Do not invent semantic/AI search without backend implementation.

The homepage search should route/query into the service catalog rather than maintain a separate search engine.

---

# 28 — IMAGES / MEDIA

Use existing category/service images from Khalsni.

Requirements:

- consistent aspect ratio
- lazy loading where appropriate
- alt text
- graceful placeholder
- no broken layout
- no random external hotlinked production images
- no customer/private documents used as decorative media

Category cards should support:

```text
image
→ controlled dark/blue overlay
→ readable Arabic/English label
```

If no image:

```text
Khalsni branded surface
+ category icon
+ category color
```

---

# 29 — LOADING / EMPTY / ERROR STATES

Every data-driven redesigned page must have intentional states:

```text
Loading
Empty
Error
Success
Permission denied where appropriate
```

Do not show blank screens.

Use reusable skeletons/placeholders.

Keep error copy understandable and actionable.

---

# 30 — MOTION

Use subtle motion only:

- hover
- focus
- drawer/dialog transition
- small status/accordion transitions

Avoid decorative animation that slows service completion.

Respect reduced-motion preferences.

---

# 31 — TEST BASELINE BEFORE CHANGES

The discovery found the current frontend test suite already has failures/timeouts.

Before editing:

1. run the current safe frontend tests using the project's real scripts;
2. run the current frontend production build;
3. run lint/typecheck scripts if defined;
4. record the exact baseline;
5. do not claim existing failures were caused by this transformation.

Create:

```text
docs/khalsni-ui-transformation/baseline.md
```

Include:

```text
command
pass/fail
known failures
timeouts
build status
environment
```

Do not modify tests merely to create a green baseline.

---

# 32 — IMPLEMENTATION GATES

Execute in order.

Do not jump directly into page-by-page CSS duplication.

## GATE UI-00 — Baseline and Source Verification

- read discovery
- inspect current routes/APIs
- record baseline
- create implementation checklist
- confirm git working tree state
- identify currently failing tests

PASS when current state is documented.

## GATE UI-01 — Khalsni Design System

Implement:

- tokens
- typography
- base surfaces
- buttons
- form controls
- cards
- badges
- alerts
- modal/drawer primitives
- skeletons
- RTL/LTR foundations
- icon rules

No major page redesign yet.

PASS when primitives render correctly and existing pages still build.

## GATE UI-02 — Shared Shells

Implement/modernize:

- public header/footer
- customer shell
- employee shell
- admin shell
- provider shell where practical
- mobile navigation
- language switch

Preserve routes and permissions.

## GATE UI-03 — Public Discovery Experience

Implement:

- homepage
- categories
- service catalog
- category experience
- service detail
- search/filter presentation
- missing/custom service CTA

## GATE UI-04 — Application Wizard

Implement the dynamic service application using existing service configuration, documents, validation, and order API.

No hardcoded service-specific forms.

## GATE UI-05 — Public Tracking

Implement secure tracking with real status data.

No fake progress.

## GATE UI-06 — Customer Portal

Implement:

- dashboard
- My Requests
- request workspace
- missing documents
- profile/help consistency
- notifications/updates where real

## GATE UI-07 — Employee / Provider Operational UX

Apply shared system without altering backend workflow semantics.

## GATE UI-08 — Admin Catalog / Operations UX

Modernize high-priority admin pages and shared admin components.

Preserve all existing functionality.

## GATE UI-09 — Responsive / RTL / Accessibility Pass

Test all redesigned areas at target breakpoints and both languages.

## GATE UI-10 — Regression / Production Build

Run:

- relevant component/page tests
- full frontend tests
- production build
- backend tests if backend files were touched
- mobile typecheck if API contracts were touched

PASS only if there are no newly introduced regressions.

---

# 33 — TEST REQUIREMENTS

For touched critical components/pages, add or update tests for behavior, not implementation detail.

Cover important cases such as:

## Public

- category rendering
- service loading
- search/filter
- service price visibility
- duration rendering
- RTL/LTR

## Application

- dynamic fields
- required validation
- document requirements
- conditional steps
- successful order creation
- backend errors

## Tracking

- valid tracking result
- invalid verification
- status/timeline rendering
- no internal data leakage

## Customer

- customer order list
- request workspace
- status rendering
- missing-document actions
- permission-safe data

## Shared

- language direction
- mobile navigation
- critical dialog behavior

If old tests only assert obsolete labels/markup from the former UI, update them to assert the new approved behavior.

Do NOT weaken security/business assertions.

Do NOT globally increase test timeouts merely to hide slow tests.

---

# 34 — VISUAL VERIFICATION

If browser automation/browser access is available, capture final screenshots at representative sizes:

```text
1440px desktop
1024px laptop/tablet
390px mobile
```

For:

```text
Homepage
Services
Category
Service Detail
Application
Track Request
Customer Dashboard
My Requests
Request Workspace
Employee Orders
Admin Services
```

Also capture at least one English/LTR screen.

Store under:

```text
docs/khalsni-ui-transformation/screenshots/
```

If browser capture is unavailable, explicitly document that instead of fabricating screenshots.

---

# 35 — NO REGRESSION REQUIREMENTS

The transformation must not break:

- login
- registration
- JWT/session behavior
- user roles
- organization scoping
- public services API
- customer order creation
- existing orders
- order numbers
- order status transitions
- documents
- protected document access
- missing-document requests
- payments
- notifications
- soft delete
- guarded admin delete
- audit
- provider assignment
- mobile API contracts
- existing URLs relied upon externally

When introducing a new route, preserve the old route or provide a safe redirect where appropriate.

---

# 36 — PERFORMANCE

Avoid turning the new interface into a heavy SPA.

Requirements:

- reuse API calls
- avoid duplicate page requests
- avoid unnecessary large icon/image bundles
- lazy-load large page sections/routes where appropriate
- optimize category/service images
- avoid render loops
- avoid unnecessary global context updates
- preserve Vite production optimization

Do not prematurely introduce a new state-management framework.

Use existing project patterns unless there is a proven problem.

---

# 37 — CODE QUALITY

Requirements:

- no giant 1,000-line redesign component where decomposition is obvious
- no copy/pasted page CSS
- no inline style explosion
- no hardcoded Arabic/English strings throughout new components
- no duplicated status mappings
- no duplicated pricing formatters
- no duplicated duration formatters
- no duplicated responsive shells
- no dead experimental components left behind
- no console errors/warnings introduced
- no commented-out legacy copies

Use meaningful component names.

Keep feature-specific code close to the relevant feature where consistent with the repository.

---

# 38 — REQUIRED DOCUMENTATION

Create:

```text
docs/khalsni-ui-transformation/
│
├── 00-baseline.md
├── 01-ui-architecture.md
├── 02-design-system.md
├── 03-component-map.md
├── 04-public-site-map.md
├── 05-application-flow.md
├── 06-customer-portal-map.md
├── 07-staff-admin-map.md
├── 08-api-reuse-and-gaps.md
├── 09-accessibility-rtl-responsive.md
├── 10-test-regression-report.md
├── 11-known-limitations.md
├── screenshots/
└── KHALSNI_UI_TRANSFORMATION_REPORT.md
```

Do not produce huge documentation before coding. Keep it factual and update it as implementation proceeds.

---

# 39 — API GAP POLICY

Whenever a desired screen needs data, classify the situation:

```text
A — Existing API already provides it
→ reuse it

B — Existing API provides it but frontend does not use it
→ wire it into the UI

C — Existing API needs a small backward-compatible serializer/read endpoint extension
→ implement narrowly with tests

D — Requires schema/domain migration
→ do not implement in this UI task; document as a blocker/follow-up

E — Functionality does not actually exist
→ do not fake it; implement an honest UI state and document the gap
```

This rule is mandatory.

---

# 40 — SPECIFIC KNOWN ARCHITECTURAL CAUTIONS

Based on discovery, pay particular attention to:

## Dynamic service information

`Service.required_information_schema` exists.

Verify exactly how customer answers are currently submitted/stored.

Do not invent a second form-definition system.

If structured historical answer storage requires schema changes, document that as a later architecture task instead of hiding it inside the UI redesign.

## Workflow

Backend workflow rules in:

```text
backend/workflow/rules.py
```

are authoritative.

Do not create frontend-only workflow semantics.

## Media/document privacy

The repository has both protected document access logic and `/media/` serving behavior.

Do not introduce direct private-document links.

Use existing protected endpoints for customer/staff document access.

## Payments

Payment records exist, but discovery did not confirm live gateway processing.

Do not present fake gateway functionality.

## Messaging

Order notes/notifications exist, but a complete customer-safe chat system was not confirmed.

Do not expose internal notes or fabricate chat.

## Existing test failures

The frontend test suite was already non-green during discovery.

Separate pre-existing failures from new regressions.

---

# 41 — ACCEPTANCE CRITERIA

The task is successful only if all applicable conditions hold.

## Architecture

- [ ] existing backend/domain preserved
- [ ] no duplicate service/request/document systems
- [ ] existing API reused wherever possible
- [ ] no unapproved schema migration
- [ ] existing routes preserved or safely redirected
- [ ] mobile API compatibility preserved

## Design

- [ ] one Khalsni design system
- [ ] Lucide icon consistency
- [ ] light blue/navy visual identity
- [ ] consistent typography
- [ ] consistent spacing/radius/shadows
- [ ] no leftover dark/orange styling in redesigned target pages

## Public

- [ ] modern homepage
- [ ] visual category cards
- [ ] service catalog
- [ ] category-focused experience
- [ ] rich service detail
- [ ] real service search/filter
- [ ] missing/custom service CTA
- [ ] secure public tracking

## Application

- [ ] dynamic service fields
- [ ] required documents
- [ ] review
- [ ] conditional real payment behavior
- [ ] confirmation using real order data
- [ ] no service-specific hardcoded forms

## Customer

- [ ] dashboard
- [ ] My Requests
- [ ] request workspace
- [ ] real status/timeline
- [ ] documents/missing documents
- [ ] customer-safe updates/communication
- [ ] profile/help styling

## Staff/Admin

- [ ] shared visual language
- [ ] workflows remain functional
- [ ] high-value admin catalog screens modernized
- [ ] deletion/permissions preserved

## Quality

- [ ] Arabic RTL works
- [ ] English LTR works
- [ ] responsive mobile/tablet/desktop
- [ ] keyboard navigation
- [ ] accessible form errors
- [ ] intentional loading/empty/error states
- [ ] production build passes
- [ ] no new critical console warnings
- [ ] no newly introduced test regressions

---

# 42 — FINAL VALIDATION

At the end:

1. run the production frontend build;
2. run the frontend test suite;
3. compare against recorded baseline;
4. run backend tests if backend code changed;
5. run mobile typecheck if shared API behavior changed;
6. inspect redesigned routes;
7. check Arabic RTL;
8. check English LTR;
9. check mobile layouts;
10. check permissions with representative roles where the local test environment allows;
11. verify document links do not bypass protected access;
12. verify no fake payment/chat/progress UI remains;
13. inspect browser console where possible.

Do not mark the project PASS while hiding known new failures.

---

# 43 — FINAL REPORT

Create:

```text
docs/khalsni-ui-transformation/KHALSNI_UI_TRANSFORMATION_REPORT.md
```

It must include:

```text
Executive summary
Files/components changed
Routes changed/added
Design-system implementation
Pages migrated
APIs reused
Small API extensions made
Known API/domain gaps
Security-sensitive decisions
Accessibility/RTL work
Responsive verification
Test baseline vs final
Remaining legacy UI
Known limitations
Recommended next gate
```

---

# 44 — FINAL RESPONSE TO ME

When complete, respond with:

```text
KHALSNI UI TRANSFORMATION

Result:
PASS / PARTIAL / FAIL

Frontend architecture:
PRESERVED / CHANGED
<brief detail>

Backend schema migrations:
NONE
(or STOP and report if one became necessary)

Public experience:
<status>

Application wizard:
<status>

Customer portal:
<status>

Employee/provider UI:
<status>

Admin UI:
<status>

Arabic RTL:
PASS / PARTIAL / FAIL

English LTR:
PASS / PARTIAL / FAIL

Responsive:
PASS / PARTIAL / FAIL

Accessibility:
PASS / PARTIAL / FAIL

Production build:
<result>

Frontend tests:
<baseline>
→
<final>

Backend tests if applicable:
<result>

Mobile compatibility:
<result>

New regressions:
<number>

Known blockers:
<number>

Transformation report:
docs/khalsni-ui-transformation/KHALSNI_UI_TRANSFORMATION_REPORT.md
```

If PARTIAL or FAIL, state exactly what remains.

Do not begin unrelated backend refactoring.

STOP.
