# KHALSNI — FULL SAAS UI/UX AUDIT PROMPT

## ROLE
Act as a senior SaaS product designer, UX architect, frontend architect, accessibility reviewer, design-system reviewer, and QA analyst.

You are working inside the EXISTING Khalsni repository.

This task is AUDIT ONLY. Do not redesign or implement UI changes.

## SOURCE OF TRUTH
Read when present:
- docs/khalsni-system-discovery/
- docs/khalsni-ui-transformation/
- docs/khalsni-ui-overhaul/
- docs/khalsni-public-homepage/

Then inspect actual code and runtime. The running application is the final source of truth for visible behavior.

## ABSOLUTE RULES
Do not change production UI, backend models, migrations, workflows, routing, permissions, dependencies, or frameworks.
Only create audit files under:
docs/khalsni-saas-uiux-audit/
and screenshots under:
docs/khalsni-saas-uiux-audit/screenshots/

## PRIMARY OBJECTIVE
Audit the COMPLETE reachable Khalsni UI and produce an implementation-ready SaaS UI/UX backlog.

The audit must determine:
1. whether the whole product feels coherent;
2. whether the public site is trustworthy and service-oriented;
3. whether customer/staff/provider/admin portals feel like one SaaS product;
4. whether navigation and information architecture are understandable;
5. whether each role can complete critical tasks efficiently;
6. whether forms, tables, filters, dialogs, upload flows, statuses, and actions are consistent;
7. whether Arabic RTL and English LTR are first-class;
8. whether responsive behavior is production quality;
9. whether accessibility is acceptable;
10. whether dead buttons, broken routes, unreachable features, or missing feedback exist;
11. whether loading, empty, error, permission, and success states are designed;
12. what should be standardized, redesigned, simplified, or removed;
13. exact P0/P1/P2/P3 priorities and implementation order.

# 1 — COMPLETE ROUTE / SCREEN INVENTORY
Inspect all reachable routes and group:
PUBLIC
AUTH
CUSTOMER
EMPLOYEE / STAFF
PROVIDER
ADMIN
SYSTEM / HELP

For every screen record:
| Route | Screen | Persona | Layout | Data Source | Reachable? | Working? |

Identify orphan screens, duplicate screens, unused components, routes without navigation, wrong links, dead buttons, and partially working actions.

# 2 — RUNTIME EVIDENCE
Where safe, run the app and capture representative screenshots at:
1440px
1024px
390px

Cover Arabic RTL and English LTR.
Store under docs/khalsni-saas-uiux-audit/screenshots/

For each screenshot record route, role, language, viewport, visible defects, and source component.
Do not fabricate screenshots.

# 3 — SAAS PRODUCT-SHELL AUDIT
Audit public/auth/customer/employee/provider/admin shells:
- navigation
- sidebar/topbar
- breadcrumbs
- account menu
- language switch
- role context
- organization context if actually supported
- notifications
- help
- active state
- page titles
- contextual actions

Identify inconsistent buttons, icons, colors, spacing, headers, status colors, dialog behavior, and duplicate shells.

# 4 — INFORMATION ARCHITECTURE
For each persona map:
Entry → navigation → common task → detail → completion

Audit navigation depth, ambiguous labels, duplicated menu items, buried actions, overloaded screens, missing breadcrumbs, poor back-navigation, inconsistent page names, and broken mental models.
Produce a recommended IA per persona, but do not implement it.

# 5 — CRITICAL TASK FLOWS
Audit at minimum:

PUBLIC:
homepage → find service → search/filter → service detail → understand requirements/price/duration → apply

APPLICATION:
select service → enter required info → upload required documents → review → submit → confirmation/order number

CUSTOMER:
login → dashboard → My Requests → request workspace → understand status → respond to missing document

TRACKING:
track page → verification → understand status

EMPLOYEE:
login → work queue → order → review → verify documents → allowed status transition → update/communication

PROVIDER:
audit actual provider workflow

ADMIN:
login → categories → services → requirements/documents → users/roles → orders

For each flow document steps, confusion, unnecessary clicks, missing feedback, duplicated entry, possible errors, accessibility barriers.

# 6 — PUBLIC SITE / CONVERSION AUDIT
Audit:
homepage value proposition
search prominence
category discoverability
service cards
service detail completeness
price/duration clarity
required documents
trust cues
FAQ/help
tracking CTA
custom/missing-service CTA
login/register
mobile navigation
footer

Classify whether the public site feels like a real service platform or merely a portal/dashboard.

# 7 — VISUAL DESIGN AUDIT
Audit:
color
typography
spacing
container widths
cards
borders
shadows
radii
hierarchy
icons
images
buttons
forms
tables
status badges
progress/timelines
dialogs
dropdowns
tabs
tooltips
empty states

Mark legacy, generic, cramped, noisy, unfinished, prototype-like, inconsistent, or visually off-brand areas.

# 8 — DESIGN SYSTEM AUDIT
Inventory:
Button, IconButton, Input, Select, Textarea, Checkbox, Radio, Switch, Card, Badge, Alert, Dialog, Drawer, Tabs, Table, Pagination, Breadcrumb, PageHeader, EmptyState, Skeleton, Toast, Upload, Stepper, Timeline, StatusBadge, ServiceCard, CategoryCard.

Classify each:
GOOD / NEEDS REFINEMENT / DUPLICATED / INCONSISTENT / MISSING / LEGACY

Identify inline, duplicated, one-off, hardcoded styling.

# 9 — FORM UX AUDIT
Audit labels, required markers, instructions, placeholders, grouping, validation timing, error placement, success confirmation, loading/disabled state, keyboard behavior, mobile usability, autofill, dates, selects, dynamic service fields, uploads, destructive confirmation, delete-password confirmation.

Flag any form where users cannot easily understand:
what is required / why / format / what happened after submit.

# 10 — TABLE / DATA-DENSE UI
For staff/provider/admin audit:
density, columns, horizontal scrolling, sticky headers, search, filters, sort, pagination, status/date filters, row actions, destructive actions, bulk actions if real, mobile fallback, empty/loading states.

Identify when a table should become cards, split view, details drawer, or work queue.

# 11 — FEEDBACK STATES
Audit:
loading / success / warning / error / empty / permission denied / not found / network error / validation error / processing / completed

Verify users know when work is running, succeeds, fails, and how to recover.
No fake percentages.

# 12 — EMPTY STATE / FIRST USE
Audit no-services, no-requests, no-notifications, no-documents, no-provider-assignments, no-reports.

A quality empty state should explain:
what the area is / why empty / next action.

# 13 — ONBOARDING / LEARNABILITY
Evaluate first login, dashboard orientation, role guidance, terminology, help/manual discoverability, contextual guidance, form instructions, admin configuration guidance.
Recommend lightweight improvements only.

# 14 — RTL / LTR
Audit:
direction, navigation order, sidebar, icon direction, chevrons, breadcrumbs, stepper, forms, tables, numeric display, mixed strings, untranslated labels, clipping, hardcoded bilingual logic.

# 15 — ACCESSIBILITY
Audit against WCAG 2.2 AA behavior:
keyboard, focus, headings, landmarks, labels, errors, contrast, target size, dialog focus, menus, icon names, color-only meaning, status announcements, reduced motion, zoom/reflow, alt text.

Use automated tools if safely available, plus manual review.
Do not claim compliance from automation alone.

# 16 — RESPONSIVE
Evaluate 390 / 768 / 1024 / 1440.
Flag overflow, clipping, broken cards, sidebar failures, unusable tables, overlap, oversized modals, side-scroll forms, poor touch targets.

# 17 — PERFORMANCE / PERCEIVED PERFORMANCE
Audit duplicate API calls, heavy images, re-renders, route bundles, lazy loading, blank loading, skeletons, layout shift, slow search/filter, excessive motion.
Record real measurements only.

# 18 — TRUST / SECURITY UX
Audit:
account identity
role clarity
destructive confirmation
secure document behavior
logout
session-expiry handling
permission denied
customer isolation
internal-note exposure
tracking privacy
upload rules before failure

Do not weaken backend security.

# 19 — SAAS READINESS
Evaluate:
coherent shells
reusable design system
role-aware navigation
organization context if supported
account/profile clarity
notification experience
settings patterns
confirmation patterns
predictable navigation
scalable lists/tables
help/onboarding
responsive
accessibility
error recovery
empty states
performance
maintainability

Do NOT invent subscription plans, billing portals, tenant switchers, or analytics unless they actually exist.
Classify such missing product features separately as FUTURE PRODUCT CAPABILITY.

# 20 — ISSUE FORMAT
Every issue:
ID
Area
Route
Persona
Evidence
Problem
User impact
Business impact
Severity
Effort
Recommended solution
Dependencies
Acceptance criteria

Severity:
P0 critical blocker/security/accessibility
P1 major
P2 moderate
P3 polish

Effort:
S / M / L / XL

# 21 — SCORECARD
Rate 1–5 with evidence:
Public experience
Auth
Customer
Employee
Provider
Admin
Information architecture
Navigation
Visual hierarchy
Design consistency
Forms
Tables
Feedback
Empty states
Responsive
Arabic RTL
English LTR
Accessibility
Learnability
Perceived performance
Trust/security UX
SaaS product coherence

# 22 — OUTPUT
Create:
docs/khalsni-saas-uiux-audit/
├── 00-executive-summary.md
├── 01-route-screen-inventory.md
├── 02-persona-information-architecture.md
├── 03-critical-task-flows.md
├── 04-public-site-audit.md
├── 05-customer-portal-audit.md
├── 06-employee-provider-audit.md
├── 07-admin-audit.md
├── 08-design-system-audit.md
├── 09-form-table-interaction-audit.md
├── 10-responsive-rtl-ltr-audit.md
├── 11-accessibility-audit.md
├── 12-performance-feedback-states.md
├── 13-saas-readiness.md
├── 14-prioritized-backlog.md
├── 15-ui-quality-scorecard.md
├── screenshots/
└── KHALSNI_SAAS_UIUX_AUDIT_MASTER.md

Backlog waves:
WAVE 0 broken interactions/routes/safety
WAVE 1 foundations/shells
WAVE 2 public/auth
WAVE 3 customer
WAVE 4 staff/provider
WAVE 5 admin
WAVE 6 responsive/RTL/accessibility
WAVE 7 polish/performance

# FINAL RESPONSE
KHALSNI SAAS UI/UX AUDIT

Result: PASS / PARTIAL / FAIL
Reachable screens audited: <n>
Major flows audited: <n>
P0: <n>
P1: <n>
P2: <n>
P3: <n>
Overall SaaS UI/UX score: <x>/5
Highest-risk area: <area>
Highest-value enhancement: <area>
Master report: docs/khalsni-saas-uiux-audit/KHALSNI_SAAS_UIUX_AUDIT_MASTER.md
Backlog: docs/khalsni-saas-uiux-audit/14-prioritized-backlog.md

Do not implement changes.
STOP.
