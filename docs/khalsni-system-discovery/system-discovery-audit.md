# Khalsni Current-System Discovery Audit

Discovery date: 2026-07-26

Scope: existing repository at `D:\ghassan`. This is a discovery-only document. No application behavior was changed.

## Executive Summary

CONFIRMED: Khalsni is currently a Django REST API with a React/Vite web client and a React Native/Expo mobile client. The backend exposes only API routes plus Django admin and media serving; the user-facing web UI is React Router, not Django templates. Evidence: `backend/config/urls.py:13-29`, `backend/config/settings.py:87-119`, `frontend/src/routes/AppRoutes.jsx:156-240`, `mobile/src/navigation/RootNavigator.tsx`.

CONFIRMED: The main domain is a service-order workflow. Customers register/login, browse public services, create orders with required documents, track orders, upload missing documents, and rate completed orders. Staff/admin users review, request documents, assign providers, verify documents, upload or validate final documents, complete/reject/cancel/archive orders, manage catalog data, public-site content, users, providers, payments, notifications, reports, audit logs, and help guides. Evidence: `backend/orders/urls.py:37-54`, `backend/services/urls.py:19-33`, `backend/documents/urls.py:17-20`, `backend/public_site/urls.py:20-26`, `frontend/src/routes/AppRoutes.jsx:157-236`.

CONFIRMED: Workflow transitions are code-defined in `workflow.rules`, not stored as database rows. Service definitions, pricing, duration, required documents, relations, provider assignments, public content, notifications, payments, and help guides are database-backed. Evidence: `backend/workflow/rules.py`, `backend/services/models.py:151-856`, `backend/orders/models.py:15-911`.

PARTIALLY CONFIRMED: The repository contains current mobile code, but CI only covers backend and frontend. Mobile typecheck passes locally. Evidence: `mobile/package.json:5-9`, `.github/workflows/ci.yml:9-72`, `runtime-verification.md`.

## Repository Inventory

CONFIRMED architectural tree:

```text
backend/
  config/          Django settings, URL root, WSGI/ASGI, DRF permissions
  core/            shared choices, soft delete model, delete guard
  accounts/        custom user, profiles, auth, role groups, settings, password reset
  organizations/   tenants/branches/memberships/branding/partner catalog config
  services/        service catalog, categories, document definitions, service rules
  orders/          order workflow, status logs, notes, assignments, ratings, issues
  documents/       document upload, verification, download-token/download access
  workflow/        canonical order status transition rules
  providers/       provider profiles and provider-facing order processing
  payment/         payments, invoices, commissions, payouts
  notifications/   system notifications, templates, event map, manual sends
  reports/         dashboards and operational reports
  audit/           audit log model/API/timeline
  public_site/     homepage/theme/advertisements/missing-service requests
  help_guides/     contextual help and manual metadata
frontend/
  src/api/         axios clients mapped to backend APIs
  src/routes/      React Router app routes
  src/pages/       public/customer/employee/admin/provider pages
  src/components/  shared UI components
  src/context/     auth, language, public-site, help, toast contexts
  src/locales/     ar/en JSON dictionaries
  src/index.css    Tailwind/custom design tokens
mobile/
  src/api/         axios API clients
  src/navigation/  role-based navigators
  src/features/    admin/client/employee/provider/document/notification screens
  src/theme/       mobile design tokens
docs/              prior repository documentation, not treated as source of truth
.github/workflows CI
Dockerfile/docker-compose/nginx deployment files
```

Noise intentionally ignored: `node_modules`, `.venv`, `venv`, `__pycache__`, `build`, `dist`, package caches.

## Technology Stack

Backend:

- CONFIRMED Python 3.12 locally and Docker `python:3.12-slim`. Evidence: `runtime-verification.md`, `backend/Dockerfile:1`.
- CONFIRMED Django 5.x requirement, local Django 5.1.11. Evidence: `backend/requirements.txt:1`, `runtime-verification.md`.
- CONFIRMED Django REST Framework, SimpleJWT, django-filter, CORS headers, psycopg, Pillow, dotenv, gunicorn, WhiteNoise, django-storages S3, boto3 are declared. Evidence: `backend/requirements.txt:2-12`.
- CONFIRMED custom user model. Evidence: `backend/config/settings.py:184`, `backend/accounts/models.py:44`.
- CONFIRMED DRF defaults include JWT when available, session auth fallback, `IsAuthenticatedOrReadOnly`, pagination, filter/search/order backends, and throttles. Evidence: `backend/config/settings.py:240-270`.
- NOT FOUND background job workers, Celery, RQ, Channels, WebSockets, or realtime server code in current source. Evidence: no queue/worker dependency in `backend/requirements.txt:1-12`; no Channels app in `backend/config/settings.py:87-119`.

Frontend:

- CONFIRMED Vite + React 19 + React Router 7 + axios + react-hook-form + lucide-react + Recharts. Evidence: `frontend/package.json:14-23`.
- CONFIRMED Tailwind CSS 3.4 plus custom component classes and CSS variables. Evidence: `frontend/package.json:38`, `frontend/src/index.css:3-5`, `frontend/tailwind.config.js:1-30`.
- NOT FOUND Bootstrap, Vue, Angular, Next.js, HTMX, Alpine, or Django-template frontend as active UI framework.

Mobile:

- CONFIRMED Expo 54, React Native 0.81.5, React 19.1, React Navigation 7, React Query 5, Zustand, axios, Expo document/image/file/notification libraries. Evidence: `mobile/package.json:13-40`.

Database/infrastructure:

- CONFIRMED SQLite is default when `POSTGRES_DB` is unset; Postgres is used when env is set. Evidence: `backend/config/settings.py:158-176`.
- CONFIRMED migrations are Django migrations under each app.
- CONFIRMED Docker Compose defines Postgres 16, backend, frontend, named volumes for db/media/static, optional Redis URL, optional AWS S3 storage envs. Evidence: `docker-compose.yml:1-106`.
- CONFIRMED frontend container is Nginx proxying `/api/` and `/django-admin/`, serving `/static/` and `/media/` aliases. Evidence: `frontend/nginx.conf:17-44`.
- PARTIALLY CONFIRMED object storage support exists through settings and requirements, but local environment did not have `storages`/`boto3` importable during discovery. Evidence: `backend/config/settings.py:197-214`, `backend/requirements.txt:11-12`, `runtime-verification.md`.

## Module Map

| Module | Purpose | Models | Routes/UI | Dependencies |
|---|---|---|---|---|
| `accounts` | Auth, users, roles, customer profile, system settings, delete guard password | `CustomUser`, `CustomerProfile`, `SystemSetting`, `PasswordResetToken` | `/api/auth/*`, `/api/customer/profile/`, `/api/admin/users/`, `/api/admin/system-settings/` | Django auth, SimpleJWT, organizations, audit |
| `organizations` | Multi-organization scoping | `Organization`, `Branch`, `OrganizationMembership`, `OrganizationBranding`, `PartnerServiceConfig` | `/api/organizations/`, `/api/branches/`, `/api/me/memberships/` | accounts, services |
| `services` | Catalog and service configuration | `ServiceCategory`, `Service`, `RequiredDocumentDefinition`, `ServiceRequiredDocument`, `ServiceRelation`, `ServiceProviderAssignment`, `Address` | `/api/services/`, `/api/services/<slug>/`, `/api/admin/services/`, `/api/admin/service-documents/` | organizations, providers |
| `orders` | Customer service requests and workflow | `Order`, `OrderStatusLog`, `OrderNote`, `OrderAssignmentHistory`, `OrderIssue`, `Rating`, `MissingDocumentRequest` | `/api/orders/`, `/api/customer/orders/`, `/api/admin/orders/` | services, documents, workflow, audit, notifications |
| `documents` | Upload, validation, verification, download access | `Document` | `/api/documents/<id>/download-token/`, `/api/staff/documents/`, `/api/admin/documents/` | orders, services, permissions |
| `workflow` | Canonical order transition map | none | consumed by order services/API | `core.choices` |
| `providers` | Provider profile admin and provider work portal APIs | `ProviderProfile` | `/api/admin/providers/`, `/api/provider/orders/` | orders, documents |
| `payment` | Payment records, invoices, commissions, payouts | `Payment`, `Invoice`, `CommissionRule`, `ProviderPayout` | `/api/customer/payments/`, `/api/admin/payments/` | orders, organizations, audit, notifications |
| `notifications` | In-app/system notification records and templates | `Notification`, `NotificationTemplate` | `/api/notifications/`, `/api/admin/notification-templates/`, manual order notification | accounts, orders, services, audit |
| `reports` | Dashboards and summaries | none | `/api/admin/dashboard/`, `/api/employee/dashboard/`, `/api/reports/summary/` | orders, payment, documents |
| `audit` | Audit events and order timeline API | `AuditLog` | `/api/admin/audit-logs/`, `/api/orders/<id>/timeline/` | all write paths |
| `public_site` | Public homepage/theme/ads/missing-service intake | `SiteTheme`, `PublicPageContent`, `Advertisement`, `MissingServiceRequest` | `/api/public-site/*`, `/api/admin/public-site/*` | services, accounts |
| `help_guides` | Contextual help/manual metadata | `HelpGuide`, screenshots, actions, fields, services, workflows | `/api/help/*`, `/api/help/admin/*` | services, permissions |

## Domain Model

### User / Role / Permission

CONFIRMED `CustomUser` extends `SoftDeleteModel`, `AbstractBaseUser`, and `PermissionsMixin`; primary key is `user_id`. Important fields: `full_name`, unique conditional `email`, unique conditional `phone`, `role`, `national_id`, active/staff/verification flags, IP, timestamps. Evidence: `backend/accounts/models.py:44-130`.

CONFIRMED roles are `customer`, `admin`, `employee`, `provider`, `support`. Evidence: `backend/core/choices.py:4-10`.

CONFIRMED role groups are synced on user save and post-migrate. Evidence: `backend/accounts/signals.py:10-21`, `backend/accounts/role_groups.py:7-92`.

CONFIRMED DRF permission classes combine user role, organization membership, and Django permissions. Evidence: `backend/config/permissions.py`, `backend/organizations/selectors.py:28-105`.

### Customer

CONFIRMED customer profile is `CustomerProfile` with one-to-one `user`, optional organization FK, national ID, address, birth date, identity flag, timestamps. It validates that the user role is customer. Evidence: `backend/accounts/models.py:152-186`.

### Organization / Staff Scope

CONFIRMED organizations have type `platform`, `partner`, `provider`, `customer_company`; branches belong to organizations; memberships connect users to organizations/branches with role validation. Evidence: `backend/organizations/models.py:9-35`, `backend/organizations/models.py:56-141`, `backend/organizations/models.py:151-189`.

CONFIRMED organization scoping is centralized in selectors and used by service/order/payment/report queries. Evidence: `backend/organizations/selectors.py:145-168`, `backend/services/views.py:202-209`, `backend/payment/views.py:56-70`.

### Service Catalog

CONFIRMED `ServiceCategory` is soft-deletable, hierarchical, public-visible, ordered, with slug/image/icon/color and Arabic/English names/descriptions. Evidence: `backend/services/models.py:28-75`, `backend/services/models.py:111-142`.

CONFIRMED `Service` is soft-deletable and contains category, optional organization, `scope`, Arabic/English names/descriptions, `required_information_schema`, price fields, public price flags/notes, duration fields, delivery-date mode fields, terms, online/manual/provider flags, featured/active/public visibility, timestamps. Evidence: `backend/services/models.py:151-351`.

CONFIRMED service price components are `base_price`, `government_fee`, and `service_fee`; public serializers can hide individual components and expose a structured `pricing` payload. Evidence: `backend/services/models.py:226-257`, `backend/services/serializers.py:40-53`, `backend/services/serializers.py:317-377`.

CONFIRMED duration supports a simple duration value plus min/max range, units `hours/days/weeks/months`, and delivery modes `duration`, `duration_range`, `date_range`, `custom`. Evidence: `backend/services/models.py:163-168`, `backend/services/models.py:259-288`.

### Required Documents

CONFIRMED global reusable document definitions are `RequiredDocumentDefinition` with code, bilingual names/descriptions, allowed extensions/MIME types, max file size, active and soft-delete flags. Evidence: `backend/services/models.py:498-568`.

CONFIRMED service-specific required documents are `ServiceRequiredDocument` rows with service FK, optional definition FK, document type, bilingual names/instructions, required flag, allowed extensions, max file size, verification flag, replace/provider-view flags, display order, active/soft-delete. Evidence: `backend/services/models.py:786-852`.

### Orders / Requests

CONFIRMED the domain uses the name `Order`, not `Request` or `Application`. It is the service request record. Primary key is default `id` (no explicit PK field), with unique `order_number`, customer, organization, branch, service, snapshots, status, priority, provider/employee assignments, city, expected delivery snapshot fields, final price, notes, missing doc types, rejection/cancellation reasons, timestamps. Evidence: `backend/orders/models.py:15-249`.

CONFIRMED order final price is snapshotted at order creation from current service pricing. Evidence: `backend/orders/serializers.py:394-400`, `backend/orders/tests.py:109`, `backend/orders/tests.py:1108-1110`.

CONFIRMED service-specific dynamic fields are defined on `Service.required_information_schema`, but backend order creation accepts fixed customer/order fields and uploaded documents. In the web customer order form, dynamic field values are appended into the submitted `notes` text, not stored in structured order field-value rows. Evidence: `backend/services/models.py:220-224`, `backend/orders/serializers.py:270-391`, `frontend/src/pages/customer/CustomerCreateOrderPage.jsx:74-136`, `frontend/src/utils/serviceForms.js:90-116`. Status: NOT FOUND dedicated request-field/value entity.

### Workflow / Status

CONFIRMED statuses: `NEW`, `UNDER_REVIEW`, `WAITING_CUSTOMER`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_GOVERNMENT`, `READY_FOR_DELIVERY`, `COMPLETED`, `REJECTED`, `CANCELLED`, `ARCHIVED`. Evidence: `backend/core/choices.py:12-24`.

CONFIRMED transitions are hard-coded in `WORKFLOW_TRANSITIONS`; each transition has action, allowed roles, validation checks, reason/notification/audit flags. Evidence: `backend/workflow/rules.py`.

CONFIRMED actor restrictions additionally enforce customer ownership, assigned-provider access, and assigned-employee access. Evidence: `backend/workflow/transition_permissions.py:12-62`.

### Documents / Files

CONFIRMED document uploads are `Document` rows with order, uploader, uploader role, document type/title, file metadata, checksum, status, scan status/result metadata, final-document flag, verification fields, soft-delete fields, timestamps, constraints and indexes. Evidence: `backend/documents/models.py:36-246`.

CONFIRMED uploads validate allowed extensions, MIME types, max size, and dangerous extensions. Evidence: `backend/documents/models.py:246-298`, `backend/documents/serializers.py:67-78`.

CONFIRMED document download requires a token or authenticated permission, with a legacy public final-document gate using order number and phone. Evidence: `backend/documents/views.py:50-91`, `backend/documents/services.py:171-204`.

CONFIRMED media is served by Django route in all environments and by Nginx `/media/` in frontend container; comment says high-traffic deployments should replace Django media serving. Evidence: `backend/config/urls.py:27-29`, `frontend/nginx.conf:43-46`.

### Payments

CONFIRMED `Payment` has order, organization, payer/recorder, type, method, status, amount/currency, gateway fields, reference, receipt file, failure/notes, paid/refunded timestamps. Evidence: `backend/payment/models.py:13-246`.

CONFIRMED payment gateway fields exist, but no concrete gateway integration/client was found. Payment records are created and status-updated through API/services. Evidence: `backend/payment/services.py:10-45`, `backend/payment/views.py:22-118`. Status: PARTIALLY CONFIRMED payments as records, NOT FOUND live payment processing integration.

CONFIRMED invoices, commission rules, and provider payouts exist as models/helpers. Evidence: `backend/payment/models.py:260-345`, `backend/payment/billing.py:10-57`.

### Messaging / Notifications

CONFIRMED notification records and templates exist. Channels include system/email/sms/whatsapp-like choices in code; current event map uses system channel for order/payment events. Evidence: `backend/notifications/models.py:10-319`, `backend/notifications/event_map.py:31-188`.

CONFIRMED notification creation stores records and marks system notifications as sent; external channels are only recorded as unconfigured unless settings indicate availability. Evidence: `backend/notifications/utils.py:45-94`.

CONFIRMED password reset emails use Django `send_mail`; default backend is console in debug and SMTP otherwise. Evidence: `backend/accounts/password_reset.py:77-100`, `backend/config/settings.py:319-329`.

NOT FOUND actual SMS, WhatsApp, push, or WebSocket delivery implementation. Mobile includes `expo-notifications`, but no confirmed backend push provider.

### Audit / History

CONFIRMED `AuditLog` stores user, user-role snapshot, action/source/status, entity type/id/name, old/new values, changed fields, message/error, request id, IP, user agent, timestamp. Evidence: `backend/audit/models.py:57-168`.

CONFIRMED `create_audit_log` centralizes audit creation and derives portal source from user role. Evidence: `backend/audit/utils.py:37-74`.

CONFIRMED order-specific history also exists as `OrderStatusLog`, `OrderNote`, `OrderAssignmentHistory`, `OrderIssue`, `Rating`, and `MissingDocumentRequest`. Evidence: `backend/orders/models.py:567-911`.

## Current Interfaces

Backend API root:

- `django-admin/`, `api/health/`, and `api/` includes for accounts, organizations, services, orders, providers, reports, audit, documents, notifications, payment, public_site, help_guides. Evidence: `backend/config/urls.py:13-29`.

Public API:

- Services/categories/detail: `backend/services/urls.py:28-32`.
- Public site homepage/theme/ads/missing-service request: `backend/public_site/urls.py:20-23`.
- Track order: `backend/orders/urls.py:38`.
- Register/login/reset: `backend/accounts/urls.py:28-33`.

Authenticated customer API:

- Create order, own orders, detail, document upload, cancel, rating, payments, profile. Evidence: `backend/orders/urls.py:37-43`, `backend/payment/urls.py:12-13`, `backend/accounts/urls.py:35`.

Staff/admin API:

- Order queue/detail/status/assign/request-docs/notes/final-doc/complete/reject/cancel/workflow rules. Evidence: `backend/orders/urls.py:44-54`.
- Catalog, categories, required document definitions, service-doc rules, service relations, provider assignments, addresses. Evidence: `backend/services/urls.py:19-25`.
- Users, profiles, settings, available permissions, delete guard. Evidence: `backend/accounts/urls.py:22-37`.
- Providers, documents, payments, reports, audit, notifications, public site, help guides. Evidence: respective `urls.py` files listed in `backend/config/urls.py:15-26`.

Provider API:

- Dashboard, assigned orders, detail, status update, notes, final document. Evidence: `backend/providers/urls.py:19-24`.

Web UI:

- Public: `/`, `/services`, `/services/:slug`, `/create-order`, `/track-order`, `/about`, `/contact`, `/faq`, `/privacy`, `/login`, `/forgot-password`, `/reset-password/:token`, `/register`. Evidence: `frontend/src/routes/AppRoutes.jsx:156-169`.
- Customer: `/customer`, `/customer/orders/new`, `/customer/orders`, `/customer/orders/:id`, `/customer/orders/:id/missing-docs`, `/customer/profile`, `/customer/manual`. Evidence: `frontend/src/routes/AppRoutes.jsx:172-180`.
- Employee/support: `/employee`, `/employee/orders`, `/employee/missing-service-requests`, `/employee/orders/:id`, `/employee/documents/verify`, `/employee/reports`, support-only service categories/relations. Evidence: `frontend/src/routes/AppRoutes.jsx:184-199`.
- Admin: overview, orders, rules, CMS, categories/services/relations, public site/content/ads/theme/preview, missing-service requests, users, providers, provider-services, reports, notifications, payments, audit, help guides, manual. Evidence: `frontend/src/routes/AppRoutes.jsx:203-227`.
- Provider: dashboard, orders, order detail, manual. Evidence: `frontend/src/routes/AppRoutes.jsx:231-236`.

Mobile UI:

- Root navigator routes by auth status and role. Evidence: `mobile/src/navigation/RootNavigator.tsx`.
- Mobile APIs map to the same backend API families. Evidence: `mobile/src/api/*.ts`.

## Arabic / English Implementation

CONFIRMED backend default language is Arabic with Arabic/English languages configured. Evidence: `backend/config/settings.py:186-187`.

CONFIRMED frontend default language is Arabic; supported languages are `ar` and `en`; it sets `document.documentElement.lang` and `dir`, stores language in localStorage, and sends `Accept-Language`. Evidence: `frontend/src/utils/i18n.js:3-33`, `frontend/src/context/LanguageContext.jsx:27-31`, `frontend/src/api/client.js:10-12`, `frontend/src/api/client.js:300-303`.

CONFIRMED many model fields are duplicated as `_ar`/`_en` rather than using a translation framework. Evidence: services/public-site/notification/help-guide model fields, e.g. `backend/services/models.py:203-212`, `backend/public_site/models.py:81-105`, `backend/notifications/models.py:295-299`.

PARTIALLY CONFIRMED localization is mixed: some frontend UI uses locale JSON and `t()`, while many pages still contain inline Arabic/English conditional strings. Evidence: `frontend/src/locales/ar.json`, `frontend/src/locales/en.json`, `frontend/src/pages/public/TrackOrderPage.jsx:30-43`.

## Deletion Behavior

CONFIRMED shared soft-delete base sets `is_deleted`, `deleted_by`, `deleted_at`, `delete_reason`, and deactivates `is_active` when present. Evidence: `backend/core/models.py:6-43`.

CONFIRMED admin delete guard requires platform super-admin and current password; it logs blocked/successful delete attempts. Evidence: `backend/core/delete_guard.py:88-231`.

CONFIRMED many admin viewsets inherit `AdminDeleteGuardMixin`. Evidence: `backend/services/views.py:180-591`, `backend/orders/views.py:234-334`, `backend/notifications/views.py:33-120`, `backend/public_site/views.py:218`.

PARTIALLY CONFIRMED not all models use `SoftDeleteModel`; `Document` implements its own deletion fields and `Payment`/`AuditLog` are not soft-deletable. Evidence: `backend/documents/models.py:192-206`, `backend/payment/models.py:13`, `backend/audit/models.py:5`.

## Testing

CONFIRMED backend tests exist for accounts, audit, core, documents, help guides, notifications, orders, end-to-end orders, organizations, payment, providers, public site, reports, services. Evidence: files listed in `runtime-verification.md`.

CONFIRMED frontend tests exist across API client, status badge, admin/customer/employee/provider/public pages. Evidence: files listed in `runtime-verification.md`.

CONFIRMED CI runs backend pending-migration check, Django check, Django tests, frontend lint, frontend tests. Evidence: `.github/workflows/ci.yml:9-72`.

CONFIRMED local `python manage.py check` passed and mobile `npm run typecheck` passed. PARTIALLY CONFIRMED frontend tests execute but fail. Evidence: `runtime-verification.md`.

## Deployment

CONFIRMED backend Docker image installs requirements, copies app, runs entrypoint. Evidence: `backend/Dockerfile:1-19`.

CONFIRMED entrypoint waits for Postgres, runs migrations, collectstatic, setup_roles, create_admin, optional seed, then Gunicorn. Evidence: `backend/entrypoint.sh:30-51`.

CONFIRMED frontend Docker builds Vite app with Node 22 then serves via Nginx 1.27. Evidence: `frontend/Dockerfile:2-24`.

CONFIRMED Compose exposes backend/frontend internally in production-style config and maps ports locally through override. Evidence: `docker-compose.yml:81-98`, `docker-compose.override.yml:5-20`.

CONFIRMED production security settings are env-driven and include proxy SSL header, secure cookies, HSTS, nosniff, referrer policy, X-Frame-Options. Evidence: `backend/config/settings.py:219-237`.

## What Must Not Be Broken

CONFIRMED critical current contracts:

- Custom user PK/name and JWT auth payloads. Evidence: `backend/accounts/models.py:47-101`, `backend/accounts/serializers.py:131-142`, `frontend/src/api/client.js:289-383`.
- Hard-coded order statuses/transitions and allowed role matrix. Evidence: `backend/core/choices.py:12-24`, `backend/workflow/rules.py`.
- Order creation with service snapshot pricing/delivery/document validation. Evidence: `backend/orders/serializers.py:270-400`.
- Document upload validation and download authorization. Evidence: `backend/documents/models.py:246-298`, `backend/documents/services.py:171-204`.
- Admin delete guard and audit logging. Evidence: `backend/core/delete_guard.py:88-231`, `backend/audit/utils.py:37-74`.
- Organization scoping for partner/provider/customer users. Evidence: `backend/organizations/selectors.py:145-168`.
- Public service visibility and partner catalog configuration. Evidence: `backend/services/selectors.py:20-50`.
- Web route structure consumed by users. Evidence: `frontend/src/routes/AppRoutes.jsx:156-240`.
- CI expectations. Evidence: `.github/workflows/ci.yml:32-72`.

## Safe Extension Points

CONFIRMED current extension seams:

- Add new services, categories, required-document definitions, service-document rules, and service relations through existing admin APIs/models. Evidence: `backend/services/urls.py:19-25`, `backend/services/models.py:151-856`.
- Add notification templates and event definitions, provided external delivery remains explicitly implemented/configured. Evidence: `backend/notifications/models.py:274-319`, `backend/notifications/event_map.py`.
- Add report views using existing scoped order query helpers. Evidence: `backend/reports/views.py:250-465`, `backend/organizations/selectors.py:145-168`.
- Extend public-site content fields cautiously via `public_site` models/serializers. Evidence: `backend/public_site/models.py:24-343`, `backend/public_site/serializers.py:19-292`.
- Extend mobile screens against existing API clients. Evidence: `mobile/src/api/*.ts`, `mobile/src/navigation/RootNavigator.tsx`.

## Refactor Readiness / Current Risks

These are current-state findings, not proposed redesigns:

- PARTIALLY CONFIRMED workflow is duplicated across hard-coded backend transitions, frontend action handling, help guide fallbacks, and tests. Evidence: `backend/workflow/rules.py`, `frontend/src/pages/employee/EmployeeOrderReviewPage.jsx`, `backend/help_guides/fallbacks.py`.
- CONFIRMED frontend tests are not green locally. Evidence: `runtime-verification.md`.
- CONFIRMED external notification channels and payment gateways are modeled but not fully integrated. Evidence: `backend/notifications/utils.py:77-78`, `backend/payment/models.py:110-131`.
- PARTIALLY CONFIRMED mixed localization strategy exists: translation dictionaries plus inline conditional strings. Evidence: `frontend/src/utils/i18n.js`, `frontend/src/pages/public/TrackOrderPage.jsx`.
- PARTIALLY CONFIRMED file protection is application-mediated, but media files are also served from `/media/`; correctness depends on download-token routes and not exposing sensitive paths directly through Nginx/Django media aliases. Evidence: `backend/config/urls.py:27-29`, `frontend/nginx.conf:43-46`, `backend/documents/views.py:50-91`.
- CONFIRMED Docker entrypoint runs migrations automatically; this is operationally important for deployment changes. Evidence: `backend/entrypoint.sh:30`.

## Missing for Intended Future Platform

Status from current code:

- NOT FOUND real payment gateway execution/webhook integration.
- NOT FOUND real SMS/WhatsApp/push delivery provider.
- NOT FOUND background workers/queues for notifications, scanning, or async processing.
- NOT FOUND WebSockets/realtime order updates.
- NOT FOUND dedicated document antivirus scan integration, despite scan metadata fields.
- NOT FOUND dedicated request-field/value model for dynamic service form answers.
- NOT FOUND OpenAPI/schema generation docs in current code.
- NOT FOUND mobile CI in GitHub Actions.
- NOT FOUND runtime screenshots captured by this audit.

## Unknowns

UNABLE TO VERIFY without running production-like services and/or inspecting deployment secrets:

- Actual production DB contents, active migrations state, seed data, and live organization/service catalog.
- Whether production uses local filesystem, S3/MinIO, or another media backend.
- Whether external email SMTP, Redis cache, notification channel settings, payment gateway settings, or AWS credentials are configured in deployment.
- Whether `storages`/`boto3` are installed in the production container; they are declared in requirements but were not installed in the local Python environment used for discovery.
- Runtime screenshots and visual correctness of every route under authenticated roles.
