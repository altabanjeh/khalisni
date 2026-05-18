# Theme Gap Report

## Extracted From Web

- Primary: `#0b67b2`
- Dark text / navy: `#0f3554`
- Secondary accent: `#147fd1`
- Background: `#f4faff`
- Surface: `#ffffff`
- Border: `#d7e7f5`
- Accent surface: `#eaf6ff`
- Success: `#16a34a`
- Warning: `#f59e0b`
- Danger: `#dc2626`

## Mobile Decisions

- The mobile app reuses the same core color tokens in `mobile/src/theme/colors.ts`.
- Card radius, border softness, and button prominence were mapped from the current web UI language.
- Status badges use role-consistent colors derived from the web theme.

## Remaining Gaps

- The web app uses Cairo from Google Fonts. The mobile app currently uses the system font stack for reliability and zero native font setup friction.
- If exact typography parity is required, the next step is to load Cairo with Expo Fonts and apply it through the theme layer.
- The public-site gradients and decorative background effects were simplified for mobile performance and readability.
