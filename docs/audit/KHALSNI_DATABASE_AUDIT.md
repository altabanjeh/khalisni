# KHALSNI — Database & Data-Integrity Audit

Gate 1 · 2026-09-05 · HEAD `574753e`

Method: read `*/models.py` (deep for `services`, `orders` Order region, `accounts` CustomUser, `documents`, `core`; class+Meta list for the rest), ran `makemigrations --check --dry-run` (clean) and the full test suite (creates + migrates a fresh test DB from 65 migrations — **PASS**, 197 tests). No production data was touched. Engine for the local run: SQLite (default); production target is PostgreSQL (`docker-compose.yml`).

---

## 0. Gate 1R runtime addendum (2026-09-05)

- **Clean migration from scratch, verified twice this gate:** the Gate 1R E2E harness built a brand-new SQLite DB via `manage.py migrate` (67 migrations) + `seed_demo` with **zero errors**, and the 249-test backend suite each build a fresh test DB. `python manage.py makemigrations --check --dry-run` → **No changes detected**.
- **New migrations since Gate 1:** `accounts/0007_customuser_token_version`, `services/0010_*` (FK `CASCADE→PROTECT` on `ServiceRelation`/`ServiceProviderAssignment`, new partial-unique `unique_undeleted_required_document_definition_code`). Both additive; applied cleanly on seeded data.
- **Constraint behaviour exercised at runtime:** journey J19 soft-deletes then restores a `Service` (partial-unique `slug` survives the round-trip); `services/tests_remediation` proves the new `code` constraint and the FK `PROTECT`; `notifications/tests_remediation` exercises the `notification_read_state_consistent` CheckConstraint via the new bulk `mark-all-read`.
- **Transactional integrity:** journey J20 drives an order review→assign→execute→complete→archive with `OrderStatusLog` + `AuditLog` rows created per step; no partial-state left behind.
- **`DJANGO_SQLITE_NAME`** env hook added to `config/settings.py` (test-infra only; Postgres branch and default unchanged) so the E2E harness uses a throwaway DB and never touches `backend/db.sqlite3`.
- **No production data touched.** Postgres upgrade path still not exercised (no staging dump) — tracked as D-DB3.
- D6/D7/D-DB1/D-DB2 status unchanged from Gate 2 (D7/D-DB2 fixed; D6/D-DB1 deferred with reason). Note: `services/management/commands/normalize_required_documents.py` **already exists** and is the intended safe path for the deferred D6 backfill.

---

## 1. Schema-level results

### Soft delete
`core.SoftDeleteModel` (`is_deleted` [db_index], `deleted_at`, `deleted_by` [SET_NULL], `delete_reason`, `soft_delete()`, `restore()`) is applied to: `CustomUser`, `ServiceCategory`, `Service`, `RequiredDocumentDefinition`, `ServiceRelation`, `ServiceProviderAssignment`, `Address`, `ServiceRequiredDocument`, `Organization`, `Branch`, `OrganizationMembership`, `OrganizationBranding`, `PartnerServiceConfig`, `ProviderProfile`, `Advertisement`, `Notification`, `NotificationTemplate`, `OrderNote`, `OrderIssue`, `Rating`, and the `help_guides` model family. `Order`, `OrderStatusLog`, `OrderAssignmentHistory`, `MissingDocumentRequest`, `Payment`/`Invoice`/`CommissionRule`/`ProviderPayout`, `AuditLog`, `PublicPageContent`, `SiteTheme` are **not** soft-deletable — orders use the `ARCHIVED` status instead (SRS BR8), audit is immutable, payments have no delete path.

**Gap (MEDIUM-LOW, D-DB1):** `SoftDeleteModel` has **no custom manager / `QuerySet`**. Deleted-row exclusion is the responsibility of each view/selector. Reviewed catalog & public paths do it correctly (`visible_services_queryset`, `AdminDeleteGuardMixin.get_queryset`), but any future/unaudited queryset that omits `.filter(is_deleted=False)` will surface deleted rows. A1/A2 explicitly asked for `.active()/.deleted()/.with_deleted()` helpers — not implemented as managers.

### Foreign keys & deletion behaviour
| Relation | on_delete | Assessment |
|---|---|---|
| `Service.category → ServiceCategory` | `PROTECT` | Correct — prevents orphaning services. |
| `ServiceCategory.parent → self` | `PROTECT` | Correct + `clean()` cycle guard. |
| `Service.organization → Organization` | `SET_NULL` | OK (global services have no org). |
| `ServiceRequiredDocument.document_definition → RequiredDocumentDefinition` | `PROTECT`, **null=True** | PROTECT good; nullable is the D6 concern. |
| `ServiceRelation.source/target_service → Service` | `CASCADE` | Hard cascade — deleting a `Service` row would delete its relations. Since `Service` is soft-deleted (never row-deleted through the app), this is latent only, but inconsistent with the soft-delete intent. |
| `ServiceProviderAssignment.service/provider` | `CASCADE` | Same latent-cascade note. |
| `Address.user → CustomUser` | `CASCADE` | OK. |
| `SoftDeleteModel.deleted_by` | `SET_NULL` | Correct — preserves history if the actor is removed. |
| `ServiceRelation.created_by` | `PROTECT` | Prevents deleting a user who authored relations. |
| Order FKs (`customer`, `service`, `assigned_provider`, `assigned_employee`, `organization`, `branch`) | mix of PROTECT/SET_NULL (per `orders/models.py`, not fully enumerated this gate) | Order also stores `*_snapshot` strings so historical reporting survives catalog changes — good. |

### Unique constraints & indexes (well-modelled)
- Partial unique constraints used correctly for soft-deletable rows: `ServiceRelation (source,target,type) WHERE NOT is_deleted`; `ServiceRequiredDocument (service,document_type) WHERE NOT is_deleted` and `(service,document_definition) WHERE NOT is_deleted`; `ServiceProviderAssignment (service,provider) WHERE NOT is_deleted`; `RequiredDocumentDefinition (code) WHERE NOT is_deleted AND is_active` and `(name_ar) WHERE NOT is_deleted AND is_active`.
- `CustomUser`: partial unique on non-empty `phone` and non-empty `national_id`; unique `email`.
- `Address`: partial unique — one `is_default=True` per user.
- `Service`: `CheckConstraint`s `base_price>=0`, `government_fee>=0`, `service_fee>=0`, `estimated_duration>=1`; unique `slug`, unique `service_number`.
- `Document`: `CheckConstraint file_size>=0`.
- Rich `Index` sets on `Service`/`ServiceCategory` including `(is_deleted, is_active)` and `(show_on_public_site, is_active)` — good for the public catalog queries.

**Gap (LOW, D7):** `RequiredDocumentDefinition.code` = `SlugField(unique=False)`. Uniqueness relies on (a) a **partial** unique index (active + non-deleted only) and (b) a `clean()` check that filters `is_deleted=False, is_active=True`. Two soft-deleted/inactive definitions may share a `code`; the `clean()` check is also race-prone (no full unique index to backstop concurrent inserts). A1 called `code` a "unique identifier".

### Nullable fields of note
- `ServiceRequiredDocument.document_definition` (null) — D6.
- `Service.estimated_duration_min/max`, `delivery_start_date/end_date` (null) — correct, mode-dependent; `save()` nulls the irrelevant set.
- Catalog `image` fields (null) — intentional (UI6).

### Enums / statuses
`core/choices.py`: `OrderStatus` (11), `OrderPriority` (4), `DocumentType` (7 — note mixed casing: `CUSTOMER_UPLOAD` value `"CUSTOMER_UPLOAD"` vs `national_id` lowercase — cosmetic), `NotificationType` (5), `PaymentStatus` (7), `UserRole` (5). `Service` has its own `Scope`, `PriceType`, `DurationUnit`, `DeliveryTimeMode` text-choices.

### Audit fields
`created_at`/`updated_at` present on catalog + user + relation models. `Order`/`Document`/`AuditLog` carry timestamps. `SoftDeleteModel` adds `deleted_at`/`deleted_by`/`delete_reason`.

---

## 2. Transactions & concurrency

| Path | Handling | Assessment |
|---|---|---|
| Order status transitions | `orders/services.py` functions run under `transaction.atomic()` (e.g. `update_order_status` chain, `AdminOrderRecordViewSet.destroy`) | OK |
| Delete guard | `AdminDeleteGuardMixin.destroy` wraps `perform_delete_action` + audit in `transaction.atomic()` with failure audit on exception | OK |
| Category reorder | 2026-06 pass wrapped it in a transaction + validates all submitted IDs against a scoped queryset | OK |
| Recommendation notifications on completion | created "in the same transaction" per `docs/service_dependency_rules.md`; `order_completion.py` | OK |
| Provider assignment race (two admins assign same order) | relies on status precondition (`UNDER_REVIEW`) re-checked inside the action; no `select_for_update` observed | LOW risk — last-writer wins but transition guard limits damage |
| Guest customer creation (`_get_or_create_public_customer`) | loops to find a free `@guest.khalisni.local` email; not locked | LOW — unique constraint on `email` will raise on true collision |
| Duplicate order prevention | none explicit (a customer can submit the same service twice); prereq checks are the only gate | matches spec (no "one open order per service" rule stated) |

---

## 3. Migrations

- `python manage.py makemigrations --check --dry-run` → **No changes detected** (no model/migration drift).
- Fresh-DB path exercised: the test runner builds a new DB by applying all 65 migrations + `seed_initial_data` + `seed_demo` — completed without error across 197 tests.
- Upgrade path from an existing DB was **not** tested this gate (no staging dump available). The catalog-enhancement migrations (adding `RequiredDocumentDefinition`, `document_definition` FK, delivery-mode fields, price-visibility flags, `SoftDeleteModel` fields across many tables) are the highest-risk historical set — `docs/service-import/` and A6/A7 report they applied cleanly and the data-migration for required documents was handled.
- **Data quality note (from `docs/`):** `check_system_consistency` previously reported `KH-2026-000002` / `KH-2026-000003` missing approved required documents, and the service import produced duplicate Arabic category names (the model now rejects edits to those rows). These are seed/live-data issues, not schema defects.

---

## 4. Destructive-action safety (SRS BR8 / A1 CE7 / A2)

| Action | Behaviour | Safe? |
|---|---|---|
| Admin "delete" order | `AdminOrderRecordViewSet.destroy` → `archive_order()` (status → `ARCHIVED`, full timeline + audit kept) | Yes |
| Admin delete catalog record | `AdminDeleteGuardMixin` → `soft_delete()` (row kept, `is_active=False`, audit written); requires re-entered admin password | Yes |
| Delete category with active services | `ServiceCategory.clean()` blocks deactivation; `Service.category` is `PROTECT` | Yes |
| Delete document | soft delete on `Document`; file row + metadata retained | Yes |
| Delete user / provider | `CustomUser` soft delete; `providers` restore also restores the user | Yes (login/access implications not deep-traced) |
| Audit log deletion | no API | Yes (immutable) |
| Hard `DELETE` on a soft-delete model via API | `AdminDeleteGuardMixin.perform_delete_action` calls `soft_delete()` when available, only falls back to `perform_destroy` for non-soft models | Yes |

No path was found by which normal admin UI actions physically destroy a business record contrary to spec.

---

## 5. Database findings summary

| ID | Severity | Finding |
|---|---|---|
| D-DB1 | MEDIUM-LOW | `SoftDeleteModel` has no manager/queryset; deleted-row exclusion is per-view and not centrally guaranteed (A1/A2 asked for `.active()/.deleted()/.with_deleted()`). |
| D6 | LOW | `ServiceRequiredDocument.document_definition` FK nullable + legacy free-text `document_type`/`name_ar` retained (CE1/CE10 intent only partly met). |
| D7 | LOW | `RequiredDocumentDefinition.code` not globally unique; `clean()` uniqueness check is race-prone. |
| D-DB2 | LOW | `ServiceRelation` / `ServiceProviderAssignment` FKs to `Service` are `CASCADE` while `Service` is soft-deleted — latent inconsistency (no live trigger path). |
| D-DB3 | INFO | Local dev + local test run on SQLite; production Postgres not exercised this gate; `backend/db.sqlite3` present in the working tree. |
