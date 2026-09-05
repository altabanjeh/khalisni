# KHALSNI — Requirement Conflicts (Gate 1R)

## C1 — Who may create a service request

| Field | Detail |
|---|---|
| Competing statement A | `docs/SRS.md` FR2 (original wording, 2026-05-11): *"Public users can create a service request with customer data and file uploads."* |
| Competing statement B | Code at HEAD: `POST /api/orders/` → `permission_classes = [IsAuthenticated, IsCustomerRole]` (`orders/views.py`). Verified at runtime this gate: an unauthenticated `POST /api/orders/` is rejected; an authenticated customer succeeds (journey J08, contract test). |
| Supporting doc for B | `docs/current_system_full_analysis_2026-06-16.md`: *"`POST /api/orders/` is currently authenticated customer-only … public tracking remains available through `GET /api/orders/track/`."* This is the newest analysis document and post-dates the SRS. |
| Dates / authority | SRS: 2026-05-11 (baseline). Analysis doc: 2026-06-16 (later, describes the auth-hardening pass that made the change). No SRS revision between the two. |
| Actual runtime behaviour | Public visitors reach order creation by **registering** (journey J06) or through the public request flow, which provisions a **guest customer account** (`orders/services._get_or_create_public_customer`, seen in code review). The raw endpoint is authenticated-customer-only. |
| UI behaviour | The public `/create-order` route loads (route matrix PASS) but funnels the visitor through auth; `/register` is one click from every public page. |
| Latest supported interpretation | **Order creation is performed by an authenticated customer account (real or auto-provisioned guest).** The 2026-06 hardening pass is the most recent authoritative change and the code + analysis doc agree. |
| Product decision still required? | **NO — resolvable from repository evidence.** The newer authority (code + 2026-06-16 analysis) supersedes the 2026-05-11 SRS wording. |
| Action taken (Gate 2) | `docs/SRS.md` FR2 updated to state the authenticated/guest-account rule and to explicitly note it supersedes the earlier "public users" wording, citing this conflict. |
| Status | **RESOLVED (documentation aligned to implemented, newer-authority behaviour).** Not `BLOCKED_PRODUCT_DECISION`. |

## No other unresolved requirement conflicts found

Gate 1 catalogued several *evolutions* (not conflicts) which the Gate 1R review re-confirmed are consistently resolved by "newest authority wins":

| Item | Older position | Current position | Resolution |
|---|---|---|---|
| C2 Delete semantics | SRS BR8 "orders archived logically" | A1/A2 (2026-06) extend soft-delete to all admin-manageable records + visible Delete/Restore UI | Newest (A1/A2) governs; implemented (soft-delete suite, journey J19). No conflict. |
| C3 Required-document identity | A1/CE10 "validate against stable definition IDs, not names" | Code keeps a nullable `document_definition` FK **and** legacy free-text `document_type`; validation still matches on `document_type` strings | Requirement partially met — tracked as **defect D6** (deferred: needs a safe backfill migration; `services/management/commands/normalize_required_documents.py` already exists for this). Not a spec conflict, an implementation gap. |
| C4 Public price visibility | A1/CE5 "public APIs expose only selected price fields" | Fixed in Gate 2 (D2). Runtime-verified this gate: `pricing.government_fee`/`company_fee` null when flags off; `related_services` carry no raw fee columns. | Requirement now met. |
| C5 Database | SRS NFR "PostgreSQL for production" | `docker-compose.yml` provisions Postgres; local dev + local tests + the Gate 1R E2E harness use SQLite (throwaway) | No intent conflict. Prod path is Postgres; a Postgres CI job is a tracked infra item (D-DB3). |
| C6 Support-role UI | PRD "Support … UI remains focused on customer/admin/provider dashboards" | Code gives `support` its own routes (`/employee/service-categories`, `/employee/service-relations`) and a shared employee shell | Newer code exposes more Support UI than the PRD anticipated. Not a defect; PRD text is stale. Recorded. |

## Ambiguities re-checked at runtime

| Ambiguity (Gate 1) | Gate 1R finding |
|---|---|
| "duration ranges rather than only one fixed duration" | Code supports **three** modes (`duration`, `duration_range`, `date_range`); `delivery_time` payload renders a `label` (journey J03). Exceeds the written requirement. Resolved — accepted. |
| Notifications completeness (`unread-count`, `mark-all-read` missing) | Both endpoints **added and runtime-tested** in Gate 2 (D8); authz matrix confirms `unread-count` is scoped per role. |
