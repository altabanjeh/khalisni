# UI Architecture

Scope implemented in this pass:
- Frontend-only UI transformation work.
- No backend models, serializers, views, migrations, settings, Docker files, or dependencies changed.
- Existing React/Vite/Tailwind/Lucide stack preserved.
- Existing public, customer, employee, admin, and provider route families preserved.

Implemented architecture changes:
- Added a shared service-presentation helper in `frontend/src/utils/servicePresentation.js`.
- Added reusable service display components:
  - `ServicePriceDisplay`
  - `ServiceDurationDisplay`
  - `CategoryCard`
- Reworked the canonical `ServiceCard` to consume those shared helpers instead of duplicating price/duration logic.
- Added `/services/category/:slug` as a public route using the existing public category-services API.

Backend/API contract:
- PRESERVED. The new category page calls `api.getPublicCategoryServices(slug)`, which already maps to `/public-site/service-categories/:slug/services/`.
