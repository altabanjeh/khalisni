# Requirements Inventory

Authoritative sources reviewed: `docs/`, `docs/ui/KHALSNI_CUSTOMER_UI_AUDIT.md`, `docs/ui/KHALASNI_VISUAL_IMPLEMENTATION_FINAL_REPORT.md`, `docs/API_SPEC.md`, `docs/DATABASE_SCHEMA.md`, routes, models, migrations, serializers, views, frontend locales, and automated tests.

Domains: architecture; authentication/authorization; public discovery; category/service catalog; request workflow; documents; pricing; duration; customer/employee/provider/admin operations; deletion/audit/notifications/payment; search; i18n/RTL; UI/mobile; security; performance; accessibility; testing.

The catalog has one authoritative `ServiceCategory` and `Service` model. Orders, documents, provider assignments, required-document definitions, and audit records likewise use one domain implementation; no parallel `New*` domain was found.
