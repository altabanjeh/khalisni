# KHALSNI — FULL SAAS UI/UX VALIDATION & ACCEPTANCE PROMPT

## ROLE
Act as an independent senior QA architect, UX reviewer, accessibility tester, SaaS product-quality reviewer, frontend test engineer, and integration validator.

You are validating the enhanced EXISTING Khalsni product.

This is a validation task first. Only make small, clearly safe UI fixes when a defect is fully understood and the fix does not change domain/business behavior. Large changes go into the remediation backlog.

## REQUIRED INPUT
Read:
- docs/khalsni-system-discovery/
- docs/khalsni-saas-uiux-audit/
- docs/khalsni-saas-uiux-enhancement/

Verify against actual code/runtime. Do not trust reports as proof.

## OBJECTIVES
Validate:
all reachable route families
public front page
service discovery
service details
auth
application/order creation
public tracking
customer portal
request workspace
missing documents
employee/staff operations
provider
admin
design consistency
RTL/LTR
responsive
accessibility
feedback states
interaction correctness
route correctness
permission-safe presentation
build/tests
SaaS product coherence

# 1 — ROUTE COVERAGE
Rebuild current route inventory from code.
Compare to:
docs/khalsni-saas-uiux-enhancement/03-route-migration-matrix.md

Detect:
missing routes
undocumented routes
active legacy screens
routes marked migrated but visually old
dead routes
duplicate entry points
wrong navigation

Create final coverage matrix.
PASS requires no silently skipped reachable production routes.

# 2 — REAL BROWSER VALIDATION
Run app where safe.
Validate at:
390
768
1024
1440

Validate Arabic RTL and English LTR.
Capture under:
docs/khalsni-saas-uiux-validation/screenshots/

Do not rely only on source inspection.

# 3 — PUBLIC EXPERIENCE
Validate actual root route:
new homepage active
header
mobile nav
search
real categories
category navigation
real service cards
service detail
apply CTA
tracking
custom/missing-service CTA
FAQ/help
footer
unauthenticated permissions

FAIL public experience if `/` is still legacy/unrelated.

# 4 — AUTH
Validate:
login
registration
reset/recovery if real
validation
incorrect credentials
loading
successful redirect
role destination
logout
language switch
mobile

Use safe dev/test accounts only.

# 5 — CUSTOMER CRITICAL FLOW
Safely test:
login
→ dashboard
→ service discovery
→ application
→ required info
→ documents when applicable
→ review
→ submit
→ confirmation
→ My Requests
→ request workspace

Verify:
no duplicate submit
no lost input
real service data
real price/duration
real required documents
real order number
real status
no internal leakage
Back/Next
understandable errors

# 6 — TRACKING
Validate:
verification
invalid lookup
valid lookup
privacy
status
timeline/history
expected date if real
mobile
RTL/LTR

Do not weaken verification.

# 7 — REQUEST WORKSPACE
Validate:
header
status
timeline
overview
documents
missing documents
updates
payment state
support

Confirm:
internal notes not exposed
private documents protected
allowed customer actions work
forbidden actions absent/blocked
status is backend truth
no fake progress

# 8 — EMPLOYEE / STAFF
Validate:
dashboard/work queue
filters
open order
document verification
allowed status actions
internal notes
customer-visible update separation
feedback after transitions

UI must not offer backend-forbidden actions.

# 9 — PROVIDER
Validate actual provider workflow:
assigned work
open order
actions
status
empty state
responsive
permissions

# 10 — ADMIN
Validate representative areas:
dashboard
services
categories
document definitions
service-document requirements
orders
users/roles
providers
notifications
payments
audit/help/public configuration where present

Check:
list
search/filter
create
edit
validation
success/error
pagination
responsive
permissions
destructive actions
guarded delete password flow when applicable

Do not destructively test production data.

# 11 — DESIGN SYSTEM CONSISTENCY
Check live app for:
one button system
one input system
one select system
one card language
one status language
one dialog language
one table language
one page-header pattern
one spacing rhythm
one icon family
consistent radii/shadows/typography

Identify legacy visual islands.
PASS requires no major portal to feel like a separate product.

# 12 — INTERACTION AUDIT
Systematically test:
links
tabs
filters
search
pagination
dropdowns
modals
drawers
buttons
uploads
submits
cancel/back
confirm dialogs
language switch
logout

Classify:
DEAD
BROKEN
MISROUTED
NO FEEDBACK
DOUBLE SUBMIT
INCONSISTENT

# 13 — LOADING / EMPTY / ERROR / SUCCESS
For every major data-driven screen validate:
loading
empty
error
success
permission denied
not found

Where safe simulate network/API errors.
No blank pages, stack traces, or unexplained failures.

# 14 — RESPONSIVE
At 390/768/1024/1440 check:
overflow
navigation
sidebars
tables
dialogs
forms
touch targets
cards
images
Arabic wrapping
sticky overlap

# 15 — RTL / LTR
Arabic RTL and English LTR:
global dir
shell placement
breadcrumbs
steppers
timelines
arrows
search icons
forms
tables
dialogs
mixed content
untranslated strings

No duplicated language pages.

# 16 — ACCESSIBILITY
Automated + manual where possible:
keyboard
focus
landmarks
headings
labels
errors
required semantics
contrast
accessible names
dialog focus
menu keyboard
touch targets
zoom/reflow
non-color status
reduced motion

Classify:
CRITICAL
MAJOR
MODERATE
MINOR

Do not claim full compliance from automated scan alone.

# 17 — PERFORMANCE / PERCEIVED PERFORMANCE
Where tooling exists inspect:
route loading
duplicate requests
images
layout shift
blank loading
re-render loops
bundle size hotspots
slow search/filter

Record only real measurements.

# 18 — SECURITY-SAFE PRESENTATION
Verify UI does not expose:
other customer data
internal staff notes
deleted records
private document URLs
admin/provider actions to unauthorized roles
hidden fee components
sensitive audit data

Validate permission-denied handling.
Do not attempt destructive exploitation.

# 19 — SAAS QUALITY SCORE
Score 1–5:
Product coherence
Public conversion/discovery
Navigation
Customer task efficiency
Staff efficiency
Provider usability
Admin scalability
Design consistency
Forms
Tables/work queues
Status/feedback
Empty states
Responsive
Arabic RTL
English LTR
Accessibility
Learnability
Perceived performance
Trust/security UX

PASS target:
No blocker critical-flow defects
No critical accessibility defects
No broken critical task flows
No silent route omissions
No major legacy visual islands
Overall average >= 4.0/5
No core area below 3.5/5

If thresholds are not met, cannot PASS.

# 20 — DEFECT FORMAT
Every defect:
ID
Severity
Persona
Route
Viewport
Language
Steps
Expected
Actual
Evidence/screenshot
Likely source
Recommended fix
Regression risk

Severity:
BLOCKER
CRITICAL
MAJOR
MODERATE
MINOR

# 21 — SAFE FIX LOOP
You may fix only if:
clearly UI
root cause understood
localized
no schema migration
no permission/business-rule change
relevant tests can run

After fix:
retest defect
retest affected flow
run relevant tests

Large issues go to remediation backlog.

# 22 — FINAL TESTS
Run real project commands:
frontend production build
frontend tests
lint/typecheck if present
backend tests if backend touched
mobile typecheck if shared API changed

Compare to baseline.
No fake pass.

# 23 — OUTPUT
Create:
docs/khalsni-saas-uiux-validation/
├── 00-executive-result.md
├── 01-route-coverage.md
├── 02-critical-flow-results.md
├── 03-public-auth-validation.md
├── 04-customer-validation.md
├── 05-employee-provider-validation.md
├── 06-admin-validation.md
├── 07-design-system-consistency.md
├── 08-responsive-rtl-ltr.md
├── 09-accessibility.md
├── 10-interaction-defects.md
├── 11-performance-security-ux.md
├── 12-final-scorecard.md
├── 13-remediation-backlog.md
├── screenshots/
└── KHALSNI_SAAS_UIUX_VALIDATION_MASTER.md

# FINAL RESPONSE
KHALSNI SAAS UI/UX VALIDATION

Result: PASS / PARTIAL / FAIL
Reachable routes: <n>
Routes validated: <n>
Critical flows: <passed>/<total>
Blockers: <n>
Critical defects: <n>
Major defects: <n>
Accessibility critical: <n>
Overall SaaS UI/UX score: <x>/5
Lowest-scoring area: <area>
Production build: <result>
Frontend tests: <result>
Backend tests if applicable: <result>
New regressions: <n>
Report: docs/khalsni-saas-uiux-validation/KHALSNI_SAAS_UIUX_VALIDATION_MASTER.md
Remediation backlog: docs/khalsni-saas-uiux-validation/13-remediation-backlog.md

Do not claim PASS unless acceptance thresholds are met.
STOP.
