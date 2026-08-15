# Public Site Map

Routes preserved:
- `/`
- `/services`
- `/services/:slug`
- `/create-order`
- `/track-order`
- `/about`
- `/contact`
- `/faq`
- `/privacy`
- `/login`
- `/register`

Route added:
- `/services/category/:slug`

Public API reuse:
- Services catalog: `api.getServices()`
- Public categories: `api.getPublicServiceCategories()`
- Category services: `api.getPublicCategoryServices(slug)`
- Service details: `api.getService(slug)`
- Tracking: `api.trackOrder(payload)`
- Missing service request: `api.createPublicMissingServiceRequest(payload)`

Behavior preserved:
- `/services?category=:slug` still filters the catalog.
- Service detail route remains `/services/:slug`.
- Homepage missing-service assistant continues to use the existing public missing-service request API.
