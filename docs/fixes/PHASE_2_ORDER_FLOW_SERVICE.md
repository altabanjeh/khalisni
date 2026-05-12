# PHASE 2 ORDER FLOW SERVICE

## Workflow Source Of Truth

- Central transition registry: `backend/workflow/rules.py`
- Role/object permission enforcement: `backend/workflow/transition_permissions.py`
- Transition execution services: `backend/orders/services.py`
- Final-document verification / return-for-rework flow: `backend/documents/services.py`

The backend now uses one `TransitionRule` definition per allowed transition. Each rule contains:

- `from_status`
- `to_status`
- `action`
- `allowed_roles`
- `validation_checks`
- `reason_required`
- `notification_trigger`
- `audit_required`
- `generic_status_update`

## Actual Status Model

Current persisted statuses remain:

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

## Conceptual Flow Mapping

The requested conceptual stages do not all exist as separate stored statuses. The current system now maps them as follows:

| Conceptual Stage | Actual Status / Action |
|---|---|
| Draft | Missing in current system. Public order creation creates `NEW` directly. |
| Submitted | `NEW` |
| Under Review | `UNDER_REVIEW` |
| Missing Documents | `WAITING_CUSTOMER` |
| Resubmitted | No separate stored status. Customer upload clears missing items and returns to `UNDER_REVIEW` once all requested docs are supplied. |
| Approved for Provider | No separate stored status. Readiness is validated inside `assign_provider_to_order()`. |
| Assigned to Provider | `ASSIGNED` |
| In Progress | `IN_PROGRESS` |
| Provider Completed | No separate stored status. Provider final upload moves directly to `READY_FOR_DELIVERY`. |
| Internal Verification | No separate stored status. Final document verification happens while order remains `READY_FOR_DELIVERY`. |
| Ready for Delivery | `READY_FOR_DELIVERY` |
| Returned to Provider | `READY_FOR_DELIVERY -> IN_PROGRESS` |
| Completed | `COMPLETED` |
| Reopened | No separate stored status. Reopen action maps `COMPLETED -> UNDER_REVIEW`. |

## Final Workflow Map

| From | To | Action | Roles | Reason Required | Notifications | Audit |
|---|---|---|---|---|---|---|
| `NEW` | `UNDER_REVIEW` | `start_review` | Admin, Employee, Support | No | No | Yes |
| `NEW` | `CANCELLED` | `cancel_order` | Admin, Customer | Yes | Yes | Yes |
| `UNDER_REVIEW` | `WAITING_CUSTOMER` | `request_missing_documents` | Admin, Employee, Support | Yes | Yes | Yes |
| `UNDER_REVIEW` | `ASSIGNED` | `assign_provider` | Admin, Employee, Support | No | Yes | Yes |
| `UNDER_REVIEW` | `REJECTED` | `reject_order` | Admin, Employee, Support | Yes | Yes | Yes |
| `UNDER_REVIEW` | `CANCELLED` | `cancel_order` | Admin, Employee, Support | Yes | Yes | Yes |
| `WAITING_CUSTOMER` | `UNDER_REVIEW` | `resume_review` | Admin, Employee, Support, Customer | No | No | Yes |
| `WAITING_CUSTOMER` | `CANCELLED` | `cancel_order` | Admin, Employee, Support | Yes | Yes | Yes |
| `ASSIGNED` | `IN_PROGRESS` | `provider_start_work` | Provider | No | No | Yes |
| `ASSIGNED` | `CANCELLED` | `cancel_order` | Admin | Yes | Yes | Yes |
| `IN_PROGRESS` | `WAITING_GOVERNMENT` | `provider_pause_for_government` | Provider | No | No | Yes |
| `IN_PROGRESS` | `READY_FOR_DELIVERY` | `mark_ready_for_delivery` | Provider or Internal Staff through dedicated final-upload flow only | No | Yes | Yes |
| `IN_PROGRESS` | `REJECTED` | `reject_order` | Admin, Employee, Support | Yes | Yes | Yes |
| `IN_PROGRESS` | `CANCELLED` | `cancel_order` | Admin | Yes | Yes | Yes |
| `WAITING_GOVERNMENT` | `IN_PROGRESS` | `provider_resume_work` | Provider | No | No | Yes |
| `WAITING_GOVERNMENT` | `READY_FOR_DELIVERY` | `mark_ready_for_delivery` | Provider or Internal Staff through dedicated final-upload flow only | No | Yes | Yes |
| `WAITING_GOVERNMENT` | `CANCELLED` | `cancel_order` | Admin | Yes | Yes | Yes |
| `READY_FOR_DELIVERY` | `UNDER_REVIEW` | `return_to_internal_review` | Admin, Employee, Support | Yes | No | Yes |
| `READY_FOR_DELIVERY` | `IN_PROGRESS` | `return_to_provider` | Admin, Employee, Support | Yes | Provider Yes | Yes |
| `READY_FOR_DELIVERY` | `COMPLETED` | `complete_order` | Admin, Employee, Support | No | Yes | Yes |
| `READY_FOR_DELIVERY` | `CANCELLED` | `cancel_order` | Admin | Yes | Yes | Yes |
| `COMPLETED` | `UNDER_REVIEW` | `reopen_order` | Admin | Yes | Yes | Yes |
| `COMPLETED` | `ARCHIVED` | `archive_order` | Admin | No | No | Yes |
| `REJECTED` | `ARCHIVED` | `archive_order` | Admin | No | No | Yes |
| `CANCELLED` | `ARCHIVED` | `archive_order` | Admin | No | No | Yes |

## Validation Rules

### Transition-wide rules

- Every transition must exist in `backend/workflow/rules.py`.
- Role checks now read from the same transition registry.
- Employee/support object access still respects assigned employee ownership rules.
- Provider transitions still require assigned-provider ownership.
- Customer transitions still require customer ownership.

### Action-specific rules

- `assign_provider`
  - only from `UNDER_REVIEW`
  - all required service documents must be approved
  - `missing_document_types` must already be empty
  - provider must be approved, available, and linked to the service/category
- `resume_review`
  - `WAITING_CUSTOMER -> UNDER_REVIEW` is blocked until all requested missing docs are uploaded
- `mark_ready_for_delivery`
  - generic status endpoint cannot do this
  - dedicated final-upload flow must be used
  - required documents must remain approved
- `complete_order`
  - generic status endpoint cannot do this
  - required documents must remain approved
  - missing-document list must be empty
  - final document must exist, unless `admin_confirmation=True`
  - final document must be verified, unless `admin_confirmation=True`
- `return_to_provider`
  - requires assigned provider
  - requires reason
- `return_to_internal_review`
  - requires reason
- `reopen_order`
  - only from `COMPLETED`
  - requires reason
  - clears `completed_at`
- Raw admin order record updates
  - cannot edit finalized orders
  - cannot mutate workflow-sensitive fields directly

## Generic Status Endpoint

`/api/admin/orders/<id>/status/` is no longer a free-form status mutator.

It now dispatches only to the explicit workflow actions marked `generic_status_update=True` in the central workflow registry:

- `NEW -> UNDER_REVIEW`
- `READY_FOR_DELIVERY -> UNDER_REVIEW`
- `READY_FOR_DELIVERY -> IN_PROGRESS`
- `COMPLETED -> UNDER_REVIEW`
- `COMPLETED -> ARCHIVED`
- `REJECTED -> ARCHIVED`
- `CANCELLED -> ARCHIVED`

All other transitions must use dedicated backend services/endpoints.

## Role Matrix

| Action | Client | Employee / Support | Provider | Admin |
|---|---|---|---|---|
| Create order | Yes | No | No | No |
| Start review | No | Yes | No | Yes |
| Request missing documents | No | Yes | No | Yes |
| Upload missing documents | Yes, own order only | No | No | No |
| Assign provider | No | Yes | No | Yes |
| Provider start/resume work | No | No | Yes, assigned order only | No |
| Upload final result | No | No | Yes, assigned order only | Yes via internal final-upload endpoint |
| Verify final result document | No | Yes | No | Yes |
| Return to provider | No | Yes | No | Yes |
| Return to internal review | No | Yes | No | Yes |
| Complete order | No | Yes | No | Yes |
| Cancel order | Limited: own `NEW` order only | Limited: review-stage only | No | Yes |
| Reopen completed order | No | No | No | Yes |
| Archive final order | No | No | No | Yes |

## Tests Added

- `orders.tests.OrderAPITests.test_finalized_order_cannot_be_edited_normally`
- `orders.tests.OrderAPITests.test_generic_status_endpoint_rejects_non_generic_transition`
- `orders.tests.OrderAPITests.test_assign_provider_blocked_while_waiting_customer`
- `orders.tests.OrderAPITests.test_return_to_provider_requires_reason`
- `orders.tests.OrderAPITests.test_admin_can_reopen_completed_order_with_reason`

Existing Phase 1 workflow tests continue to pass and now exercise the stricter dispatcher/service behavior.

## Commands Run

- `..\.venv\Scripts\python.exe manage.py test orders.tests`
- `..\.venv\Scripts\python.exe manage.py test documents.tests`
- `..\.venv\Scripts\python.exe manage.py test providers.tests`
- `..\.venv\Scripts\python.exe manage.py check`
- `..\.venv\Scripts\python.exe manage.py test`
- `npm test -- --run`

## Remaining Team Decisions

- There is still no separate persisted status for:
  - approved-for-provider
  - provider-completed
  - internal-verification
  - reopened
  If the business wants these to appear independently in reporting and admin UI, new statuses will be required.
- Customer and employee cancellation rights remain as currently implemented:
  - customer can cancel only own `NEW` order
  - employee/support can cancel only review-stage orders
  This differs from the stricter example flow “cancelled by admin only”.
- `admin_confirmation=True` still allows completion without a verified final document. This remains an explicit existing-system override and should be reviewed by product/operations.
