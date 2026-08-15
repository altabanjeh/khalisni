# Customer Portal Map

Routes preserved:
- `/customer`
- `/customer/orders/new`
- `/customer/orders`
- `/customer/orders/:id`
- `/customer/orders/:id/missing-docs`
- `/customer/profile`
- `/customer/manual`

Current customer UI capabilities preserved:
- Dashboard summary from customer orders and notifications.
- My Requests table/card hybrid with status badges and search.
- Request workspace with documents, status timeline, missing-document CTA, upload flow, cancellation, and rating where allowed.

Security-sensitive behavior preserved:
- No internal notes exposed.
- Document display continues to use existing `DocumentList` and API-provided document links.
- Missing documents continue to use existing customer order permissions/actions.

Not completed in this pass:
- Full visual rewrite of every customer page.
- New customer-safe messaging system. The current UI remains updates/timeline oriented.
