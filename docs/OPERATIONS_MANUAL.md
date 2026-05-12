# Operations Manual

## Daily Operations Flow

### 1. Review New Orders

1. Open the admin dashboard.
2. Check `طلبات جديدة اليوم`.
3. Open `إدارة الطلبات`.
4. Filter by `NEW`.
5. Verify customer details and uploaded documents.

### 2. Verify Documents

1. Open order details.
2. Review uploaded files.
3. If documents are missing, use `طلب وثائق إضافية`.
4. The order moves to `WAITING_CUSTOMER`.
5. Customer receives a logged notification.

### 3. Assign Provider

1. Change status to `UNDER_REVIEW` when the file is valid.
2. Use `تعيين مزوّد`.
3. Select a provider based on service category and availability.
4. Confirm the order becomes `ASSIGNED`.

### 4. Update Status During Execution

1. Providers move the order to `IN_PROGRESS`.
2. If blocked on an external entity, set `WAITING_GOVERNMENT`.
3. Add internal notes for operational visibility.
4. Every status change is recorded in the order timeline.

### 5. Deliver Final Result

1. Provider or admin uploads the final document.
2. Order becomes `READY_FOR_DELIVERY`.
3. Admin verifies the output.
4. Use `إكمال الطلب` to mark the order `COMPLETED`.

### 6. Close Order

1. Confirm final output exists or use admin confirmation.
2. Notify the customer implicitly through the system notification log.
3. Customer can download the result and submit a rating.
4. Archive historical items without hard deletion.

### 7. Review Delayed Orders

1. Check `طلبات متأخرة` in the dashboard.
2. Review provider workload and expected delivery dates.
3. Reassign or escalate where necessary.
4. Track overdue services through weekly reports.
