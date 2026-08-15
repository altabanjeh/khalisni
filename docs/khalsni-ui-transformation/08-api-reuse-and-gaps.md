# API Reuse And Gaps

API reuse classification:

| Need | Classification | Implementation |
|---|---|---|
| Service catalog | A - Existing API already provides it | Reused `api.getServices()`. |
| Public categories | A - Existing API already provides it | Reused `api.getPublicServiceCategories()`. |
| Category page services | B - Existing API existed but frontend lacked a route | Added `/services/category/:slug` over `api.getPublicCategoryServices(slug)`. |
| Service price/duration display | A - Existing API already provides it | Centralized frontend interpretation in `servicePresentation.js`. |
| Dynamic application fields | A/PARTIAL | Existing `required_information_schema` is rendered; answers are still submitted in notes per current backend behavior. |
| Customer chat | E - Functionality not confirmed | No fake chat added. |
| Online payment gateway | E - Functionality not confirmed | No fake payment UI added. |
| Runtime screenshots | Unknown tool availability | Documented as not captured in this pass. |

Backend extensions made:
- None.
