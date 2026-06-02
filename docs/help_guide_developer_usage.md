# Help Guide Developer Usage

## Add Help To A New Screen

1. Add the `screen_key` to:
   - `backend/help_guides/screen_registry.py`
   - `frontend/src/help/screenRegistry.js`
2. If the page is workflow-aware, call:

```jsx
useRegisterPageHelp({
  workflowStatus: currentStatus || '',
  serviceId: currentServiceId || '',
})
```

3. Add admin-authored records or extend the fallback registry when the screen has important fields or actions.

## Add Field Help

Use one of two paths:

- admin-managed `HelpGuideField` rows
- centralized fallback definitions in `backend/help_guides/fallbacks.py`

For inline tooltip support, use:

```jsx
<HelpLabel fieldKey="phone">Phone number</HelpLabel>
```

or:

```jsx
<InlineHelp fieldKey="phone" />
```

## Add Button Help

Use:

- admin-managed `HelpGuideAction` rows
- fallback action definitions in `backend/help_guides/fallbacks.py`

For inline button help, use:

```jsx
<InlineHelp actionKey="assign_provider" />
```

## Add Service Help

The runtime already builds fallback service help from the real `Service` definition.

Add `HelpGuideService` rows only when you need curated language beyond the generated baseline.

## Add Workflow Help

The runtime already builds fallback workflow rows from `workflow.rules.WORKFLOW_TRANSITIONS`.

Add `HelpGuideWorkflow` rows when you need:

- custom wording
- extra blocked-case detail
- screen-specific clarification

## Role Filtering

Filtering is enforced in `backend/help_guides/selectors.py`.

Public output depends on:

- authenticated user role
- organization-derived audience codes
- Django permissions
- active state
- optional workflow status

Do not rely on frontend hiding for security.

## Seed And Draft Sources

Existing defaults come from:

- seeded screen-level guides
- fallback field/action/workflow registries
- generated service help

Generate the draft authoring backlog with:

```bash
python manage.py generate_help_registry
```

Output:

- `docs/help_guide/draft_help_registry.json`

## Tests

Primary backend test suite:

```bash
python manage.py test help_guides
```

Useful validation commands:

```bash
python manage.py makemigrations --check
npm run lint
npm run build
```
