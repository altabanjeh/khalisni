# PHASE 1 BACKEND WORKFLOW LOCK

## Bugs Fixed

- Locked down `/api/admin/order-records/` so it no longer acts as a raw workflow bypass.
- Blocked generic `/api/admin/orders/<id>/status/` transitions to `READY_FOR_DELIVERY` and `COMPLETED`.
- Fixed missing-document resubmission so one upload only removes its own requested type.
- Replaced provider order payloads with provider-safe serializers that exclude private customer/internal data and unrelated documents.

## Files Changed

- `backend/orders/views.py`
- `backend/orders/serializers.py`
- `backend/orders/services.py`
- `backend/orders/allowed_actions.py`
- `backend/providers/views.py`
- `backend/documents/serializers.py`
- `backend/orders/tests.py`
- `backend/providers/tests.py`

## Rules Now Enforced

### Admin raw order endpoint

- Direct order creation through `/api/admin/order-records/` is disabled.
- Normal admin raw deletion is blocked.
- Raw deletion is limited to Django superuser only.
- Raw order updates are restricted to safe fields only:
  - `city`
  - `priority`
  - `expected_delivery_date`
  - `customer_notes`
  - `internal_notes`
- Raw updates to workflow-sensitive fields are rejected with explicit validation errors:
  - `status`
  - `customer`
  - `assigned_provider`
  - `assigned_by`
  - `assigned_employee`
  - `final_price`
  - `completed_at`
  - `cancelled_at`

### Generic status endpoint

- Generic admin/employee status updates cannot move an order to:
  - `READY_FOR_DELIVERY`
  - `COMPLETED`
- Those states must use dedicated service-layer actions only.
- Blocked attempts are audit logged through `AuditLog`.
- Generic status transitions are also removed from `allowed_actions.available_status_transitions`, so the backend no longer advertises those unsafe choices to employee/admin status dropdowns.

### Completion safeguards

- `complete_order()` now requires unresolved missing-document requests to be cleared first.
- `complete_order()` now requires required service documents to remain approved.
- `complete_order()` now requires:
  - a final document, unless the existing `admin_confirmation=True` override is used
  - a verified final document, unless the existing `admin_confirmation=True` override is used
- Blocked completion attempts are audit logged.

### Missing-document resubmission

- While an order is in `WAITING_CUSTOMER`, uploading one missing document removes only that document type from `missing_document_types`.
- The order stays in `WAITING_CUSTOMER` until the missing list becomes empty.
- The order moves back to `UNDER_REVIEW` only after all requested missing document types have been uploaded.

### Provider payload hardening

- Provider list/detail APIs now use provider-safe serializers.
- Provider responses no longer expose:
  - full customer object
  - `internal_notes`
  - `customer_notes` under the raw internal field name
  - rating payload
  - full internal notes list
  - unrelated document metadata
  - price fields
- Provider detail now exposes:
  - `order_number`
  - service summary
  - city
  - assigned work details
  - provider-visible instructions list
  - allowed document metadata only
  - provider-safe status history
  - backend-derived allowed actions

## Tests Added / Updated

- `orders.tests.OrderAPITests.test_admin_order_record_endpoint_allows_safe_updates_only`
- `orders.tests.OrderAPITests.test_admin_order_record_endpoint_blocks_raw_create_and_delete_for_normal_admin`
- `orders.tests.OrderAPITests.test_generic_status_endpoint_blocks_ready_and_completed_transitions`
- `orders.tests.OrderAPITests.test_complete_endpoint_requires_final_document_and_verification_without_override`
- `orders.tests.OrderAPITests.test_missing_document_upload_only_removes_uploaded_type`
- `providers.tests.ProviderPermissionsTests.test_provider_cannot_access_unassigned_order_detail`
- `providers.tests.ProviderPermissionsTests.test_provider_order_detail_hides_private_fields_and_unrelated_documents`

## Commands Run

- `..\.venv\Scripts\python.exe manage.py check`
  - Result: passed
- `..\.venv\Scripts\python.exe manage.py test orders.tests`
  - Result: passed
- `..\.venv\Scripts\python.exe manage.py test providers.tests`
  - Result: passed
- `..\.venv\Scripts\python.exe manage.py test documents.tests`
  - Result: passed
- `..\.venv\Scripts\python.exe manage.py test`
  - Result: `43` tests passed
- `npm test -- --run`
  - Result: `8` frontend test files, `9` tests passed

## Remaining Risks

- Order deletion is still a hard delete for Django superusers. There is still no order soft-delete model flag.
- The existing `admin_confirmation=True` completion override is still supported because it is an explicit current-system rule. Whether that override should remain available is a business decision.
- Provider-visible instructions are currently sourced from `OrderNote.Visibility.PROVIDER`. If operations need a richer dedicated provider-instruction field, that is a later design item.

## Needs Decision

- Should `admin_confirmation=True` remain as an allowed override for completing an order without a verified final document in exceptional cases, or should completion always require a verified final document with no override?
- Should superuser raw order deletion remain allowed, or should the system move to order soft-delete only?
