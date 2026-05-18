# Mobile App Analysis for Khalsni

## Scope
This document analyzes the existing Khalsni codebase and defines what the mobile application must mirror. The mobile app is an extension of the current system, not a separate product.

Primary implementation sources reviewed:

- `backend/accounts/*`
- `backend/orders/*`
- `backend/workflow/*`
- `backend/documents/*`
- `backend/services/*`
- `backend/providers/*`
- `backend/notifications/*`
- `backend/payment/*`
- `backend/reports/*`
- `backend/public_site/*`
- `backend/audit/*`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/pages/**/*`
- `frontend/src/api/**/*`
- `frontend/src/index.css`

## 1. Existing Business Modules

| Module | Current implementation | Notes for mobile |
| --- | --- | --- |
| Authentication and identity | JWT login, refresh, logout, `/auth/me/`, customer profile update | Mobile should reuse JWT flow with secure storage instead of web `sessionStorage`. |
| User and role management | Admin user CRUD, direct permission assignment, customer profiles, system settings | Admin role management is implemented through users + direct Django permissions, not a separate RBAC product UI. |
| Service catalog | Public service list, categories, service details, dynamic required-information schema, service pricing, service required documents | Mobile client flow should reuse service metadata and dynamic form behavior. |
| Order intake | Public order creation, customer order list/detail, track order | Public unauthenticated order creation already exists and creates/reuses guest customer accounts. |
| Internal order workflow | Employee/admin review, request missing documents, assign provider, update status, reject, cancel, complete, archive/reopen | Workflow is backend-driven and enforced through transition rules. |
| Provider operations | Provider dashboard, assigned orders, provider notes, provider status updates, final document upload | Provider cannot invent statuses; only backend-approved transitions are allowed. |
| Document management | Upload, verify, reject, final document upload, secure download token, public final-document download fallback | File rules are backend-enforced; mobile must validate before upload for UX only. |
| Notifications | Notification center, notification templates, manual employee notification sending | In-app list exists, but read-state mutation endpoints are missing. |
| Payments | Customer payment records, admin payment management, status changes/refund-related updates | Payment flows are record-based; there is no fully integrated mobile gateway flow yet. |
| Reports and dashboards | Admin dashboard, daily/weekly reports, employee dashboard, scoped operational summary | Customer dashboard currently derives from orders + notifications on the frontend rather than a dedicated backend endpoint. |
| Public-site content | Public homepage payload, theme, advertisements, admin public content/theme/ads management | Admin mobile can reuse these endpoints for content operations. |
| Audit and compliance | Audit log list, order timeline, workflow logs, assignment history | Important for admin-only mobile visibility. |

## 2. Existing User Roles

### Primary product roles
- `customer`
- `employee`
- `provider`
- `admin`

### Additional role present in backend
- `support`

`support` currently shares the employee experience and permissions in most workflow and routing logic. The mobile app requested by product should expose four role experiences, but implementation should treat `support` as the employee app shell unless product decides to separate it later.

## 3. Existing Permissions by Role

### Role groups from `backend/accounts/role_groups.py`

#### Customer
- `orders.add_order`
- `orders.submit_order`
- `orders.cancel_order`
- `orders.view_order`
- `documents.add_document`
- `documents.view_document`
- `notifications.view_notification`
- `payment.add_payment`
- `payment.view_payment`
- `payment.create_payment_record`
- `payment.view_payment_status`

#### Employee and Support
- `orders.view_order`
- `orders.review_order`
- `orders.request_missing_documents`
- `orders.cancel_order`
- `orders.reject_order`
- `orders.assign_order`
- `orders.manage_order_workflow`
- `orders.view_reports_dashboard`
- `documents.view_document`
- `documents.verify_document`
- `notifications.view_notification`
- `notifications.send_manual_notification`

#### Provider
- `orders.view_order`
- `orders.process_order`
- `documents.view_document`
- `documents.add_document`
- `documents.upload_final_document`
- `notifications.view_notification`

#### Admin
- Admin group is granted nearly all app permissions except excluded Django internals.
- Important nuance: some high-risk admin-user changes still require `is_superuser` in `accounts.serializers.AdminUserSerializer`.

### Mobile implication
- Backend permission checks are already real security.
- Mobile must also hide unauthorized screens and buttons using `role` plus `permissions` returned from `/auth/login/` and `/auth/me/`.

## 4. Existing Order Status Lifecycle

### Status values from `backend/core/choices.py`
- `NEW`
- `UNDER_REVIEW`
- `WAITING_CUSTOMER`
- `ASSIGNED`
- `IN_PROGRESS`
- `WAITING_GOVERNMENT`
- `READY_FOR_DELIVERY`
- `COMPLETED`
- `REJECTED`
- `CANCELLED`
- `ARCHIVED`

### Workflow transitions from `backend/workflow/rules.py`

| From | To | Primary actor(s) | Meaning |
| --- | --- | --- | --- |
| `NEW` | `UNDER_REVIEW` | admin, employee, support | Start internal review |
| `NEW` | `CANCELLED` | admin, customer | Customer/admin cancellation |
| `UNDER_REVIEW` | `WAITING_CUSTOMER` | admin, employee, support | Missing documents requested |
| `UNDER_REVIEW` | `ASSIGNED` | admin, employee, support | Provider assigned after document approval |
| `UNDER_REVIEW` | `REJECTED` | admin, employee, support | Reject order |
| `UNDER_REVIEW` | `CANCELLED` | admin, employee, support | Internal cancellation |
| `WAITING_CUSTOMER` | `UNDER_REVIEW` | customer or internal staff | Resume review after all missing docs uploaded |
| `WAITING_CUSTOMER` | `CANCELLED` | admin, employee, support | Cancel while waiting on customer |
| `ASSIGNED` | `IN_PROGRESS` | provider | Provider starts work |
| `ASSIGNED` | `CANCELLED` | admin | Admin cancellation |
| `IN_PROGRESS` | `WAITING_GOVERNMENT` | provider | External/government dependency pause |
| `IN_PROGRESS` | `READY_FOR_DELIVERY` | provider or internal staff | Final document uploaded and workflow ready |
| `IN_PROGRESS` | `REJECTED` | internal staff | Reject during execution |
| `IN_PROGRESS` | `CANCELLED` | admin | Admin cancellation |
| `WAITING_GOVERNMENT` | `IN_PROGRESS` | provider | Resume provider work |
| `WAITING_GOVERNMENT` | `READY_FOR_DELIVERY` | provider or internal staff | Final result ready |
| `WAITING_GOVERNMENT` | `CANCELLED` | admin | Admin cancellation |
| `READY_FOR_DELIVERY` | `UNDER_REVIEW` | internal staff | Return result to internal review |
| `READY_FOR_DELIVERY` | `IN_PROGRESS` | internal staff | Return result to provider |
| `READY_FOR_DELIVERY` | `COMPLETED` | internal staff | Complete after final verification/admin override |
| `READY_FOR_DELIVERY` | `CANCELLED` | admin | Admin cancellation |
| `COMPLETED` | `UNDER_REVIEW` | admin | Reopen completed order |
| `COMPLETED` | `ARCHIVED` | admin | Archive completed order |
| `REJECTED` | `ARCHIVED` | admin | Archive rejected order |
| `CANCELLED` | `ARCHIVED` | admin | Archive cancelled order |

### Important workflow validations already enforced in backend
- Required service documents must be approved before provider assignment.
- Missing-document cycles are tracked in `MissingDocumentRequest`.
- Provider must be approved, available, and linked to service/category before assignment.
- Final document is required before `READY_FOR_DELIVERY` and effectively before completion.
- Final document must be verified before completion unless admin confirmation override is used.
- Assigned employee restrictions apply for employee/support users.
- Assigned provider restrictions apply for provider actions.

## 5. Existing Mobile Screens Required

This is the minimum mobile set needed to preserve current behavior:

### Shared
- Splash
- Role redirect
- Login
- Notifications center
- Profile
- Error and unauthorized screens

### Customer
- Dashboard
- Service list
- Service detail
- Create order
- My orders
- Order detail
- Missing document response
- Final document access

### Employee
- Dashboard
- Review queue
- Order review detail
- Document verification queue
- Missing-document request action
- Provider assignment action
- Employee report summary

### Provider
- Dashboard
- Assigned orders
- Provider order detail
- Final document upload
- Provider work note/status actions

### Admin
- Overview dashboard
- Orders list/detail
- Rule/workflow management
- CMS/content management
- Services/categories/doc rules/provider assignments
- Providers management
- Users and direct permissions
- Payments
- Notifications/templates
- Reports
- Audit logs
- Public-site content, theme, advertisements, preview metadata

## 6. Existing Web Screens That Need Mobile Equivalents

### Public
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

### Customer
- `/customer`
- `/customer/orders/new`
- `/customer/orders`
- `/customer/orders/:id`
- `/customer/orders/:id/missing-docs`
- `/customer/profile`

### Employee and Support
- `/employee`
- `/employee/orders`
- `/employee/orders/:id`
- `/employee/documents/verify`
- `/employee/reports`

### Admin
- `/admin`
- `/admin/orders`
- `/admin/orders/:id`
- `/admin/rules`
- `/admin/cms`
- `/admin/services`
- `/admin/public-site`
- `/admin/public-site/content`
- `/admin/public-site/advertisements`
- `/admin/public-site/theme`
- `/admin/public-site/preview`
- `/admin/users`
- `/admin/providers`
- `/admin/provider-services`
- `/admin/payments`
- `/admin/reports`
- `/admin/notifications`
- `/admin/audit`

### Provider
- `/provider`
- `/provider/orders`
- `/provider/orders/:id`

## 7. Missing APIs

High-priority gaps for a production mobile app:

1. Forgot-password and reset-password endpoints are not present.
2. Notification read-state mutation is not present.
3. Notification unread-count endpoint is not present.
4. Push notification device registration/send pipeline is not present.
5. No self-service profile endpoints for employee/provider/admin beyond `auth/me`; only customer profile update exists.
6. No explicit customer dashboard summary endpoint; current web dashboard composes from orders + notifications.
7. No dedicated mark-all-notifications-read endpoint.

Detailed breakdown is in `docs/mobile/api_gap_report.md`.

## 8. Backend Changes Required for Mobile Support

### Required before full production parity
- Add forgot/reset password flow.
- Add notification read endpoints.
- Add unread count endpoint.
- Add device token registration and push dispatch support.
- Add role-appropriate self-profile update endpoints, or formally scope mobile profile editing to customer only.

### Recommended but not absolute blockers
- Add customer dashboard summary endpoint.
- Add provider/customer list filtering and pagination consistency where mobile needs larger datasets.
- Add notification deep-link metadata normalization if mobile needs stronger navigation contracts.

## 9. Risks and Technical Gaps

### Product and workflow risks
- The workflow is strict. Mobile must not bypass backend transition rules or fake status jumps.
- `support` exists in backend but product requirement lists only four roles. This must be intentionally mapped.
- Some admin operations are broad on web; mobile should likely expose only safe subsets for smaller screens.

### Technical risks
- Web frontend currently handles token storage with `sessionStorage`; mobile must replace this with secure storage.
- API responses may be paginated or unpaginated; the mobile API layer must handle both, similar to current `unwrapList`.
- Existing frontend still contains role-specific composition logic rather than dedicated API for every dashboard.
- Notification system exists for in-app records, but push infrastructure does not.
- Direct permission editing exists, but there is no higher-level “role editor” abstraction in backend.

### UX and localization risks
- Backend supports Arabic and English fields in several modules, but some operational labels are enum-based and must be localized in the mobile app.
- Admin screens are dense on web; mobile needs task-focused forms and list/detail flows, not 1:1 desktop cloning.

## 10. Recommended Mobile Technology Stack

### Recommended choice
React Native with Expo and TypeScript.

### Why this is the best fit
- Existing frontend is React-based.
- Existing API patterns can be mirrored directly.
- Existing business terminology and component conventions can be reused.
- Existing theme tokens from `frontend/src/index.css` can be ported into a mobile theme system.

### Recommended stack details
- Expo + React Native + TypeScript
- React Navigation for role-based stacks/tabs
- TanStack Query for server state
- Zustand for auth/session and lightweight UI state
- Expo SecureStore for tokens
- Expo DocumentPicker and ImagePicker for file capture
- Axios-based API client matching current web normalization strategy
- React Hook Form + Zod for forms and validation

### Theme tokens to extract first
- Brand primary: `#0b67b2`
- Brand navy: `#0f3554`
- Background: `#f4faff`
- Border: `#d7e7f5`
- Accent: `#eaf6ff`
- Success: `#16a34a`
- Warning: `#f59e0b`
- Danger: `#dc2626`
- Font family direction: Cairo / Arabic-first
- Shape language: large rounded cards and buttons

## Mobile Build Direction

Recommended implementation order after this analysis:

1. Create `/mobile` Expo TypeScript workspace.
2. Port auth/session layer with secure token storage.
3. Build typed API client from existing endpoint map.
4. Implement role-based navigation shell.
5. Build customer flow first, then employee, provider, admin.
6. Add notification read/push support only after backend gaps are addressed or clearly feature-flagged.
