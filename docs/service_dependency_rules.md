# Service Dependency & Recommendation Rules

## Overview

This feature lets Admin and Support users define business relationships between services without backend code changes.

Supported relation types:

- `prerequisite`: the source service should be completed before the target service can proceed.
- `recommended_after`: the target service should be suggested after the source service is completed.
- `optional_bundle`: the target service can be offered as an optional add-on related to the source service.
- `alternative`: the target service can be shown as an alternative path.

## Backend Structure

### Model

- `services.ServiceRelation`
  - `source_service`
  - `target_service`
  - `relation_type`
  - `is_required`
  - `message_to_customer`
  - `is_active`
  - `created_by`
  - `created_at`
  - `updated_at`

### Validation

Validation is enforced in the model and serializer path:

- self-relations are rejected
- duplicate `(source_service, target_service, relation_type)` rows are rejected
- inactive services cannot be selected
- active required prerequisite loops are blocked

### Service Layer

- `services/service_relations.py`
  - prerequisite cycle detection
  - audit snapshot helpers
- `services/order_validation.py`
  - prerequisite completion checks before order creation
  - warning generation for optional prerequisites
- `services/order_completion.py`
  - related-service recommendation notification creation
  - unread duplicate prevention

## API Surface

### Management

- `GET /api/admin/service-relations/`
- `POST /api/admin/service-relations/`
- `PATCH /api/admin/service-relations/{id}/`
- `DELETE /api/admin/service-relations/{id}/`
  - soft deactivation
- `DELETE /api/admin/service-relations/{id}/hard-delete/`
  - admin-only permanent delete

Filters:

- `source_service`
- `target_service`
- `relation_type`
- `is_active`

### Customer-Facing Service Detail

`GET /api/services/{slug}/` now includes:

- `prerequisite_services`
- `recommended_services`

For authenticated customers, prerequisite items are marked as:

- `completed`
- `missing`

based on prior completed or archived orders for the source service.

## Order Flow Integration

### Order Creation

Before a customer order is created:

- active prerequisite relations targeting the requested service are checked
- missing required prerequisites block creation
- missing optional prerequisites generate warning messages

Warnings are returned in the order create response under `warnings`.

### Order Completion

When an order becomes `COMPLETED`:

- standard completion notifications still run
- active `recommended_after` and `optional_bundle` relations from the completed service are loaded
- customer recommendation notifications are created in the same transaction
- duplicate unread recommendation notifications are not created for the same customer, order, and target service

## Notifications

Recommendation notifications use:

- title: `Related service recommended`
- `notifications.Notification.target_service`
- `template_key = service_relation_recommendation`

## Permissions

- Admin:
  - list, create, update, deactivate, hard delete
- Support:
  - list, create, update
  - deactivate only when existing permission rules allow it
- Customer, Provider, Employee:
  - no management access

## Audit Logging

Audit entries are created for:

- create service relation
- update service relation
- deactivate service relation
- hard delete service relation
- recommendation notification creation

## Seed Data

`accounts.management.commands.seed_initial_data` now creates demo service relations for realistic dependency and recommendation flows.

## Test Coverage

Focused backend coverage includes:

- valid relation creation
- self-relation rejection
- duplicate rejection
- circular required prerequisite rejection
- blocked order creation when required prerequisite is missing
- allowed order creation when required prerequisite is already completed
- recommendation notification creation after completion
- duplicate recommendation prevention
- role-based permission enforcement
