# Codex Prompt — Full Test, Audit, and Enhancement for the Khalsni Services Platform

## Critical Context
You are working on the **Khalsni services platform** project.

Do **not** confuse this system with any other project, especially:

- Serialization system
- Manufacturing production-line system
- ESP32 flashing system
- Label printing system
- Warehouse or electronics inspection workflow
- Firmware upload or MAC address reading system

This prompt is only for the **Khalsni services platform**.

The goal is to fully inspect, test, validate, and enhance the current Khalsni platform so it becomes suitable for its original purpose as a service-oriented platform used by clients, admins, and internal users.

Before changing anything, read the project folder carefully and infer the real system purpose from the existing code, models, routes, templates, APIs, documentation, screenshots, README files, configuration files, and database structure.

---

## Main Objective
Perform a complete technical and functional audit of the Khalsni services platform, then improve what needs improvement without changing the core identity of the system.

The final system should be:

- Functional
- Stable
- Secure
- Suitable for real clients
- Easy to use
- Role-aware
- Properly documented
- Testable
- Maintainable
- Ready for local or server deployment
- Clearly aligned with the real purpose of Khalsni as a services platform

---

## Step 1 — Understand the Project Before Editing
First, inspect the full project structure.

Read and analyze:

- README files
- Requirements files
- Django/FastAPI/Flask configuration if present
- Backend apps/modules
- Models
- Views/controllers
- Routes/URLs
- Templates/pages
- Static files
- JavaScript files
- API endpoints
- Forms
- Permissions
- Authentication logic
- Admin panel customizations
- Database migrations
- Existing tests
- Existing user manual or guide files
- Screenshot folders if available
- Environment variable examples
- Docker files if available
- Deployment files if available

After reading, create a short internal summary that answers:

1. What is the real purpose of Khalsni?
2. Who are the users?
3. What services does the system provide?
4. What is the expected client journey?
5. What is the expected admin/internal-user journey?
6. What parts are complete?
7. What parts are missing, broken, or unclear?
8. What parts conflict with the intended purpose?

Do not start coding before this understanding step is complete.

---

## Step 2 — Protect the System Scope
During the audit, make sure the platform does not accidentally include logic or assumptions from unrelated systems.

Flag and remove or isolate anything that belongs to:

- Manufacturing workflows
- Serial number assignment
- ESP32 firmware upload
- MAC address reading
- Physical product inspection
- Label printing
- Production-line status tracking
- Hardware testing

Only keep these if the existing Khalsni services platform truly requires them. If not required, do not mix them into the platform.

---

## Step 3 — Functional Testing Checklist
Test every core function in the system based on the actual code.

At minimum, check:

### Authentication
- User registration if available
- Login
- Logout
- Password reset / forgot password
- Email verification if available
- Session handling
- Invalid login handling
- Password validation
- Account activation/deactivation

### User Roles and Permissions
Identify all roles in the system, then test that each role can only access what it should.

Check:

- Admin permissions
- Client permissions
- Staff/internal-user permissions
- Anonymous visitor permissions
- Page-level access control
- API-level access control
- Button/action visibility by role
- Direct URL access protection

### Client Flow
Test the full client journey from start to finish.

Check:

- Client account creation or onboarding
- Client dashboard
- Service browsing/requesting
- Request creation
- Request editing if supported
- Request tracking
- Request status visibility
- Client notifications if available
- Client profile update
- Client support/contact flow
- Client documents/files if available

### Admin/Internal Flow
Test the full admin or staff workflow.

Check:

- Admin dashboard
- Viewing client requests
- Assigning or updating services
- Changing request status
- Managing clients
- Managing service categories
- Managing content
- Managing system settings
- Reviewing feedback or survey data if available
- Creating reports if available
- Exporting data if available

### Service Management
Check the service-related logic.

Validate:

- Service list
- Service details
- Service categories
- Service forms
- Required fields
- Pricing fields if present
- Approval process if present
- Status lifecycle
- Search/filtering
- Sorting
- Pagination
- Empty states
- Error states

### Forms and Validation
Check every form in the system.

Validate:

- Required fields
- Field length limits
- File upload rules
- Email validation
- Phone validation
- Date validation
- Numeric validation
- Duplicate record prevention
- Clear error messages
- Success messages
- Protection against invalid data

### UI and UX
Check every visible page.

Validate:

- Page layout
- Navigation
- Sidebar/header/footer
- Button behavior
- Form usability
- Mobile responsiveness
- Tablet responsiveness
- Desktop layout
- Arabic layout if RTL is supported
- English layout if LTR is supported
- Clear labels
- Clear status messages
- No broken links
- No missing icons/images
- No untranslated text
- No placeholder text left in production pages

### Arabic and English Support
If the system supports Arabic and English, test the language switch fully.

Check:

- All English text has Arabic translation
- All Arabic text has English translation
- No mixed language unless intentionally required
- RTL layout works correctly for Arabic
- LTR layout works correctly for English
- Language preference is saved if designed
- Emails/messages are translated if needed
- User manual supports both languages if required

### Guide / User Manual
If the project includes a user guide or manual, test and enhance it.

The guide should explain:

- What Khalsni is
- Who should use it
- How to login
- How to reset password
- How to use each dashboard
- How to request a service
- How to track a service
- How admins manage requests
- What each button does
- What each status means
- What each role can do
- Common errors and solutions

If screenshots exist, use them to enrich the guide. Link screenshots to the correct pages and explain each step clearly.

---

## Step 4 — Security Audit
Perform a practical security review.

Check:

- SECRET_KEY is not hardcoded
- DEBUG is disabled in production mode
- ALLOWED_HOSTS is configured correctly
- CSRF protection is enabled
- Authentication is required where needed
- Permissions are enforced in backend logic, not only in templates
- Password reset tokens are safe
- File uploads are validated
- Uploaded files cannot execute code
- SQL injection risks
- XSS risks
- Open redirect risks
- Sensitive data exposure
- API authentication
- Rate limiting if needed
- Environment variables are documented

Add safe fixes where needed.

Do not print secrets in logs.
Do not commit real credentials.
Create or update `.env.example` if needed.

---

## Step 5 — Database and Data Integrity Audit
Inspect the database models and migrations.

Check:

- Model relationships
- Foreign keys
- Required fields
- Unique constraints
- Indexes for search-heavy fields
- Default values
- Status fields
- Timestamp fields
- Soft delete needs if applicable
- Migration consistency
- Orphan records risk
- Data duplication risk

If test data is missing, create safe seed/test data for development only.

Seed data should include:

- Admin user
- Staff/internal user
- Client user
- Several service categories
- Several services
- Several service requests with different statuses
- Example feedback records if the system supports feedback
- Example guide/manual records if stored in DB

Make sure seed data does not run automatically in production.

---

## Step 6 — API and Backend Testing
If the system has APIs, test every endpoint.

For each endpoint, verify:

- URL
- HTTP method
- Required authentication
- Required role
- Request body
- Response body
- Status codes
- Validation errors
- Permission errors
- Not found errors
- Server error prevention

Add or improve API tests if missing.

Expected response behavior:

- 200 for successful reads
- 201 for successful creation
- 400 for validation errors
- 401 for unauthenticated access
- 403 for unauthorized access
- 404 for missing records
- 500 should not happen during normal invalid usage

---

## Step 7 — Automated Testing
Add or improve automated tests based on the technology stack.

For Django, use Django TestCase, pytest-django, or the existing project test style.

Test categories:

### Unit Tests
- Models
- Utility functions
- Validators
- Services/business logic

### Integration Tests
- Login flow
- Password reset flow
- Client service request flow
- Admin request management flow
- Language switching
- File upload flow if available

### Permission Tests
- Anonymous access
- Client access
- Staff access
- Admin access
- Direct URL access
- API access

### UI Smoke Tests
If Playwright, Selenium, or another browser testing tool exists or can be added safely, create smoke tests for:

- Home page
- Login page
- Dashboard
- Service list
- Service request page
- Admin management page
- User guide page

Do not add heavy tools if the project is not ready for them. Prefer simple reliable tests first.

---

## Step 8 — Enhancement Tasks
After testing, improve the system where needed.

Possible improvements:

- Better dashboard cards
- Clearer service status labels
- Better empty states
- Better validation messages
- Better error pages
- Better mobile layout
- Better Arabic/English consistency
- Better role-based navigation
- Better user manual integration
- Better admin filtering/search
- Better logging
- Better environment configuration
- Better deployment readiness
- Better Docker setup if Docker exists
- Better README

Do not over-engineer.
Do not rewrite the whole system unless required.
Do not introduce unrelated features.

---

## Step 9 — Deployment Readiness
Check whether the project can run reliably in development and production-like environments.

Validate:

- Installation steps
- Required Python/Node versions
- Required environment variables
- Database setup
- Migration commands
- Static files collection
- Media files setup
- Email configuration
- Docker build if available
- Docker Compose if available
- Local network access if needed
- Production settings separation

Update documentation with exact commands.

Example documentation sections to create or update:

- Project purpose
- Features
- User roles
- Setup instructions
- Environment variables
- Database setup
- Running locally
- Running tests
- Creating seed data
- Deployment notes
- Troubleshooting

---

## Step 10 — Reporting Requirements
At the end, produce a clear report file inside the project, for example:

`docs/KHALSNI_SYSTEM_AUDIT_REPORT.md`

The report must include:

1. System purpose summary
2. Detected user roles
3. Detected service workflow
4. Tested features
5. Passed tests
6. Failed tests
7. Fixed issues
8. Remaining issues
9. Security findings
10. Database findings
11. UI/UX findings
12. Arabic/English findings
13. Deployment findings
14. Recommended next steps

Also update or create:

- `README.md`
- `.env.example`
- Test files
- Seed data command or fixture if needed
- User guide/manual files if needed

---

## Step 11 — Acceptance Criteria
The task is complete only when:

- The real Khalsni services-platform purpose is clearly identified
- The platform is not confused with serialization or manufacturing systems
- All core pages are tested
- All core user flows are tested
- Role permissions are tested
- Authentication is tested
- Service request flow is tested
- Admin/internal workflow is tested
- Arabic/English support is checked if present
- User manual or guide is checked and improved if present
- Security basics are checked
- Database integrity is checked
- Automated tests are added or improved
- Documentation is updated
- A final audit report is created
- No unrelated system logic is added

---

## Important Coding Rules
Follow these rules while editing:

- Make small, safe commits/changes
- Do not delete major code without explaining why
- Do not rename core models/routes unless necessary
- Do not break existing URLs unless required
- Keep backward compatibility where possible
- Use existing project style
- Prefer simple fixes over complex rewrites
- Add comments only where useful
- Keep code readable
- Avoid hardcoded values
- Avoid hardcoded secrets
- Do not add random features
- Do not fabricate system purpose; infer it from the project files

---

## Final Output Expected From Codex
When finished, provide:

1. A summary of what you found
2. A summary of what you fixed
3. A list of files changed
4. A list of tests added or updated
5. Commands to run the system
6. Commands to run tests
7. Any remaining problems
8. Any manual steps required

The final answer must clearly state whether the Khalsni services platform is now suitable for its intended purpose, partially suitable, or not yet suitable, with reasons.
