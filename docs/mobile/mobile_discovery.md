# Mobile Discovery

## What Was Found

- Backend: Django + Django REST Framework with JWT authentication through SimpleJWT.
- Existing auth endpoints:
  - `POST /api/auth/login/`
  - `POST /api/auth/logout/`
  - `POST /api/auth/token/refresh/`
  - `GET /api/auth/me/`
- Existing business modules already exposed by the backend:
  - accounts / user roles
  - services / categories
  - orders / workflow
  - documents / verification / secure download
  - providers / assignments / work updates
  - notifications
  - payments
  - reports
  - public-site content and advertisements
  - audit logs

## Roles Confirmed

- `customer` in backend maps to mobile `client`
- `employee`
- `support` maps to mobile employee experience
- `provider`
- `admin`

## Core APIs Present

- Client:
  - `GET /api/services/`
  - `GET /api/services/{slug}/`
  - `POST /api/orders/`
  - `GET /api/customer/orders/`
  - `GET /api/customer/orders/{id}/`
  - `POST /api/customer/orders/{id}/documents/`
- Employee/Admin workflow:
  - `GET /api/admin/orders/`
  - `GET /api/admin/orders/{id}/`
  - `PATCH /api/admin/orders/{id}/status/`
  - `PATCH /api/admin/orders/{id}/assign/`
  - `POST /api/admin/orders/{id}/request-documents/`
  - `POST /api/staff/documents/{id}/verify/`
- Provider:
  - `GET /api/provider/dashboard/`
  - `GET /api/provider/orders/`
  - `GET /api/provider/orders/{id}/`
  - `PATCH /api/provider/orders/{id}/status/`
  - `POST /api/provider/orders/{id}/notes/`
  - `POST /api/provider/orders/{id}/final-document/`
- Admin configuration:
  - users, permissions, services, providers, advertisements, public content, payments, reports, audit logs

## APIs Missing Or Incomplete For Mobile

- Forgot password / reset password flow
- Notification mark-as-read endpoint
- Notification unread-count endpoint
- Push registration / push delivery endpoints
- Non-customer self-profile update endpoints

## Assumptions Used In Mobile Implementation

- Mobile uses the same backend status lifecycle and relies on backend enforcement for real security.
- Frontend role `client` is a presentation alias for backend role `customer`.
- Notification read state remains view-only until backend supports a mutation endpoint.
- Public-content and theme editing use existing admin endpoints with JSON payload editing where field-specific contracts are not fully documented.
- Document download uses the secure document URL already returned by backend serializers and shares the file locally after download.
