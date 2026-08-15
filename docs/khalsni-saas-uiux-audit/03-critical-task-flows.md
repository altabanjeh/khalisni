# Critical Task Flows

Confirmed flows:
- Discover services: public home to services/category/detail.
- Create request: public `/create-order` and customer `/customer/orders/new`.
- Track request: public `/track-order`.
- Customer document response: `/customer/orders/:id/missing-docs`.
- Employee processing: `/employee/orders` to `/employee/orders/:id`.
- Provider processing: `/provider/orders` to `/provider/orders/:id`.
- Admin configuration: services, rules, users, providers, CMS, payments, audit.

Flow notes:
- Public discovery is visually confirmed in Arabic and English screenshots. English discovery has a content completeness problem where service/category data can remain Arabic.
- Application flow is source/test confirmed but needs route screenshots through service selection, dynamic fields, uploads, review, and confirmation.
- Customer flow is test-confirmed for missing document response but still needs authenticated visual coverage of dashboard, request workspace, status, and next action.
- Employee flow is test-confirmed for review behavior but needs work-queue information architecture review.
- Provider flow is test-confirmed for order detail upload behavior but needs provider queue/dashboard screenshots.
- Admin flow is source/test confirmed across many screens, but its navigation and tables are the highest-density UI area.

Evidence:
- `frontend/src/routes/AppRoutes.jsx:158-242`
- `frontend/src/pages/public/TrackOrderPage.test.jsx`
- `frontend/src/pages/customer/MissingDocumentsResponsePage.test.jsx`
- `frontend/src/pages/employee/EmployeeOrderReviewPage.test.jsx`
- `frontend/src/pages/provider/ProviderOrderDetailsPage.test.jsx`
- `docs/khalsni-saas-uiux-audit/screenshots/services-en-1024.png`
