# Database Schema

## Core Tables

### `accounts_customuser`

- Primary identity table.
- Roles: `CUSTOMER`, `ADMIN`, `PROVIDER`, `SUPPORT`.
- Related to orders, notes, ratings, notifications, and audit logs.

### `services_servicecategory`

- Stores category labels in Arabic and English.
- One category has many services.

### `services_service`

- Stores service metadata, required documents, pricing, and estimated duration.
- Referenced by orders.

### `providers_providerprofile`

- One-to-one with `CustomUser`.
- Holds provider city, availability, rating, completed order count.
- Many-to-many to `ServiceCategory`.

### `orders_order`

- Main transactional table.
- References customer, service, optional assigned provider, optional assigner.
- Stores status, price, expected delivery, notes, rejection reason, archive flag.

### `orders_orderstatuslog`

- Immutable timeline of status transitions.
- References order and optional actor user.

### `orders_ordernote`

- Free-form note table.
- Visibility can be `INTERNAL` or `CUSTOMER`.

### `orders_rating`

- One rating per order.
- Linked to customer and order.

### `documents_document`

- Stores uploaded files and file metadata.
- Linked to order and optional uploader user.
- Supports final-document and verification flags.

### `notifications_notification`

- Delivery log for system/email/SMS/WhatsApp notifications.
- Linked to user and optional order.

### `audit_auditlog`

- Tracks sensitive actions with entity metadata, actor, values, IP, and user agent.

## Relationships

- `CustomUser 1..* Order` as customer
- `ServiceCategory 1..* Service`
- `Service 1..* Order`
- `ProviderProfile 1..* Order` as assigned provider
- `Order 1..* OrderStatusLog`
- `Order 1..* OrderNote`
- `Order 1..* Document`
- `Order 1..1 Rating`
- `CustomUser 1..* Notification`
- `CustomUser 1..* AuditLog`

## Storage Notes

- Documents are stored under `media/orders/{order_number}/`.
- Orders are archived logically with `is_archived` and `ARCHIVED` status.
- Required documents are stored as JSON arrays for flexible service configuration.
