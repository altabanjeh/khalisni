# ORDER STATUS FLOW SIMPLE

## Notes

- The system uses practical working statuses.
- Some business steps are part of a larger status instead of having their own separate status.

| Step | Status | Who Acts | What Happens | Next Possible Step |
|---|---|---|---|---|
| 1 | New | Client | Client creates the order and submits the first required information | Under Review, Cancelled |
| 2 | Under Review | Employee or Admin | Team checks the order details and documents | Waiting for Client, Assigned, Rejected, Cancelled |
| 3 | Waiting for Client | Client | Client must upload the missing requested documents | Under Review, Cancelled |
| 4 | Assigned | Employee or Admin | A provider is chosen for the order if the service needs one | In Progress, Cancelled |
| 5 | In Progress | Provider | Provider starts working on the order | Waiting for Government, Ready for Delivery, Rejected, Cancelled |
| 6 | Waiting for Government | Provider | Provider is waiting on an outside office or authority | In Progress, Ready for Delivery, Cancelled |
| 7 | Ready for Delivery | Employee or Admin after provider result upload | Final result exists and is waiting for internal approval or final completion | Completed, Under Review, In Progress, Cancelled |
| 8 | Completed | Employee or Admin | Order is finished and final result is accepted | Archived, Reopened to Under Review if allowed |
| 9 | Rejected | Employee or Admin | Order is rejected and closed with a reason | Archived |
| 10 | Cancelled | Client in limited early cases, or Admin, or some internal review roles depending on policy | Order is cancelled with a reason | Archived |
| 11 | Archived | Admin | Final closed state for records | No normal next step |

## Simple Journey Example

1. Client creates order.
2. Employee reviews it.
3. If documents are missing, client is asked to upload them.
4. Employee approves the file set.
5. Provider is assigned.
6. Provider works and uploads final result.
7. Employee checks the result.
8. Order is completed.

## Return To Provider Example

1. Provider uploads a final result.
2. Employee finds a problem.
3. Employee returns the work with a reason.
4. Order moves back to In Progress.
5. Provider corrects the issue and uploads a new result.
6. Employee approves and completes the order.

## Appendix: Technical Reference Sources

- `docs/system_review/ORDER_WORKFLOW_MATRIX.md`
- `docs/fixes/PHASE_2_ORDER_FLOW_SERVICE.md`
- `docs/qa/MANUAL_FLOW_TEST_CHECKLIST.md`
