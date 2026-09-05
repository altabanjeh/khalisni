# KHALSNI — Accessibility Runtime Audit (Gate 1R)

Baseline: WCAG 2.2 AA. **Automated:** `@axe-core/playwright` (tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`) run against the live app via `frontend/e2e/run-matrix.mjs` + a focused `axe_detail` pass. **Manual:** structural review of the rendered DOM + component source. Runner is committed as `frontend/e2e/a11y.spec.js` (Playwright) and wired to the CI `e2e` job.

## Automated result

| Route | Viewport | Serious/critical violations |
|---|---|---|
| `/` | 1440 & 390 | **1 type** — `color-contrast` (serious) × 10 nodes |
| `/services` | 1440 | **1 type** — `color-contrast` (serious) × 7 nodes |
| `/employee` | 1440 | `color-contrast` (serious) × 1 |
| `/admin` | 1440 | `color-contrast` (serious) × 1 |
| `/track-order`, `/login`, `/register`, `/faq`, `/about`, `/customer` | 1440 | **0** — clean |
| **critical** violations, anywhere | — | **0** |

## Root cause (single, design-system level) — finding **D-A11Y-1** (MEDIUM, P2)

`ServiceCard` (and the reused stat block on the homepage) renders the price/duration mini-labels as:

```
<dl> <div class="bg-[var(--khalsni-public-bg-secondary)] p-3"> <dt>…</dt> … </dl>
```

The `<dt>` text colour resolves to **`#98a2b3`** on background **`#f6f9ff`** → contrast **2.44 : 1** at 12 px bold. WCAG 2.2 AA requires **4.5 : 1** for text this size.

- Affected: every service card on `/` (latest services + services-by-category = 10) and `/services` (7). The `/employee` and `/admin` single nodes are the same muted-label pattern in a different component.
- Fix (Gate 2): darken the secondary label token (e.g. `#667085` gives 4.6:1 on `#f6f9ff`, or `#5b6472`), or increase weight/size — **one token change** propagates everywhere. Do **not** patch per-route.
- No product behaviour is affected; this is purely the label colour.

## Manual / structural checks

| Check | Finding |
|---|---|
| Landmarks / headings | `PublicPageShell`/`PublicHero` produce `<header>`, `<main>`, `<footer>`, `<h1>`/`<h2>` hierarchy; route matrix confirmed non-empty `#root` with headings on every route |
| Semantic controls | links are `<a>`, buttons are `<button>`, inputs have associated labels (login/register/track forms rendered and axe-clean) |
| Keyboard access | not exhaustively driven this gate (no full tab-order walk); axe found no `focusable-content` / `tabindex` violations on the scanned routes. **Gap — a keyboard-flow pass is still owed** (tracked). |
| Focus visibility | `focus-visible` styles present in `index.css` / Tailwind ring utilities; not measured per-control |
| Modal focus trap/restore | `AdminSoftDeleteModal` / `ConfirmModal` / `FormModal` exist; focus-trap behaviour not runtime-verified this gate |
| Error association | login "wrong credentials" and register "duplicate email" show messages (`LoginPage.test`, `RegisterPage.test`); `aria-describedby` wiring not audited per-field |
| Contrast | the `color-contrast` finding above; other text passed axe |
| Text scaling / reflow | responsive matrix: 0 horizontal overflow down to 390px — reflow is sound |
| Target size | dashboard menu + language controls meet min touch size (per prior UI report); public card CTAs are full-width buttons (adequate) |
| Accessible authentication | login is email+password, no CAPTCHA/cognitive-test barrier; `?next=` preserved |
| Screen-reader names for icon controls | `lucide-react` icons used with `aria-hidden` + text labels in the reviewed components; not exhaustively swept |
| No untranslated dev text | English probe: page bodies render in English; the bilingual "خلصني Khalsni" wordmark is intentional brand |

## Verdict

- **Automated axe: FAIL** on serious `color-contrast` (1 root cause, ~19 nodes across 4 routes). 0 critical.
- **No use-blocking accessibility failure** was found (nothing prevents completing a task; contrast is a readability defect, not an operability blocker).
- **Owed for a complete AA sign-off:** the contrast fix (D-A11Y-1), a keyboard-only task walk on the primary journeys, and modal focus-trap verification. The axe harness is now committed so regressions fail CI.
