# KHALSNI — J01–J20 Journey Results (Gate 1R)

The J-numbers appear in prior acceptance docs but were **never defined** in the repository. They are derived here from the authoritative requirements — `docs/SRS.md` FR1–FR10 + business rules, `docs/PRD.md` "Primary User Journeys", `docs/b2b2c_architecture.md` "Required Screen Map" — not invented arbitrarily. Each journey asserts: **initial state → role → action → HTTP/API result → persisted state → permission boundary / failure behaviour.**

**Execution:** `backend/orders/tests_journeys.py::JourneySuite` — 20 tests, **all PASS** — driving the **real DRF API against a real test database** (real serializers, permissions, workflow engine, audit, notifications). Frontend rendering of the journey screens is separately proven by `KHALSNI_ROUTE_RUNTIME_MATRIX.md` (every customer/employee/admin/provider route loads clean against the live API) and screenshots in `frontend/e2e-results/screenshots/`.

Run: `POSTGRES_DB= DJANGO_SECRET_KEY=... python manage.py test orders.tests_journeys` → `Ran 20 tests ... OK`.

| Journey | Role | Result | UI evidence | API evidence | DB evidence | Defect |
|---|---|---|---|---|---|---|
| **J01** Public homepage payload | anon | PASS | `/` route matrix PASS + screenshot `public-home-ar-1440.png` | `GET /api/public-site/homepage/` → 200 | — | — |
| **J02** Category discovery hides non-public categories | anon | PASS | `/services`, category cards render (screenshot) | `GET /api/public-site/service-categories/` → 200; `j-internal` (show_on_public_site=False) absent, `j-gov` present | `ServiceCategory.show_on_public_site` honoured | — |
| **J03** Category→services→service detail w/ requirements, gated pricing, duration | anon | PASS | `/services/:slug` route matrix PASS + screenshot `public-service-detail-ar-1440.png` | `GET /api/public-site/service-categories/j-gov/services/` → 200; `GET /api/services/j-passport/` → 200 with `required_documents`, `pricing.total_price` set, `pricing.government_fee`/`company_fee` **null**, `delivery_time.label` present | visibility flags applied by serializer | **D2 verified fixed** here |
| **J04** Public order tracking by number + phone | anon | PASS | `/track-order` route matrix PASS + screenshot | `GET /api/orders/track/?order_number=&phone=` → 200 status `NEW`; wrong phone → 400/404 | order persisted, `order_number` `KH-YYYY-######` | — |
| **J05** Public "request a missing service" | anon | PASS | `/` missing-service CTA (screenshot) | `POST /api/public-site/missing-service-requests/` (`service_name`,`request_message`,`requester_name`,`requester_phone`) → 201 | `MissingServiceRequest` row created | (model has no tenant key — documented limitation) |
| **J06** Customer registration | anon→customer | PASS | `/register` route matrix PASS + `RegisterPage.test` | `POST /api/auth/register/` → 201 | new `CustomUser` role=customer | — |
| **J07** Login + wrong-password rejection | customer | PASS | `/login` route matrix PASS + `LoginPage.test` (5) | `POST /api/auth/login/` → 200 `{access,refresh,user}`; wrong pw → 401 | — | — |
| **J08** Customer creates request; appears in history | customer | PASS | `/customer/orders/new`, `/customer/orders` route matrix PASS + `MyOrdersPage.test` | `POST /api/orders/` (multipart, required doc) → 201; `GET /api/customer/orders/` lists it | `Order` + `Document` rows; `order_number` `KH-` prefix | — |
| **J09** Customer uploads a document to an existing order | customer | PASS | `/customer/orders/:id` route matrix PASS | `POST /api/customer/orders/:id/documents/` (`document_type`,`file`) → 201 | `Document` row, not deleted | — |
| **J10** Customer views detail + status timeline | customer | PASS | `/customer/orders/:id` route matrix PASS | `GET /api/customer/orders/:id/` → 200; `GET /api/orders/:id/timeline/` → 200 | `OrderStatusLog` | — |
| **J11** Missing-documents cycle | customer + employee | PASS | `/customer/orders/:id/missing-docs` route matrix PASS + `MissingDocumentsResponsePage.test` | employee `request-documents` → order `WAITING_CUSTOMER`; customer re-upload → order back to `UNDER_REVIEW` | `Order.missing_document_types` cleared; status transitions logged | — |
| **J12** Customer cancel rules (NEW only) | customer | PASS | `/customer/orders/:id` | `POST /api/customer/orders/:id/cancel/` on NEW → 200 `CANCELLED`; second cancel → 400 | `Order.status=CANCELLED`, `cancellation_reason` set (BR3) | — |
| **J13** Rate a completed order | customer | PASS | `/customer/orders/:id` | full lifecycle drive → `POST /api/customer/orders/:id/rating/` (`score`,`comment`) → 201 | `Rating` row (BR: one rating per order) | — |
| **J14** Employee review queue + open order | employee | PASS | `/employee/orders`, `/employee/orders/:id` route matrix PASS + `EmployeeOrderReviewPage.test` | `GET /api/admin/orders/` → 200; `GET /api/admin/orders/:id/` → 200 | — | — |
| **J15** Employee requests missing documents (transition) | employee | PASS | `/employee/orders/:id` | `start_review` then `POST .../request-documents/` → order `WAITING_CUSTOMER` (note required — BR3-style) | status log + `missing_document_types` | — |
| **J16** Staff verifies an uploaded document | employee | PASS | `/employee/documents/verify` route matrix PASS | `POST /api/staff/documents/:id/verify/` (`is_verified:true`) → 200/204 | `Document.is_verified=True` | — |
| **J17** Provider assignment requires approved documents (BR2/BR: docs-before-assign) | employee | PASS | `/admin/orders/:id` (admin), assignment UI | assign before doc approval → **400**; approve docs, assign → 200 `ASSIGNED` | `Order.assigned_provider`, `assigned_provider_organization` snapshot; status log | — |
| **J18** Provider scope + execution (BR: assigned-only) | provider | PASS | `/provider/orders`, `/provider/orders/:id` route matrix PASS + `ProviderOrderDetails.test` | provider `GET` on unassigned order → **404**; on assigned → 200; `status→IN_PROGRESS` → 200; `POST .../final-document/` (`document_type`,`file`) → order `READY_FOR_DELIVERY` | provider-scoped queryset; final `Document.is_final_document=True` | — |
| **J19** Admin catalog: create → soft-delete → restore, with audit (SD1/SD4/SD6, BR8) | admin | PASS | `/admin/services` route matrix PASS + `ServicesManagementPage.test` + screenshot `admin-services-ar-1440.png` | `POST /api/admin/services/` (`category_id`,…) → 201; `DELETE .../:id/` (`delete_password`) → 204; public `GET /api/services/:slug/` no longer 200; `POST .../:id/restore/` → 200/204 | row soft-deleted then restored; `restore_service` `AuditLog` present | — |
| **J20** Admin processes an order end-to-end and archives (BR8, FR8, FR9) | admin (+ employee/provider) | PASS | `/admin/orders/:id` route matrix PASS + screenshot `admin-orders-ar-1440.png` | full drive review→assign→in-progress→final-doc→verify→`complete` → `COMPLETED`; then generic `status→ARCHIVED` → 200 | `Order.status=ARCHIVED`; `AuditLog` entries for the order; `OrderStatusLog` chain | — |

## Coverage against the business capabilities (Gate 1R §9)

| Capability area | Journeys | Covered |
|---|---|---|
| Public discovery (home, category, service, requirements, gated fees, duration, auth entry) | J01–J07 | ✅ |
| Customer request lifecycle (select, create, fields, documents, validation, submit, confirm, history, tracking, detail, missing-docs, cancel, rate) | J08–J13 | ✅ |
| Operations / employee (review queue, open, request docs, verify docs, assign provider) | J14–J17 | ✅ |
| Provider execution (assigned-only scope, progress, final document) | J18 | ✅ |
| Administration (catalog create/edit, soft-delete, restore, audit, order processing, status workflow, archive) | J19–J20 | ✅ |
| Category / document-catalog / duration / pricing-visibility configuration | J02, J03, J19 (+ `services/tests*`, `services/tests_remediation`) | ✅ |
| Deletion / archive / restore / auditability | J12, J19, J20 (+ soft-delete suite) | ✅ |

## Notes / contract facts discovered while building the suite

- `POST /api/orders/` for a service that has required documents **rejects creation without those documents** (all-required-docs-at-creation). Uploading additional docs later is via `POST /api/customer/orders/:id/documents/`.
- Assign endpoint field is `provider_id` (not `provider`); admin service create uses `category_id`; provider final-document upload requires `document_type`; missing-service-request wants `service_name` + `request_message` + `requester_name` + `requester_phone`. These are recorded in `KHALSNI_CONTRACT_TEST_AUDIT.md`.
- No product defect was found by the journey suite. Every failure encountered while authoring it was a wrong assumption in the test, corrected against the real contract.
