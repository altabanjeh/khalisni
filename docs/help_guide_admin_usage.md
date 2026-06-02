# Help Guide Admin Usage

## Screen

Admin entry point:

- Route: `/admin/help-guides`

Tabs:

- Screen Guides
- Field Guides
- Action Guides
- Service Guides
- Workflow Guides

## Typical Workflow

1. Choose the tab for the guide type you want to manage.
2. Filter by role, screen, or service when the list is large.
3. Create a new entry or edit an existing one.
4. Set `display_order` so higher-priority entries appear first.
5. Keep `internal_notes` for admin context only.
6. Deactivate outdated entries instead of deleting behavior history.

## Authoring Guidance

Use short, operational language.

Prefer:

- what the user is doing
- when they should do it
- what the system expects
- what happens next
- what common errors mean

Avoid:

- developer terminology
- implementation details irrelevant to the user
- duplicate content across many records unless it is intentional

## Per-Type Notes

### Screen Guides

Use for:

- page purpose
- workflow context
- before-you-start guidance
- expected result
- next step

### Field Guides

Use for:

- accepted format
- example valid values
- error explanations
- tooltip content

### Action Guides

Use for:

- button purpose
- state transitions
- warnings
- confirmation expectations

### Service Guides

Use for:

- required documents
- required data
- prerequisites
- common rejection or missing-document causes

### Workflow Guides

Use for:

- current status
- action key
- next status
- required checks
- blocked cases
- correction path

## Preview And Verification

After saving:

1. Open the target screen in the matching user role.
2. Open the Help panel.
3. Confirm that:
   - the right section appears
   - inactive content is hidden
   - permission-gated content is not shown to the wrong user
   - field tooltips display the expected short message

## Draft Registry

Use the generated draft file as an authoring backlog:

- `docs/help_guide/draft_help_registry.json`

Generate it with:

```bash
python manage.py generate_help_registry
```
