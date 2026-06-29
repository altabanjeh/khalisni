# Codex Prompt — Khalisni Service Catalog, Public Site, Soft Delete, and UI Simplification Enhancement

## 0. Mission

You are working on the **Khalisni** project, a Django 5 + Django REST Framework backend, React + Vite web portal, and Expo / React Native mobile app.

Your task is to enhance the service-management architecture without breaking existing workflows.

The required outcome is a cleaner and more standard service-catalog workflow where:

1. Admins add/manage reusable required-document definitions in one master table.
2. When creating or editing a service, admins select required documents from that master table instead of typing duplicate document names directly inside the service form.
3. If a needed document does not exist, the admin must add it first in the document-definition table, then link it to the service.
4. Services can define delivery time either as normal expected duration or as a configurable **from-date / to-date period** when the service can take longer or has a known window.
5. Public service pricing can be controlled field-by-field: total price, government fee, and company fee must be stored internally, but the admin chooses what is visible on the public site.
6. The public site must show service categories as cards, and each category card must open/list the services inside that category.
7. Deletion must be system-level soft deletion, not physical database deletion. Deleted records must be hidden from normal system usage and public views, with admin/audit recovery support where appropriate.
8. The whole system must be simplified as much as possible without removing required features. Anything that can be calculated or handled automatically should be moved to backend logic, not shown as unnecessary UI complexity.

Do this in a professional, production-safe, testable way.

---

## 1. Architecture Context You Must Preserve

Before changing code, inspect the repository and confirm the current implementation. Do not guess file names or fields.

Known architecture from the existing project documentation:

- Backend: Django 5 + Django REST Framework.
- Web: React + Vite.
- Mobile: Expo / React Native.
- Backend modules include:
  - `backend/services/` for service catalog, categories, service relations, required documents, and provider assignments.
  - `backend/orders/` for order lifecycle and order creation.
  - `backend/documents/` for uploaded customer/provider documents.
  - `backend/public_site/` for public homepage/content/theme/advertisements and missing-service requests.
  - `backend/audit/` for audit log.
  - `backend/core/delete_guard.py` for delete guard behavior.
  - `backend/config/permissions.py` and `backend/organizations/selectors.py` for authorization and tenant scoping.
- Existing catalog models include `ServiceCategory`, `Service`, `ServiceRequiredDocument`, `ServiceRelation`, `ServiceProviderAssignment`, and `Address`.
- Existing workflow depends on customer order creation, document validation, internal review, provider execution, final-document delivery, payments, notifications, and audit logs.
- Public users browse service categories and service details before authenticated order creation.
- Admins currently manage catalog, users, providers, public content, notifications, payments, reports, and audit logs.
- Existing architecture already has partial delete guard / soft-disable behavior in some admin viewsets, but deletion semantics are inconsistent.

Keep the current domain structure. Improve it; do not rewrite the whole project.

---

## 2. Non-Negotiable Rules

Follow these rules strictly:

1. **No physical deletes for normal system delete actions.**
   - Replace hard delete behavior with soft delete / deactivate behavior unless the repo already has a safe archival pattern that fully satisfies this requirement.
   - Deleted records must stay in the database for audit, recovery, and traceability.

2. **Do not break existing order workflows.**
   - Customer order creation must still validate required documents.
   - Staff must still verify documents.
   - Missing-document cycles must still work.
   - Provider assignment and completion must still work.

3. **Do not mix document definitions with uploaded documents.**
   - Uploaded files belong to the order/document lifecycle.
   - Required-document definitions belong to the service catalog configuration.

4. **Do not duplicate required-document text inside every service.**
   - Create or reuse a master document-definition table.
   - Link services to document definitions through a service-rule table.

5. **Public output must obey visibility flags.**
   - Internal APIs may show total price, government fee, and company fee to authorized users.
   - Public APIs must expose only what the admin configured as public-visible.

6. **Keep the UI simple.**
   - Do not add extra manual fields when backend can compute them.
   - Do not expose technical flags to normal users.
   - Use clean admin forms and clear sections.

7. **All changes must be tenant-aware where the current repo is tenant-aware.**
   - Respect existing `Organization`, `Branch`, `OrganizationMembership`, and partner-scoped catalog behavior.

8. **Every meaningful change needs tests.**
   - Backend model/serializer/API tests.
   - Frontend behavior tests where existing test framework supports it.
   - Mobile API compatibility updates if any shared contract changes affect mobile.

---

## 3. Backend Requirements

### 3.1 Required Document Master Table

Inspect `backend/services/models.py`, `backend/documents/models.py`, and existing migrations.

If a reusable document-definition model already exists, improve it. If it does not exist, create a new model in the catalog domain, preferably in `backend/services/models.py`, because this is catalog configuration, not uploaded document storage.

Recommended model name:

```python
RequiredDocumentDefinition
```

Alternative acceptable names if they fit existing naming:

```python
DocumentType
RequiredDocumentType
CatalogDocumentRequirement
```

The model should support at minimum:

- `id`
- `name_ar`
- `name_en`
- `code` or slug-like unique identifier
- `description_ar`
- `description_en`
- `is_active`
- `is_deleted`
- `deleted_at`
- `deleted_by`
- `created_at`
- `updated_at`
- optional `organization` if the existing catalog is tenant-specific
- optional `sort_order`
- optional file constraints if the current system already stores them per requirement:
  - allowed extensions
  - allowed MIME types
  - max file size

Constraints:

- Prevent duplicate active names/codes in the same scope.
- Deleted definitions must not appear in normal selectors.
- A document definition used by existing service rules should not be physically deleted.
- If a document definition is deleted, handle existing service links safely:
  - either prevent delete while in use, or
  - soft-delete it and hide it from new service selection while preserving existing historical rules.

### 3.2 Refactor `ServiceRequiredDocument`

Update the service-required-document relationship to reference the master document-definition table.

Target relationship:

```python
ServiceRequiredDocument
    service -> Service
    document_definition -> RequiredDocumentDefinition
```

Keep or add fields such as:

- `is_required`
- `is_active`
- `is_deleted`
- `instructions_ar`
- `instructions_en`
- `sort_order`
- `requires_verification`
- `accepted_file_types` only if this is not already inherited from the definition
- `max_file_size` only if this needs per-service override

Rules:

- A service cannot link the same active document definition twice.
- Public service detail must return the linked documents in a stable ordered list.
- Customer order creation must validate uploaded documents against the service linked document definitions.
- Missing-document request workflow must use the same canonical document definition IDs/codes, not fragile free-text strings.
- Preserve backward compatibility where possible by returning both stable `id/code` and display names.

### 3.3 Data Migration

Create a safe migration path.

If `ServiceRequiredDocument` currently stores document names or document types as strings:

1. Extract distinct existing document names/types.
2. Create one `RequiredDocumentDefinition` row per distinct type/name.
3. Link every existing `ServiceRequiredDocument` row to the correct definition.
4. Preserve old values temporarily only if needed for a safe migration.
5. Remove or deprecate old duplicate fields after data is migrated and tests pass.

Add a management command if the migration would be too risky to do fully inside a migration.

Recommended command:

```bash
python manage.py normalize_required_documents
```

The command should be idempotent.

---

## 4. Service Delivery Time Requirements

### 4.1 Service Catalog Delivery Configuration

Enhance service delivery configuration so each service can support either:

1. **Expected duration mode**
   - Example: expected completion in 3 days, 10 days, 30 days.

2. **Date-range mode**
   - Example: from `2026-07-01` to `2026-09-30`.
   - This is needed for services that can take much longer than normal or depend on government/seasonal/administrative timing.

Recommended fields on `Service` or a related service-delivery configuration model:

```python
delivery_time_mode = choices("duration", "date_range")
expected_duration_days = PositiveIntegerField(null=True, blank=True)
delivery_start_date = DateField(null=True, blank=True)
delivery_end_date = DateField(null=True, blank=True)
delivery_note_ar = TextField(blank=True)
delivery_note_en = TextField(blank=True)
```

Validation:

- If mode is `duration`, `expected_duration_days` is required and date range is optional/ignored.
- If mode is `date_range`, both `delivery_start_date` and `delivery_end_date` are required.
- `delivery_end_date` must be greater than or equal to `delivery_start_date`.
- Public serializers must return a clean display object, not raw confusing fields.

Recommended public response shape:

```json
{
  "delivery_time": {
    "mode": "date_range",
    "label": "From 2026-07-01 to 2026-09-30",
    "start_date": "2026-07-01",
    "end_date": "2026-09-30"
  }
}
```

For duration mode:

```json
{
  "delivery_time": {
    "mode": "duration",
    "label": "Expected completion: 10 days",
    "expected_duration_days": 10
  }
}
```

### 4.2 Order Snapshot Behavior

When a customer creates an order, snapshot the service delivery configuration onto the order.

Reason: service configuration may change later, but old orders must keep their original delivery expectation.

Recommended order snapshot fields if not already present:

```python
expected_delivery_mode
expected_duration_days_snapshot
expected_delivery_start_date
expected_delivery_end_date
expected_delivery_note_snapshot
```

If the current `Order` model already has `expected_delivery_date`, keep it and compute it in backend logic:

- For duration mode: calculate from order creation date + expected days.
- For date-range mode: store the start/end range and optionally set `expected_delivery_date = delivery_end_date` for reporting compatibility.

Do not force admin users to manually fill values that backend can calculate.

---

## 5. Price Visibility Requirements

The system currently has:

- total price
- government fee
- company fee

Keep all financial values internally.

Add visibility controls so the admin can decide what appears on the public site.

Recommended fields on `Service`, `PartnerServiceConfig`, or whichever model currently owns public pricing:

```python
show_total_price_public = BooleanField(default=True)
show_government_fee_public = BooleanField(default=False)
show_company_fee_public = BooleanField(default=False)
public_price_note_ar = TextField(blank=True)
public_price_note_en = TextField(blank=True)
```

If partner-specific pricing already exists in `PartnerServiceConfig`, put visibility flags there when pricing differs by partner/organization. Otherwise put them on `Service`.

Public API behavior:

- If `show_total_price_public = true`, expose total price.
- If `show_government_fee_public = true`, expose government fee.
- If `show_company_fee_public = true`, expose company fee.
- Hidden fields must not appear in public response, or must appear as `null` only if the frontend contract requires fixed keys.
- Internal admin APIs can return all values.

Recommended public response:

```json
{
  "pricing": {
    "total_price": "20.00",
    "government_fee": null,
    "company_fee": null,
    "public_note": "Fees may change depending on the government department."
  }
}
```

Add serializer tests to prove hidden price parts are not leaked publicly.

---

## 6. Public Site Category Cards

The public site must show categories as cards. When a customer opens a category, they should see the services inside that category.

### 6.1 Backend Public API

Inspect the current public category endpoint:

```text
GET /api/services/categories/
```

Enhance it or add a dedicated endpoint if cleaner:

```text
GET /api/public-site/service-categories/
GET /api/public-site/service-categories/{slug}/services/
```

Recommended category card payload:

```json
{
  "id": 1,
  "slug": "passports",
  "name_ar": "الجوازات",
  "name_en": "Passports",
  "description_ar": "...",
  "description_en": "...",
  "icon": "passport",
  "image": "/media/...",
  "service_count": 12,
  "sort_order": 10
}
```

Rules:

- Only active and not-deleted categories appear publicly.
- Only categories with visible public services should appear unless admin explicitly enables empty-category display.
- Service count must exclude hidden/deleted/inactive services.
- The category service list must include only public-visible active services.
- Respect tenant/organization public visibility rules already used by current service APIs.

### 6.2 Web Frontend

Update public website pages:

- Homepage category cards section if present.
- Services page.
- Service details navigation.

Expected UX:

1. Public user opens the public site.
2. They see categories as clean cards.
3. They click a category card.
4. They see services inside that category.
5. They open a service and see required documents, public price fields, and delivery time display.

Do not overload the public site with admin fields.

### 6.3 Mobile

If the mobile client uses the same service/category public APIs, update the mobile API types and screens so they continue to work.

Do not leave backend/frontend/mobile contracts mismatched.

---

## 7. Soft Delete and System-Level Delete Standardization

The user must be able to delete records from the system UI, but the delete must happen at system/application level, not by physically deleting database rows.

### 7.1 Create or Reuse a Soft Delete Base Pattern

Inspect current `backend/core/delete_guard.py`, model mixins, and viewsets.

Create or standardize a reusable soft-delete pattern, such as:

```python
class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    delete_reason = models.TextField(blank=True)

    class Meta:
        abstract = True
```

Use default querysets/managers carefully:

- Normal app queries exclude deleted records.
- Admin trash/recovery endpoints can include deleted records.
- Reports should exclude deleted records unless explicitly auditing deleted items.

### 7.2 Apply Soft Delete to Important Domain Models

At minimum apply or confirm consistent soft delete for:

- `ServiceCategory`
- `Service`
- `RequiredDocumentDefinition` or equivalent master document table
- `ServiceRequiredDocument`
- `ServiceRelation`
- `ServiceProviderAssignment`
- `Address`
- public-site CMS records where deletion is allowed
- notifications/templates if deletion exists
- provider profiles / organizations only if current business rules allow deletion; otherwise deactivate safely

For order and document records:

- Be very careful. Orders and uploaded documents are audit-critical.
- Prefer archive/cancel/deactivate states instead of delete where deletion would harm traceability.
- If a UI delete exists for documents, keep the file row soft-deleted and hidden while preserving audit.

### 7.3 Admin Restore / Trash Behavior

Add admin-only ability to view deleted records where useful.

Recommended endpoints:

```text
GET /api/admin/deleted-records/?model=services.Service
POST /api/admin/services/{id}/restore/
```

If generic deleted-record browsing is too large, implement restore per model viewset.

Rules:

- Restore must be admin-only.
- Restore must validate uniqueness conflicts.
- Restore must create an audit log.
- Delete must create an audit log.
- If the existing delete guard requires password confirmation, keep it for destructive actions.

### 7.4 Frontend Delete UX

Replace hard delete buttons with:

- “Delete from system” or Arabic equivalent.
- Confirmation dialog.
- Optional reason field for sensitive records.
- Explain that the item will be hidden, not removed from history.

Normal lists must not show deleted records.

---

## 8. UI Simplification Requirements

Simplify the admin service-management UI without removing features.

### 8.1 Service Create/Edit Form

Make the service form clean and grouped:

1. Basic info
   - Arabic/English name
   - category
   - description
   - active/public visibility

2. Required documents
   - searchable multi-select from master document definitions
   - add/edit document-definition shortcut opens the document library screen, not inline uncontrolled duplication
   - allow per-service instruction if needed

3. Pricing
   - total price
   - government fee
   - company fee
   - public visibility checkboxes
   - public price note

4. Delivery time
   - mode selector: duration or date range
   - show only relevant fields based on mode

5. Provider/relations/advanced configuration
   - keep existing capabilities, but hide advanced settings behind a collapsible section if they are not needed for normal service creation

### 8.2 Backend Automation

Move these to backend logic where possible:

- service slug/code generation
- price display object building
- delivery label building
- order delivery snapshot
- required-document validation
- service count for category cards
- deleted-record filtering
- audit log writing

Do not make the admin manually maintain computed values.

### 8.3 Public UI

Public service detail should show only customer-relevant fields:

- Service name and description
- Category
- Required documents list
- Public pricing according to visibility rules
- Delivery time display
- Call-to-action to start order

No internal flags, no hidden fees, no tenant/security implementation details.

---

## 9. API and Serializer Requirements

Update backend serializers carefully.

### 9.1 Public Service Detail Serializer

Must include:

```json
{
  "id": 1,
  "slug": "service-slug",
  "category": {...},
  "required_documents": [
    {
      "id": 10,
      "code": "national_id",
      "name_ar": "صورة الهوية",
      "name_en": "National ID Copy",
      "is_required": true,
      "instructions_ar": "...",
      "instructions_en": "..."
    }
  ],
  "pricing": {...},
  "delivery_time": {...}
}
```

### 9.2 Admin Service Serializer

Must include full internal configuration:

- all price fields
- all price visibility flags
- all delivery configuration fields
- linked document-definition IDs
- existing service relations/provider assignments as currently supported

### 9.3 Order Create Serializer

Must validate uploaded required documents against the linked document-definition IDs/codes.

Avoid relying on translated names as identifiers.

---

## 10. Frontend and Mobile Contract Updates

After backend changes:

1. Update `frontend/src/api/*` service wrappers.
2. Update public service/category pages.
3. Update admin service-management pages.
4. Update required-document management pages or create them if missing.
5. Update mobile API types/screens if mobile uses the changed endpoints.
6. Keep backward-compatible response fields if practical, but prefer a clean structured object for new UI.

Also inspect and fix nearby existing API contract mismatches if they block tests, especially around public services/categories/order creation.

---

## 11. Tests Required

Add or update tests before considering the task complete.

### 11.1 Backend Tests

Add tests for:

- creating a document definition
- preventing duplicate active document definitions
- linking document definitions to services
- preventing duplicate active service/document links
- public service detail returns document definitions correctly
- public service detail hides non-public price fields
- public service detail shows selected price fields
- delivery duration validation
- delivery date-range validation
- order creation snapshots delivery settings
- soft delete hides records from normal list endpoints
- deleted service/category/document-definition does not appear publicly
- restore behavior if implemented
- audit log is created for delete/restore

### 11.2 Frontend Tests

Add or update tests for:

- public category cards render
- category click shows services in that category
- service detail shows required documents from master definitions
- service detail respects price visibility
- admin service form can select required docs from the document-definition table
- delivery mode switches the visible fields
- deleted records disappear from normal admin/public lists

### 11.3 Mobile Tests / Type Checks

If mobile contracts are touched:

- update TypeScript types
- run typecheck
- verify category/service screens still work

### 11.4 Commands to Run

Run the relevant project commands. Adapt exact commands to the repo scripts.

Recommended:

```bash
# Backend
cd backend
python manage.py makemigrations --check --dry-run || true
python manage.py makemigrations
python manage.py migrate
python manage.py test
python manage.py check

# Frontend
cd ../frontend
npm install
npm run lint
npm run test -- --run
npm run build

# Mobile, if touched
cd ../mobile
npm install
npm run typecheck
```

If any command fails because the repo uses different scripts, inspect `package.json`, `pyproject.toml`, or project docs and run the correct equivalent.

---

## 12. Data Safety and Migration Checklist

Before finishing, verify:

- Existing services still exist after migration.
- Existing required-document rules are migrated to the master table.
- Existing customer orders still open correctly.
- Existing uploaded documents still download/verify correctly.
- Public service pages do not leak hidden fees.
- Deleted records are hidden from public and normal internal screens.
- Admin can still audit deleted items.
- No physical data loss occurs.

---

## 13. Acceptance Criteria

The task is complete only when all criteria below are true:

1. Admin can manage a master required-document table.
2. Admin can create/edit a service and select required documents from that table.
3. Service creation no longer requires duplicating document names manually.
4. Public service details show the required documents linked to the service.
5. Customer order creation validates required documents using stable document-definition IDs/codes.
6. Service delivery time supports both expected duration and from-date/to-date range.
7. Orders snapshot delivery configuration at creation time.
8. Admin can choose which price fields are public-visible.
9. Public APIs/pages expose only the selected price fields.
10. Public site shows categories as cards.
11. Opening a category shows services under that category.
12. Delete actions are soft-delete/system-level only.
13. Deleted records are hidden from public and normal system views.
14. Delete/restore actions create audit logs.
15. Existing order, document, provider, payment, notification, report, and help-guide flows still work.
16. Backend tests pass.
17. Frontend build/tests pass.
18. Mobile typecheck passes if mobile contracts were touched.
19. No major feature is removed.
20. UI is simpler and avoids manual fields where backend automation is possible.

---

## 14. Deliverables

Produce these deliverables in the repository:

1. Backend model/serializer/view/service updates.
2. Django migrations and safe data migration.
3. Admin UI for required-document definitions.
4. Updated service create/edit UI.
5. Updated public category card UI.
6. Updated public service detail UI.
7. Soft-delete standardization and restore support where appropriate.
8. Tests for backend and frontend.
9. Updated documentation.

Documentation should include:

```text
docs/fixes/SERVICE_CATALOG_PUBLIC_SITE_SOFT_DELETE_ENHANCEMENT.md
```

The document must explain:

- What changed.
- New/updated models.
- New/updated endpoints.
- Migration behavior.
- Soft-delete policy.
- Pricing visibility policy.
- Delivery-time policy.
- How to test manually.
- Known limitations, if any.

---

## 15. Implementation Strategy

Work in this order:

1. Inspect current models, serializers, views, routes, frontend pages, and mobile API wrappers.
2. Write a short implementation plan inside the final documentation file.
3. Implement backend document-definition model and migrations.
4. Refactor service-required-document linking.
5. Update serializers and order validation.
6. Add delivery-time mode and price visibility rules.
7. Standardize soft delete for catalog/public-management records.
8. Update public category/service APIs.
9. Update React admin/public UI.
10. Update mobile only if affected.
11. Add tests.
12. Run checks/builds/tests.
13. Fix regressions.
14. Produce final summary with files changed and commands run.

---

## 16. Final Response Format

When finished, respond with:

```markdown
# Khalisni Enhancement Completed

## Summary
- ...

## Backend Changes
- ...

## Frontend Changes
- ...

## Mobile Changes
- ...

## Database / Migration Notes
- ...

## Soft Delete Policy Implemented
- ...

## Tests Run
- command: result

## Files Changed
- path/to/file

## Manual Verification Steps
1. ...

## Known Limitations
- None, or list clearly.
```

Do not claim success unless tests/checks were actually run. If a command could not run, say exactly why.
