# Help Guide System

## Scope

Khalisni now exposes contextual in-app help through one backend help domain and one frontend help context.

The system covers:

- Screen-level guidance
- Button and action guidance
- Field-level and tooltip guidance
- Service-level operational guidance
- Workflow transition guidance
- Search across help content
- Admin CRUD for all help entity types

## Backend

Main app:

- `backend/help_guides/`

Key modules:

- `models.py`
  - `HelpGuide` remains the screen-level guide model.
  - `HelpGuideAction`, `HelpGuideField`, `HelpGuideService`, and `HelpGuideWorkflow` store normalized guide content for the other layers.
- `selectors.py`
  - Resolves readable content by role, permission, active state, screen, workflow status, and optional admin preview role.
  - Merges stored entries with fallback/generated guidance.
- `fallbacks.py`
  - Central registry for important field and action help.
  - Dynamic service help builder from the real `Service` model.
  - Dynamic workflow help builder from the real workflow transition rules.
- `views.py`
  - Context endpoint, read endpoints, search endpoint, and admin CRUD viewsets.
- `management/commands/generate_help_registry.py`
  - Builds a draft registry from routes, serializers, models, permissions, workflow rules, and frontend buttons.

## API

User-facing endpoints:

- `GET /api/help/current/?screen_key=...&workflow_status=...&service_id=...`
- `GET /api/help/fields/?screen_key=...`
- `GET /api/help/actions/?screen_key=...&workflow_status=...`
- `GET /api/help/services/{service_id}/?screen_key=...`
- `GET /api/help/workflows/?screen_key=...&status=...`
- `GET /api/help/search/?q=...`

Admin endpoints:

- `GET|POST /api/help/admin/screens/`
- `PATCH|DELETE /api/help/admin/screens/{id}/`
- `GET|POST /api/help/admin/fields/`
- `PATCH|DELETE /api/help/admin/fields/{id}/`
- `GET|POST /api/help/admin/actions/`
- `PATCH|DELETE /api/help/admin/actions/{id}/`
- `GET|POST /api/help/admin/services/`
- `PATCH|DELETE /api/help/admin/services/{id}/`
- `GET|POST /api/help/admin/workflows/`
- `PATCH|DELETE /api/help/admin/workflows/{id}/`

## Frontend

Key files:

- `frontend/src/context/HelpGuideContext.jsx`
  - Tracks current screen help payload and exposes field/action lookup helpers.
- `frontend/src/components/HelpGuidePanel.jsx`
  - Renders overview, actions, fields, service, workflow, common-problem, and next-step sections.
- `frontend/src/components/InlineHelp.jsx`
  - Small contextual tooltip trigger for important fields and buttons.
- `frontend/src/pages/admin/HelpGuideManagementPage.jsx`
  - Multi-tab admin manager for screen, field, action, service, and workflow guides.

Inline help is currently wired into the highest-risk order flow screens:

- Customer create order
- Customer order details
- Customer missing documents response
- Employee order review
- Provider order details

## Fallback Strategy

The help system does not rely only on manually curated database rows.

It also generates safe fallback help from:

- real screen registries
- real serializer and file-upload rules
- real service definitions
- real workflow transition rules

This means the panel can still explain major flows even before every admin-managed record is authored.

## Security

All filtering is backend-enforced.

Normal users cannot access:

- inactive guide entries
- other-role guide entries
- permission-gated entries they do not qualify for
- admin CRUD endpoints
- internal notes stored on help records

Admin preview mode is supported through `preview_role`, but only for users who can manage help guides.

## Verification

- `python manage.py makemigrations --check`
- `python manage.py test help_guides`
- `python manage.py generate_help_registry`
- `npm run lint`
- `npm run build`
