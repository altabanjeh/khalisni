# Mobile Permission Matrix

## Role Mapping

| Backend role | Mobile experience |
| --- | --- |
| `customer` | Client app |
| `employee` | Employee app |
| `support` | Employee app |
| `provider` | Provider app |
| `admin` | Admin app |

## Core Access Matrix

| Capability | Customer | Employee | Provider | Admin | Notes |
| --- | --- | --- | --- | --- | --- |
| Login | Yes | Yes | Yes | Yes | JWT auth |
| View own profile | Yes | Yes via `me` | Yes via `me` | Yes via `me` | Only customer has update endpoint today |
| Update own profile | Yes | Gap | Gap | Gap | Backend gap for non-customer self-service |
| Browse services | Yes | Yes | Yes | Yes | Public endpoints |
| Create order | Yes | No | No | Not through raw admin endpoint | Public/customer flow only |
| Track public order | Yes | Yes | Yes | Yes | Anonymous/public flow also exists |
| View own orders | Yes | No | No | Yes | Employee/provider have scoped work lists instead |
| View review queue | No | Yes | No | Yes | Employee/admin scoped through `/admin/orders/` |
| View provider assigned orders | No | No | Yes | Yes | Admin can inspect all orders |
| Request missing documents | No | Yes | No | Yes | Requires `orders.request_missing_documents` |
| Upload customer documents | Yes | No | No | No | Customer only through customer order flow |
| Verify documents | No | Yes | No | Yes | Requires `documents.verify_document` |
| Assign provider | No | Yes | No | Yes | Requires `orders.assign_order` |
| Provider update work status | No | No | Yes | No | Provider-only workflow endpoint |
| Upload final document | No | No | Yes | Yes | Provider uses provider endpoint, admin can upload via admin flow |
| Add internal note | No | Yes | Yes | Yes | Scope depends on order visibility |
| Add customer-visible note | No | Yes | No | Yes | Internal roles only |
| Complete order | No | Yes | No | Yes | Requires workflow permission |
| Reject order | No | Yes | No | Yes | Requires rejection permission |
| Cancel order | Limited | Limited | No | Yes | Customer only for `NEW`; employee only review-stage; admin broad |
| Rate completed order | Yes | No | No | No | Customer only |
| View notifications | Yes | Yes | Yes | Yes | All role groups have notification view permission |
| Send manual notification | No | Yes | No | Yes | Permission-based |
| View reports | Scoped via summary | Yes | Scoped via summary | Yes | Admin full; employee report dashboard; provider/customer via scoped summary |
| Manage users | No | No | No | Yes | Includes direct permissions |
| Manage services and prices | No | No | No | Yes | `services.manage_service_prices` |
| Manage providers | No | No | No | Yes | Admin only |
| Manage payments | No | No | No | Yes | Admin or permission-based status viewing |
| Manage public-site content | No | No | No | Yes | Admin only |
| View audit logs | No | No | No | Yes | Admin only |

## Backend Permission Reference

### Customer group
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

### Employee/support group
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

### Provider group
- `orders.view_order`
- `orders.process_order`
- `documents.view_document`
- `documents.add_document`
- `documents.upload_final_document`
- `notifications.view_notification`

### Admin group
- Broad permission set across app models
- Additional serializer restrictions:
  - only super admin can create/assign admin users
  - only super admin can change admin-level users

## Mobile UX Enforcement Rules

The mobile app should enforce the following client-side visibility rules:

1. Hide tabs/stack entries the user cannot access by role.
2. Hide action buttons if `allowed_actions` from order payload do not permit them.
3. Hide admin-only forms when user lacks admin role, even if a route is guessed.
4. Hide provider status actions when order is not assigned to that provider.
5. Hide customer cancellation when order is not `NEW`.
6. Hide completion/rejection actions when backend `allowed_actions` do not allow them.
7. Treat `support` exactly like employee unless product explicitly separates the experience.

## Order Allowed Actions Contract

For order-centric screens, mobile should rely on backend `allowed_actions` as the primary UX contract:

- `can_view`
- `available_status_transitions`
- `can_cancel`
- `can_upload_customer_document`
- `can_view_missing_documents_form`
- `can_submit_rating`
- `can_request_documents`
- `can_assign_provider`
- `can_add_internal_note`
- `can_add_customer_note`
- `can_verify_documents`
- `can_send_manual_notification`
- `can_reject`
- `can_complete`
- `can_upload_final_document`

This is the safest way to keep mobile behavior aligned with backend workflow rules.
