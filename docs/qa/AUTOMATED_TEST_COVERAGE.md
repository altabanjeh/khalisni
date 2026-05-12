# AUTOMATED TEST COVERAGE

## New End-To-End Flow Coverage

### `backend/orders/test_end_to_end.py`

- `test_scenario_1_normal_successful_order_flow`
  - Scenario covered: normal successful order lifecycle
  - Roles covered: client, employee, provider
  - Assertions:
    - valid status progression
    - notification creation
    - audit creation
    - provider/customer data visibility limits
    - final document exists before completion

- `test_scenario_2_missing_document_flow`
  - Scenario covered: multiple missing-document request and staged client resubmission
  - Roles covered: client, employee
  - Assertions:
    - `missing_document_types` updates one item at a time
    - order remains `WAITING_CUSTOMER` until all requested files are uploaded
    - workflow cannot continue early

- `test_scenario_3_provider_return_flow`
  - Scenario covered: provider result rejection, rework, corrected result, completion
  - Roles covered: provider, employee
  - Assertions:
    - reason required on rejection
    - provider sees return note
    - provider-only order access
    - notification and audit creation

- `test_scenario_4_unauthorized_access_controls`
  - Scenario covered: cross-role and cross-order access restrictions
  - Roles covered: client, provider, employee, admin
  - Assertions:
    - client cannot access another client order
    - provider cannot access unassigned order
    - provider cannot see internal notes
    - employee cannot access admin settings
    - admin cannot mutate protected workflow fields directly
    - generic status endpoint cannot complete order

- `test_scenario_5_admin_configuration_rule_change_affects_new_orders_only`
  - Scenario covered: admin rule update safety
  - Roles covered: admin
  - Assertions:
    - service required-document rule change is audited
    - new orders respect updated rule
    - old completed orders remain valid
    - audit logs cannot be deleted

- `test_scenario_6_cancellation_and_reopening_rules`
  - Scenario covered: cancel and reopen safety rules
  - Roles covered: admin, employee
  - Assertions:
    - cancellation requires reason
    - finalized orders cannot be edited directly
    - reopen requires allowed role and reason

## Related Existing Coverage Reused

### `backend/orders/tests.py`

- raw order-record protections
- completion safeguards
- missing-document partial upload behavior
- provider assignment checks
- notification creation on submit and status transitions

### `backend/providers/tests.py`

- provider access limited to assigned orders
- provider payload hides internal/private fields
- provider approval and activation audit behavior

### `backend/services/tests.py`

- safe service rule editing
- required-document rule management
- service-provider assignment rule management

### `backend/audit/tests.py`

- audit logs are read-only for normal admin access

### `backend/accounts/tests.py`

- normal admin cannot create admin-level users
- super admin can create admin-level users

## Small Fixes Included With Test Work

- `backend/orders/serializers.py`
  - customer order detail no longer exposes `internal_notes`
  - provider-visible status logs now include `note` so return-for-rework reasons are visible

## Remaining Gaps

- No browser-driven frontend E2E automation is present yet; current coverage is API-level end-to-end.
- Payment-specific operational flow is still only lightly coupled to orders and is not part of the service-order happy path.
- Public tracking remains phone-and-order-number based and does not yet have dedicated QA automation beyond API assertions.
- Notification delivery provider integrations are not exercised because the current system stores in-app records when external channels are not configured.
