# KHALSNI — FORCED VISUAL UI OVERHAUL PROMPT

## ROLE

Act as a senior product designer and senior React/Tailwind engineer.

You are working inside the EXISTING Khalsni repository.

This task is NOT architecture discovery.
This task is NOT documentation.
This task is NOT a design-system-only refactor.

Your job is to make the running Khalsni UI look **visibly and substantially different** from the current UI, using the approved reference screenshots as the visual target.

The result must be obvious when the application is opened in a browser.

---

# 1 — ABSOLUTE SUCCESS CONDITION

This task FAILS if the UI still looks substantially the same after implementation.

A successful result must visibly change:

- page composition
- spacing
- typography
- colors
- cards
- buttons
- navigation
- section hierarchy
- public homepage
- services experience
- service details
- request/application flow
- customer portal
- request detail workspace

Changing only:

- CSS variables
- Tailwind config
- font
- border radius
- icon library
- component names
- internal architecture
- documentation

is NOT enough.

The task must produce a real visual transformation in the running application.

---

# 2 — VISUAL SOURCE OF TRUTH

Use the supplied UI reference screenshots as the primary visual target.

Expected reference folder:

```text
docs/khalsni-ui-references/
```

If the screenshots are available elsewhere in the session/repository, locate and inspect them.

The references define the target direction:

- bright/light interface
- strong navy + blue identity
- large white space
- large category cards
- service cards with clean icon treatment
- simple professional government/service-platform appearance
- Arabic-first RTL layout
- clean customer portal
- timeline/status presentation
- clear application stepper
- minimal, restrained borders/shadows

Do NOT make a generic admin dashboard.

Do NOT preserve the current page layout merely because it works.

Preserve behavior and data, but REPLACE the presentation.

---

# 3 — EXISTING TECH TO KEEP

Use the existing stack:

- React
- Vite
- React Router
- Tailwind CSS
- Lucide React
- existing Khalsni APIs
- existing auth/permissions
- existing service/category/order/document models

Do not rebuild backend/domain architecture.

Do not create parallel service/request/document systems.

---

# 4 — FIRST ACTION: INSPECT THE CURRENT RENDERED UI

Before editing, run the application locally if possible.

Capture BEFORE screenshots for these pages:

```text
/
/services
/services/:slug
current order/application route
/track-order
/customer
/customer/orders
/customer/orders/:id
```

Store them under:

```text
docs/khalsni-ui-overhaul/before/
```

If a route differs, use the actual current route.

These screenshots establish the baseline.

---

# 5 — REQUIRED VISUAL OVERHAUL

## A. GLOBAL APP LOOK

Replace the current visible styling with a unified Khalsni design language.

Use approximately:

```text
Background:       #F7F9FC
Surface:          #FFFFFF
Primary navy:     #0A2A66
Action blue:      #1261E8
Soft blue:        #EEF4FF
Primary text:     #1B2433
Muted text:       #6D7890
Border:           #E3E8F0
Success:          semantic green
Warning:          semantic amber
Danger:           semantic red
```

Use these as centralized design tokens.

Target:

- soft page background
- white cards
- light borders
- very subtle shadows
- 12–18px radius depending on component
- consistent generous spacing
- strong Arabic typography
- Lucide outline icons
- clear primary blue CTA buttons
- no dark/orange dashboard styling

---

# 6 — PUBLIC HOMEPAGE MUST BE REBUILT VISUALLY

The homepage must no longer look like the current homepage.

Create this composition:

```text
[ Public Header ]

[ HERO ]
Large Arabic headline
Short supporting copy
Large service-search box
Primary CTA

[ SERVICE CATEGORIES ]
Large visual category cards
2–4 cards per row depending on width
Category image where available
Dark/blue overlay
Category icon
Category title
Short description
Service count if available

[ POPULAR / FEATURED SERVICES ]
Clean service-card grid

[ HOW KHALSNI WORKS ]
3–4 visual steps

[ CUSTOM SERVICE / MISSING SERVICE CTA ]

[ HELP / FAQ CTA ]

[ FOOTER ]
```

The categories section is the main visual feature.

Do not render categories as plain text links or generic small cards.

---

# 7 — CATEGORY CARDS

Create a real reusable CategoryCard.

Visual target:

```text
┌───────────────────────────────┐
│                               │
│        category image         │
│                               │
│   [icon]                      │
│   العقارات والأراضي           │
│   وصف قصير                    │
│                               │
└───────────────────────────────┘
```

Requirements:

- large card
- image-backed when available
- controlled overlay for readability
- large Arabic title
- subtle hover lift
- consistent height
- responsive
- no ugly default image stretch
- branded fallback when no image exists

---

# 8 — SERVICES PAGE MUST BE VISIBLY DIFFERENT

Rebuild `/services`.

Structure:

```text
Page header
Search
Category filter chips/cards
Optional filter/sort area
Service grid
Pagination / loading / empty state
```

Do not keep the old service-list layout.

Use a new reusable ServiceCard.

---

# 9 — SERVICE CARD

Visual target:

```text
┌─────────────────────────────┐
│       [service icon]        │
│                             │
│        سند تسجيل            │
│ وصف مختصر للخدمة            │
│                             │
│  3 أيام        من 15 د.أ    │
│                             │
│       [اطلب الخدمة]         │
└─────────────────────────────┘
```

Requirements:

- centered or balanced icon treatment
- clear title
- limited but readable description
- price and duration metadata
- strong CTA
- consistent card proportions
- hover state
- real backend data only

---

# 10 — CATEGORY DETAIL PAGE

Create a visually rich category page.

Structure:

```text
Category hero
Category title
Description
Service count

Popular services

All services grid

Related categories/services

Missing service CTA
```

Use actual category data.

If a category page does not exist, implement one using existing routing/API capabilities without changing the domain model.

---

# 11 — SERVICE DETAIL PAGE MUST BE REBUILT

Create a two-column desktop layout:

```text
MAIN CONTENT                      STICKY SUMMARY
────────────────────              ──────────────
Service title                     Service title
Category                          Duration
Description                       Price
Requirements                      Authority
Required documents                Apply button
Instructions
FAQ/related services
```

Mobile becomes one column.

Do not keep the current service-detail layout if it differs substantially from this.

---

# 12 — APPLICATION EXPERIENCE MUST LOOK LIKE A MODERN WIZARD

Replace the current application presentation with:

```text
Step 1  بيانات الطلب
Step 2  المستندات
Step 3  المراجعة
Step 4  الدفع   (only if real)
Step 5  التأكيد
```

Do not force steps that do not apply.

Desktop layout:

```text
[ stepper across top ]

[ main form area ]     [ sticky service summary ]
```

Required visual behavior:

- large section cards
- clear form grouping
- strong labels
- helpful descriptions
- clean upload zones
- clear Next/Back actions
- visible completion state
- consistent validation styling

Use real dynamic service fields and real document requirements.

---

# 13 — DOCUMENT UPLOAD UI

Replace generic file inputs with a polished upload component.

Each required document should look like:

```text
┌──────────────────────────────────────┐
│ [File icon]  صورة الهوية            │
│ مطلوب                               │
│ PDF/JPG/PNG — max size              │
│                                      │
│ [ رفع الملف ]                        │
└──────────────────────────────────────┘
```

After upload:

```text
filename
status
replace/remove where allowed
```

Do not bypass backend validation.

---

# 14 — PUBLIC TRACKING PAGE MUST BE REDESIGNED

Create:

```text
Tracking lookup card

Order summary

Current status panel

Horizontal/vertical real status timeline

Expected completion

Next required customer action

Support CTA
```

No fake completion percentage.

---

# 15 — CUSTOMER PORTAL MUST BE REBUILT VISUALLY

Desktop shell:

```text
┌─────────────┬──────────────────────────────┐
│ Sidebar     │ Page content                 │
│             │                              │
│ الرئيسية    │                              │
│ طلب جديد    │                              │
│ طلباتي      │                              │
│ الملف       │                              │
│ الدليل      │                              │
│ الإشعارات   │                              │
└─────────────┴──────────────────────────────┘
```

Sidebar:

- clean white/navy design
- selected state
- Lucide icons
- compact but spacious
- responsive drawer on mobile

Do not leave the old portal shell unchanged.

---

# 16 — CUSTOMER DASHBOARD

Create a visually modern dashboard.

Include:

```text
Welcome header

Status summary cards

Quick actions

Recent requests

Important updates / notifications

Help/support card
```

Use real API data.

Do not fill the page with meaningless KPI cards.

---

# 17 — MY REQUESTS

Redesign `/customer/orders`.

Desktop:

- clean table/card hybrid
- order number
- service
- status badge
- date
- expected completion
- action

Mobile:

- stacked request cards

Filters/search if currently supported.

---

# 18 — REQUEST WORKSPACE MUST BE A MAJOR VISUAL CHANGE

This page is critical.

Create:

```text
[ Order header ]
Order number
Service
Status
Expected completion
Primary action

[ Progress / Timeline ]

[ Tabs or sections ]
Overview
Documents
Updates
Payment
```

Overview:

- request information
- submitted values
- summary

Documents:

- uploaded documents
- verification state
- missing documents
- replacement actions

Updates:

- only customer-visible notes/notifications/messages

Payment:

- real payment state/instructions only

This page should resemble a professional case-management workspace.

Do not expose internal staff notes.

---

# 19 — STATUS TIMELINE

Build one reusable timeline component.

Use actual OrderStatusLog/history data.

Visual:

```text
● تم إنشاء الطلب
│
● مراجعة المستندات
│
● تم تعيين مزود الخدمة
│
◉ جاري التنفيذ
│
○ جاهز للاستلام
```

States:

- completed
- current
- future/pending if actual workflow data supports it

If future states are not safely derivable, render only real history + current state.

---

# 20 — STAFF / ADMIN VISUAL UPDATE

Do not spend this task rebuilding every admin page.

But visibly modernize the shared shell and the most important operational pages.

At minimum:

```text
employee order list
employee order detail
admin dashboard
admin services
admin categories
admin document definitions
```

Use:

- consistent headers
- clean filter bars
- modern tables
- cards
- badges
- modal/dialog patterns
- clear action hierarchy

Do not change business logic.

---

# 21 — RTL / LTR

Arabic must render correctly across all redesigned pages.

English must flip layout correctly.

Verify:

- sidebar direction
- icon placement
- breadcrumb direction
- form alignment
- stepper direction
- card metadata
- arrows/chevrons
- search icon position
- dialog buttons

Do not solve RTL by duplicating pages.

---

# 22 — BEFORE/AFTER VISUAL VALIDATION IS MANDATORY

After implementation, capture AFTER screenshots of the same pages and sizes used before.

Store:

```text
docs/khalsni-ui-overhaul/after/
```

Create:

```text
docs/khalsni-ui-overhaul/visual-comparison.md
```

For each page document:

```text
Page
Before screenshot
After screenshot
What visually changed
What functional behavior was preserved
```

This task MUST NOT be marked complete if before/after screenshots show only minor cosmetic changes.

---

# 23 — MINIMUM VISUAL DELTA REQUIREMENT

Each major target page must have at least 3 substantial visual changes from this list:

- layout structure changed
- navigation changed
- card system changed
- information hierarchy changed
- typography scale changed
- spacing system changed
- color system changed
- form structure changed
- responsive behavior changed
- timeline/stepper added
- image/category presentation changed
- CTA hierarchy changed

Simple recoloring is not enough.

---

# 24 — TESTING

Before changes:

- run existing frontend tests
- run production build
- record baseline

After changes:

- run frontend tests
- run production build
- compare with baseline
- run relevant backend tests if backend was touched

Do not hide existing failures.

Do not introduce new failures.

---

# 25 — DO NOT STOP EARLY

Do not stop after:

- adding design tokens
- creating components
- changing header
- updating one page
- writing documentation

Continue until the actual target pages are visibly transformed in the running app.

---

# 26 — COMPLETION GATE

PASS only if all are true:

- [ ] homepage visibly rebuilt
- [ ] services page visibly rebuilt
- [ ] service cards visibly changed
- [ ] category experience visually upgraded
- [ ] service detail visibly rebuilt
- [ ] application visually converted to wizard
- [ ] tracking visually rebuilt
- [ ] customer shell visibly rebuilt
- [ ] dashboard visibly rebuilt
- [ ] My Requests visibly rebuilt
- [ ] request workspace visibly rebuilt
- [ ] real status timeline implemented
- [ ] RTL verified
- [ ] LTR verified
- [ ] mobile verified
- [ ] before screenshots captured
- [ ] after screenshots captured
- [ ] before/after comparison created
- [ ] production build passes
- [ ] no new critical regressions

If any of those are not done, result must be PARTIAL or FAIL.

---

# 27 — FINAL RESPONSE

Respond with:

```text
KHALSNI VISUAL UI OVERHAUL

Result:
PASS / PARTIAL / FAIL

Pages visibly transformed:
<list>

Pages not transformed:
<list>

Before screenshots:
<count>

After screenshots:
<count>

Production build:
<result>

Frontend tests:
<baseline → final>

Backend changed:
YES / NO

Schema migrations:
NONE

New regressions:
<number>

Visual comparison:
docs/khalsni-ui-overhaul/visual-comparison.md

Remaining blockers:
<list>
```

Do not claim PASS if the running UI still looks substantially the same.

STOP.
