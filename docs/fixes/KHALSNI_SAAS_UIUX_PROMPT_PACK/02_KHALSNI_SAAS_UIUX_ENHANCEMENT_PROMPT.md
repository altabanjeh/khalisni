# KHALSNI — FULL SYSTEM SAAS UI/UX ENHANCEMENT PROMPT

## ROLE
Act as a senior SaaS product designer, senior React/Tailwind architect, UX engineer, design-system engineer, accessibility engineer, and integration-focused full-stack engineer.

You are working inside the EXISTING Khalsni repository.

This is the IMPLEMENTATION phase.

The goal is to transform the COMPLETE reachable Khalsni interface into one coherent, modern, professional SaaS-grade service platform while preserving existing domain logic, data, APIs, permissions, workflows, and mobile API contracts.

This is not a prototype, partial theme change, or homepage-only task.

## REQUIRED INPUT
Read:
- docs/khalsni-system-discovery/
- docs/khalsni-saas-uiux-audit/

Also read prior UI reports if present:
- docs/khalsni-ui-transformation/
- docs/khalsni-ui-overhaul/
- docs/khalsni-public-homepage/

The latest audit backlog is the primary defect source. Verify findings against current code/runtime.

## ARCHITECTURE RULE
Preserve existing:
Service
ServiceCategory
document registry
service-document requirements
Order/request domain
status/history
auth
permissions
organization scoping
provider assignment
notifications
payments records
soft delete
guarded delete
APIs
mobile API contracts

Do not create parallel models.
No database/schema migration unless separately approved.
If a UX improvement requires a domain migration, document it as a follow-up blocker.

## ABSOLUTE VISUAL SUCCESS CONDITION
The task FAILS if major parts still look like unrelated legacy products.

PASS requires:
one visual language
coherent public shell
coherent auth shell
coherent customer shell
coherent employee shell
coherent provider shell
coherent admin shell
consistent components
consistent statuses
consistent forms
consistent tables
consistent dialogs
consistent feedback
responsive behavior
correct RTL/LTR

Every reachable production screen must be:
MIGRATED
NO VISUAL CHANGE NEEDED
EXCLUDED WITH REASON
BLOCKED

No silent legacy leftovers.

# 1 — FRONTEND FOUNDATION
Use existing React, Vite, React Router, Tailwind CSS, Lucide React, localization, and API clients.
Do not upgrade major frameworks merely for styling.
Use shadcn/ui only if it integrates cleanly with current Vite/Tailwind without forcing major upgrades; otherwise build equivalent accessible primitives using current stack.

# 2 — DESIGN PRINCIPLES
The product must feel:
clear
trustworthy
calm
fast
predictable
professional
service-oriented
accessible
Arabic-first
responsive

Avoid:
dark/orange drift
giant gradients
glassmorphism
excessive shadows
dense legacy admin styling
inconsistent buttons/icons
one-off forms
arbitrary spacing
fake analytics/progress/payment/chat/SaaS billing

# 3 — DESIGN SYSTEM
Centralize semantic tokens.

Starting visual direction:
Background #F7F9FC
Surface #FFFFFF
Primary Navy #0A2A66
Action Blue #1261E8
Soft Blue #EEF4FF
Primary Text #1B2433
Muted Text #6D7890
Border #E3E8F0
semantic success/warning/danger

Create coherent:
typography scale
spacing scale
container widths
radii
borders
shadows
focus styles
motion rules

Use Lucide consistently.

# 4 — REUSABLE PRIMITIVES
Create/consolidate canonical:
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
SearchInput
DateInput
Card
Badge
Alert
Toast
Dialog
ConfirmDialog
Drawer/Sheet
Dropdown
Tabs
Accordion
Tooltip
Skeleton
EmptyState
ErrorState
Pagination
Breadcrumbs
PageHeader
SectionHeader
Table
DataCardList
FilterBar
StatusBadge
UploadField
Stepper
Timeline

Do not create visually identical copies per portal.

# 5 — DOMAIN COMPONENTS
Create/reuse:
CategoryCard
ServiceCard
ServiceSearch
ServiceFilterBar
ServiceSummaryCard
ServicePriceDisplay
ServiceDurationDisplay
RequiredDocumentCard
ApplicationStepper
ApplicationReviewSummary
OrderStatusBadge
OrderStageStepper
OrderTimeline
OrderSummaryCard
OrderDocumentCard
MissingDocumentCard
PaymentSummary
NotificationItem
DashboardStatCard
QuickActionCard
WorkQueueCard
OrderActionPanel
AdminResourceHeader

Centralize status labels/colors/icons, duration formatting, price formatting, bilingual presentation.

# 6 — GLOBAL LAYOUTS
Modernize:
PublicLayout
AuthLayout
CustomerLayout
EmployeeLayout
ProviderLayout
AdminLayout

All shells must feel like one Khalsni product.

Customer/employee/provider/admin desktop:
sidebar + top utility/page header + content

Mobile:
drawer/compact nav with no horizontal overflow.

# 7 — PUBLIC EXPERIENCE
Enhance every reachable public page:
/
services
category experience
service detail
track order
about
contact
FAQ/help
privacy/policies
missing/custom service flow
auth links

Homepage must visibly include:
hero
service search
visual categories
available/featured services based on real data
how Khalsni works
custom/missing-service CTA
help/FAQ CTA
professional footer

Services:
search
category filters
clean grid
loading/empty/error states

Category:
hero/banner
description
service count if real
services
related data only when real

Service detail:
main content + sticky summary desktop
price
duration
requirements
required documents
authority if real
apply CTA
related services if real

Business data must come from backend.

# 8 — AUTH EXPERIENCE
Enhance login/register/reset/verification where real:
clean auth shell
brand
labels
password visibility
validation
error recovery
loading
language switch
mobile

Do not invent social login.

# 9 — APPLICATION / ORDER CREATION
Turn current request flow into clear steps:
Request Information
Documents
Review
Payment only if real
Confirmation

Use actual dynamic service info and required documents.
Do not hardcode service-specific forms.

Provide:
stepper
grouped sections
sticky summary desktop
Back/Next
validation
upload states
submit loading
real confirmation/order number

No fake gateway.

# 10 — CUSTOMER
Enhance all reachable customer routes.

Dashboard:
active requests
waiting for customer
completed
recent requests
important updates
quick actions
help

My Requests:
search/filter where real
order number
service
status
created date
expected date if real
next action
mobile cards

Request Workspace:
Order Header
Progress / Timeline
Overview
Documents
Updates
Payment
Support

Expose customer-safe data only.
Never expose internal notes.

Missing Documents:
what is missing
why
deadline if real
allowed formats
upload/replace
status

Profile/manual/notifications:
same design system and clear states.

# 11 — EMPLOYEE / STAFF
Enhance every reachable employee screen for operational efficiency:
work queue
filters
priority/status
customer/service identity
document review
allowed workflow actions
internal notes separated from customer-visible updates
clear confirmation
case information
timeline
documents
actions

Backend workflow remains authoritative.

# 12 — PROVIDER
Enhance all reachable provider screens:
navigation
assigned work
status
expected dates if real
order detail
permitted actions
empty states
responsive
permissions

# 13 — ADMIN
Enhance the COMPLETE reachable admin UI, not only dashboard.

Admin shell:
section navigation
page headers
breadcrumbs
action placement
global feedback
responsive sidebar

Resource lists:
title
description
primary CTA
search
filters
table/list
status
pagination
row actions
empty/loading

Resource create/edit:
logical sections
consistent forms
clear save/cancel

Service management group real fields into:
Basic Information
Category & Publication
Pricing
Duration
Required Documents
Application Information
Relations
Provider Assignment
Public Presentation

Do not invent fields or workflow configurators that backend does not support.

Guarded delete:
use existing backend contract
role-appropriate delete action
destructive dialog
password only if required
reason if required
success/error feedback

# 14 — TABLE / WORK-QUEUE STANDARD
Create one consistent pattern for:
search
filters
sort
pagination
status/date filtering
row actions
bulk actions only if backend supports

Mobile:
cards or controlled horizontal scroll based on density.

# 15 — FORM STANDARD
Every migrated form:
explicit labels
required markers
instructions
consistent validation
field errors
submit-level error summary when useful
disabled/loading
success confirmation
accessible error focus
mobile usability

No placeholder-only forms.

# 16 — FEEDBACK SYSTEM
Implement consistent:
loading
skeleton
empty
success
warning
error
permission denied
not found
network error
processing

No blank screens or silent saves.

# 17 — EMPTY / FIRST-USE
Every list/dashboard has:
icon
explanation
next action
real CTA when applicable

# 18 — RTL / LTR
Arabic dir=rtl
English dir=ltr

Verify:
sidebars
nav order
breadcrumbs
chevrons
steppers
timelines
forms
tables
dialogs
mobile menu
mixed content

Do not duplicate pages by language.

# 19 — ACCESSIBILITY
Target WCAG 2.2 AA behavior:
semantic headings/landmarks
labels
keyboard
focus
dialogs
menus
contrast
non-color status cues
icon names
errors
touch targets
reduced motion
responsive reflow

# 20 — RESPONSIVE
Verify:
390
768
1024
1440

No overflow.
Sidebars adapt.
Tables remain usable.
Dialogs/forms fit mobile.

# 21 — PERFORMANCE
Improve where justified:
route lazy loading
image sizing/lazy loading
skeletons
duplicate API calls
re-renders
large bundle hotspots

Do not add new global state framework without a proven need.

# 22 — SECURITY-SAFE UX
Never expose:
internal staff notes
other customers' orders
private media URLs
hidden fee components
admin/provider actions to unauthorized roles
deleted data

Public tracking keeps current verification.
Private documents use protected access.

# 23 — SAAS-GRADE DETAILS
Implement when supported:
consistent account menu
user/role context
organization context if existing
breadcrumbs
notifications surface
contextual help
predictable destructive confirmations
consistent resource list/create/edit patterns
strong loading/empty/error states
scalable data views

Do NOT invent:
subscription plans
billing portal
tenant switcher
usage dashboards

unless already supported.

# 24 — FULL ROUTE MIGRATION MATRIX
Create:
docs/khalsni-saas-uiux-enhancement/03-route-migration-matrix.md

For every reachable route:
| Route | Persona | Before Pattern | New Pattern | Status |

Status:
MIGRATED
NO VISUAL CHANGE NEEDED
EXCLUDED WITH REASON
BLOCKED

Cannot PASS while reachable routes are omitted.

# 25 — EXECUTION WAVES
WAVE 0:
fix dead buttons, wrong routes, broken nav, unreachable actions, obvious console/UI failures.

WAVE 1:
design system, primitives, shells, navigation, typography, status mapping.

WAVE 2:
public + auth.

WAVE 3:
application + customer.

WAVE 4:
employee + provider.

WAVE 5:
all reachable admin.

WAVE 6:
responsive + RTL/LTR + accessibility.

WAVE 7:
performance + polish.

Do not stop after Wave 1.

# 26 — BEFORE / AFTER EVIDENCE
Capture representative BEFORE and AFTER screenshots.

Store:
docs/khalsni-saas-uiux-enhancement/before/
docs/khalsni-saas-uiux-enhancement/after/

Minimum:
homepage
services
service detail
application
tracking
login
customer dashboard
customer requests
request workspace
employee queue
employee order detail
provider work view
admin dashboard
admin services
admin categories
admin document definitions

Use desktop/mobile for critical screens and at least one English/LTR screen per shell.

# 27 — TESTING
Before:
frontend build
frontend tests
lint/typecheck if present
record known failures

After each wave:
relevant tests

Final:
frontend production build
full frontend tests
backend tests if backend files touched
mobile typecheck if shared API contracts changed

Do not hide failures by globally increasing timeouts.
Do not weaken business/security tests.

# 28 — DOCUMENTATION
Create:
docs/khalsni-saas-uiux-enhancement/
├── 00-baseline.md
├── 01-design-system.md
├── 02-component-architecture.md
├── 03-route-migration-matrix.md
├── 04-public-auth.md
├── 05-customer.md
├── 06-employee-provider.md
├── 07-admin.md
├── 08-responsive-rtl-accessibility.md
├── 09-performance.md
├── 10-test-report.md
├── 11-known-limitations.md
├── before/
├── after/
└── KHALSNI_SAAS_UIUX_ENHANCEMENT_REPORT.md

# 29 — COMPLETION GATE
PASS only if:

Global:
[ ] one coherent design system
[ ] shared shells migrated
[ ] consistent navigation/forms/status/dialogs/loading/error/empty states

Public/Auth:
[ ] homepage visibly upgraded
[ ] services/category/service detail upgraded
[ ] tracking upgraded
[ ] auth upgraded

Customer:
[ ] dashboard upgraded
[ ] application upgraded
[ ] requests list upgraded
[ ] request workspace upgraded
[ ] missing documents upgraded
[ ] profile/help/notifications consistent

Employee/Provider:
[ ] work queues upgraded
[ ] order details upgraded
[ ] provider consistent

Admin:
[ ] admin shell upgraded
[ ] every reachable admin route classified
[ ] resource pages SaaS-quality
[ ] guarded delete preserved

Quality:
[ ] Arabic RTL
[ ] English LTR
[ ] mobile
[ ] critical accessibility issues fixed
[ ] production build passes
[ ] no new critical regression
[ ] route matrix complete
[ ] before/after evidence

If major reachable sections remain visually legacy, result is PARTIAL or FAIL.

# FINAL RESPONSE
KHALSNI SAAS UI/UX ENHANCEMENT

Result: PASS / PARTIAL / FAIL
Routes reviewed: <n>
Routes migrated: <n>
Routes excluded: <n>
Blocked: <n>
Public/Auth: <status>
Customer: <status>
Employee: <status>
Provider: <status>
Admin: <status>
Arabic RTL: PASS / PARTIAL / FAIL
English LTR: PASS / PARTIAL / FAIL
Responsive: PASS / PARTIAL / FAIL
Accessibility: PASS / PARTIAL / FAIL
Production build: <result>
Frontend tests: <baseline → final>
New regressions: <n>
Schema migrations: NONE
Report: docs/khalsni-saas-uiux-enhancement/KHALSNI_SAAS_UIUX_ENHANCEMENT_REPORT.md
Route matrix: docs/khalsni-saas-uiux-enhancement/03-route-migration-matrix.md

STOP.
