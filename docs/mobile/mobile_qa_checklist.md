# Mobile QA Checklist

## Authentication and Session

- [ ] Login works for customer.
- [ ] Login works for employee.
- [ ] Login works for provider.
- [ ] Login works for admin.
- [ ] Refresh token flow restores session after access expiry.
- [ ] Logout clears secure storage and returns to login.
- [ ] Expired session redirects safely to login.
- [ ] Unauthorized role cannot open another role's screen via deep link or manual navigation.

## Localization and UI

- [ ] Arabic UI renders correctly across all major screens.
- [ ] English UI renders correctly where bilingual support is enabled.
- [ ] RTL layout is correct for Arabic.
- [ ] Brand colors, cards, and status badges match the current web identity.
- [ ] Empty states, loading states, and error states are present.

## Customer Flow

- [ ] Customer can browse services.
- [ ] Customer can open service details.
- [ ] Customer can create a new order with required dynamic fields.
- [ ] Customer can upload required documents during order creation.
- [ ] Customer can see order list.
- [ ] Customer can open order details.
- [ ] Customer can see missing document requests when order is `WAITING_CUSTOMER`.
- [ ] Customer can upload requested missing documents.
- [ ] Customer can cancel a `NEW` order only when backend allows it.
- [ ] Customer can download final documents when available.
- [ ] Customer can rate a completed order.

## Employee Flow

- [ ] Employee dashboard loads queue summaries correctly.
- [ ] Employee review queue filters work.
- [ ] Employee can open review order details.
- [ ] Employee can verify documents from document queue.
- [ ] Employee can request missing documents with reason.
- [ ] Employee can assign provider only when documents are approved and backend allows it.
- [ ] Employee can add internal notes.
- [ ] Employee can add customer-visible notes when allowed.
- [ ] Employee can return final result to provider when allowed.
- [ ] Employee can complete order only when backend allows it.
- [ ] Employee report summary loads correctly.

## Provider Flow

- [ ] Provider dashboard metrics load correctly.
- [ ] Provider sees only assigned orders.
- [ ] Provider can move `ASSIGNED -> IN_PROGRESS` when allowed.
- [ ] Provider can move `IN_PROGRESS -> WAITING_GOVERNMENT` when allowed.
- [ ] Provider can add provider/internal notes.
- [ ] Provider can upload final document.
- [ ] Provider cannot upload final document when backend disallows it.

## Admin Flow

- [ ] Admin dashboard loads system overview.
- [ ] Admin can open all orders and details.
- [ ] Admin can manage users.
- [ ] Admin can edit user permissions.
- [ ] Admin can manage services and categories.
- [ ] Admin can manage document rules.
- [ ] Admin can manage provider assignments.
- [ ] Admin can manage providers, approval, and activation.
- [ ] Admin can manage public-site content.
- [ ] Admin can manage advertisements.
- [ ] Admin can manage theme settings if included.
- [ ] Admin can manage payments and payment status.
- [ ] Admin can view reports.
- [ ] Admin can view audit logs.

## Notifications

- [ ] Notification list loads for each role.
- [ ] Notification badge/unread count behavior is correct once backend support exists.
- [ ] Tapping notification opens related order when relation exists.
- [ ] Manual notification sending works for employee/admin where allowed.

## Documents

- [ ] File picker accepts allowed formats only.
- [ ] File size validation blocks oversized files before upload.
- [ ] Upload progress or upload state is shown.
- [ ] Verified/rejected document statuses are visible.
- [ ] Secure download works with auth token flow.
- [ ] Anonymous/public final document access is not exposed in authenticated mobile screens incorrectly.

## Reports

- [ ] Admin reports show correct metrics by status and period.
- [ ] Employee reports show only allowed scoped data.
- [ ] Provider/customer do not see admin-only reports.

## Error and Resilience

- [ ] Network offline state is shown cleanly.
- [ ] API validation errors display field-level feedback.
- [ ] Permission errors display a clear not-authorized message.
- [ ] Duplicate submissions are prevented during loading.
- [ ] Pull-to-refresh reloads list/detail data correctly.

## Security

- [ ] Tokens are stored in secure storage, not plain async storage.
- [ ] No password is stored after login.
- [ ] No secret keys are bundled in app code.
- [ ] Admin-only actions are hidden for non-admin roles.
- [ ] Sensitive tokens or signed download URLs are not logged in console.
