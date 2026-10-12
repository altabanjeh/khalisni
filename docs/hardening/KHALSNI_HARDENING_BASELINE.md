# Khalsni hardening baseline

Recorded 2026-10-12, before any hardening change.

## Repository state

| Item | Value |
|---|---|
| Branch | `main` |
| Base SHA | `9ac5f7c4b30c04890696c6a730c79c910fef187f` ("gate f") |
| Uncommitted changes | none (clean tree) |
| Deployed environment | `https://khalisnidev.raedaltabanjeh.com` (from local `.env`). Not reachable from this machine: HTTPS and HTTP both time out after 15 s. Served commit, applied migrations and data are unknown. |

## Sources read

| Source | Location | Note |
|---|---|---|
| Client audit report | `D:\ghassam moblie\Khalsni_Website_Audit_AR.docx` | Outside the repository. Text extracted and read. |
| Client evidence | `D:\ghassam moblie\Khalsni_Audit_Evidence.zip` (+ extracted folder) | 19 images, `audit_data.json`, report script. Script not executed. |
| Remediation mapping | `docs/audit/KHALSNI_CLIENT_REMEDIATION_PLAN.md` | Read in full. |
| Final acceptance | `docs/audit/KHALSNI_CLIENT_FINAL_ACCEPTANCE.md` | Read in full. |
| Client decisions | `docs/audit/KHALSNI_CLIENT_DECISIONS_REQUIRED.md` | Read in full. |
| Requirements | `docs/PRD.md`, `docs/SRS.md` | Read in full. These are the authoritative business rules used below. |

Requirement hierarchy applied: approved requirement (PRD/SRS) → client audit → implementation → test evidence.

## Baseline checks (unmodified code)

| Check | Command | Result |
|---|---|---|
| Django system check | `manage.py check` | 0 issues |
| Migration consistency | `manage.py makemigrations --check --dry-run` | No changes detected |
| Backend tests | `manage.py test` | **310 / 310 pass** |
| Frontend lint | `npm run lint` | pass |
| Frontend unit tests | `npm test` | **65 / 65 pass** (29 files) |
| Frontend production build | `npm run build` | pass |
| Browser suites | Playwright | Not re-run before changes. Last recorded results are in `KHALSNI_CLIENT_FINAL_ACCEPTANCE.md` (fresh journey 2/2, viewport matrix 1/1, mobile UX 3/3). They were re-run after hardening; see the final report. |
| Python dependencies | `pip-audit -r backend/requirements.txt` | No known vulnerabilities |
| npm dependencies | `npm audit --omit=dev` | 0 vulnerabilities |

All existing tests passed, and 25 + 18 adversarial probes written against the same unmodified code failed. The existing suite was green while the weaknesses in `KHALSNI_FINDINGS.csv` were present.

## Architecture summary

- **Backend:** Django 5.2 + DRF 3.17 + SimpleJWT 5.5, service-layer style. PostgreSQL in production, SQLite for local and test.
- **Frontend:** React 19 + Vite, Arabic-first RTL, axios client with JWT in web storage.
- **Deployment:** Docker Compose; nginx serves the SPA and proxies `/api/`; `entrypoint.sh` runs migrate, collectstatic, `setup_roles`, `create_admin`, optional `seed_initial_data` (catalog only) and `seed_service_images`. No demo or QA seed runs at startup.

| Area | Authoritative code |
|---|---|
| Order lifecycle and transitions | `workflow/rules.py` (transition table), `workflow/transition_permissions.py` (actor rules), `orders/services.py` (actions), `orders/models.py` (`transition_status`, `assign_provider`) |
| Document readiness | `orders/readiness.py` |
| What each role may do on an order | `orders/allowed_actions.py` (also sent to the UI) |
| Order visibility per role | `orders/selectors.py`, `providers/views.py::provider_orders_queryset` |
| Document upload, review, download | `documents/services.py`, `documents/views.py`, `documents/file_validation.py` |
| Roles and tenant scope | `config/permissions.py`, `organizations/selectors.py` |
| Notifications (in-system only) | `notifications/services.py`, `notifications/selectors.py` |
| Catalog and CMS | `services/`, `public_site/` |
| Idempotent order creation | `orders/views.py::CreateOrderAPIView` + unique constraint `(customer, submission_key)` |

### Order lifecycle

`NEW → UNDER_REVIEW → (WAITING_CUSTOMER ⇄ UNDER_REVIEW) → ASSIGNED → IN_PROGRESS ⇄ WAITING_GOVERNMENT → READY_FOR_DELIVERY → COMPLETED → ARCHIVED`, with `REJECTED` and `CANCELLED` as closed states and `READY_FOR_DELIVERY → IN_PROGRESS / UNDER_REVIEW` and `COMPLETED → UNDER_REVIEW` (admin reopen) as return paths. 25 transition rules, each with allowed roles.

### Duplicate business logic found at baseline

| Rule | Where it was expressed | Risk |
|---|---|---|
| "Which documents does this order need" | Live catalog query repeated in `readiness`, `services` (×3), `documents/services` (×2), `orders/serializers` (×2), `allowed_actions`, frontend via the public service API | Every copy followed later catalog edits; they could disagree with each other and with history. |
| "Who may see this order" for providers | `orders/selectors.py` and `providers/views.py` | The two copies differed on inactive memberships. |
| "May the customer upload" | `allowed_actions` flag and `upload_customer_document` | Both allowed any open state. |
| Platform-role check | `organizations/selectors.py` and `accounts/serializers.py` | Neither checked the organization type. |
| Publish state of CMS content | selector fallback and view "get or create" | Reading re-published content. |

## Known dependencies and scope limits (unchanged by this pass)

| ID | Status | What is needed |
|---|---|---|
| D05 | CLIENT_INPUT_REQUIRED | Approved support contact details |
| D06 | CLIENT_INPUT_REQUIRED | Approved privacy-policy text |
| B10 | BUSINESS_DECISION_REQUIRED | Eight decisions in `KHALSNI_CLIENT_DECISIONS_REQUIRED.md` |
| B04 | BLOCKED_EXTERNAL | QA mailbox to observe reset email receipt |
| B09 | BLOCKED_EXTERNAL | Real devices / WebKit |
| B05 | NOT_IN_RELEASE_SCOPE | External payment gateway (PRD: none in MVP) |
| B08 | NOT_IN_RELEASE_SCOPE | External email/SMS/WhatsApp delivery (PRD: in-system only) |

No newer requirement contradicting the MVP scope was found.

## Prior audit status at baseline

19 PASS (F01–F06, U01–U04, D01–D04, B01, B02, B03, B06, B07), 2 client input, 1 business decision, 2 blocked external, 2 not in scope, 0 fail.

## Risk areas chosen for attack

1. Workflow actions taken on a stale copy of an order, and partial writes when an action fails midway.
2. Public tracking and the anonymous final-document gate.
3. Server-owned fields on customer uploads and admin serializers.
4. Final-result visibility before staff verification.
5. Provider access after reassignment and through organization memberships.
6. Catalog edits after an order exists.
7. Organization-scoped administrators reaching platform-wide records.
8. Session revocation, password policy and brute-force limits.
9. Notification recipient scoping.
10. Frontend dead-ends on failed loads, partial uploads and cross-tab sign-in.
