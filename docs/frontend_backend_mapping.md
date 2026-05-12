# Frontend-Backend Mapping

## 1. System integration overview

This repository uses a Django REST backend under `/api` and a React/Vite frontend that consumes those APIs through `frontend/src/api/client.js` and `frontend/src/api/services.js`.

The main integration domains are:

- Authentication and current-user resolution: `accounts`
- Public service catalog and service details: `services`
- Order creation, tracking, workflow, notes, ratings: `orders`
- Document upload, verification, and download: `documents`
- Provider dashboard and assigned-order execution: `providers`
- Notifications: `notifications`
- Reports and audit logs: `reports`, `audit`
- Payments exist in the backend but currently have no frontend screens

The backend is workflow-driven. Frontend actions must follow backend status transitions, backend role permissions, backend-required fields, and backend validation rules. The frontend must not invent status paths, fields, or provider/document rules that are not present in the backend.

## 2. API base URL rules

### Base URL

- Frontend API client base URL is:
  - `import.meta.env.VITE_API_BASE_URL`
  - fallback: `http://localhost:8000/api`
- All frontend API calls in `frontend/src/api/services.js` are written relative to that base.

### URL construction rules

- Use relative API paths such as `/auth/login/`, `/services/`, `/customer/orders/`.
- Keep trailing slashes because Django routes are declared with trailing slashes.
- Public file-download URLs are returned by the backend as absolute API URLs via serializer `download_url`.
- Do not manually build backend URLs outside the API layer except when appending the public `order_number` and `phone` query parameters for final-document guest download.

### Environment rules

- Local default: `http://localhost:8000/api`
- Production/staging must set `VITE_API_BASE_URL` explicitly.
- Frontend must not hardcode a second API host in components.

## 3. Authentication and CSRF/token handling rules

### Current backend auth

- Django REST is configured with:
  - `JWTAuthentication` when SimpleJWT is installed
  - `SessionAuthentication`
- Frontend currently uses JWT bearer tokens stored in `localStorage`.

### Current frontend auth flow

- Login: `POST /auth/login/`
- Logout: `POST /auth/logout/`
- Current user: `GET /auth/me/`
- Access token storage key: `khalisni_access`
- Refresh token storage key: `khalisni_refresh`
- API client attaches:
  - `Authorization: Bearer <access-token>`

### Expiry handling rules

- If a `401` response indicates `token_not_valid`, frontend clears stored tokens and emits `khalisni:auth-expired`.
- Protected routes must redirect unauthenticated users to `/login`.

### CSRF rules

- Current frontend does not use cookie/session auth or CSRF headers.
- This is acceptable only while authenticated API usage remains bearer-token based.
- If the project switches to session/cookie auth for API writes, frontend must add:
  - `withCredentials: true`
  - CSRF cookie retrieval
  - `X-CSRFToken` header on unsafe methods

### Binary/file access rule

- Browser-native `<a>`, `<img>`, `<iframe>` requests do not automatically include bearer tokens.
- Any authenticated document preview or download must use one of:
  - authenticated XHR/fetch/axios request and blob rendering
  - signed URLs
  - cookie/session auth with CSRF-safe setup
- Only public final-document download may use plain URL access, and only with:
  - `order_number`
  - `phone`

## 4. Role-based UI visibility rules

### Backend roles

- `customer`
- `admin`
- `employee`
- `provider`
- `support`

### Frontend route groups currently implemented

- Public
- Customer
- Employee
- Admin
- Provider

### Required visibility rules

- Public users may access:
  - service listing
  - service details
  - public order creation
  - public order tracking
  - static content pages
- Customers may access:
  - their own orders
  - their own profile
  - their own notifications
  - their own rating submission
  - their own document uploads
- Employees and support users may access:
  - review queue
  - reviewable order details
  - staff document verification
  - order notes/request-doc flows permitted by backend permissions
- Providers may access:
  - assigned orders only
  - provider dashboard
  - provider notes/status/final-document actions only for their own orders
- Admins may access:
  - admin dashboard
  - full order list/detail
  - service/category/system settings CRUD
  - provider admin list/CRUD
  - notifications/audit/reports

### Frontend alignment rule

- Frontend must include a supported UI path for `support`, because backend treats `support` as an internal role with employee-style workflow access.
- Frontend must not rely only on route visibility for protection. Backend permissions remain the source of truth.

## 5. Screen-to-backend mapping table

| Screen | Frontend Route | API Endpoint(s) | Backend Model(s) | Serializer(s) | Allowed Roles | Notes |
|---|---|---|---|---|---|---|
| HomePage | `/` | `GET /services/` | `Service` | `ServiceListSerializer` | Public | Featured services are API-backed; marketing content is static |
| ServicesPage | `/services` | `GET /services/`, `GET /services/categories/` | `Service`, `ServiceCategory` | `ServiceListSerializer`, `ServiceCategorySerializer` | Public | Client-side search/filter on fetched data |
| ServiceDetailsPage | `/services/:slug` | `GET /services/{slug}/` | `Service`, `ServiceRequiredDocument` | `ServiceDetailSerializer` | Public | Includes required docs, steps, related services |
| CreateOrderPage | `/create-order` | `POST /orders/` | `Order`, `Document`, `CustomUser` | `PublicOrderCreateSerializer` | Public | Multipart submit |
| TrackOrderPage | `/track-order` | `GET /orders/track/` | `Order` | `TrackOrderSerializer` | Public | Requires `order_number` and `phone` |
| LoginPage | `/login` | `POST /auth/login/`, `GET /auth/me/`, `POST /auth/logout/` | `CustomUser` | `CustomTokenObtainPairSerializer`, `UserSerializer` | Public | Role redirect required after login |
| CustomerDashboardHome | `/customer` | `GET /customer/orders/`, `GET /notifications/` | `Order`, `Notification` | `OrderListSerializer`, `NotificationSerializer` | Customer | Dashboard counts are derived client-side |
| CustomerCreateOrderPage | `/customer/orders/new` | `POST /orders/` | `Order`, `Document`, `CustomUser` | `PublicOrderCreateSerializer` | Customer | Currently uses public endpoint; see integration caveat |
| MyOrdersPage | `/customer/orders` | `GET /customer/orders/` | `Order` | `OrderListSerializer` | Customer | Customer-only order list |
| CustomerOrderDetailsPage | `/customer/orders/:id` | `GET /customer/orders/{id}/`, `POST /customer/orders/{id}/documents/`, `POST /customer/orders/{id}/cancel/`, `POST /customer/orders/{id}/rating/` | `Order`, `Document`, `Rating` | `OrderDetailSerializer`, `DocumentUploadSerializer`, `CancelOrderSerializer`, `RatingCreateSerializer` | Customer | Full customer detail view |
| MissingDocumentsResponsePage | `/customer/orders/:id/missing-docs` | `GET /customer/orders/{id}/`, `POST /customer/orders/{id}/documents/` | `Order`, `Document` | `OrderDetailSerializer`, `DocumentUploadSerializer` | Customer | One upload per missing document type |
| ProfilePage | `/customer/profile` | `PATCH /customer/profile/` | `CustomUser` | `CustomerProfileSerializer` | Customer | Updates current authenticated customer |
| EmployeeDashboardHome | `/employee` | `GET /admin/orders/` | `Order` | `OrderListSerializer` | Employee, Support | Review queue summary |
| EmployeeReviewQueuePage | `/employee/orders` | `GET /admin/orders/` | `Order` | `OrderListSerializer` | Employee, Support | Reviewable orders only |
| EmployeeOrderReviewPage | `/employee/orders/:id` | `GET /admin/orders/{id}/`, `PATCH /admin/orders/{id}/status/`, `PATCH /admin/orders/{id}/assign/`, `POST /admin/orders/{id}/request-documents/`, `POST /admin/orders/{id}/notes/`, `POST /admin/orders/{id}/reject/`, `GET /admin/providers/?order={id}` | `Order`, `ProviderProfile` | `OrderDetailSerializer` and action serializers | Employee, Support | Frontend must respect backend permission limits |
| EmployeeVerifyDocumentsPage | `/employee/documents/verify` | `GET /staff/documents/`, `POST /staff/documents/{id}/verify/`, `GET /documents/{id}/download/` | `Document` | `DocumentSerializer`, `DocumentVerificationSerializer` | Employee, Support | Download/preview must be auth-safe |
| AdminOverviewPage | `/admin` | `GET /admin/dashboard/` | `Order` | dashboard JSON | Admin | KPI dashboard |
| OrdersManagementPage | `/admin/orders` | `GET /admin/orders/` | `Order` | `OrderListSerializer` | Admin | Full admin list |
| AdminOrderDetailsPage | `/admin/orders/:id` | `GET /admin/orders/{id}/`, `PATCH /admin/orders/{id}/status/`, `PATCH /admin/orders/{id}/assign/`, `POST /admin/orders/{id}/notes/`, `POST /admin/orders/{id}/complete/`, `POST /admin/orders/{id}/reject/` | `Order` | `OrderDetailSerializer` and action serializers | Admin | Workflow control view |
| ServicesManagementPage | `/admin/services` | `GET /admin/services/` | `Service` | `ServiceDetailSerializer` | Admin | Read-oriented summary |
| AdminUsersRolesPage | `/admin/users` | `GET /admin/users/` | `CustomUser` | `AdminUserSerializer` | Admin | Current page is view-only |
| ProvidersManagementPage | `/admin/providers` | `GET /admin/providers/` | `ProviderProfile` | `ProviderProfileSerializer` | Admin | Current page is list-only |
| ReportsPage | `/admin/reports` | `GET /admin/reports/daily/`, `GET /admin/reports/weekly/` | `Order` | report JSON | Admin | Reports surface |
| NotificationsPage | `/admin/notifications` | `GET /admin/notifications/` | `Notification` | `NotificationSerializer` | Admin | Delivery log |
| AuditLogPage | `/admin/audit` | `GET /admin/audit-logs/` | `AuditLog` | `AuditLogSerializer` | Admin | Audit stream |
| AdminCmsPage | `/admin/cms` | `GET/POST/PATCH/DELETE /admin/system-settings/`, `/admin/categories/`, `/admin/services/`, `/admin/users/` | `SystemSetting`, `ServiceCategory`, `Service`, `CustomUser` | matching admin serializers | Admin | Central admin CRUD page |
| ProviderDashboardHome | `/provider` | `GET /provider/dashboard/`, `GET /provider/orders/` | `ProviderProfile`, `Order` | dashboard JSON, `OrderListSerializer` | Provider | Provider summary |
| AssignedOrdersPage | `/provider/orders` | `GET /provider/orders/` | `Order` | `OrderListSerializer` | Provider | Assigned orders only |
| ProviderOrderDetailsPage | `/provider/orders/:id` | `GET /provider/orders/{id}/`, `PATCH /provider/orders/{id}/status/`, `POST /provider/orders/{id}/notes/`, `POST /provider/orders/{id}/final-document/` | `Order`, `Document` | `OrderDetailSerializer`, `DocumentUploadSerializer` | Provider | Execution view |

## 6. API contract per screen

### Public service catalog screens

#### `GET /services/`

- Method: `GET`
- Query params supported by backend:
  - `category`
  - `featured`
  - search backend exists, but frontend currently filters client-side
- Response fields used by frontend:
  - `id`
  - `category`
  - `name_ar`
  - `name_en`
  - `slug`
  - `description_ar`
  - `estimated_duration`
  - `base_price`
  - `government_fee`
  - `service_fee`
  - `total_fee`
  - `is_featured`
  - `is_active`

#### `GET /services/categories/`

- Method: `GET`
- Response fields used:
  - `id`
  - `name_ar`
  - `slug`

#### `GET /services/{slug}/`

- Method: `GET`
- Response fields used:
  - all list fields
  - `required_documents`
  - `steps`
  - `related_services`

### Order creation and tracking

#### `POST /orders/`

- Method: `POST`
- Content type: `multipart/form-data`
- Request fields:
  - `service`
  - `full_name`
  - `phone`
  - `national_id`
  - `city`
  - `notes`
  - `consent`
  - repeated `document_types`
  - repeated `documents`
- Response fields:
  - `order_number`
  - `status`
  - `message`

#### `GET /orders/track/`

- Method: `GET`
- Query params:
  - `order_number`
  - `phone`
- Response fields:
  - `id`
  - `order_number`
  - `status`
  - `timeline`
  - `missing_documents`
  - `final_documents`

### Customer screens

#### `GET /customer/orders/`

- Method: `GET`
- Response fields from `OrderListSerializer`:
  - `id`
  - `order_number`
  - `service`
  - `status`
  - `priority`
  - `assigned_employee`
  - `assigned_provider`
  - `expected_delivery_date`
  - `final_price`
  - `created_at`
  - `updated_at`

#### `GET /customer/orders/{id}/`

- Method: `GET`
- Response fields from `OrderDetailSerializer`:
  - all list fields
  - `customer`
  - `city`
  - `customer_notes`
  - `internal_notes`
  - `missing_document_types`
  - `rejection_reason`
  - `is_archived`
  - `completed_at`
  - `documents`
  - `status_logs`
  - `notes`
  - `rating`

#### `POST /customer/orders/{id}/documents/`

- Method: `POST`
- Content type: `multipart/form-data`
- Request fields:
  - `document_type`
  - `file`
- Response fields:
  - `id`

#### `POST /customer/orders/{id}/cancel/`

- Method: `POST`
- Request JSON:
  - `reason`
- Response:
  - `status`
  - `reason`

#### `POST /customer/orders/{id}/rating/`

- Method: `POST`
- Request JSON:
  - `score`
  - `comment`
- Response:
  - `score`
  - `comment`

#### `PATCH /customer/profile/`

- Method: `PATCH`
- Request JSON:
  - `full_name`
  - `phone`
  - `email`
  - `national_id`
- Response:
  - same fields

### Employee/support screens

#### `GET /admin/orders/`

- Method: `GET`
- Query params supported:
  - `search`
  - `status`
  - `priority`
  - `provider`
- Response currently uses `OrderListSerializer`
- Frontend must not assume list responses include:
  - `customer`
  - `documents`
  - `city`

#### `GET /admin/orders/{id}/`

- Method: `GET`
- Response uses `OrderDetailSerializer`

#### `PATCH /admin/orders/{id}/status/`

- Method: `PATCH`
- Request JSON:
  - `status`
  - `note`
- Current backend permission on this endpoint:
  - admin only

#### `PATCH /admin/orders/{id}/assign/`

- Method: `PATCH`
- Request JSON:
  - `provider_id`
  - `note`

#### `POST /admin/orders/{id}/request-documents/`

- Method: `POST`
- Request JSON:
  - `note`
  - `document_types`

#### `POST /admin/orders/{id}/notes/`

- Method: `POST`
- Request JSON:
  - `note`
  - `visibility`

#### `POST /admin/orders/{id}/reject/`

- Method: `POST`
- Request JSON:
  - `reason`

#### `GET /staff/documents/`

- Method: `GET`
- Query params supported:
  - `status`
  - `order`

#### `POST /staff/documents/{id}/verify/`

- Method: `POST`
- Request JSON:
  - `is_verified`
  - `note`

### Admin screens

#### `GET /admin/dashboard/`

- Method: `GET`
- Response:
  - `cards`
  - `orders_by_status`
  - `top_services`
  - `provider_performance`
- Non-admin users with report permission receive reduced data from backend.

#### `POST /admin/orders/{id}/complete/`

- Method: `POST`
- Request JSON:
  - `admin_confirmation`

#### Admin CMS CRUD endpoints

- `/admin/system-settings/`
- `/admin/categories/`
- `/admin/services/`
- `/admin/users/`
- Existing backend endpoints not yet fully integrated in frontend:
  - `/admin/service-documents/`
  - `/admin/service-provider-assignments/`
  - `/admin/addresses/`
  - `/admin/providers/` full admin CRUD flows
  - `/admin/notification-templates/`
  - `/admin/payments/`
  - `/admin/customer-profiles/`
  - `/admin/order-records/`
  - `/admin/order-notes/`
  - `/admin/order-issues/`
  - `/admin/ratings/`

### Provider screens

#### `GET /provider/dashboard/`

- Method: `GET`
- Response:
  - `provider`
  - `assigned_orders`
  - `in_progress`
  - `completed`
  - `delayed`

#### `GET /provider/orders/`

- Method: `GET`
- Response uses `OrderListSerializer`

#### `GET /provider/orders/{id}/`

- Method: `GET`
- Response uses `OrderDetailSerializer`

#### `PATCH /provider/orders/{id}/status/`

- Method: `PATCH`
- Request JSON:
  - `status`
  - `note`
- Allowed provider statuses from backend service:
  - `IN_PROGRESS`
  - `WAITING_GOVERNMENT`

#### `POST /provider/orders/{id}/notes/`

- Method: `POST`
- Request JSON:
  - `note`

#### `POST /provider/orders/{id}/final-document/`

- Method: `POST`
- Content type: `multipart/form-data`
- Request fields:
  - `document_type`
  - `file`
- Backend uploads final document and moves order to `READY_FOR_DELIVERY`

## 7. Form field mapping

### Public and customer order creation

| Frontend Field | Backend Field | Required | Notes |
|---|---|---|---|
| service | service | Yes | Active online service only |
| full_name | full_name | Yes | Public endpoint currently trusts submitted value |
| phone | phone | Yes | Used by guest-customer matching logic |
| national_id | national_id | No | Optional |
| city | city | Yes | Required |
| notes | notes | No | Stored as `customer_notes` |
| consent | consent | Yes | Must be `true` |
| document_<type> | document_types + documents | Conditional | Required if service has required documents |
| documents | documents | Optional | Only valid when service has no structured required documents |

### Customer missing-document upload

| Frontend Field | Backend Field | Required | Notes |
|---|---|---|---|
| document_type | document_type | Yes | Must be one of `missing_document_types` |
| file | file | Yes | Upload reopens review if order is `WAITING_CUSTOMER` |

### Customer profile

| Frontend Field | Backend Field |
|---|---|
| full_name | full_name |
| phone | phone |
| email | email |
| national_id | national_id |

### Customer rating

| Frontend Field | Backend Field | Rules |
|---|---|---|
| score | score | Integer 1 to 5 |
| comment | comment | Optional |

### Employee/admin order actions

| Action | Frontend Field | Backend Field |
|---|---|---|
| status update | status | status |
| status update | note | note |
| assign provider | provider_id | provider_id |
| assign provider | note | note |
| request documents | note | note |
| request documents | document_types | document_types[] |
| add note | note | note |
| add note | visibility | visibility |
| reject | reason | reason |
| complete | admin_confirmation | admin_confirmation |

### Provider actions

| Action | Frontend Field | Backend Field |
|---|---|---|
| provider status | status | status |
| provider status | note | note |
| provider note | note | note |
| final document upload | document_type | document_type |
| final document upload | file | file |

### Admin CMS fields

Current frontend-managed backend fields:

- System setting:
  - `key`
  - `description`
  - `value`
- Category:
  - `name_ar`
  - `name_en`
  - `slug`
  - `description_ar`
  - `description_en`
  - `icon`
  - `display_order`
  - `is_active`
- Service:
  - `category`
  - `name_ar`
  - `name_en`
  - `slug`
  - `short_description_ar`
  - `short_description_en`
  - `description_ar`
  - `description_en`
  - `base_price`
  - `government_fee`
  - `service_fee`
  - `estimated_duration`
  - `estimated_duration_unit`
  - `price_type`
  - `is_online`
  - `provider_required`
  - `requires_manual_review`
  - `requires_appointment`
  - `is_featured`
  - `is_active`
  - `display_order`
- Admin user:
  - `full_name`
  - `email`
  - `phone`
  - `password`
  - `role`
  - `national_id`
  - `is_active`
  - `is_staff`
  - `is_verified`

Backend service/provider fields not currently covered by frontend forms:

- Service:
  - `image`
  - `required_information_schema`
  - `terms_ar`
  - `terms_en`
- Service required documents:
  - full `/admin/service-documents/` contract
- Service-provider assignments:
  - full `/admin/service-provider-assignments/` contract
- Provider profile:
  - approval metadata and more complete admin edit flow

## 8. Order status transition matrix

### Canonical transition graph

| Current Status | Allowed Next Status |
|---|---|
| `NEW` | `UNDER_REVIEW`, `CANCELLED` |
| `UNDER_REVIEW` | `WAITING_CUSTOMER`, `ASSIGNED`, `REJECTED`, `CANCELLED` |
| `WAITING_CUSTOMER` | `UNDER_REVIEW`, `CANCELLED` |
| `ASSIGNED` | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | `WAITING_GOVERNMENT`, `READY_FOR_DELIVERY`, `REJECTED`, `CANCELLED` |
| `WAITING_GOVERNMENT` | `IN_PROGRESS`, `READY_FOR_DELIVERY`, `CANCELLED` |
| `READY_FOR_DELIVERY` | `UNDER_REVIEW`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `COMPLETED` | `ARCHIVED` |
| `REJECTED` | `ARCHIVED` |
| `CANCELLED` | `ARCHIVED` |
| `ARCHIVED` | none |

### Role transition rules

| Transition | Allowed Roles |
|---|---|
| `NEW -> UNDER_REVIEW` | `admin`, `employee`, `support` |
| `NEW -> CANCELLED` | `admin`, `customer` |
| `UNDER_REVIEW -> WAITING_CUSTOMER` | `admin`, `employee`, `support` |
| `UNDER_REVIEW -> ASSIGNED` | `admin`, `employee`, `support` |
| `UNDER_REVIEW -> REJECTED` | `admin`, `employee`, `support` |
| `UNDER_REVIEW -> CANCELLED` | `admin`, `employee`, `support` |
| `WAITING_CUSTOMER -> UNDER_REVIEW` | `admin`, `employee`, `support`, `customer` |
| `WAITING_CUSTOMER -> ASSIGNED` | `admin`, `employee`, `support` |
| `WAITING_CUSTOMER -> CANCELLED` | `admin`, `employee`, `support` |
| `ASSIGNED -> IN_PROGRESS` | `provider` |
| `ASSIGNED -> CANCELLED` | `admin` |
| `IN_PROGRESS -> WAITING_GOVERNMENT` | `provider` |
| `IN_PROGRESS -> READY_FOR_DELIVERY` | `admin`, `employee`, `support`, `provider` |
| `IN_PROGRESS -> REJECTED` | `admin`, `employee`, `support` |
| `IN_PROGRESS -> CANCELLED` | `admin` |
| `WAITING_GOVERNMENT -> IN_PROGRESS` | `provider` |
| `WAITING_GOVERNMENT -> READY_FOR_DELIVERY` | `admin`, `employee`, `support`, `provider` |
| `WAITING_GOVERNMENT -> CANCELLED` | `admin` |
| `READY_FOR_DELIVERY -> UNDER_REVIEW` | `admin`, `employee`, `support` |
| `READY_FOR_DELIVERY -> IN_PROGRESS` | `admin`, `employee`, `support` |
| `READY_FOR_DELIVERY -> COMPLETED` | `admin`, `employee`, `support` |
| `READY_FOR_DELIVERY -> CANCELLED` | `admin` |
| `COMPLETED/REJECTED/CANCELLED -> ARCHIVED` | `admin` |

### Actor ownership rules

- Customer may act only on their own order.
- Provider may act only on their assigned order.
- Employee/support may be restricted to the assigned employee once ownership exists and order is no longer `NEW`.

### UI rule

- Frontend must generate status actions from backend-valid transitions, not from hardcoded global status lists.

## 9. Required document upload rules

### Service-level required documents

- Service required docs are defined in `ServiceRequiredDocument`.
- Each requirement has:
  - `document_type`
  - `name_ar`
  - `name_en`
  - `is_required`
  - `allowed_extensions`
  - `max_file_size`
  - `display_order`
  - `is_active`

### Order-create rules

- If a service has required document requirements:
  - frontend should render one field per required/optional configured document
  - each uploaded file must be paired with a matching `document_type`
- If the service has no configured requirements:
  - generic `documents[]` upload is allowed

### Validation rules

- Required document types must be present once each.
- Duplicate document types are rejected.
- Unknown document types are rejected.
- Per-document extension and max file size must match the service requirement when defined.

### Global backend upload rules

- Allowed extensions:
  - `.pdf`
  - `.jpg`
  - `.jpeg`
  - `.png`
  - `.doc`
  - `.docx`
- Allowed MIME types:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Max upload size:
  - `10 MB`

### Frontend display rule

- File upload hints in the UI must match backend-allowed file types.
- Current frontend helper text that says only `PDF, JPG, JPEG, PNG` is incomplete because backend also allows `DOC` and `DOCX`.

### Verification rules

- Staff verification request:
  - `is_verified: true` approves
  - `is_verified: false` rejects
  - rejection requires `note`
- If a final document is rejected while order is `READY_FOR_DELIVERY`, backend reopens the order:
  - to `IN_PROGRESS` when a provider exists
  - otherwise to `UNDER_REVIEW`

## 10. Provider assignment UI rules

### Backend eligibility rules

A provider may be assigned only when all of the following are true:

- Order is not `NEW`
- Required service documents are approved before assignment
- Provider is available
- Provider is approved
- Service has `provider_required = true`
- Provider is linked to the service directly through `ServiceProviderAssignment` or indirectly through the service category

### Provider lookup rules

- Use `GET /admin/providers/?order={order_id}` for assignment UI.
- Do not use the unfiltered provider list for order assignment.

### UI rules

- Assignment button must be disabled until order state allows assignment.
- UI should explain why no providers are returned:
  - no approved providers
  - no category/service mapping
  - required docs not approved
- Admin and employee assignment screens must not offer providers unrelated to the order service.

## 11. Error handling rules

### General response parsing

Frontend should support DRF error shapes:

- string detail:
  - `{ "detail": "..." }`
- field map:
  - `{ "field_name": ["..."] }`
  - `{ "field_name": "..." }`
- mixed object:
  - `{ "detail": "...", "field": ["..."] }`

### Recommended UI handling

- Field-specific validation errors:
  - show inline near the matching field
- Workflow/permission errors:
  - show as action-level alert/toast/banner
- Auth expiry:
  - clear tokens
  - redirect to login
- File preview/download failures:
  - show explicit message that auth-safe download is required

### Binary/document errors

- `403` on authenticated document URL usually means the request was made without auth headers in a browser-native tag.
- `404` on public final-download URL usually means:
  - wrong `order_number`
  - wrong `phone`
  - document is not final

### Logging rule

- Do not suppress backend validation errors in the API layer.
- Normalize them into a display-friendly shape, but keep backend meaning intact.

## 12. Frontend implementation checklist

### Core routing and auth

- Add explicit frontend route support for `support`
- Keep all protected routes aligned with backend roles
- Keep all authenticated API calls inside the shared API client
- Do not perform protected binary access through plain browser tags

### Screen contract alignment

- Do not render fields on list pages unless the list serializer returns them
- If a screen needs `customer`, `city`, or `documents`, either:
  - extend the backend list serializer
  - or fetch detail payload
  - or remove those UI dependencies
- Use backend-filtered provider lookup for assignment

### Workflow safety

- Build status-action UI from backend-valid transitions
- Do not hardcode impossible statuses for a given order state
- Respect role ownership constraints for customer/provider/employee

### Form correctness

- Keep upload hints synchronized with backend file rules
- Keep required document inputs synchronized with service document requirements
- Keep service/admin forms aligned with actual serializer fields
- Add missing frontend coverage for backend-managed business entities when needed

### Known gaps to resolve before claiming full alignment

- Replace authenticated document anchor/img/iframe access with auth-safe binary handling
- Resolve employee review-start flow versus admin-only status endpoint
- Stop using public guest order-create semantics inside authenticated customer portal
- Add support-role frontend handling
- Add frontend coverage for:
  - payments
  - notification templates
  - service required-document management
  - service-provider assignments
  - provider approval/admin workflow


