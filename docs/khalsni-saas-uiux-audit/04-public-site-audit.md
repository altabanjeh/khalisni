# Public Site Audit

Status: CONFIRMED

The public site uses a public layout shell, localized content helpers, service cards, category cards, and public pages for home, services, service details, tracking, contact, FAQ, privacy, login, register, and password recovery.

Strengths:
- The homepage and service directory present service discovery, categories, tracking, and request actions as first-class tasks.
- Desktop and mobile screenshots show a coherent public shell.
- Public route tests cover services, service detail, category, create order, tracking, login, and registration.

Issues:
- English screenshots show mixed Arabic service data where content is missing.
- Service/category data quality strongly affects perceived trust; generic category/service labels weaken conversion.
- Public/auth screenshot coverage is representative, not exhaustive for every route and breakpoint.

Evidence:
- `frontend/src/layouts/PublicLayout.jsx:32-67`
- `frontend/src/pages/public/HomePage.jsx:45-62`
- `frontend/src/pages/public/ServicesPage.jsx:13-225`
- `frontend/src/pages/public/ServiceDetailsPage.jsx:25-156`
- `docs/khalsni-saas-uiux-audit/screenshots/public-home-ar-1440.png`
- `docs/khalsni-saas-uiux-audit/screenshots/services-ar-1440.png`
- `docs/khalsni-saas-uiux-audit/screenshots/services-en-1024.png`
