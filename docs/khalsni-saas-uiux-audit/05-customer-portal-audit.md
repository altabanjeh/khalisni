# Customer Portal Audit

Status: PARTIALLY CONFIRMED

Customer routes exist for dashboard, order creation, order list, order detail, missing documents, profile, and manual. Automated tests cover order tables and missing document response. Runtime screenshots captured unauthenticated redirect behavior only.

Key audit risks:
- Customer request workspace needs authenticated screenshot validation for status, document requirements, timeline, missing document response, and next action.
- Mobile customer portal behavior is not fully runtime-confirmed.
- Upload states should be checked in Arabic and English because `FileUploader` includes hardcoded Arabic text.

Evidence:
- `frontend/src/routes/AppRoutes.jsx:176-182`
- `frontend/src/pages/customer/MyOrdersPage.test.jsx`
- `frontend/src/pages/customer/MissingDocumentsResponsePage.test.jsx`
- `frontend/src/components/FileUploader.jsx:46-182`
- `docs/khalsni-saas-uiux-audit/screenshots/customer-protected-redirect-1440.png`
