# Current System Full Analysis

Date: 2026-06-16

## Scope

Reviewed the current Django backend, React web frontend, and React Native mobile app to confirm:

- security and tenant-isolation behavior
- frontend and mobile correctness
- API scalability and abuse protection
- test coverage and release readiness
- documentation accuracy

This document reflects the current codebase after the 2026-06-16 hardening pass.

## Validation Baseline

Target validation commands for this state:

- `backend`: `python manage.py check`, `python manage.py test`, `python manage.py check_system_consistency`
- `frontend`: `npm run lint`, `npm test`, `npm run build`
- `mobile`: `npm run typecheck`

## Executive Summary

The system is materially safer than the earlier audit snapshot. The main production-facing gaps that were confirmed and fixed in this pass were:

- provider and customer admin data leaking across organization scope
- session tokens being silently promoted into persistent browser storage
- missing mobile rendering of `provider_instructions`
- browser crash risk from corrupted order-draft local storage
- lack of throttling on sensitive public endpoints
- disabled pagination on several high-volume admin/customer/provider APIs
- stale documentation claiming missing APIs or outdated auth/order behavior

The system is not risk-free. The largest remaining issues are workflow bypass risk in some admin order paths, limited mobile runtime test coverage, and overall backend test runtime.

## Closed Findings

### Backend authorization and tenant isolation

Resolved:

- `backend/providers/views.py`
  Provider admin queries are now organization-scoped and order/service filters resolve through scoped records.
- `backend/services/views.py`
  Category reorder now uses scoped querysets, validates all submitted IDs, and runs inside a transaction.
- `backend/accounts/views.py`
  Customer profile admin queries now respect organization scope for non-platform admins.

Regression coverage added for:

- provider organization scoping
- scoped provider candidate lookup by order
- category reorder with out-of-scope IDs
- customer profile admin scope

### Web auth/session hardening

Resolved:

- `frontend/src/api/client.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/public/LoginPage.jsx`

Current behavior:

- default login is session-only
- persistent login requires explicit remember-me selection
- refresh updates only the active storage layer
- logout clears both storage layers defensively

Regression coverage added for:

- session login storage
- remember-me login storage
- refresh without session-to-local promotion
- logout cleanup behavior

### Mobile correctness and admin safety

Resolved:

- `mobile/src/features/provider/screens/ProviderOrderDetailScreen.tsx`
  now renders `provider_instructions`
- `mobile/src/types/order.ts`
  includes `provider_instructions`

Improved:

- admin mobile screens now validate inputs before submit
- malformed JSON is blocked client-side
- destructive changes require confirmation

### Frontend robustness

Resolved:

- `frontend/src/pages/customer/CustomerCreateOrderPage.jsx`
  no longer crashes on corrupted draft storage

Added:

- versioned draft serialization
- expiry handling
- safe cleanup and recoverable user messaging

### API throttling

Resolved:

- `backend/config/settings.py`
  now enables DRF throttling with environment-configurable rates
- scoped throttles added for:
  - order tracking
  - missing service request submission
  - forgot/reset password flows

Regression coverage added for all three throttle scopes.

### Pagination and client compatibility

Resolved:

- default DRF pagination re-enabled on selected high-volume endpoints in:
  - orders
  - notifications
  - documents
  - providers
  - accounts
  - services
- web and mobile list clients normalize both array and paginated DRF payloads

Regression coverage added for:

- customer orders paginated response shape
- admin users paginated response shape
- frontend paginated list normalization

## Confirmed Current Behavior

### Authentication and account APIs

- forgot-password exists: `POST /api/auth/forgot-password/`
- reset-password exists: `POST /api/auth/reset-password/{token}/`
- notification mark-read exists: `PATCH /api/notifications/{id}/read/`

### Order creation

- `POST /api/orders/` is currently authenticated customer-only
- public tracking remains available through `GET /api/orders/track/`

### Notification gaps still present

Still missing:

- mark-all-as-read endpoint
- unread-count endpoint
- mobile push device registration and dispatch pipeline

## Remaining Risks

### Backend

- `backend/orders/views.py`
  `AdminOrderRecordViewSet` still exists as a raw-record surface and remains higher risk than dedicated workflow actions.
- `backend/orders/services.py` and related admin status flows still deserve a focused review to ensure generic status changes never bypass final-document rules.
- `backend/public_site/views.py`
  missing service requests remain a global internal queue because the model has no organization key; if tenant ownership is needed later, that requires a model-level design change.
- live data still needs cleanup:
  `check_system_consistency` currently reports `KH-2026-000002` and `KH-2026-000003` as missing approved required documents.

### Frontend

- some pages still rely on client-side pagination or list slicing patterns even though server pagination is now available
- there is no browser E2E coverage for the highest-risk customer/admin flows

### Mobile

- mobile currently has type-check validation only; no automated runtime or navigation tests exist yet
- admin mobile tools are safer now, but they still expose operational workflows in a compact shell rather than full production-grade task UX

### Quality and operations

- backend test runtime remains relatively slow; no safe suite-wide optimization was applied in this pass because the slow path is spread across many per-test setup patterns and should be refactored carefully rather than guessed at

## Recommended Next Enhancements

### P0

1. tighten or remove remaining raw admin order update/delete paths
2. add mobile runtime tests and navigation smoke coverage
3. add unread-count and mark-all-read notification APIs

### P1

1. finish moving large frontend pages to server-driven pagination UX
2. review provider/document payload minimization for least-privilege exposure
3. profile backend tests and convert safe repeated setup into class fixtures/factories

### P2

1. replace remaining raw-ID/raw-JSON mobile admin tools with pickers and structured forms
2. add browser E2E coverage for login, order creation, and admin review flows
