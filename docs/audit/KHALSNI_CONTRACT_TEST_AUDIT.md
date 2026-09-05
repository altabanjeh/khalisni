# KHALSNI — FE/BE Contract Test Audit (Gate 1R)

**Why:** the frontend vitest suite substitutes mock fixtures whenever `import.meta.env.MODE === 'test'` (`src/api/services.js`), so it under-tests the real FE↔BE contract. Gate 1R adds real contract verification.

**How:** `backend/config/tests_contract.py::ContractTests` — **7 tests, all PASS** — hits the real endpoints with the real serializers + a real DB and asserts the exact shapes the React client consumes. Plus the runtime route matrix (`e2e/run-matrix.mjs`) exercised the real API through the built frontend for all 57 routes with **zero failed requests and zero console errors**, and the journey suite drove 20 end-to-end flows through the API.

## Contract assertions verified

| Consumer (frontend) | Endpoint | Contract asserted | Result |
|---|---|---|---|
| `servicesApi.getServices` → `ServiceCard` | `GET /api/services/` | list envelope is bare array **or** `{results:[]}` (client `unwrapList` handles both); each item has `id, slug, name_ar, name_en, pricing{total_price}, delivery_time{label}` | PASS |
| `ServiceDetailsPage`, `servicePresentation.js` | `GET /api/services/{slug}/` | has `required_documents[], pricing, delivery_time, prerequisite_services, recommended_services, related_services, steps`; `required_documents[].{name_ar,is_required}`; **`pricing.government_fee`/`company_fee` null when flags off, `total_price` set**; `related_services[]` carry **no** `service_fee`/`government_fee` keys | PASS (D2 contract) |
| `HomePage`, `ServicesPage` category cards | `GET /api/public-site/service-categories/` | each has `id, slug, name_ar, name_en` | PASS |
| `MyOrdersPage`, `CustomerOrderDetailsPage`, `orders/allowed_actions` UI | `GET /api/customer/orders/{id}/` | has `id, order_number, status, service_name_snapshot, allowed_actions`; `status ∈ core.choices.OrderStatus`; `order_number` starts `KH-`; `allowed_actions` has `can_view, can_cancel, can_upload_customer_document, available_status_transitions` | PASS |
| admin order list, `unwrapList` | `GET /api/admin/orders/` | DRF `PageNumberPagination` envelope (`{results,count,…}`) **or** bare list — client tolerates both | PASS |
| axios interceptor error mapping (`getDisplayError`) | invalid `POST /api/orders/` | body is a dict with `detail` **or** a `{field: [messages]}` map | PASS |
| `AuthContext`, `LoginPage` | `POST /api/auth/login/` | body has `access, refresh, user`; `user.role` present | PASS |

## Contract facts discovered (previously undocumented)

These were learned by building the journey + contract suites against the live API and are recorded so future FE/mobile work matches the backend:

| Operation | Real request contract |
|---|---|
| Assign provider | `PATCH /api/admin/orders/{id}/assign/` body `{"provider_id": <ProviderProfile pk>, "note"?: str}` — **not** `provider` |
| Admin create service | `POST /api/admin/services/` requires `category_id` (PK), plus `name_ar,name_en,slug?,description_ar,description_en,estimated_duration,base_price,…` — **not** `category` |
| Provider final document | `POST /api/provider/orders/{id}/final-document/` requires `document_type` (e.g. `"final_report"`) + `file` — the field is **required** despite a serializer default elsewhere |
| Missing-service request | `POST /api/public-site/missing-service-requests/` body `{service_name, request_message, requester_name, requester_phone|requester_email}` |
| Order creation with required docs | `POST /api/orders/` (multipart) needs `document_types` (repeated) + `documents` (files) **at creation** for any service that has required documents; later docs go to `POST /api/customer/orders/{id}/documents/` (`document_type` + `file`) |
| Rating | `POST /api/customer/orders/{id}/rating/` body `{score, comment}` |
| Request missing documents | `POST /api/admin/orders/{id}/request-documents/` body `{note (required), document_types: []}` |
| Complete order | `POST /api/admin/orders/{id}/complete/` body `{admin_confirmation: bool}` |
| Order create response | `{ "id": <pk>, ... }` (plus `warnings: []` when optional prerequisites are unmet) |

## Assessment

- **No FE/BE contract divergence was found** that breaks a real screen: the route runtime matrix loaded all 57 routes against the live API with zero failed requests, and the journey suite completed 20 flows. The client's `unwrapList`/`withId` helpers absorb list-shape and `id`/`*_id` drift, so pagination-envelope differences are non-breaking.
- The mock seam in `src/api/services.js` is **test-mode only** (`MODE === 'test'`) — it is not fake production behaviour, but it does mean vitest asserts against fixtures. The contract module + route matrix + journey suite are the real-contract backstop and should be kept green in CI (the CI `e2e` job runs the matrix; `python manage.py test` runs the contract + journey + authz modules).
- **Recommendation (Gate 2 / ongoing):** grow `config/tests_contract.py` and `config/tests_authz_matrix.py::CASES` toward full endpoint coverage; consider generating an OpenAPI schema (`drf-spectacular`) and a schema-diff check so contract drift fails CI automatically.
