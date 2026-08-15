# Component Map

Shared foundations already present before this pass:
- `DataTable`
- `EmptyState`
- `FileUploader`
- `FormModal`
- `ConfirmModal`
- `AdminSoftDeleteModal`
- `PageHeader`
- `Pagination`
- `StatusBadge`
- `OrderTimeline`
- `Sidebar`
- `Topbar`
- `LanguageSwitcher`

Added in this pass:
- `frontend/src/components/CategoryCard.jsx`: image-backed/branded public category card.
- `frontend/src/components/ServiceDurationDisplay.jsx`: canonical customer-safe service duration display.
- `frontend/src/components/ServicePriceDisplay.jsx`: canonical customer-safe public price display.
- `frontend/src/utils/servicePresentation.js`: localized service/category labels and public price/duration helpers.

Updated:
- `frontend/src/components/ServiceCard.jsx`: now consumes the canonical service presentation helpers and display components.
- `frontend/src/pages/public/ServicesPage.jsx`: now renders visual category cards above existing filter chips.
- `frontend/src/components/publicSite/PublicHomepageTemplate.jsx`: homepage category shortcuts now open category-focused routes.
