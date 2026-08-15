# KHALSNI Design System Implementation

Date: 2026-08-15

Scope: system-wide UI foundation phase. This phase centralizes visual tokens and applies them through shared layouts/components that are used by public, customer, employee, admin, and provider routes.

## Design Tokens

Tokens are defined in `frontend/src/index.css` and mirrored in `frontend/tailwind.config.js`.

| Token Area | Values |
| --- | --- |
| Primary | `#1252f7`, hover `#0e47da`, active `#0b3bc0` |
| Soft primary | `#eef4ff`, strong `#e4eeff` |
| Backgrounds | page `#ffffff`, secondary `#f7faff`, surface `#ffffff` |
| Text | heading `#0b1533`, body `#17213a`, secondary `#667085`, muted `#98a2b3` |
| Borders | `#e4eaf2`, strong `#d7e0ec` |
| Feedback | success `#12b76a`, warning `#f79009`, error `#f04438` |
| Radius | sm `8px`, md `12px`, lg `16px`, xl `20px`, 2xl `24px`, pill `999px` |
| Shadows | `shadow-sm`, `shadow-md`, `shadow-lg`, Tailwind `shadow-soft`, `shadow-panel` |

## Typography

The existing Arabic-first font stack is preserved:

- `"Noto Sans Arabic"`
- `"IBM Plex Sans Arabic"`
- `Tahoma`
- `Arial`
- `sans-serif`

Semantic utilities added:

- `.kh-text-display`
- `.kh-text-h1`
- `.kh-text-h2`
- `.kh-text-h3`
- `.kh-text-body-lg`
- `.kh-text-body`
- `.kh-text-label`

## Spacing

The implementation keeps the current Tailwind spacing system and aligns component defaults around the existing 4px/8px scale. Primary shared components use consistent 12px, 16px, 20px, and 24px surface spacing.

## Components Refactored

| Component | Change |
| --- | --- |
| Global CSS component classes | Tokenized `.field`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.glass-panel`, `.panel-muted`, `.table-card`, `.status-pill`, `.skeleton`. |
| `PublicPage` shared wrappers | Converted public shell, hero, panel, card, input, textarea, button, loading, and empty state primitives to light SaaS surfaces. |
| `PublicLayout` | Converted public header, desktop nav, mobile nav, footer, logo fallback, and floating contact action to the light token system. |
| `ServiceCard` | Converted reusable service cards from dark cards to white bordered SaaS cards using existing service presentation helpers. |
| `CategoryCard` | Converted reusable category cards from dark image overlays to light cards with restrained image tinting. |
| `DocumentList` | Converted public document list variant to light cards/buttons. |
| `OrderTimeline` | Converted public timeline variant to light cards and neutral connector styling. |
| `DashboardLayout` | Moved dashboard page background to the shared secondary surface token. |
| `PageHeader` | Moved dashboard/public shared page header radius to the shared radius token. |
| Public theme defaults | Updated fallback public theme and CSS variable bridge to the Khalsni blue/light foundation. |

## Routes Affected

The foundation affects all routed areas through shared tokens and layouts:

- Public routes through `PublicLayout`, `PublicPage`, `ServiceCard`, `CategoryCard`, `DocumentList`, and `OrderTimeline`.
- Customer, employee, admin, and provider routes through `DashboardLayout`, `PageHeader`, global button/form/card classes, and shared table/status/modal/upload components.
- Admin public-site preview/theme routes through the updated public theme variable bridge.

Full route inventory is documented in `docs/ui/KHALSNI-UI-ROUTE-INVENTORY.md`.

## Validation

- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 20 files and 35 tests.

## Business Logic

No backend, API, routing, authentication, authorization, persistence, upload validation, order workflow, service filtering, status transition, or role behavior was intentionally changed.

## Remaining Work

- Several public route files still contain older page-local `text-white/*`, `border-white/*`, and dark panel utilities. The shared foundation now exists, but those page-local sections should be migrated route-by-route.
- `HomePage.jsx` remains a standalone custom homepage implementation with older dark utility classes and hardcoded reference-category fallback content. It should be migrated to the shared public primitives or the existing `PublicHomepageTemplate` in a follow-up pass.
- Tabs, breadcrumbs, search wrappers, checkbox/radio controls, and icon button patterns are still partially page-local and should be extracted only where duplication remains meaningful.
- Visual screenshot verification across 320px, 360px, 390px, 430px, tablet, laptop, desktop, and wide desktop remains recommended once the route-level public cleanup is complete.
