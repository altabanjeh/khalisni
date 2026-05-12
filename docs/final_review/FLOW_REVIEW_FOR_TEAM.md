# FLOW REVIEW FOR TEAM

## Purpose

This document explains how the service-order system now works after the review and fix phases.

It is written for:

- Admin team
- Employee operations team
- Provider coordination team
- System owner

## Simple Explanation Of The System Flow

The system handles a service request from start to finish in a controlled order.

The normal flow is:

1. Client creates a service order.
2. Client uploads the required documents for that service.
3. Employee reviews the order and the documents.
4. If something is missing, employee asks the client for the missing items.
5. When the order is ready, employee or admin assigns a provider if the service needs one.
6. Provider works on the order.
7. Provider uploads the final result.
8. Employee checks the provider result.
9. If the result is correct, the order is completed.
10. If the result is not correct, the order is returned to the provider with a reason.

The system is designed so people cannot skip important steps easily.

## Role Responsibilities

### Client

- Create a new order
- Upload required documents
- Respond when missing documents are requested
- Track the order
- View the final result if allowed
- Cancel only in limited early cases

### Employee

- Start order review
- Check documents
- Request missing documents
- Assign provider if allowed
- Review provider result
- Complete the order through the safe completion action
- Return provider work with a reason when needed

### Provider

- See only assigned orders
- Start work
- Update work progress
- Upload final result
- Receive return notes when rework is needed

### Admin

- Manage service rules and required-document rules
- Approve and activate providers
- View audit logs
- Manage safe business settings
- Cancel active orders with a reason
- Reopen completed orders with a reason if allowed

### Super Admin

- Perform limited high-level actions that normal admin cannot do
- Manage admin-level users
- Keep control of sensitive access areas

## Client Journey

1. Client chooses a service from the public service list.
2. Client creates an order.
3. If the service requires documents at creation time, the client must upload them.
4. The order enters the review process.
5. If more documents are needed, the client receives a request.
6. The client uploads the missing files.
7. The client waits while employee and provider continue the work.
8. The client receives updates during key steps.
9. The client can track the order and later access the final result if the service allows it.

## Employee Journey

1. Employee checks the review queue.
2. Employee starts review of new orders.
3. Employee checks whether all required documents are present and valid.
4. If something is missing, employee requests the exact missing items.
5. When all required documents are ready, employee assigns a suitable provider if the service needs one.
6. Employee waits for provider progress and final upload.
7. Employee verifies the provider result.
8. If the result is correct, employee completes the order through the correct completion flow.
9. If the result is wrong or incomplete, employee returns it to the provider with a reason.

## Provider Journey

1. Provider sees only orders assigned to them.
2. Provider starts work.
3. Provider updates progress when needed.
4. Provider uploads the final result.
5. If the employee returns the work, provider sees the return reason.
6. Provider uploads a corrected result.
7. Provider waits for final employee approval.

## Admin Journey

1. Admin manages safe business rules such as services, required documents, templates, providers, and settings.
2. Admin cannot freely bypass workflow rules.
3. Admin can review audit logs to see what changed and who changed it.
4. Admin can update required-document rules for future orders.
5. Admin can cancel orders with a reason.
6. Admin can reopen completed orders with a reason when the workflow allows it.

## What Changed After Fixes

### Workflow safety improved

- Protected workflow steps are now harder to bypass.
- Orders cannot be completed through the generic status change route.
- Final result must exist before normal completion.
- Missing-document handling now works one item at a time.

### Role protection improved

- Client cannot see another client order.
- Provider cannot access unassigned orders.
- Provider no longer sees private internal information.
- Customer order detail no longer exposes internal notes.

### Admin safety improved

- Admin rule screens are now safer and simpler.
- Dangerous raw editing paths are restricted.
- Audit logs are read-only.
- Required-document rules and provider approvals are audited.

### Notification and audit reliability improved

- Important events now create consistent notifications.
- Duplicate workflow notifications are blocked.
- More business actions now create audit records.

### Reporting and checking improved

- Operational reports are scoped by role.
- A consistency-check command now reports invalid data conditions without changing data automatically.

## What Is Still Pending

- No browser-driven automated end-to-end frontend tests yet. Current end-to-end coverage is API-level.
- Payment is still not a strong part of the service-order completion rule.
- Some business stages are still grouped together in the current status model instead of having separate statuses.
- Notification delivery is reliable inside the system, but external channel delivery workers are still not expanded.

## Decisions Needed From The Team

- Who should be allowed to assign providers: admin only, or employee and admin?
- Should employee be allowed to complete orders, or should completion be admin-only?
- Should admin be allowed to reopen completed orders in all cases, or only limited cases?
- Should client cancellation stay limited to early orders only?
- Should payment be required before completion?
- Which services require a provider and which do not?
- Which documents are required for each service?
- Should provider see client name, or only limited task details?
- Should the system keep the current emergency completion override, or remove it later?

## Recommended Team Review Order

1. Review [ORDER_STATUS_FLOW_SIMPLE.md](/d:/ghassan/docs/final_review/ORDER_STATUS_FLOW_SIMPLE.md)
2. Review [ROLE_ACTION_TABLE.md](/d:/ghassan/docs/final_review/ROLE_ACTION_TABLE.md)
3. Review [EMPLOYEE_WORK_GUIDE.md](/d:/ghassan/docs/final_review/EMPLOYEE_WORK_GUIDE.md)
4. Review [ADMIN_SETTINGS_SIMPLE_GUIDE.md](/d:/ghassan/docs/final_review/ADMIN_SETTINGS_SIMPLE_GUIDE.md)
5. Record decisions in [TEAM_DECISION_LOG.md](/d:/ghassan/docs/final_review/TEAM_DECISION_LOG.md)

## Appendix: Technical Reference Sources

- `docs/system_review/ORDER_WORKFLOW_MATRIX.md`
- `docs/system_review/ROLE_PERMISSION_MATRIX.md`
- `docs/system_review/ADMIN_CONFIG_RULES.md`
- `docs/fixes/PHASE_1_BACKEND_WORKFLOW_LOCK.md`
- `docs/fixes/PHASE_2_ORDER_FLOW_SERVICE.md`
- `docs/fixes/PHASE_3_EMPLOYEE_WORKFLOW_FIXES.md`
- `docs/fixes/PHASE_4_ADMIN_RULE_MANAGEMENT.md`
- `docs/fixes/PHASE_5_AUDIT_NOTIFICATION_REPORTING.md`
- `docs/qa/MANUAL_FLOW_TEST_CHECKLIST.md`
- `docs/qa/AUTOMATED_TEST_COVERAGE.md`
