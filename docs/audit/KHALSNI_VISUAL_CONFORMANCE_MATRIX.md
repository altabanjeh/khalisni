# KHALSNI — Visual Conformance Matrix (Gate 1R)

**Reference images used (accessible, viewed this gate):**
- `image/3.jpeg` (2026-07-26) — public **track-order** page, **light** theme, white cards, `#F7F9FC` ground, navy hero band, dark footer, stepper + document cards + timeline + side summary + related services + app CTA.
- `image/WhatsApp Image 2026-08-05 at 12.29.32 PM.jpeg` — public **homepage**, **dark navy** premium theme, photographic category banners, horizontal service-shelf per category, app-download + QR, dark footer. **This image contradicts the light direction — see conflict C-VIS1.**
- `image/2.jpeg`, `image/4.jpeg`, `image/WhatsApp Image 2026-07-26 *` — additional 2026-07-26 light-direction references (public pages).
- `docs/fixes/KHALSNI_PUBLIC_HOMEPAGE_FORCED_REDESIGN_PROMPT.md` (2026-07-27) — the written spec: `Background #F7F9FC`, `Navy #0A2A66`, white cards, very light shadows, navy/blue identity, large white space, *"no dark/orange homepage styling"*.

**Live screenshots captured this gate** (`frontend/e2e-results/screenshots/`, deterministic, AR + EN, 1440 + 390): public home/services/service-detail/login/track; admin dashboard/services/orders/users; customer dashboard/orders/new-order.

**Method:** live screenshot ↔ reference image, page-family by page-family. Not scored from source. Design language extracted below.

---

## C-VIS1 — Visual direction conflict (documented, product confirmation recommended — NOT a blocker)

| Evidence | Direction | Date |
|---|---|---|
| `image/2.jpeg`, `3.jpeg`, `4.jpeg`, 4× WhatsApp (2026-07-26) | **LIGHT** (`#F7F9FC`, white cards) | 2026-07-26 |
| `KHALSNI_PUBLIC_HOMEPAGE_FORCED_REDESIGN_PROMPT.md` — explicit written spec | **LIGHT** (`#F7F9FC` / `#0A2A66`, "no dark homepage styling") | 2026-07-27 |
| `docs/khalsni-public-homepage/visual-comparison.md` | **LIGHT** ("hero changed from dark navy … to a light public-service hero") | 2026-07-27 |
| `docs/ui/KHALASNI_VISUAL_IMPLEMENTATION_FINAL_REPORT.md` — "the approved light/premium direction" | **LIGHT** | 2026-09-01 |
| `image/WhatsApp Image 2026-08-05` — one homepage mockup, no accompanying brief | **DARK navy** | 2026-08-05 |

**Assessment:** the LIGHT direction is a consistent, dated, written-and-implemented chain (2026-07-27 → 2026-09-01). The single 2026-08-05 dark JPEG has **no written brief** and contradicts that chain. Per "newest *documented* authority wins," conformance below is scored against **LIGHT**. The 2026-08-05 image is recorded as an unresolved ambiguity — **recommend the product owner confirm light-vs-dark in writing** so the reference set is internally consistent. This does not block Gate 1R.

---

## Extracted design language (LIGHT direction)

| Token | Reference value | Live implementation |
|---|---|---|
| Page background | `#F7F9FC` / very light blue | `--khalsni-public-bg` ≈ `#f6f9ff` — **match** |
| Surface / cards | white, `~16px` radius, very light shadow | white `kh-public-card`, soft radius/shadow — **match** |
| Navy (headings, footer, hero band) | `#0A2A66` | dark navy headings — **match**; footer is **light** in live vs **dark navy** in ref — **deviation** |
| Primary blue (buttons, accents) | strong blue `#1e5eff`-ish | brand blue buttons/pills — **match** |
| Secondary text | grey | `#98a2b3` used for card mini-labels — **too light (contrast 2.44:1)** — see D-A11Y-1 |
| Typography | bold Arabic display headings, regular body | bold navy headings, regular body — **match** |
| Nav | pill nav, brand right (RTL), auth actions opposite | pill nav, "خلصني" logo right, "تسجيل الدخول"/"إنشاء حساب" left — **match** |
| Hero | photographic navy band with page title | plain **white boxed** hero panel — **deviation** (the "box-in-box, less premium" note from 2026-08-30) |
| Category presentation | large image-capable cards / shelves | light cards, icon glyph (seed data has no images), horizontal scroll — **partial match** (image-led when images exist per A6) |
| Footer | dark navy, 4 columns + identity + socials | light, 4 columns + identity — **structure matches, colour deviates** |

---

## Page-family conformance

| Page family | Reference | Live screenshot | Match | Deviations | Severity |
|---|---|---|---|---|---|
| Public homepage | `WhatsApp 2026-08-05` (dark, outlier) + light chain | `public-home-ar-1440.png`, `public-home-en-1440.png`, `-390` | **PARTIAL** | (1) light vs the 2026-08-05 dark mock (C-VIS1); (2) hero is a plain white box vs photographic band; (3) "services by category" section renders cards **left-flush with large empty space** at ≥1024px (grid not filling row) = **D-UX2**; (4) no app-download/QR section present in live | MEDIUM (D-UX2), + C-VIS1 pending |
| Public services list | `image/2.jpeg` / `4.jpeg` (light) | `public-services-ar-1440.png` | **GOOD** | box-in-box counters inside hero (2026-08-30 HIGH, still open); card mini-label contrast (D-A11Y-1) | MEDIUM |
| Public service detail | light chain | `public-service-detail-ar-1440.png` | **GOOD** | price/duration repeated in overview + card + (sticky) summary (2026-08-30 HIGH); "Expected co…" label truncation | LOW–MEDIUM |
| Public track-order | `image/3.jpeg` (light) | `public-track-ar-1440.png` | **GOOD** | footer light vs ref dark navy; hero plain box vs photographic band; empty-state matches | LOW |
| Public auth (login/register) | light chain | `public-login-ar-1440.png`, `public-login-en-1440.png` | **GOOD** | boxed hero panel feels "admin-like" per 2026-08-30 MEDIUM | LOW |
| Customer dashboard | — (screen map only) | `customer-dashboard-ar-1440.png` | **GOOD** | larger radii/shadows than public per 2026-08-30 MEDIUM (design-token unification) | LOW–MEDIUM |
| Customer orders / new order | — | `customer-orders-ar-1440.png`, `customer-new-order-ar-1440.png` | **GOOD** | consistent with dashboard | LOW |
| Admin dashboard | — | `admin-dashboard-ar-1440.png` | **GOOD** | 1 axe contrast node | LOW |
| Admin services (table + form) | — | `admin-services-ar-1440.png` | **GOOD** | operational table + grouped form present (A1 CE8) | LOW |
| Admin orders | — | `admin-orders-ar-1440.png` | **GOOD** | — | — |
| Admin users | — | `admin-users-ar-1440.png` | **GOOD** | — | — |

## Verdict

- **Reference images: accessible and used** (not `BLOCKED_REFERENCE_ASSETS`).
- **Live vs reference (LIGHT direction): substantial conformance** on palette, surfaces, typography, navigation, identity, whitespace, footer structure, empty/loading states.
- **Open visual deviations** (all pre-existing, tracked, none are runtime failures): `D-UX2` left-flush category grid (MEDIUM); footer colour vs dark-navy reference (LOW); plain-box heroes vs photographic bands (LOW–MEDIUM); the 2026-08-30 box-in-box / radius-scale / repeated-info / gray-overuse family (P2); `D-A11Y-1` card-label contrast (MEDIUM).
- **`C-VIS1`**: the 2026-08-05 dark-navy homepage mockup vs the light-direction chain — **recommend written product confirmation**; not a blocker for Gate 1R.
- **Not source-code-inspection**: every row above is backed by a captured live screenshot and (for D-UX2 / D-A11Y-1) an axe/overflow measurement.
