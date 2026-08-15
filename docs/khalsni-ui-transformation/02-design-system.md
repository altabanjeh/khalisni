# Design System

Implemented:
- Consolidated semantic Khalsni CSS variables in `frontend/src/index.css`:
  - `--kh-bg`
  - `--kh-surface`
  - `--kh-surface-muted`
  - `--kh-soft-blue`
  - `--kh-primary`
  - `--kh-primary-hover`
  - `--kh-navy`
  - `--kh-text`
  - `--kh-text-muted`
  - `--kh-border`
  - `--kh-success`
  - `--kh-warning`
  - `--kh-danger`
- Mapped Tailwind brand colors to the approved navy/blue family in `frontend/tailwind.config.js`.
- Removed the runtime Google Fonts import from `frontend/src/index.css`.
- Replaced it with an Arabic-first local/system font stack in Tailwind.
- Tightened shared button/input radii and focus rings.

Not completed in this pass:
- Full migration of every legacy page to design primitives.
- Local font asset bundling. The current implementation avoids CDN runtime dependency and uses system/local-family fallbacks.
