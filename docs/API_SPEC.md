# API Specification

Base URL: `/api`

## Auth

### `POST /auth/register/`
Request:

```json
{
  "full_name": "Ahmad Khaled",
  "phone": "0790000002",
  "email": "customer@example.com",
  "password": "Password@123",
  "national_id": "9876543210"
}
```

Response:

```json
{
  "id": 4,
  "full_name": "Ahmad Khaled",
  "phone": "0790000002",
  "email": "customer@example.com",
  "national_id": "9876543210"
}
```

### `POST /auth/login/`
Request:

```json
{
  "email": "admin@khalisni.local",
  "password": "Admin@123"
}
```

Response:

```json
{
  "refresh": "jwt-refresh-token",
  "access": "jwt-access-token",
  "user": {
    "id": 1,
    "full_name": "Khalisni Admin",
    "role": "ADMIN"
  }
}
```

### `POST /auth/logout/`
Request:

```json
{
  "refresh": "jwt-refresh-token"
}
```

Response: `204 No Content`

### `GET /auth/me/`
Response: current authenticated user.

## Public

### `GET /services/`
Response: paginated or array list of active services.

### `GET /services/categories/`
Response: active service categories.

### `GET /services/{slug}/`
Response includes service description, required documents, fees, steps, and related services.

### `POST /orders/`
Multipart request:

- `service`
- `full_name`
- `phone`
- `national_id`
- `city`
- `notes`
- `consent`
- `documents`

Response:

```json
{
  "order_number": "KH-2026-000001",
  "status": "NEW",
  "message": "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨ Ø¨Ù†Ø¬Ø§Ø­"
}
```

### `GET /orders/track/?order_number=KH-2026-000001&phone=0790000002`
Response:

```json
{
  "order_number": "KH-2026-000001",
  "status": "IN_PROGRESS",
  "timeline": [],
  "missing_documents": [],
  "final_documents": []
}
```

## Customer

### `GET /customer/orders/`
Returns the authenticated customer's orders.

### `GET /customer/orders/{id}/`
Returns full order details, timeline, documents, notes, and rating.

### `POST /customer/orders/{id}/documents/`
Multipart fields:

- `document_type`
- `file`

### `POST /customer/orders/{id}/rating/`
Request:

```json
{
  "score": 5,
  "comment": "Excellent service"
}
```

### `PATCH /customer/profile/`
Request:

```json
{
  "full_name": "Updated Name",
  "phone": "0790000002",
  "email": "customer@example.com",
  "national_id": "9876543210"
}
```

## Admin

### `GET /admin/dashboard/`
Returns KPI cards plus chart datasets.

### `GET /admin/orders/`
Filters supported: `search`, `status`, `priority`, `provider`

### `GET /admin/orders/{id}/`
Returns complete order payload for operations.

### `PATCH /admin/orders/{id}/status/`
Request:

```json
{
  "status": "UNDER_REVIEW",
  "note": "Documents validated"
}
```

### `PATCH /admin/orders/{id}/assign/`
Request:

```json
{
  "provider_id": 1,
  "note": "Handle today"
}
```

### `POST /admin/orders/{id}/request-documents/`
Request:

```json
{
  "note": "Please upload a clear copy of your ID."
}
```

### `POST /admin/orders/{id}/notes/`
Request:

```json
{
  "note": "Internal follow-up note",
  "visibility": "INTERNAL"
}
```

### `POST /admin/orders/{id}/final-document/`
Multipart fields:

- `document_type`
- `file`

### `POST /admin/orders/{id}/complete/`
Request:

```json
{
  "admin_confirmation": true
}
```

### `POST /admin/orders/{id}/reject/`
Request:

```json
{
  "reason": "Insufficient documents"
}
```

### `GET /admin/services/`, `POST /admin/services/`, `PUT/PATCH /admin/services/{id}/`
CRUD for services.

### `GET /admin/categories/`, `POST /admin/categories/`, `PUT/PATCH /admin/categories/{id}/`
CRUD for categories.

### `GET /admin/providers/`, `POST /admin/providers/`, `PUT/PATCH /admin/providers/{id}/`
CRUD for provider profiles and related user data.

### `GET /admin/reports/daily/`
Daily counts, revenue, and top services.

### `GET /admin/reports/weekly/`
Weekly revenue, daily breakdown, delayed orders, and provider performance.

### `GET /admin/notifications/`
Notification delivery log.

### `GET /admin/audit-logs/`
Audit log stream.

## Provider

### `GET /provider/dashboard/`
Assigned, in-progress, completed, and delayed counts.

### `GET /provider/orders/`
Only orders assigned to the current provider.

### `GET /provider/orders/{id}/`
Detailed assigned order view.

### `PATCH /provider/orders/{id}/status/`
Allowed statuses: `IN_PROGRESS`, `WAITING_GOVERNMENT`, `READY_FOR_DELIVERY`

### `POST /provider/orders/{id}/notes/`
Internal execution note.

### `POST /provider/orders/{id}/final-document/`
Multipart upload for final result.

## Documents

### `GET /documents/{id}/download/`
Authenticated access for authorized users.
Public final-download access supports query params:

- `order_number`
- `phone`

