# Help Guide System

## Overview

The Khalisni in-app help system is implemented as a full application feature, not a static document.

Main goals:

- Show help inside the authenticated web application.
- Filter help by current screen, user audience, permissions, and optional workflow status.
- Let admins manage guide content from a dedicated admin screen.
- Keep role and permission filtering enforced in the backend.

## Backend Structure

Main app:

- `backend/help_guides/`

Important files:

- `models.py`: `HelpGuide` data model.
- `screen_registry.py`: backend screen registry used for metadata and seeded route mappings.
- `selectors.py`: audience resolution, readable queryset filtering, and current-screen fallback logic.
- `serializers.py`: admin and user-facing API payloads.
- `views.py`: current help endpoint, metadata endpoint, and CRUD viewset.
- `urls.py`: `/api/help/` routes.
- `tests.py`: role, permission, fallback, and management coverage.

## Data Model

Model: `HelpGuide`

Fields:

- `help_guide_id`
- `screen_key`
- `route_path`
- `role`
- `permission_key`
- `workflow_status`
- `title`
- `short_description`
- `purpose`
- `before_you_start`
- `step_by_step_guide`
- `expected_result`
- `common_errors`
- `related_screen`
- `related_permission`
- `search_keywords`
- `display_order`
- `is_active`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

Notes:

- `screen_key` can be blank for a general role-level guide.
- `permission_key` and `related_permission` use `app_label.codename` format.
- `step_by_step_guide` stores one step per line. The frontend renders it as numbered steps.
- `common_errors` stores one item per line. The frontend renders it as a separate list.

## API Endpoints

Read endpoints:

- `GET /api/help/current/?screen_key=...&workflow_status=...`
- `GET /api/help/`
- `GET /api/help/{id}/`

Admin endpoints:

- `POST /api/help/`
- `PATCH /api/help/{id}/`
- `DELETE /api/help/{id}/`
- `GET /api/help/metadata/`

Behavior:

- Normal authenticated users only see active records that match their audience and permissions.
- Admin management uses the same `/api/help/` resource with write permissions enforced in the backend.
- `DELETE` is a soft deactivate. It sets `is_active=False`.

## Screen Key Convention

Screen keys are stable identifiers for route-level help targeting.

Examples from the current web app:

- `customer_dashboard`
- `customer_orders`
- `customer_order_details`
- `customer_missing_documents`
- `employee_review_queue`
- `employee_order_review`
- `employee_verify_documents`
- `admin_services`
- `admin_users_roles`
- `admin_help_guides`
- `provider_orders`
- `provider_order_details`

Where they live:

- Backend registry: `backend/help_guides/screen_registry.py`
- Frontend route matcher: `frontend/src/help/screenRegistry.js`

When adding a new screen:

1. Add a stable `screen_key` to both registries.
2. Map the frontend route pattern in `screenRegistry.js`.
3. Add seeded or managed help content for the new screen if needed.
4. If the screen has workflow-specific help, register its status with `useRegisterPageHelp`.

## Role And Permission Filtering

Audience filtering is enforced in `backend/help_guides/selectors.py`.

Effective audience resolution includes:

- Legacy user role such as `admin`, `customer`, `employee`, `support`, `provider`
- Active organization membership roles such as `partner_admin`, `branch_manager`, `provider_employee`
- Derived staff shortcuts where the existing permission model implies broader access

Read filtering rules:

- The guide role must match the resolved audience, or be `all_users`.
- If `permission_key` is present, the current user must have that permission.
- Inactive guides are hidden from non-admin reads.
- If `workflow_status` is present, it must match the requested workflow status.

Current-screen fallback order:

1. Exact screen + role + permission + workflow status
2. Exact screen + role + permission
3. Exact screen + role
4. Exact screen + generic role (`all_users`)
5. General role guide with no `screen_key`

Implementation detail:

- Workflow-specific role guides without a permission are treated as more specific than a plain role guide on the same screen.

## Frontend Integration

Shared files:

- `frontend/src/components/HelpGuidePanel.jsx`
- `frontend/src/context/HelpGuideContext.jsx`
- `frontend/src/help/screenRegistry.js`
- `frontend/src/api/helpGuidesApi.js`

Current behavior:

- The Help button is available in the dashboard topbar on authenticated major screens.
- The drawer detects the current route, loads help from `/api/help/current/`, and allows in-drawer search via `/api/help/`.
- Search results still respect backend role and permission filtering.

## Adding HelpGuidePanel To A New Screen

If the screen only needs route-based help:

1. Add the route pattern and `screen_key` to `frontend/src/help/screenRegistry.js`.
2. Add the same `screen_key` to `backend/help_guides/screen_registry.py`.
3. Create help content from the admin screen or seed data.

If the screen also needs workflow-aware help:

1. Import `useRegisterPageHelp` from `frontend/src/context/HelpGuideContext.jsx`.
2. Call `useRegisterPageHelp({ workflowStatus: currentStatus || '' })` inside the page component.
3. Create help entries with the same `screen_key` and the required `workflow_status`.

Current workflow-aware pages include:

- `CustomerOrderDetailsPage`
- `MissingDocumentsResponsePage`
- `EmployeeOrderReviewPage`
- `ProviderOrderDetailsPage`
- `AdminOrderDetailsPage`

## Admin Management Flow

Admin screen:

- Route: `/admin/help-guides`
- Component: `frontend/src/pages/admin/HelpGuideManagementPage.jsx`

Admin can:

- Create help entries
- Edit content
- Set role and optional permission requirements
- Set optional workflow status targeting
- Set display order
- Activate or deactivate entries
- Preview the guide before saving

Recommended admin workflow:

1. Choose the target screen.
2. Choose the target role.
3. Add a permission or workflow restriction only if truly needed.
4. Write short operational text, not developer-facing text.
5. Preview the guide.
6. Save and verify from the target role’s screen.

## Seed Data

Seed migration:

- `backend/help_guides/migrations/0002_seed_help_guides.py`

Seed coverage includes:

- General guides for `customer`, `employee`, `support`, `provider`, and `admin`
- Core customer workflow screens
- Core employee review and verification screens
- Provider dashboard and assigned-order screens
- Support service-request and service-structure screens
- Key admin management screens, including the help management screen itself

## Security Notes

- Backend filtering is the source of truth.
- Frontend search does not bypass role filtering because it uses the same protected API.
- Users without `help_guides.manage_help_guides` cannot create, edit, or deactivate content.
- Permission-linked guides are hidden when the permission is missing.

## Verification

Backend:

- `python manage.py test help_guides`

Frontend:

- `npm run lint`
- `npm run build`
