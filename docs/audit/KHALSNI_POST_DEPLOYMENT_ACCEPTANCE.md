# Khalsni post-deployment acceptance verification

Assessment date: 2026-10-04. This is a **deployment verification attempt**, separate from the passing local remediation evidence in `KHALSNI_CLIENT_FINAL_ACCEPTANCE.md`. No production or old May demo record was changed. No production QA seed, payment, customer message, or registration was attempted.

## Release identity and reachability

| Check | Evidence | Result |
|---|---|---|
| Candidate deployment URL | The workspace `.env` names `https://khalisnidev.raedaltabanjeh.com` in allowed hosts and trusted origins. This URL has not been confirmed by the deployment owner as the release under review. | Candidate only |
| Local source version | Clean local HEAD `ba2ba31edf91a94c5e2498eec08b5b8da671a6f3` (`gate 4`, 2026-10-04). This commit contains `services` migrations 0012/0013, `orders` migration 0014, and `public_site` migration 0007. | Confirmed locally; deployed SHA unknown |
| Deployed URL | DNS resolved to `173.249.14.230`. HTTPS and HTTP requests to `/api/health/` timed out before connection (`curl` HTTP status `000`); GETs for `/`, public catalog, contact, and privacy also timed out. The browser retrieval tool could not access the domain. | Not reachable from this workspace |
| Deployed build and migrations | No release artifact hash/version endpoint or deployment operator access was available. The application cannot be fetched to compare its asset hashes. `docker compose ps` showed no local running stack. | Not verified |
| Release database locale audit | `audit_public_catalog_locale --strict` is read-only, but there is no safe connection to the release database. Earlier zero-gap results were from isolated and copied local databases only. | Not run against release |

The deployment claim alone does not establish that this commit or its migrations are serving users. **The deployed smoke journey, deployed authorization checks, deployed D03 audit, and deployed responsive checks were not executed.** Local passing tests below do not substitute for them.

## Remaining audit items

Statuses below are retained from the last accepted audit report because no new deployed evidence supports changing them. “Not verified” in the third column is an evidence gap, not a new audit status.

| ID | Status before deploy | Deployed verification | Final status | Remaining action |
|---|---|---|---|---|
| D05 | CLIENT_INPUT_REQUIRED | Contact page unreachable; no approved release contact values supplied. | CLIENT_INPUT_REQUIRED | Supply approved support email, support phone, Arabic address, English address, WhatsApp enabled/disabled and number if enabled, office hours enabled/disabled and text if enabled; publish and check links on the deployed site. |
| D06 | CLIENT_INPUT_REQUIRED | Privacy page unreachable; no approved bilingual substantive policy supplied. | CLIENT_INPUT_REQUIRED | Approve Arabic and English text for retention periods, deletion/data requests, privacy contact, uploaded documents, lawful retention exceptions, and relevant third-party processing; publish and verify both views. |
| B04 | BLOCKED_EXTERNAL | No deployed QA SMTP/mailbox access or receipt evidence; no reset sent. | BLOCKED_EXTERNAL | Provide approved QA SMTP and accessible QA inbox, then verify actual reset receipt, recipient, URL, password change, old-password rejection, invalid/expired/used token behavior. |
| B05 | NOT_IN_RELEASE_SCOPE | `docs/PRD.md` still says no external gateway integration in MVP; no deployed payment transaction attempted. | NOT_IN_RELEASE_SCOPE | Client formally accepts that gateway charge, refund, and callback flows are outside MVP. Manual payment records and cancellation permissions remain the implemented behavior. Report any newer conflicting requirement before implementation. |
| B08 | NOT_IN_RELEASE_SCOPE | `docs/PRD.md` limits MVP notifications to in-system logging; no external delivery channel/receipt is implemented or claimed. | NOT_IN_RELEASE_SCOPE | Client formally accepts that external email/SMS/WhatsApp order delivery is outside MVP; in-system notices remain in scope. Report any newer conflicting requirement before implementation. |
| B09 | BLOCKED_EXTERNAL | Deployed pages unreachable. Earlier 390/430/768/1366 screenshots are **local Chromium emulation**, not deployed or real-device evidence. Playwright WebKit is not installed in this workspace. | BLOCKED_EXTERNAL | Run deployed viewport matrix and critical RTL, menu, dialog, upload, download, and keyboard interactions; obtain real Android Chrome and real iPhone Safari or an approved equivalent for final signoff. |
| B10 | BUSINESS_DECISION_REQUIRED | No authoritative answers received; no catalog or fee semantics changed. | BUSINESS_DECISION_REQUIRED | Resolve B10-1 through B10-8 in `KHALSNI_CLIENT_DECISIONS_REQUIRED.md`: answer types; repeated parcel/basin fields; conditional documents; consent wording/evidence; counts/pagination; verified-user meaning; equivalent documents; fee composition/display. |

## Safe steps needed to resume deployed verification

1. Confirm the exact release URL, deployed commit/image digest, and a safe operator route to inspect the deployment. Compare the served frontend asset hashes with that release. A local Git SHA alone is insufficient.
2. Have a deployment operator run read-only `python manage.py showmigrations services orders public_site`, `python manage.py check --deploy`, and `python manage.py audit_public_catalog_locale --strict` in the release backend. Confirm `services` 0012/0013, `orders` 0014, and `public_site` 0005–0007 are applied. Record sanitized output; do not run seeds.
3. Provide isolated QA customer A/B, employee, admin, provider A/B identities, a QA-only service/provider relationship, and permission to create **new QA records**. Then execute the full deployed request-to-download journey and direct negative authorization checks. Stop at the maximum safe subset if the environment cannot support the lifecycle.
4. Provide a QA SMTP/inbox and real-device/Safari access for B04/B09. Obtain D05/D06 content, B10 decisions, and formal B05/B08 scope acceptance from the client.

## Local regression (not deployed evidence)

At local HEAD, the full backend suite passed **310/310** against an in-memory test database. Migration drift and Django system checks passed; frontend unit tests passed **65/65**, and lint and production build passed. A fresh isolated Chromium Playwright journey and CMS check passed **2/2**, including new QA order creation through final PDF download, authorization negatives, and published-home rendering. These used an isolated QA database and are **not deployed evidence**. Final local test failures: **0**.

## Acceptance answer

**DEPLOYED VERSION:** Unknown. The local candidate is `ba2ba31edf91a94c5e2498eec08b5b8da671a6f3`.

**TECHNICALLY PASSING IN LOCAL REMEDIATION:** F01–F06, U01–U04, D01–D04, B01–B03, B06, B07. Their deployed behavior is unverified.

**CLIENT INPUT REQUIRED:** D05 and D06, as detailed above.

**BUSINESS DECISIONS REQUIRED:** B10-1 through B10-8.

**EXTERNAL TESTING STILL REQUIRED:** B04 QA mailbox receipt; B09 real-device/Safari signoff; release URL/access and deployment-specific smoke, migrations, and catalog checks.

**NOT IN RELEASE SCOPE:** B05 and B08 under `docs/PRD.md`, pending formal client scope acknowledgement.

**FAIL:** No newly reproduced application failure. The deployed release was not reachable, so an absence of observed failures is not a deployment PASS.

**Can Khalsni now be sent to the client for final acceptance? NO.** The deployed version and critical behavior have not been verified from this workspace. Reassess after the deployed checks above.

**Can every client audit note be marked fully CLOSED? NO.** D05, D06, B04, B09, and B10 remain unresolved, and B05/B08 still need formal scope acceptance.
