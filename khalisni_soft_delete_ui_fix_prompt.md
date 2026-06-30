# Codex Prompt — Fix Khalisni Soft Delete So Users Can Actually Delete From the UI

## Context
You are working on the Khalisni service-order management platform.
The project is a Django 5 + Django REST Framework backend, React + Vite web frontend, and Expo / React Native mobile app.
The existing architecture already contains admin CRUD surfaces, service catalog management, public service/category browsing, audit logs, and a delete-guard concept.

The previous implementation did not satisfy the requirement because users still cannot see or use a real Delete action from the system UI.

## Critical Clarification
In this project, **delete does not mean physical database deletion**.
Delete means:

1. The user sees a real **Delete** button/action in the UI.
2. When clicked, the backend performs a **soft delete / system-level delete**.
3. The row stays in the database for audit, history, recovery, and referential integrity.
4. Deleted records disappear from normal system screens and public APIs.
5. Admin users can optionally view deleted records in a dedicated filter/tab and restore them.
6. Audit logs must record who deleted the record, when, from where, and why.

Do not remove the Delete button just because the backend uses soft delete. The user must still be able to delete records from the application UI.

---

## Goal
Implement a complete and consistent soft-delete experience across Khalisni:

- Backend soft-delete behavior.
- Frontend visible Delete buttons.
- Delete confirmation modal.
- Deleted/Active/All filters for admin pages.
- Restore action for deleted records.
- Public and normal operational screens must hide deleted records.
- Audit logging for delete and restore.
- No direct database hard delete for business/system records.

---

## Scope
Apply this to every admin-manageable model/screen where users reasonably expect delete/remove:

### Service Catalog
- Services.
- Service categories.
- Master required-document definitions.
- Service-required-document links/rules.
- Service relations.
- Service-provider assignments.
- Addresses if managed in UI.

### Organizations and Users
- Organizations.
- Branches.
- Organization memberships.
- Users.
- Providers/provider profiles.

### Public Site / CMS
- Advertisements.
- Public content blocks if they are list-based.
- Missing-service request management where applicable.
- Help-guide content entries.
- Screenshots/help actions/help fields/help service help/help workflow help.

### Transactional Records
For records with legal, audit, workflow, or financial meaning, do **not** physically delete and do **not** silently remove history.
Use one of these patterns:

- Orders: archive/cancel/hide from normal list, but keep full timeline and audit history.
- Payments/invoices: void/archive only, never hard delete.
- Uploaded documents: soft delete/hide document file from normal views, but keep metadata and audit trail.
- Audit logs: never delete from UI. Audit logs are immutable.

---

## Backend Requirements

### 1. Create or standardize a reusable soft-delete base model/mixin
Implement or reuse a shared mixin, for example:

```python
class SoftDeleteModel(models.Model):
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='%(class)s_deleted')
    delete_reason = models.TextField(blank=True)

    class Meta:
        abstract = True
```

If models already have `is_active`, `is_enabled`, or similar flags, do not blindly duplicate logic.
Standardize behavior clearly:

- `is_active` means enabled/disabled business availability.
- `is_deleted` means removed from system UI.

Deleted records should be hidden even if `is_active=True`.

### 2. Add queryset managers/selectors
Create clear queryset helpers:

- `.active()` or `.visible()` returns `is_deleted=False` plus normal active/visibility rules.
- `.deleted()` returns `is_deleted=True`.
- `.with_deleted()` returns everything for admin audit screens.

All public/customer/staff/provider querysets must use visible records only.
Admin screens may request `?include_deleted=true` or `?status=deleted`.

### 3. Override DRF destroy behavior
For every soft-deletable admin ViewSet:

- `DELETE /api/admin/<resource>/<id>/` must soft delete the record.
- It must not call physical `.delete()` unless the model is explicitly allowed to hard-delete temporary data.
- It must require the same delete-guard/password confirmation if the existing project uses it.
- It must accept an optional `reason` field.
- It must return `204 No Content` or a small success response.
- It must write an audit log.

Example behavior:

```python
def perform_destroy(self, instance):
    soft_delete_instance(
        instance=instance,
        actor=self.request.user,
        reason=self.request.data.get('reason', ''),
        request=self.request,
    )
```

If DRF DELETE request bodies are not reliable in the existing frontend, support delete reason/password through a custom action too:

- `POST /api/admin/<resource>/<id>/soft-delete/`
- `POST /api/admin/<resource>/<id>/restore/`

Keep the normal DELETE endpoint working because the UI will call it.

### 4. Add restore endpoints
For each soft-deletable resource:

- `POST /api/admin/<resource>/<id>/restore/`
- Restore should set `is_deleted=False`, `deleted_at=None`, `deleted_by=None`, and clear/keep reason based on audit policy.
- Write an audit log.
- Validate uniqueness conflicts before restore. Example: if another active service already uses the same slug, block restore with a clear validation message.

### 5. Protect related data
When deleting a parent record:

- Deleting a category must not break existing services. Either block delete if active services exist, or soft-delete descendants only after explicit confirmation.
- Deleting a service must hide it from public site/order creation, but existing orders must still show the historical service snapshot.
- Deleting required-document rules must not remove already uploaded documents from existing orders.
- Deleting a provider assignment must stop future assignment, not rewrite old orders.
- Deleting users/providers must deactivate login/access but preserve old ownership/audit references.

Use explicit validation messages instead of database errors.

### 6. Public API filtering
Ensure these endpoints never return deleted records:

- `GET /api/services/`
- `GET /api/services/categories/`
- `GET /api/services/{slug}/`
- Public homepage/category/service cards.
- Customer order creation service selection.
- Mobile service list/detail screens.

### 7. Tests
Add backend tests for each major resource type:

- Delete endpoint soft-deletes and does not physically remove the row.
- Deleted record is hidden from public/customer/staff normal lists.
- Admin can view deleted records with the deleted/all filter.
- Restore works.
- Restore checks uniqueness conflicts.
- Audit log is created for delete and restore.
- Existing orders/documents/payments remain readable after related catalog data is deleted.

---

## Frontend Web Requirements

### 1. Add visible Delete actions
Every admin management table/card/detail screen must show a real **Delete** action where the logged-in user has permission.

Add the Delete action to:

- Row action menu.
- Detail page action bar if applicable.
- Mobile-responsive card actions if the table collapses on small screens.

Do not hide Delete just because deletion is soft-delete.

### 2. Confirmation modal
When the user clicks Delete, show a confirmation modal with:

- Resource name.
- Warning that the item will be hidden from the system but kept for audit/recovery.
- Impact message, for example: deleting a service hides it from the public site and new orders but does not delete old orders.
- Required reason field for important resources.
- Delete password field if delete guard is enabled.
- Cancel button.
- Confirm Delete button.

After successful delete:

- Close modal.
- Remove item from current list immediately.
- Show success toast.
- Refresh/revalidate the list.

### 3. Add filters/tabs
On admin list screens, add:

- Active
- Deleted
- All

Default must be Active.

When `Deleted` is selected:

- Show deleted rows with muted styling.
- Show `Restore` action.
- Hide normal Edit actions if editing deleted rows is unsafe.

When `All` is selected:

- Show both active and deleted records.
- Deleted rows must be visually marked as Deleted.

### 4. Add restore action
Deleted rows must have a **Restore** button/action.

Restore must:

- Ask for confirmation.
- Call the restore endpoint.
- Show success/error toast.
- Refresh the list.

### 5. Frontend API layer
Update `frontend/src/api/*` and/or `frontend/src/api/services.js` so every managed resource has:

- `deleteX(id, payload)` or a generic `softDeleteResource(resource, id, payload)`.
- `restoreX(id)` or a generic `restoreResource(resource, id)`.
- Support for `status=active|deleted|all` or `include_deleted=true` query params.

Use the existing Axios client and existing admin delete helper if available.
Do not bypass auth, permissions, token refresh, or error normalization.

### 6. Translation and RTL/LTR
Add Arabic and English labels/messages for:

- Delete.
- Restore.
- Deleted.
- Active.
- All.
- Delete confirmation.
- Delete reason.
- This item will be hidden from the system but kept for audit.
- Restore confirmation.

Make sure RTL layout is correct.

### 7. UI screens to inspect and patch
Inspect and patch all existing admin/shared management screens, especially:

- `frontend/src/pages/admin/ServicesManagementPage.jsx`
- `frontend/src/pages/shared/ServiceCategoryManagementPage.jsx`
- `frontend/src/pages/admin/AdminRuleManagementPage.jsx`
- `frontend/src/pages/shared/ServiceRelationsManagementPage.jsx`
- `frontend/src/pages/admin/ServiceProviderAssignmentsPage.jsx`
- `frontend/src/pages/admin/ProvidersManagementPage.jsx`
- `frontend/src/pages/admin/AdminUsersRolesPage.jsx`
- `frontend/src/pages/admin/HomepageContentEditorPage.jsx`
- `frontend/src/pages/admin/AdvertisementManagerPage.jsx`
- `frontend/src/pages/admin/HelpGuideManagementPage.jsx`
- Any other CRUD/list management page discovered in routes.

Do not patch only one screen. Search the frontend for existing edit/create actions and add delete/restore consistently.

---

## Mobile Requirements
If the mobile admin screens expose management of the same resources, add the same behavior:

- Delete action in item menu/card.
- Confirmation modal.
- Deleted/Active/All filter if the screen is a management list.
- Restore action in deleted view.
- API contract aligned with backend.

Patch relevant files under:

- `mobile/src/api/*.ts`
- `mobile/src/features/admin/screens/*.tsx`

---

## Acceptance Criteria
The implementation is correct only if all of these are true:

1. Admin can see a Delete button for services, categories, document requirements, provider assignments, users/providers, public-site records, and help-guide records where deletion is allowed.
2. Clicking Delete opens a confirmation modal, not an instant destructive action.
3. Confirming Delete hides the record from the current screen without refreshing the browser manually.
4. The row remains in the database with soft-delete metadata.
5. Public service/category pages do not show deleted records.
6. Customer order creation cannot select deleted services or deleted required-document rules.
7. Existing orders that referenced deleted services/documents still open correctly.
8. Admin can switch to Deleted/All and see deleted rows.
9. Admin can restore deleted rows unless blocked by a clear validation rule.
10. Audit logs record delete and restore.
11. No feature from the existing workflow is broken: order creation, document upload, employee review, provider assignment, final document upload, payment/admin reports, notifications, and public service browsing must still work.
12. Tests prove soft delete, filtering, restore, public hiding, and audit logging.

---

## Implementation Rules

- Do not physically delete core business records.
- Do not remove existing workflow endpoints.
- Do not bypass permission checks.
- Do not make public APIs return deleted records.
- Do not hide the Delete button if the user has permission.
- Do not confuse disabled/inactive with deleted.
- Do not break existing order history.
- Do not delete audit logs.
- Do not only implement backend behavior. The frontend visible Delete/Restore UX is mandatory.

---

## Final Deliverables
After implementation, produce a short report containing:

1. Files changed.
2. Models that now support soft delete.
3. Endpoints added or changed.
4. Screens where Delete/Restore were added.
5. Tests added.
6. Any resources intentionally not deletable and the reason.
7. Manual QA checklist with exact steps to verify Delete and Restore from the UI.
