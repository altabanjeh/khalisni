# KHALSNI — PUBLIC FRONT PAGE FORCED REDESIGN

## ROLE
Act as a senior product designer and senior React/Tailwind engineer working inside the EXISTING Khalsni repository.

The previous overhaul did not visibly change the real public landing page. This task exists specifically to fix that.

Your job is to identify the ACTUAL public homepage rendered to unauthenticated users and rebuild its visible presentation while preserving existing backend behavior, APIs, permissions, and business logic.

---

# NON-NEGOTIABLE SUCCESS CONDITION

This task FAILS if opening the normal Khalsni public URL still shows the old homepage.

A PASS requires a major visible change to the actual front page, including:

- header/navigation
- hero
- service search
- service categories
- service cards
- section hierarchy
- spacing
- typography
- CTA areas
- footer
- responsive mobile layout

Changing only CSS variables, Tailwind config, colors, fonts, shared components, or unused pages is NOT enough.

---

# 1. FIND THE REAL PUBLIC ENTRY PAGE

Do NOT assume the homepage component name or route.

Inspect:

```text
frontend/src/routes/
frontend/src/routes/AppRoutes.*
frontend/src/App.*
frontend/src/main.*
frontend/src/pages/public/
frontend/src/layouts/
frontend/src/components/
```

Search for:

```text
path="/"
index route
Home
HomePage
Landing
LandingPage
PublicHome
PublicLayout
Navigate
redirect
```

Trace the actual render path:

```text
Browser URL
→ route
→ layout
→ page component
→ child components
→ API calls
→ rendered DOM
```

Before editing, record:

```text
Actual public URL:
Actual route definition:
Actual homepage component:
Actual layout component:
Actual APIs used:
Redirects/guards involved:
```

Do not redesign an unused Home component while the real `/` route renders something else.

---

# 2. CAPTURE THE CURRENT FRONT PAGE

Run the application and open the actual public root URL as an unauthenticated user.

Capture BEFORE screenshots at:

```text
1440px desktop
390px mobile
```

Store under:

```text
docs/khalsni-public-homepage/before/
```

These screenshots are mandatory.

---

# 3. USE THE APPROVED UI REFERENCES

Use the supplied Khalsni UI reference screenshots as the visual direction.

Expected folder:

```text
docs/khalsni-ui-references/
```

Target style:

- light professional public-service website
- navy + strong blue identity
- large white space
- large category image cards
- clean Lucide outline icons
- modern service cards
- Arabic-first RTL layout
- restrained borders and shadows
- no dark/orange dashboard appearance

Preserve behavior and data, but replace the presentation.

---

# 4. REBUILD THE ACTUAL HOMEPAGE

The real public homepage should use this structure:

```text
PUBLIC HEADER

HERO
- large Arabic headline
- concise supporting text
- large service search
- primary CTA

SERVICE CATEGORIES
- large image-backed category cards
- category icon
- category title
- concise description
- service count if available

POPULAR / FEATURED / AVAILABLE SERVICES
- redesigned ServiceCard grid

HOW KHALSNI WORKS
- choose service
- submit request/documents
- track request
- complete/receive result

CUSTOM / MISSING SERVICE CTA

HELP / FAQ CTA

PUBLIC FOOTER
```

The page must look like a public service platform, not an admin dashboard.

---

# 5. PUBLIC HEADER

Visibly redesign the public header.

Use only real existing routes/actions:

```text
Khalsni brand/logo
Services
Track Request
Help / FAQ where real
Language switch
Login/Register or Customer Portal depending on auth state
```

Requirements:

- light background
- clean spacing
- navy/blue identity
- clear active/hover states
- mobile drawer/menu
- correct RTL/LTR ordering

Do not keep the old public header styling.

---

# 6. HERO

Create a substantial new hero section.

Requirements:

- large page headline
- short value proposition
- prominent service search
- strong primary CTA
- generous spacing
- light background with restrained blue accents

The search must be real.

Preferred behavior:

```text
query
→ /services?search=<query>
```

or reuse the existing real service-search contract.

Do not build a fake search box.

---

# 7. SERVICE CATEGORIES — MAJOR VISUAL FEATURE

Use actual `ServiceCategory` data.

Each category card should support real available data such as:

```text
image
icon
title
description
service count
link/filter
```

Target:

```text
┌──────────────────────────────────┐
│          CATEGORY IMAGE          │
│                                  │
│    dark/blue readability overlay │
│                                  │
│  [icon]                          │
│  العقارات والأراضي               │
│  وصف مختصر                       │
└──────────────────────────────────┘
```

Requirements:

- large cards
- controlled image crop
- readable overlay
- prominent Arabic title
- consistent aspect ratio
- responsive grid
- hover state
- branded fallback if no image exists

Do not fetch random internet images.

---

# 8. REDESIGN SERVICE CARDS

Create one real reusable public `ServiceCard` and use it on the homepage and services page where appropriate.

Target:

```text
┌────────────────────────────┐
│          [icon]            │
│                            │
│        سند تسجيل           │
│ وصف مختصر للخدمة           │
│                            │
│ 3 أيام      من 15 د.أ      │
│                            │
│      [ اطلب الخدمة ]       │
└────────────────────────────┘
```

Use real backend values for:

- service name
- description
- duration
- public price
- icon/image where available

Do not hardcode business data.

---

# 9. HOW KHALSNI WORKS

Add a clear visual 3–4 step section using Lucide icons and real process language.

Example:

```text
1. اختر الخدمة
2. أرسل الطلب والوثائق
3. تابع حالة الطلب
4. استلم النتيجة
```

Do not describe unsupported process stages.

---

# 10. CUSTOM / MISSING SERVICE CTA

Khalsni already has a missing/custom service capability.

Expose it clearly on the homepage:

```text
لم تجد الخدمة التي تحتاجها؟
أرسل طلب خدمة خاصة
[ اطلب خدمة ]
```

Wire it to the real existing route.

---

# 11. FOOTER

Visibly redesign the public footer.

Use only real links.

Suggested sections:

```text
Khalsni identity
Services
Support
About / policies
Language
Copyright
```

Keep it clean and compact.

---

# 12. VISUAL DESIGN SYSTEM

Use centralized tokens approximately in this family:

```text
Background:   #F7F9FC
Surface:      #FFFFFF
Navy:         #0A2A66
Blue:         #1261E8
Soft Blue:    #EEF4FF
Text:         #1B2433
Muted Text:   #6D7890
Border:       #E3E8F0
```

Use:

- white cards
- subtle borders
- very light shadows
- 12–18px radii
- generous spacing
- strong Arabic typography
- Lucide icons

Do not leave old dark/orange homepage styling in the live public page.

---

# 13. RTL / LTR

Arabic must be RTL and English LTR using the existing language architecture.

Verify:

- navigation order
- hero alignment
- search icon
- cards
- arrows/chevrons
- CTA alignment
- footer
- mobile menu

Do not create separate duplicated homepages by language.

---

# 14. RESPONSIVE

Verify at:

```text
390px
768px
1024px
1440px
```

Requirements:

- no horizontal overflow
- hero works on mobile
- category cards stack/reflow
- service cards reflow
- public navigation becomes usable mobile navigation
- Arabic text does not clip

---

# 15. REAL DATA ONLY

Homepage business data must come from existing Khalsni APIs/models.

Do not hardcode production service names, prices, durations, category counts, or popularity.

Static marketing copy is allowed.

---

# 16. VERIFY PUBLIC ACCESS

The homepage must remain accessible to unauthenticated users according to current public permissions.

Do not accidentally wrap `/` in a customer/staff auth guard.

Verify:

```text
/
services route
service detail route
track-order route
login
register
FAQ/help
missing/custom service route
```

---

# 17. REMOVE THE OLD HOMEPAGE FROM THE LIVE RENDER PATH

When the new homepage is active:

- ensure the live root route uses it
- remove obsolete imports from the active route tree where safe
- do not leave two competing default homepages
- do not delete legacy files still referenced elsewhere

The important point is that the normal public URL must show the new page.

---

# 18. AFTER SCREENSHOTS — MANDATORY

After implementation capture the same public page at:

```text
1440px desktop
390px mobile
```

Store under:

```text
docs/khalsni-public-homepage/after/
```

Create:

```text
docs/khalsni-public-homepage/visual-comparison.md
```

Document:

```text
Actual route changed
Actual component changed
Before screenshot
After screenshot
Major visual differences
APIs/data reused
RTL verification
LTR verification
Responsive verification
```

Do not mark PASS if before/after screenshots show only minor cosmetic differences.

---

# 19. MINIMUM VISUAL DELTA

The live front page must visibly change in ALL of these areas:

- [ ] header/navigation
- [ ] hero
- [ ] search presentation
- [ ] category presentation
- [ ] service-card presentation
- [ ] spacing/section rhythm
- [ ] typography hierarchy
- [ ] CTA treatment
- [ ] footer
- [ ] mobile layout

Simple recoloring is NOT sufficient.

---

# 20. TESTING

Before and after:

- run production frontend build
- run relevant frontend tests
- verify `/` in browser
- verify no critical console errors

Do not introduce backend schema changes.

---

# 21. DO NOT STOP AFTER CREATING COMPONENTS

Creating components such as:

```text
PublicHeader
HomeHero
CategoryCard
ServiceCard
PublicFooter
```

is NOT completion.

You MUST wire them into the ACTUAL component rendered at the public root URL and confirm it in the browser.

---

# 22. COMPLETION GATE

PASS only when:

- [ ] real root route identified
- [ ] real homepage component identified
- [ ] new homepage wired to root route
- [ ] unauthenticated browser sees the new homepage
- [ ] public header visibly redesigned
- [ ] hero visibly redesigned
- [ ] service search works
- [ ] categories visibly redesigned
- [ ] real category data used
- [ ] service cards visibly redesigned
- [ ] real service data used
- [ ] how-it-works section present
- [ ] missing/custom service CTA uses real route
- [ ] footer visibly redesigned
- [ ] desktop before/after screenshots exist
- [ ] mobile before/after screenshots exist
- [ ] Arabic RTL passes
- [ ] English LTR passes
- [ ] production build passes
- [ ] no new critical regression
- [ ] OLD homepage is no longer the default public page

If opening the normal public URL still shows the old design, result = FAIL.

---

# 23. FINAL RESPONSE

Return only:

```text
KHALSNI PUBLIC HOMEPAGE REDESIGN

Result:
PASS / PARTIAL / FAIL

Actual public URL:
<url>

Route definition:
<file>

Homepage component:
<file>

Major sections replaced:
<list>

Real APIs/data sources used:
<list>

Desktop before:
<path>

Desktop after:
<path>

Mobile before:
<path>

Mobile after:
<path>

Arabic RTL:
PASS / FAIL

English LTR:
PASS / FAIL

Production build:
<result>

Frontend tests:
<result>

Backend schema changes:
NONE

Visual comparison:
docs/khalsni-public-homepage/visual-comparison.md

Remaining blockers:
<list>
```

Do not claim PASS unless the normal public Khalsni URL visibly shows the redesigned homepage.

STOP.
