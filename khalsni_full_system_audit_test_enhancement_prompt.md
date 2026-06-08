# Codex Prompt — Full Khalsni Platform Audit, Testing, Enhancement, and Purpose Alignment

You are working inside the existing **Khalsni system** project folder.

## Critical Context

This task is about **Khalsni**, the service platform.

Do **not** confuse this system with any other project, especially:

- Serialization system
- Manufacturing line system
- ESP32 flashing system
- Label printing system
- Factory inspection/testing workflow
- Product serial number assignment workflow

Before writing code, changing files, or generating tests, you must first inspect the project folder and understand what this specific system is designed to do.

Your job is to test, validate, enhance, and align the current system with the real purpose of **Khalsni**.

---

## Main Objective

Perform a complete system review and improvement pass for the Khalsni platform.

The goal is to make sure:

1. The system matches the real purpose of Khalsni.
2. All existing features work correctly.
3. The user experience is clear and suitable.
4. The platform structure is clean and maintainable.
5. The system is ready for real users.
6. No unrelated logic from other systems is mixed into Khalsni.
7. Any broken, incomplete, confusing, or mismatched functionality is fixed.

---

## Step 1 — Understand the Project First

Before making any change, inspect the project structure.

Identify:

- Framework used
- Main apps/modules
- Routing structure
- Models/entities
- Database schema
- Templates/pages
- Static files
- API endpoints
- Admin pages
- Authentication flow
- User roles and permissions
- Existing documentation
- Existing tests
- Existing settings and environment configuration

Create a short internal understanding of:

- What Khalsni is
- Who uses it
- What problem it solves
- What the main workflows are
- What features already exist
- What features appear incomplete
- What features do not belong to this platform

Do not assume the purpose from previous projects. Use only the codebase and project files.

---

## Step 2 — Define the Correct Khalsni Purpose From the Codebase

Analyze the system and write a project-purpose summary in a temporary audit note.

The summary should answer:

- What is the platform?
- What type of users does it serve?
- What services or workflows does it manage?
- What is the expected user journey?
- What is the business value of the platform?
- What pages and modules support that purpose?
- Are there pages/modules that seem unrelated or mismatched?

If any part of the project is unclear, mark it as:

```text
Needs confirmation
```

Do not invent unsupported workflows.

---

## Step 3 — Full Feature Inventory

Create a full inventory of all system features.

For each feature, document:

- Feature name
- File/module location
- Related route or URL
- Related model/table
- User role allowed to use it
- Current status:
  - Working
  - Partially working
  - Broken
  - Missing validation
  - UI unclear
  - Not connected
  - Possibly unrelated
- Notes
- Recommended fix

Include all visible features from:

- Sidebar
- Navigation menu
- Dashboard
- Admin pages
- Forms
- Tables
- Buttons
- Modals
- API endpoints
- Background tasks
- Authentication pages
- Settings pages
- User profile pages
- Service-related pages
- Request/order/workflow pages
- Reports/statistics pages

---

## Step 4 — Purpose Alignment Check

Check every module, page, model, and workflow against the real purpose of Khalsni.

Create a classification:

```text
Core to Khalsni
Useful but needs improvement
Optional / future feature
Unclear purpose
Does not belong to Khalsni
```

Important:

- Do not delete anything automatically.
- If something does not belong, isolate it in the audit report and recommend action.
- If something belongs but is poorly named or unclear, improve naming only if safe.
- If a page exists but is not linked, decide whether it should be linked or removed from the main navigation.

---

## Step 5 — Functional Testing

Test all main workflows manually and through automated tests where possible.

At minimum, test:

### Authentication

- Login
- Logout
- Invalid login
- Session handling
- Access control
- Password reset / forgot password if implemented
- Role-based redirects if implemented

### User Management

- Create user
- Edit user
- Delete or deactivate user
- Assign roles
- Restrict access based on role
- Validate user profile data

### Dashboard

- Dashboard loads correctly
- Statistics are correct
- Cards link to correct pages
- Empty-state behavior works
- Errors do not crash the page

### Core Khalsni Workflows

Inspect the codebase and identify the real Khalsni core workflows.

For each workflow:

- Open the page
- Create a record
- View record details
- Edit record
- Delete/cancel/archive if supported
- Search/filter
- Validate required fields
- Check permission restrictions
- Check success/error messages
- Check database persistence
- Check mobile/tablet usability

### Forms

For every form:

- Required fields validation
- Invalid input validation
- Long text handling
- Empty input handling
- Duplicate data handling
- File upload validation if available
- Date/time validation if available
- Arabic/English text handling if available
- Clear success/error feedback

### Tables and Lists

For every table/list page:

- Data loads correctly
- Pagination works
- Search works
- Filters work
- Sorting works if available
- Empty-state message appears
- Action buttons work
- Permissions are respected

### Reports

If reports exist:

- Report page loads
- Data is correct
- Filters work
- Export works if available
- Date ranges work
- Empty reports are handled clearly

### API Endpoints

If APIs exist:

- Endpoint returns correct status code
- Authentication is enforced
- Invalid requests return clear errors
- Data is serialized correctly
- No sensitive fields are exposed
- Rate limiting or basic abuse protection exists if needed

---

## Step 6 — UI/UX Review

Review the entire interface.

Check:

- Navigation clarity
- Naming consistency
- Button labels
- Form layout
- Page titles
- Sidebar structure
- Dashboard usefulness
- Mobile/tablet responsiveness
- Arabic support if implemented
- English support if implemented
- RTL layout if Arabic exists
- Error messages
- Success messages
- Empty states
- Loading states
- Confirmation dialogs for destructive actions

Improve UI/UX where safe without redesigning the whole system.

Rules:

- Keep the system simple.
- Prioritize clarity over decoration.
- Make pages understandable for non-technical users.
- Do not add unnecessary complexity.
- Do not change working logic without reason.

---

## Step 7 — Code Quality Review

Review the backend and frontend code.

Check for:

- Duplicate code
- Dead code
- Unused files
- Broken imports
- Hardcoded values
- Hardcoded URLs
- Hardcoded English text
- Missing environment variables
- Missing error handling
- Poor naming
- Inconsistent structure
- Unused dependencies
- Security-sensitive debug code
- Console logs left in production
- TODO comments that indicate incomplete critical work

Fix safe issues.

For risky issues, document them instead of making destructive changes.

---

## Step 8 — Security Review

Check the system for common web application security risks.

At minimum, inspect:

- Authentication enforcement
- Role-based access control
- CSRF protection
- XSS protection
- SQL injection risk
- File upload restrictions
- Sensitive data exposure
- Password handling
- Environment variables
- Debug mode
- Secret keys
- Admin access
- Public routes
- API access control
- Error trace leakage
- Allowed hosts / CORS settings

Apply safe fixes.

Do not weaken security to make testing easier.

---

## Step 9 — Data Integrity Review

Inspect models, migrations, and database usage.

Check:

- Required fields
- Unique constraints
- Foreign key behavior
- Cascade delete behavior
- Soft delete behavior if used
- Status fields
- Date/time fields
- Created/updated timestamps
- Audit fields if available
- Data validation
- Duplicate record prevention
- Broken relationships

If a database migration is needed, create it safely.

Do not create destructive migrations unless absolutely necessary and clearly documented.

---

## Step 10 — Documentation and User Guide Check

Check whether the system has an internal user manual, guide, help page, or documentation.

If documentation exists:

- Verify that it matches the current system.
- Remove or correct wrong instructions.
- Add missing steps.
- Make it suitable for actual Khalsni users.

If documentation does not exist:

- Create a basic internal guide page or Markdown documentation.

The guide should explain:

- What Khalsni is
- How to login
- How to use the dashboard
- How each main workflow works
- How to create/edit/view records
- How user roles work
- How to use search/filter/report tools
- Common errors and how to fix them
- Best daily workflow

Do not include manufacturing, serialization, ESP32, label printing, or factory workflow instructions unless the current Khalsni codebase clearly contains those features and they truly belong to this system.

---

## Step 11 — Automated Test Creation

Add or improve automated tests.

Create tests for:

- Authentication
- Permissions
- Main pages load
- Main forms submit
- Core workflows
- Model validation
- API endpoints if available
- Role restrictions
- Error cases
- Empty states where practical

Use the testing framework already used by the project.

If no tests exist, add a minimal test structure that fits the framework.

Do not introduce a heavy testing framework unless necessary.

---

## Step 12 — Enhancement Pass

After testing and auditing, improve the system carefully.

Possible safe enhancements:

- Clearer page titles
- Better button labels
- Better validation messages
- Better empty-state messages
- Better dashboard links
- Missing navigation links
- Simple search/filter improvements
- Better role checks
- Cleaner settings handling
- Better error pages
- Better mobile responsiveness
- Better documentation
- Fixing broken links
- Removing obvious dead UI elements from navigation only if safe

Do not add large new features unless they are clearly required by the existing system purpose.

---

## Step 13 — Regression Testing

After changes, run the project and test again.

Run:

- Existing tests
- Newly added tests
- Framework checks
- Lint/type checks if available
- Migration checks
- Static file checks if relevant
- Basic manual browser testing

Make sure:

- No existing functionality is broken
- No unrelated system behavior was added
- No serialization/manufacturing logic was introduced
- Khalsni remains focused on its actual purpose

---

## Step 14 — Final Audit Report

Create a final Markdown report in the project, for example:

```text
docs/KHALSNI_SYSTEM_AUDIT_REPORT.md
```

The report must include:

1. Project understanding summary
2. Confirmed purpose of Khalsni
3. Feature inventory
4. Purpose alignment table
5. Working features
6. Broken or incomplete features
7. Fixed issues
8. Remaining issues
9. Security findings
10. Data integrity findings
11. UI/UX findings
12. Test coverage summary
13. Files changed
14. Migrations added
15. Manual/user guide updates
16. Risks
17. Recommended next steps

Use a clear table format where useful.

---

## Step 15 — Required Output From Codex

When finished, respond with:

```text
## Khalsni Audit and Enhancement Summary

### Project Purpose Detected
...

### What Was Tested
...

### What Was Fixed
...

### What Was Enhanced
...

### What Was Not Changed
...

### Files Changed
...

### Tests Added or Updated
...

### Test Results
...

### Remaining Risks
...

### Recommended Next Steps
...
```

---

## Strict Rules

- Do not confuse Khalsni with the serialization system.
- Do not add manufacturing workflow unless it already exists and clearly belongs to Khalsni.
- Do not add ESP32, printer, scanner, serial number, label, inspection-line, or factory-testing logic unless the current codebase clearly proves that Khalsni includes it.
- Read the project folder before making changes.
- Do not invent unsupported features.
- Do not delete major code without documenting why.
- Do not break existing routes.
- Do not break authentication.
- Do not break database migrations.
- Do not expose secrets.
- Do not hardcode local machine paths.
- Keep improvements aligned with the actual system purpose.
- Mark unclear areas as `Needs confirmation`.
- Prefer safe, maintainable fixes over large rewrites.
