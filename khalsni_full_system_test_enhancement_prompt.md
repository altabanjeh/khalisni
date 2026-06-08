# Codex Prompt — Full Test, Audit, and Enhancement for the Khalsni System

## Important Context
You are working inside the **Khalsni system project folder**.

This task is for the **main Khalsni system**, not the serialization system, not the factory production-line system, not the ESP32 flashing system, and not the label-printing workflow.

Do **not** mix requirements from other systems.

Before writing or modifying any code, you must inspect the current project structure, understand the actual purpose of this Khalsni system from the existing files, routes, models, templates, documentation, README files, settings, and app names, then test and enhance it based on what the system is really designed to do.

---

## Main Goal
Fully test, validate, and enhance the Khalsni system so that:

1. All existing functionality works correctly.
2. The system purpose is clear and consistently implemented.
3. The backend, frontend, database models, forms, views, APIs, permissions, documentation, and user flows are suitable for the real Khalsni system.
4. There is no mismatch with unrelated systems such as serialization, manufacturing tracking, ESP32 firmware upload, MAC reading, label printing, inspection workflow, or production-line operations.
5. Any bugs, weak areas, missing validations, broken links, poor UX flows, or incomplete features are detected and fixed safely.
6. The system becomes more stable, professional, testable, and ready for real users.

---

## Critical Rule: Identify the Real System First
Before changing anything, perform a project-discovery phase.

You must inspect:

- `README.md` and any documentation files.
- Django apps and their names.
- `settings.py`, `urls.py`, and project-level routing.
- Models in all apps.
- Views, forms, serializers, templates, static files, and JavaScript.
- Admin customizations.
- Database migrations.
- Existing tests.
- API endpoints, if present.
- User roles, permissions, groups, or access-control logic.
- Templates and page names.
- Any user manual, guide, help section, or documentation already created.
- Any comments, seed data, fixtures, or management commands.

After this inspection, create a short internal understanding of:

- What Khalsni is supposed to do.
- Who the users are.
- What the main workflows are.
- What data the system manages.
- What features already exist.
- What features are incomplete or broken.
- What must not be included because it belongs to another system.

Do not assume the system purpose from external memory. Use the project folder as the source of truth.

---

## Scope Boundary
This task is only for the Khalsni system.

### Include only if it exists in the current project
- Existing Khalsni business logic.
- Current user roles and dashboards.
- Current models and data flows.
- Current forms, views, pages, APIs, and reports.
- Current documentation/user manual/help pages.
- Current authentication and authorization flows.
- Current admin-panel behavior.
- Current frontend UX and navigation.
- Current database integrity and validation.

### Exclude completely unless the project itself clearly contains it
Do not add, test, or design anything related to:

- Product serialization system.
- Production-line inspection flow.
- Firmware upload.
- ESP32 code flashing.
- MAC address reading.
- Label printing.
- Barcode/QR production labels.
- Xprinter or TSPL commands.
- Hardware scanner/printer management.
- Oven/inspection/functional-test workflow.
- Manufacturing batch tracking.

If any of these are found in the folder, verify whether they really belong to Khalsni or are leftover/misplaced code. Report them clearly before modifying them.

---

## Required Work Phases

## Phase 1 — Project Discovery and System Mapping
Inspect the project and produce a clear system map.

Create or update a file named:

```text
SYSTEM_AUDIT_REPORT.md
```

The report must include:

1. Project structure summary.
2. Apps/modules found.
3. Main purpose of the system based on actual code.
4. Main user roles.
5. Main workflows.
6. Models and key fields.
7. Views/pages/endpoints.
8. Templates and UI structure.
9. Authentication and authorization logic.
10. Admin usage.
11. Existing tests.
12. Missing or weak areas.
13. Possible mismatched code that belongs to another system.
14. Recommended fixes.

Do not remove anything in this phase.

---

## Phase 2 — Run Existing Checks
Run the safest available checks for the project.

Use the correct commands based on the project stack.

For Django, try:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py showmigrations
python manage.py test
```

If the project uses pytest, also try:

```bash
pytest
```

If frontend tooling exists, inspect `package.json` and run suitable commands only if dependencies are available, such as:

```bash
npm test
npm run lint
npm run build
```

If commands fail because of missing environment variables, database configuration, or dependencies, do not ignore the failure. Document it and create safe fixes such as `.env.example`, default development settings, or clearer setup instructions.

---

## Phase 3 — Environment and Configuration Validation
Check the project configuration for production-readiness and local-development stability.

Validate:

- Required environment variables.
- `.env.example` completeness.
- Secret key handling.
- Debug mode handling.
- Allowed hosts.
- CSRF trusted origins.
- Database configuration.
- Static/media configuration.
- Logging configuration.
- Email configuration if password reset or notifications exist.
- Time zone and localization.
- Installed apps and middleware order.
- Security settings for production.

Create or update:

```text
.env.example
SETUP_GUIDE.md
```

Do not commit real secrets.
Do not hardcode passwords, tokens, API keys, or private credentials.

---

## Phase 4 — Authentication and Permission Testing
Audit all authentication and authorization flows.

Check:

- Login.
- Logout.
- Registration, if present.
- Password reset, if present.
- User roles.
- Staff/admin access.
- Object-level access if needed.
- Page protection.
- API protection.
- Dashboard access per role.
- Redirect behavior after login/logout.
- Unauthorized access behavior.

Fix any issue where:

- Anonymous users can access protected pages.
- Normal users can access admin/staff pages.
- A user can edit or view data they should not access.
- Forms trust client-side input only.
- Views do not validate ownership or permissions.

Add tests for the corrected behavior.

---

## Phase 5 — Model and Database Integrity Review
Review all models and database relationships.

Check:

- Field types.
- `null=True` vs `blank=True` usage.
- Unique constraints.
- Indexes for frequently filtered fields.
- Foreign key `on_delete` behavior.
- Model `__str__` methods.
- Default values.
- Validation rules.
- Date/time fields.
- File/image fields.
- Migration consistency.

Add model-level validation where needed.

Add database constraints only when safe and clearly correct.

Do not rename models or fields unless absolutely necessary. If a rename is needed, document why and create safe migrations.

---

## Phase 6 — Forms, Input Validation, and Data Quality
Audit all forms and data-entry flows.

Check:

- Required fields.
- Field labels and help text.
- Validation messages.
- File upload restrictions.
- Date validation.
- Numeric validation.
- Duplicate prevention.
- Unsafe HTML/script input.
- Server-side validation.
- Error display in templates.

Fix forms so users receive clear validation errors instead of crashes.

Add tests for valid and invalid form submissions.

---

## Phase 7 — Views, URLs, and API Endpoints
Audit all routes and endpoints.

Check:

- URL naming consistency.
- Broken links.
- Missing templates.
- Bad redirects.
- Views with repeated logic.
- Missing permission decorators/mixins.
- Missing pagination.
- Search/filter behavior.
- Create/update/delete flows.
- API response format if APIs exist.
- Proper status codes.

Fix broken flows.

Use standard Django best practices:

- `LoginRequiredMixin` or `@login_required` for protected pages.
- Permission checks for sensitive actions.
- `get_object_or_404` where needed.
- `messages` framework for user feedback.
- Pagination for large lists.
- Safe redirects.

---

## Phase 8 — Template, UI, and UX Review
Review the interface for real usability.

Check:

- Navigation clarity.
- Dashboard consistency.
- Page titles.
- Form layout.
- Error messages.
- Empty states.
- Confirmation messages.
- Delete confirmations.
- Mobile/tablet responsiveness.
- Arabic/English support if the system contains localization.
- RTL support if Arabic exists.
- Consistent buttons and labels.
- Broken static files.

Do not redesign the whole system unnecessarily.
Improve only what makes the current system clearer, safer, and easier to use.

---

## Phase 9 — User Manual and In-System Guide Validation
If the system contains a user manual, guide, help page, or documentation module, audit it.

Check:

- The guide matches the actual screens and features.
- Every important button or action is explained.
- Role-specific instructions exist if roles exist.
- Screenshots are referenced correctly if present.
- Broken image paths are fixed.
- Steps are clear and ordered.
- Arabic/English consistency is handled if multilingual support exists.

If no guide exists but the project clearly needs one, create a basic structure that can be expanded later.

Suggested files:

```text
USER_MANUAL.md
ADMIN_GUIDE.md
```

Only document features that actually exist in the project.
Do not invent features.

---

## Phase 10 — Security Review
Perform a practical security review.

Check:

- Secrets are not committed.
- Debug is not enabled by default in production.
- CSRF protection is active.
- Forms use CSRF tokens.
- File uploads are restricted.
- User input is escaped in templates.
- Sensitive views require authentication.
- Admin routes are protected.
- Password reset does not leak user existence, if implemented.
- API endpoints require proper authentication when needed.
- No unsafe `eval`, shell execution, or raw SQL exists unless justified.

If raw SQL exists, check parameterization.

Document security risks in:

```text
SECURITY_REVIEW.md
```

Fix high-confidence security bugs.
For risky or unclear changes, document the recommendation instead of forcing a change.

---

## Phase 11 — Performance and Maintainability Review
Check for common maintainability problems.

Look for:

- Duplicated logic.
- Very large views.
- Slow queries.
- Missing `select_related` / `prefetch_related`.
- Repeated database calls in templates.
- Missing pagination.
- Unused imports.
- Dead code.
- Unused templates/static files.
- Inconsistent naming.
- Hardcoded values that should be settings.

Refactor only safe areas.
Avoid large rewrites unless required.

---

## Phase 12 — Automated Test Coverage
Add or improve tests for critical behavior.

At minimum, add tests for:

- Important pages load successfully.
- Protected pages require login.
- Main create/update/delete workflows.
- Main form validation.
- Main model constraints.
- Role-based permissions.
- API endpoints if present.

Suggested structure:

```text
app_name/tests/test_models.py
app_name/tests/test_views.py
app_name/tests/test_forms.py
app_name/tests/test_permissions.py
```

Do not write fake tests that only check trivial imports.
Tests must validate real system behavior.

---

## Phase 13 — Test Data / Seed Data
Create safe development/test data only if useful.

Options:

- Django fixtures.
- Management command.
- Factory functions inside tests.
- README instructions for creating demo users.

Do not insert production-like private data.
Do not include real passwords.
Use safe demo accounts only.

Example:

```text
username: admin_demo
password: change-me-in-local-only
```

Only add seed data that matches the actual Khalsni system models.

---

## Phase 14 — Final Validation Run
After fixes, run the validation commands again.

Required final report section:

- Commands executed.
- Passed checks.
- Failed checks.
- Reason for each remaining failure.
- Files changed.
- Tests added.
- Features fixed.
- Risks remaining.
- Manual steps required from the developer.

Update:

```text
SYSTEM_AUDIT_REPORT.md
```

with the final result.

---

## Enhancement Rules
When enhancing the system:

1. Make minimal safe changes first.
2. Do not rewrite the system architecture unless there is a clear reason.
3. Do not add unrelated modules.
4. Do not invent business requirements.
5. Do not add serialization/manufacturing/ESP32/printer logic.
6. Prefer tested changes.
7. Keep the UI simple and practical.
8. Preserve existing user data.
9. Make migrations safe.
10. Document every important decision.

---

## Expected Deliverables
By the end of the task, produce or update these files when applicable:

```text
SYSTEM_AUDIT_REPORT.md
SECURITY_REVIEW.md
SETUP_GUIDE.md
.env.example
USER_MANUAL.md
ADMIN_GUIDE.md
```

Also update or create test files inside the relevant apps.

The final response must include:

1. What you discovered about the real Khalsni system.
2. What was broken or incomplete.
3. What you fixed.
4. What tests you added.
5. What commands you ran.
6. What still needs manual review.
7. Confirmation that no unrelated serialization/manufacturing workflow was mixed into the system.

---

## Safe Working Method
Use this order:

1. Inspect project.
2. Write discovery summary.
3. Run checks.
4. Identify mismatches.
5. Fix critical errors.
6. Improve validation and permissions.
7. Improve documentation.
8. Add tests.
9. Run tests again.
10. Write final report.

Do not skip discovery.
Do not start coding before understanding the project.

---

## Definition of Done
The task is done only when:

- The Khalsni system purpose is clearly documented.
- The project passes available checks or remaining failures are clearly explained.
- Critical workflows are tested.
- Authentication and permission behavior is safe.
- Main forms and views are validated.
- Documentation is updated.
- No unrelated serialization/manufacturing/ESP32/printer logic is introduced.
- The final report clearly explains all changes.

---

## Final Reminder
This is the **Khalsni system**.
Do not confuse it with the serialization system or any other system.
Read the actual project folder first and let the code define the real scope.
