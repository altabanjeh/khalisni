# Khalsni hardening: final release gate

Date: 2026-10-12. Branch `hardening/release-gate` (not pushed, not merged).

**Verdict: READY WITH CLIENT DEPENDENCIES — local verification only. The deployed environment was not reachable and is unverified.**

No release blocker from the hard-blocker list remains open in the code. Thirty-two confirmed weaknesses were fixed, including one critical privilege escalation. Eight lower-risk findings stay open with owners. The client-owned items (D05, D06, B10) and external checks (B04, B09) are unchanged.

## 1. Baseline

| Item | Value |
|---|---|
| Base SHA | `9ac5f7c4b30c04890696c6a730c79c910fef187f` (`main`, clean) |
| Code and test commit | `29b6491` on `hardening/release-gate` |
| Baseline tests | Backend 310/310, frontend 65/65, lint pass, build pass, migration check clean |
| Architecture | Django 5.2 + DRF + SimpleJWT, React 19 + Vite, PostgreSQL in production. See `KHALSNI_HARDENING_BASELINE.md`. |

The baseline suite was fully green while every finding below was present. The 72 new backend tests were written to assert the safe behaviour, run against the unmodified code to confirm each weakness, and then used to verify the fix.

## 2. Findings

Register: `KHALSNI_FINDINGS.csv` (40 rows, each with reproduction and evidence).

| Severity | Found | Fixed | Open |
|---|---:|---:|---:|
| CRITICAL | 1 | 1 | 0 |
| HIGH | 14 | 14 | 0 |
| MEDIUM | 18 | 15 | 3 |
| LOW | 6 | 2 | 4 |
| INFO | 1 | 0 | 1 |
| **Total** | **40** | **32** | **8** |

## 3. Fixed findings

Tests are in `backend/config/tests_hardening.py` (H), `backend/config/tests_hardening_access.py` (A), `frontend/src/api/clientHardening.test.js` (FE) and `frontend/e2e/hardening-access.spec.js` (E2E).

| ID | Sev. | Finding | Root cause | Main files changed | Tests |
|---|---|---|---|---|---|
| KHS-011 | CRITICAL | Organization admin could become platform super admin, join other organizations, and grant themselves any permission | No rule on who may assign which role; platform-role check ignored organization type | `organizations/{models,selectors,services,serializers}.py`, `accounts/{serializers,views}.py` | A: PlatformRoleEscalationTests (7) |
| KHS-001 | HIGH | Order number alone opened tracking and the final file for accounts without a phone | Blank values accepted on both public gates | `orders/views.py`, `documents/views.py` | H: PublicTrackingGateTests (3), E2E |
| KHS-002 | HIGH | Customer could flag an upload as the final result | Server-owned fields accepted from the customer | `orders/services.py` | H: CustomerUploadMassAssignmentTests (2) |
| KHS-003 | HIGH | Unverified and rejected results visible and downloadable by the customer and public tracking | No visibility rule for final documents | `documents/services.py`, `documents/views.py`, `orders/serializers.py` | H: FinalResultExposureTests (3) |
| KHS-004 | HIGH | Previous provider organization kept access after reassignment; inactive membership granted access | Organization never cleared; two differing visibility queries | `orders/models.py`, `orders/selectors.py`, `providers/views.py` | H: ProviderReassignmentIsolationTests (3) |
| KHS-007 | HIGH | Actions on a stale copy succeeded; multi-step writes were not atomic | No row lock, no reload, writes outside one transaction | `orders/locking.py` (new), `orders/services.py`, `documents/services.py` | H: StaleActionTests (4) |
| KHS-009 | HIGH | Catalog edits changed the requirements of existing orders | Requirements read live from the catalog in ten places | `orders/readiness.py`, `orders/models.py`, migration `orders/0015` | H: HistoricalRequirementIntegrityTests (4) |
| KHS-012 | HIGH | Restore ignored scope and the delete guard; 500 on unknown id | Custom action bypassed the scoped queryset | `core/delete_guard.py` + 15 restore actions | A: RestoreScopeTests (2) |
| KHS-014 | HIGH | Admin password reset did not end existing sessions | Token version not bumped | `accounts/serializers.py`, `providers/serializers.py` | A: SessionRevocationTests (5) |
| KHS-015 | HIGH | Bell showed other users' notifications; "mark all read" marked them read for their owners | Personal centre reused an order-scoped oversight query | `notifications/selectors.py` | A: NotificationCentreIsolationTests (3), E2E |
| KHS-016 | HIGH | Providers received customer identity, prices and revenue from the reports summary | Staff serializer and finance aggregates used for every role | `reports/views.py` | A: FinanceVisibilityTests |
| KHS-019 | HIGH | Organization admin could write platform-wide records (global services, document rules, system settings, provider accounts, addresses) | Permission admitted them; querysets and foreign keys unscoped | `config/permissions.py`, `services/views.py`, `providers/serializers.py`, `accounts/views.py`, `public_site/views.py`, `organizations/serializers.py` | A: TenantWriteBoundaryTests (3) |
| KHS-024 | HIGH | Customer order page spun forever on a failed load | Load error never read | `CustomerOrderDetailsPage.jsx`, `ProviderDashboardHome.jsx`, `AdminOverviewPage.jsx` | Route browser suite |
| KHS-025 | HIGH | Missing-documents resubmission dead-ended after a partial failure | No per-file upload state | `MissingDocumentsResponsePage.jsx` | Page test, browser journey |
| KHS-026 | HIGH | Remembered login in another tab replaced the account under a live session | Storage priority; no storage listener | `api/client.js`, `context/AuthContext.jsx` | FE (2) |
| KHS-005 | MEDIUM | Internal transition reasons and staff identity sent to customer and public tracking | One timeline serializer for all audiences | `orders/serializers.py` | H: TimelinePrivacyTests (5) |
| KHS-006 | MEDIUM | Late customer upload undid approved readiness | Upload allowed in any open state | `orders/services.py`, `orders/allowed_actions.py` | H: CustomerUploadAfterIntakeTests (2) |
| KHS-008 | MEDIUM | Documents of closed orders could be reviewed | Missing state check | `documents/services.py` | H: ClosedOrderDocumentReviewTests (2) |
| KHS-010 | MEDIUM | Retry losing the race got 400 instead of the original order | Only one of two failure shapes handled | `orders/views.py` | H: IdempotencyRaceTests (3), browser retry spec |
| KHS-013 | MEDIUM | Soft-delete fields writable through PATCH | Fields not read-only | `core/serializer_mixins.py` + all model serializers | A: DeleteGuardBypassTests |
| KHS-017 | MEDIUM | Unpublished services orderable by id | Creation filter weaker than catalog filter | `orders/serializers.py`, `services/serializers.py` | A: UnpublishedCatalogTests (5) |
| KHS-018 | MEDIUM | Public read re-published unpublished CMS content | Shared "get or create active" helper | `public_site/{selectors,views}.py` | A: CmsPublishStateTests, browser CMS spec |
| KHS-020 | MEDIUM | Demo seed with published credentials runnable on a live system | No environment guard | `seed_initial_data.py`, `seed_demo.py` | `accounts/tests.py` (1) |
| KHS-021 | MEDIUM | Customer payment record accepted refund type and non-positive amounts | Server-owned fields exposed | `payment/serializers.py` | A: CustomerPaymentRecordTests (2) |
| KHS-022 | MEDIUM | Registration ignored the password policy; no login/registration rate limit | Validator not called; no throttle scope | `accounts/{serializers,views}.py`, `config/settings.py` | A: RegistrationAndLoginTests (3) |
| KHS-023 | MEDIUM | Fee components sent to customers and providers regardless of visibility settings | Flags ignored on order payloads | `orders/serializers.py` | A: FinanceVisibilityTests |
| KHS-027 | MEDIUM | Refused actions left stale buttons | No refetch on failure | Employee, provider, admin order pages; `api/client.js` | FE (2) |
| KHS-028 | MEDIUM | Key conflict silently allowed a second order | Conflict treated as a new submission | `CustomerCreateOrderPage.jsx` | Browser idempotency specs |
| KHS-030 | MEDIUM | nginx body limit below a multi-document request | Sized for one file | `frontend/nginx.conf` | Not validated against nginx |
| KHS-032 | MEDIUM | Service form schema stored without validation | No validator | `services/serializers.py` | A: CatalogSchemaValidationTests (2) |
| KHS-029 | LOW | Document type codes and three untranslated strings on customer screens | Code used as label | `DocumentList.jsx`, locale files | Unit suite |
| KHS-031 | LOW | Empty provider notes; non-atomic counter | Missing validation | `orders/services.py`, `providers/views.py` | H: ProviderNoteTests |

Three existing tests were adjusted, none weakened: two fixtures created an order before its catalog requirements (now reordered, since requirements are frozen at creation), and three demo-seed tests now declare the debug environment the new guard requires. One assertion was added that the seed is refused otherwise.

## 4. Open findings

| ID | Sev. | Finding | Why open | Owner | Release impact |
|---|---|---|---|---|---|
| KHS-033 | MEDIUM | Rate limits keyed on client-supplied `X-Forwarded-For`; counters per worker without Redis | Correct proxy count depends on the production proxy chain | DevOps | Set `API_THROTTLE_NUM_PROXIES` and `REDIS_URL` before go-live. Until then brute-force limits can be bypassed by header rotation. |
| KHS-034 | MEDIUM | Only the order total is frozen; fee components and English service name follow the catalog; partner custom price is not what is frozen | Fee composition is an open client decision (B10-8) | Client, then engineering | Old orders can show a breakdown that disagrees with their total after a price change. |
| KHS-036 | MEDIUM | Some staff actions lack a pending state or confirmation; rejection sends a fixed reason | Not addressed in this pass | Engineering | Duplicate notes possible on double click. State-changing duplicates are refused by the server. |
| KHS-035 | LOW | nginx media denylist; no security headers on the SPA | No nginx available to validate a rewrite | DevOps | None today; a future upload folder would be public by default. |
| KHS-037 | LOW | Wizard maps some server errors to the wrong field; customer order page is Arabic-only in English mode | Not addressed in this pass | Engineering | Cosmetic and clarity. |
| KHS-038 | LOW | Profile email/phone change without re-authentication; reset timing oracle; tokens in web storage | Design changes; verification rules undecided (B10-6) | Engineering + client | Residual account-security risk. |
| KHS-039 | LOW | Notification dedupe has no database constraint; English-only manual titles; unpaginated staff lists | No measured problem at current size; public page size is B10-5 | Engineering | None at current scale. |
| KHS-040 | INFO | Migrations rehearsed on SQLite only | No PostgreSQL copy available | DevOps | Run `migrate` on a production copy before release. |

## 5. Client-audit regression

Re-proved after hardening on a fresh isolated database.

| ID | Status | Evidence after hardening |
|---|---|---|
| F01 | PASS | Browser journey bell/read check; notification centre now recipient-only (KHS-015) |
| F02 | PASS | Browser upload/resubmit; requirement survives catalog removal (KHS-009) |
| F03 | PASS | `orders.tests_readiness`; assignment refused while incomplete |
| F04 | PASS | `EmployeeOrderReviewPage.test.jsx`; browser employee review |
| F05 | PASS | Transition tests; stale actions refused (KHS-007) |
| F06 | PASS | Browser CMS publish/preview spec; publish state no longer changes on read (KHS-018) |
| U01–U04 | PASS | `client-audit-ux.spec.js` 3/3 at 390 px |
| D01–D04 | PASS | Component tests; strict catalog locale audit on migrated legacy copy: 0 gaps |
| B01, B02, B03, B06, B07 | PASS | Browser journey, role re-entry, idempotency specs (desktop and 390 px), `hardening-access.spec.js` |
| D05, D06 | CLIENT_INPUT_REQUIRED | Unchanged. No contact details or policy text were invented. |
| B10 | BUSINESS_DECISION_REQUIRED | Unchanged. Eight decisions pending. |
| B04, B09 | BLOCKED_EXTERNAL | Unchanged. No mailbox, real device or WebKit here. |
| B05, B08 | NOT_IN_RELEASE_SCOPE | Unchanged. PRD: no gateway, in-system notifications only. |

Count: PASS 19, client input 2, business decision 1, blocked external 2, not in scope 2, fail 0.

## 6. Full journey result

Fresh order on a new database, `client-audit-acceptance.spec.js` (browser + API), plus the backend tests named.

| Step | Result | Evidence |
|---|---|---|
| Customer registers / logs in | PASS | Journey logs in with a QA account. Registration itself is covered by API tests, not by the browser journey. |
| Browses service, bilingual data | PASS | Journey; locale tests; strict catalog audit |
| Enters form data, uploads requirements | PASS | Journey |
| Submits exactly one order | PASS | Journey; idempotency specs; IdempotencyRaceTests |
| Employee sees it, requests missing document | PASS | Journey |
| Customer notified, uploads replacement, resubmits | PASS | Journey |
| Employee reviews; invalid readiness stays blocked | PASS | Journey; readiness tests; assignment returns 400 while incomplete |
| Valid readiness becomes true; only eligible provider assignable | PASS | Journey; provider eligibility tests |
| Provider sees only assigned work | PASS | Journey (Provider B gets 404); ProviderReassignmentIsolationTests |
| Provider updates progress; customer sees safe progress | PASS | Journey; TimelinePrivacyTests |
| Internal note hidden | PASS | Journey; `test_internal_notes_never_reach_customer_or_provider` |
| Provider uploads result | PASS | Journey |
| Completion only legitimately | PASS | Journey; completion requires a verified result |
| In-system completion notification | PASS | Journey |
| Customer downloads authorized result | PASS | Journey (browser download begins `%PDF-1.4`); hidden before completion (FinalResultExposureTests) |
| Customer B, Provider B, logged-out, stale session, guessed URL/API | PASS (all refused) | Journey; `hardening-access.spec.js` |

## 7. Security result

| Area | Result | Basis |
|---|---|---|
| RBAC | PASS | Existing authorization matrix + 12 new tenant/role tests |
| IDOR | PASS | Cross-customer, cross-provider, guessed ids, notifications, files |
| Uploads | PASS | Zero-byte, renamed executable, HTML as image, wrong and double extension, MIME mismatch, oversize, path traversal name |
| Sessions | PASS | Logout, password change, deactivation, role change, anonymous |
| Mass assignment | PASS | Customer upload fields, registration fields, soft-delete fields, membership roles, payment fields |
| Workflow enforcement | PASS | All transitions enforced server-side under lock |
| Configuration | PASS with one open item | DEBUG off by default, secret required, HSTS/secure cookies, CORS allowlist. Open: KHS-033, KHS-035. |
| Dependencies | PASS | `pip-audit` and `npm audit --omit=dev`: no known vulnerabilities |

## 8. Data-integrity result

| Area | Result | Basis |
|---|---|---|
| Transactions | PASS | One transaction and row lock per workflow action; failure leaves no partial rows |
| Idempotency | PASS | Same key + same payload returns the original order; changed payload 409; one order, one timeline row, one notification |
| History | PASS | Requirements frozen per order; refused attempts audited |
| Notifications | PASS | Recipient-only; no duplicate event per recipient |
| Documents | PASS | Rejected and replaced files handled by latest-per-type; closed orders immutable |
| Assignments | PASS | Second assignment on a stale copy refused; one provider, one timeline row |
| Migrations | PASS on SQLite | Full chain applied to a copy of the legacy database; PostgreSQL not rehearsed (KHS-040) |

## 9. UX and localization result

| Area | Result | Basis |
|---|---|---|
| Arabic | PASS | Strict catalog audit 0 gaps; journey in Arabic |
| English | PASS with gaps | Customer order page still Arabic-only (KHS-037) |
| RTL | PASS | Public and route suites |
| Responsive | PASS (emulated Chromium) | 12 routes × 390/430/768/1366 px; public and role routes at 1440 and 390 px |
| Accessibility | PASS | axe on 6 public and 16 authenticated routes, 2 viewports: 0 serious or critical |

1024 and 1920 px were not run in this pass. No real device or WebKit run exists (B09).

## 10. Test totals

| Suite | Result |
|---|---|
| Backend | 383 / 383 |
| of which adversarial (new) | 72 / 72 (+1 seed guard test) |
| Frontend unit | 69 / 69 (30 files) |
| Browser | 174 / 174 (162 public/route/accessibility at 1440 and 390 px; 7 journey/idempotency/responsive/role/access at 1440 px; 5 UX/idempotency at 390 px) |
| Build | PASS |
| Lint | PASS |
| `manage.py check`, `makemigrations --check` | PASS |

## 11. Deployment readiness

**READY WITH CLIENT DEPENDENCIES — LOCAL VERIFIED / DEPLOYMENT UNVERIFIED.**

Before release:

1. Review and merge `hardening/release-gate`.
2. Rehearse `manage.py migrate` on a copy of the production PostgreSQL database (new migration `orders.0015` backfills every order).
3. Set `API_THROTTLE_NUM_PROXIES` to the number of proxies in front of Django and configure `REDIS_URL`.
4. Deploy, then run the safe smoke checks against the deployed site: health, public pages, one QA journey on QA accounts.
5. Obtain D05 and D06 content and the B10 decisions from the client.

### Behaviour changes that users will notice

- Customers see and download the final result only after the order is completed.
- Customers can upload documents only while the request is new, under review or waiting for them.
- The notification bell shows each person only their own notifications, including for administrators. The admin notification log is unchanged.
- Customer and public timelines no longer show staff names or internal reasons.
- Organization administrators can no longer edit platform-wide catalog rules, system settings or shared provider logins.
- Changing a user's password signs that user out everywhere.
- Login is limited to 20 attempts a minute and registration to 20 an hour per client address.
