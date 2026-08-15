# Responsive RTL/LTR Audit

Status: PARTIALLY CONFIRMED

Confirmed:
- The language context writes `document.documentElement.lang` and `document.documentElement.dir`.
- Arabic maps to RTL; English maps to LTR.
- Public layout receives `dir={direction}`.
- Representative public pages render at 1440, 1024, and 390 widths.

Defects and risks:
- English/LTR screenshots show service/category data falling back to Arabic when English data is missing. This is a content/data readiness problem, not only a component issue.
- Full protected-route LTR screenshots were not captured.
- `DataTable` table headers use `text-right`, which may be correct for Arabic but should be reviewed for English/LTR dense tables.
- Some operational strings remain hardcoded in components, increasing mixed-language risk.

Evidence:
- `frontend/src/context/LanguageContext.jsx:25-45`
- `frontend/src/utils/i18n.js:16-24`
- `frontend/src/layouts/PublicLayout.jsx:67`
- `frontend/src/components/DataTable.jsx:102-104`
- `frontend/src/components/FileUploader.jsx:88-182`
- `docs/khalsni-saas-uiux-audit/screenshots/public-home-ar-1440.png`
- `docs/khalsni-saas-uiux-audit/screenshots/public-home-ar-1024.png`
- `docs/khalsni-saas-uiux-audit/screenshots/public-home-ar-390.png`
- `docs/khalsni-saas-uiux-audit/screenshots/public-home-en-1440.png`
- `docs/khalsni-saas-uiux-audit/screenshots/public-home-en-390.png`
- `docs/khalsni-saas-uiux-audit/screenshots/services-en-1024.png`
