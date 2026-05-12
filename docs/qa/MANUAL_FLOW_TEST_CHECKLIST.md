# MANUAL FLOW TEST CHECKLIST

## Notes

- Current backend model has no separate draft or submit state.
- Public order creation is the current client submit action.
- Provider final-document upload is the current provider work-complete action.

## Client Flow

1. Open the public service catalog and choose a service with required documents.
2. Create a new order with valid customer details.
3. Upload all required documents if the service requires them at order creation.
4. Confirm the order is created and the public order number is shown.
5. Open the customer order list and verify the new order appears.
6. Open the customer order detail and verify internal-only data is not shown.
7. If employee requests missing documents, verify the order status becomes `WAITING_CUSTOMER`.
8. Upload only one requested document and verify the order still shows `WAITING_CUSTOMER`.
9. Upload the remaining requested documents and verify the order returns to review.
10. After completion, open the tracking screen and verify the final result document is visible if allowed.

## Employee Flow

1. Open the employee review queue.
2. Start review for a new order and verify it moves to `UNDER_REVIEW`.
3. Review customer-uploaded documents in the staff document queue.
4. Approve valid required documents and verify document status updates.
5. For an incomplete case, request multiple missing documents with a clear reason.
6. Verify the order shows the missing document list and moves to `WAITING_CUSTOMER`.
7. Once all required documents are resolved, assign an eligible provider.
8. When provider uploads the final result, verify the order moves to `READY_FOR_DELIVERY`.
9. Reject the provider result once with a reason and verify the order returns to `IN_PROGRESS`.
10. Verify the provider can see the return reason.
11. After corrected upload, approve the final result document.
12. Complete the order through the dedicated complete action, not through the generic status action.

## Provider Flow

1. Open the provider dashboard and verify only assigned orders are visible.
2. Open an assigned order and verify private customer/internal fields are not exposed.
3. Start work and verify the order moves to `IN_PROGRESS`.
4. Upload the final result document and verify the order moves to `READY_FOR_DELIVERY`.
5. If the result is returned, verify the return reason is visible in the provider order timeline.
6. Upload the corrected final result document.
7. Verify unassigned orders are not accessible by direct URL.

## Admin Flow

1. Open the admin rules workspace.
2. Update a service required-document rule.
3. Verify an audit log entry is created for the rule change.
4. Create a new public order for that service without the newly required document and verify submission is blocked.
5. Verify older completed orders for that service remain completed and unchanged.
6. Attempt to edit protected order workflow fields through the raw admin order-record endpoint and verify the change is blocked.
7. Attempt to delete audit logs and verify deletion is blocked.
8. Cancel an active order with a reason and verify status changes to `CANCELLED`.
9. Try cancellation without a reason and verify validation fails.
10. Reopen a completed order with an allowed role and required reason.

## Super Admin Checks

1. Verify normal admin cannot create or promote another admin-level user.
2. Verify Django super admin can create an admin-level user when required.
3. Verify raw destructive admin capabilities remain restricted to super admin only where still supported.
