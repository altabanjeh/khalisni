# Help Guide Data Model

## Models

### `HelpGuide`

Screen-level guide content.

Important fields:

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
- `when_to_use`
- `main_workflow`
- `expected_result`
- `common_errors`
- `next_step`
- `related_screen`
- `related_permission`
- `search_keywords`
- `internal_notes`
- `display_order`
- `is_active`

### `HelpGuideAction`

Button-level and action-level help.

Important fields:

- `screen_key`
- `button_key`
- `button_label`
- `role`
- `permission_key`
- `purpose`
- `when_to_use`
- `action_result`
- `status_before`
- `status_after`
- `notification_triggered`
- `warning_message`
- `common_errors`
- `safety_rule`
- `confirmation_message`

### `HelpGuideField`

Field-level help and tooltip source content.

Important fields:

- `screen_key`
- `field_key`
- `field_label`
- `model_name`
- `model_field`
- `role`
- `permission_key`
- `purpose`
- `required`
- `editable`
- `data_type`
- `accepted_format`
- `valid_example`
- `invalid_example`
- `validation_rule`
- `error_explanation`
- `placeholder_text`
- `tooltip_text`
- `default_value`
- `max_length`
- `who_can_edit`
- `locked_when`

### `HelpGuideService`

Service-level operational help.

Important fields:

- `service`
- `screen_key`
- `role`
- `permission_key`
- `description`
- `who_can_use`
- `required_documents`
- `optional_documents`
- `required_data`
- `prerequisites`
- `related_services`
- `workflow_summary`
- `final_output`
- `common_errors`
- `common_rejection_reasons`
- `common_missing_document_reasons`
- `estimated_processing_time`
- `price_rule`
- `provider_requirement`

### `HelpGuideWorkflow`

Workflow transition help.

Important fields:

- `screen_key`
- `workflow_key`
- `current_status`
- `action_key`
- `action_label`
- `button_key`
- `role`
- `permission_key`
- `next_status`
- `required_fields`
- `system_effect`
- `notification_effect`
- `blocked_cases`
- `correction_process`

## Shared Behavior

All help models use:

- `role`
- `permission_key`
- `search_keywords`
- `internal_notes`
- `display_order`
- `is_active`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

## Read Rules

Public read paths only return:

- active records
- matching roles or `all_users`
- permission-compatible records
- serialized public fields only

`internal_notes` stay admin-only.

## Generated Data

Not every help row must exist in the database.

The runtime layer also generates fallback help from:

- screen registries
- serializer/form rules
- service definitions
- workflow transition rules

Database rows override the generated fallback for the same key.
