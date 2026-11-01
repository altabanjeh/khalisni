# Khalsni production release runbook (khalisni.com, Coolify)

Written 2026-11-01 for the owner and the server operator. Follow the steps in order; each step names the command, the expected result and what to do when the result differs. Stop at the first step whose result is not the expected one.

Related documents: `docs/DEPLOYMENT.md` (stack, database roles, build identity), `docs/total-audit/RECOVERY_RUNBOOK.md` (backup, restore, rollback).

What was rehearsed before this runbook was written (2026-11-01, local Docker stack built from the release tree, production settings): backup, verification, off-server copy, rotation, a full restore into an emptied stack, build identity, the release gate, the SMTP pipeline into a local mail sink, the phone migration and the F02 repair on a copy of the real catalogue database. Evidence: `docs/audit/evidence/khalsni-total-closure-2026-11-01/ops/`. **Nothing in this runbook has been run on khalisni.com yet.**

## 0. Before you start

| Item | Value to fill in |
|---|---|
| Approved commit (short SHA, 7+ characters) | `<APPROVED_SHA>` |
| Who approved it, when | |
| Operator | |
| Maintenance window (Asia/Amman) | |
| Backup root on the server | `/srv/khalsni-backups` |
| Repository checkout on the server, for the scripts only | `/srv/khalsni` (checked out at `<APPROVED_SHA>`) |

1. SSH to the server. Find the Compose project Coolify created and its compose file:

   ```bash
   docker compose ls            # NAME = project, CONFIG FILES = the compose file Coolify rendered
   ```

2. Set one variable that every command below uses (replace both placeholders with what `docker compose ls` printed):

   ```bash
   export COMPOSE="docker compose -p <project name> -f <config file>"
   $COMPOSE ps                  # db, redis, backend, frontend running; db-init exited (0)
   ```

3. Put the scripts at the approved commit (they are not inside the images):

   ```bash
   git -C /srv/khalsni fetch --all && git -C /srv/khalsni checkout <APPROVED_SHA>
   cd /srv/khalsni
   ```

All commands below run from `/srv/khalsni`. Scripts are called with `sh` because a checkout may lack the executable bit.

## 1. Verify a fresh backup (before anything changes)

```bash
KHALSNI_BACKUP_OFFSITE_CMD='<your copy command, see RECOVERY_RUNBOOK section 3>' \
  sh scripts/backup_scheduled.sh /srv/khalsni-backups
echo "exit: $?"                                   # must be 0
sh scripts/backup_status_check.sh /srv/khalsni-backups/backup-status.json
```

Expected: the last log line is `SCHEDULED BACKUP OK <set> (offsite: copied)`, `backup_status_check.sh` prints `BACKUP STATUS OK`. Write down the backup set name: it is the restore point if the release has to be withdrawn.

```bash
cat /srv/khalsni-backups/khalsni-<UTC stamp>/manifest.json     # row counts, media file count, release_sha of the OLD release
```

If the run fails: do not deploy. The log names the failed step; the status file says `"last_result": "failure"`.

## 2. Deploy the approved commit

In Coolify, for the Khalsni resource:

1. Set the source to commit `<APPROVED_SHA>` (or the branch whose head is that commit).
2. Build identity: either enable Coolify's option to pass the source commit to the build (it provides `SOURCE_COMMIT`, which `docker-compose.yml` uses as a fallback), or set two environment variables: `BUILD_SHA=<APPROVED_SHA>` and `BUILD_TIME=<UTC time, e.g. 2026-11-02T08:00:00Z>`. Without either, the images report `"unknown"` and step 3 fails.
3. Check that the environment has the variables in section 9 (mail) and `FRONTEND_BASE_URL=https://khalisni.com`.
4. Deploy. Coolify builds both images, runs `db-init` (roles, migrations as the owner role, grants) and then starts the backend.

Expected: the deployment finishes; `db-init` shows as exited with code 0; `backend` and `frontend` are healthy.

## 3. Confirm the live build

```bash
curl -fsS https://khalisni.com/api/health/
curl -fsS https://khalisni.com/api/health/version/       # {"sha": "<APPROVED_SHA>", "built_at": "..."}
curl -fsS https://khalisni.com/version.json              # same sha (frontend image)
curl -fsS https://khalisni.com/ | grep khalsni-build     # <meta name="khalsni-build" content="<APPROVED_SHA>" />
```

Expected: both `sha` values equal `<APPROVED_SHA>` (the endpoint returns at most 12 characters; a 7-character SHA matches its 12-character form). A different value means an old image or a cached build: redeploy with "no cache"; do not continue.

## 4. Migrations

`db-init` applied them during the deploy. Confirm:

```bash
$COMPOSE logs db-init | tail -n 20                       # "db-init: done."
$COMPOSE exec backend python manage.py migrate --check   # exit 0, no output
```

If `migrate --check` fails: `$COMPOSE run --rm db-init`, then repeat. If `db-init` itself fails, read its log; do not start the backend by hand.

## 5. Database roles and grants (db-init)

```bash
$COMPOSE exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\du"'
$COMPOSE exec db sh -c 'psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select distinct pg_get_userbyid(relowner) from pg_class c join pg_namespace n on n.oid = c.relnamespace where nspname = '"'"'public'"'"'"'
$COMPOSE exec backend python manage.py shell -c "from django.db import connection; c = connection.cursor(); c.execute('select current_user, (select rolsuper from pg_roles where rolname = current_user)'); print(c.fetchone())"
$COMPOSE exec db sh -c 'psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select tgname, tgenabled from pg_trigger where tgrelid = '"'"'orders_orderconsent'"'"'::regclass and not tgisinternal"'
```

Expected: owner and app roles without `Superuser`; only the owner role owns objects; the backend prints `('<app role>', False)`; the trigger `orders_orderconsent_append_only` with `O` (enabled). If anything differs: `$COMPOSE run --rm db-init` and check again (see `docs/DEPLOYMENT.md`, "Database roles").

## 6. Release gate

```bash
KHALSNI_GATE_EXPECTED_SHA=<APPROVED_SHA> KHALSNI_GATE_URL=https://khalisni.com \
KHALSNI_BACKUP_ROOT=/srv/khalsni-backups \
  sh scripts/release_gate.sh 2>&1 | tee /srv/khalsni-backups/release-gate-$(date -u +%Y%m%dT%H%M%SZ).log
```

It runs: build identity (backend and frontend), `migrate --check`, `check --deploy --fail-level WARNING`, `check_public_content --strict`, `validate_catalogue --strict`, `audit_demo_data --strict`, `normalize_phones` (dry run), and `verify_backup.sh` on the newest backup set (which must be younger than 24 h). It exits 1 if any check fails and ends with a summary table.

Expected on the **first** run of this release:

| Check | Expected now | Action |
|---|---|---|
| version, migrations, catalogue, backup | PASS | none |
| deploy | PASS; FAIL (`khalsni.E002`) if a published contact field holds a placeholder value | owner replaces or blanks the field in the content editor |
| phones | FAIL while stored numbers are not yet canonical (the rehearsal copy had 13 accounts and 1 request to normalize) | step 7 |
| content | FAIL until the owner has entered contact details, office hours and approved (non-draft) privacy and terms texts (D05/D06) | owner enters them in the admin; not an operator decision |
| demo_data | FAIL if demo/QA accounts exist; `NOT_AVAILABLE` only on an image older than this release | review the report, then `audit_demo_data --apply` (owner decision B10-7) |

After steps 7 and 8 (and the owner's content), run the gate again. **The release is accepted only when the gate prints `RELEASE GATE: PASSED`.** Keep both logs.

## 7. Phone numbers: dry run, collision review, apply

Owner phone policy: one canonical form (`+9627XXXXXXXX`) for every stored phone, so `079…`, `+96279…` and `0096279…` are the same identity in tracking, registration checks, staff search and guest reuse.

```bash
# 7.1 dry run (masked numbers; nothing changes)
$COMPOSE exec backend python manage.py normalize_phones
```

Read the summary. Rows:

- `normalize`: will be rewritten.
- `collision`: two or more accounts become the same number. **They are never changed or merged by the command.** For each, the report shows the order count and whether it is a guest account. An operator decides with the owner which account keeps the number (for example, edit the stale account's phone in the admin) and re-runs the dry run until no collision is left, or accepts that the colliding accounts stay as they are.
- `invalid`: cannot be read as a phone; left for a person to correct in the admin.

```bash
# 7.2 apply (writes the original values to a private report first, for rollback)
REPORT=/srv/khalsni-backups/phones-$(date -u +%Y%m%dT%H%M%SZ).json
$COMPOSE exec backend python manage.py normalize_phones --apply --confirm NORMALIZE --report /tmp/phones.json
$COMPOSE cp backend:/tmp/phones.json "$REPORT" && chmod 600 "$REPORT"
#   the report holds full phone numbers: keep it with the backups, never in a ticket or chat

# 7.3 dry run again: expect 0 "normalize" rows (collisions, if accepted, still listed)
$COMPOSE exec backend python manage.py normalize_phones
```

Rollback, only if needed: `$COMPOSE cp "$REPORT" backend:/tmp/phones.json && $COMPOSE exec backend python manage.py normalize_phones --rollback /tmp/phones.json --confirm RESTORE` (restores only values the command wrote and nobody changed since).

Rehearsal result (copy of the real catalogue database): 14 values normalized, 0 collisions, dry run afterwards 0 to normalize. Before normalization, registering with the local `079…` form of an existing account's legacy number created a **duplicate account**, staff search returned two accounts and guest reuse created a new guest; after it, all three formats resolved to the same account everywhere (`ops/phone_equivalence.log`). This step is therefore required, not cosmetic.

## 8. F02: waiting orders whose missing-document request cannot be answered

```bash
# 8.1 dry run (read-only)
$COMPOSE exec backend python manage.py audit_missing_document_requests
```

Expected on production, from the rehearsal on the real catalogue copy: `KH-2026-000001` listed as `no_request_no_recorded_types`, recommended `return-to-review`. For every listed order apply the **recommended** action, as a named staff user, with a reason:

```bash
# 8.2 repair one order at a time (staff actor + reason are mandatory and audited)
$COMPOSE exec backend python manage.py audit_missing_document_requests --apply \
  --order KH-2026-000001 --action return-to-review \
  --actor <staff email> \
  --reason "F02 recovery: waiting order had no answerable missing-document request; returned to review so staff can request configured documents"

# 8.3 confirm
$COMPOSE exec backend python manage.py audit_missing_document_requests     # "0 waiting order(s) need attention"
```

Then, in the staff screen, the employee opens the order (now `UNDER_REVIEW`) and sends a proper documents request naming configured documents; the customer can then upload. Each repair writes a status-log entry (`WAITING_CUSTOMER -> UNDER_REVIEW`, system event `missing_request_recovered`, the reason in the note) and two audit entries (`recover_missing_document_request`, `recover_missing_document_request_detail`) recorded against the staff actor (`ops/f02.log`). `recreate-request` is refused for this order because it records no requested types.

## 9. Mail: production settings and the real-mailbox test

### 9.1 Environment (Coolify, Khalsni resource; mark the password as a secret)

```env
DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DJANGO_EMAIL_HOST=<SMTP host of the mail provider>
DJANGO_EMAIL_PORT=587
DJANGO_EMAIL_USE_TLS=True
DJANGO_EMAIL_USE_SSL=False
DJANGO_EMAIL_HOST_USER=<SMTP user name>
DJANGO_EMAIL_HOST_PASSWORD=<SMTP password or API key - secret>
DJANGO_DEFAULT_FROM_EMAIL=Khalsni <no-reply@khalisni.com>
FRONTEND_BASE_URL=https://khalisni.com
```

- Port 465 instead: `DJANGO_EMAIL_PORT=465`, `DJANGO_EMAIL_USE_TLS=False`, `DJANGO_EMAIL_USE_SSL=True` (never both True).
- The sender domain must be the real domain. The built-in default `no-reply@khalisni.local` is undeliverable; `check_public_content` prints the configured sender.
- Reset links are built from `FRONTEND_BASE_URL` (`<FRONTEND_BASE_URL>/reset-password/<token>`); when it is empty, the first `CORS_ALLOWED_ORIGINS` entry is used.
- Mail timeout (10 s) and background sending of reset mails are code defaults; nothing to set.
- DNS for `khalisni.com` at the mail provider: SPF including the provider, DKIM keys published, a DMARC record. Without them the messages land in spam or are rejected.

Redeploy (or restart the backend) after changing these values.

### 9.2 Real-mailbox test (owner, with two real mailboxes: one read in Arabic, one in English)

Use a customer account whose email is a real mailbox you can read (register one if needed). Passwords are customer passwords; no reset is possible for staff accounts (by design).

| # | Action | Expected |
|---|---|---|
| 1 | Site in Arabic: "نسيت كلمة المرور", enter the mailbox address | Page shows the generic confirmation |
| 2 | Wait for the mail (check spam) | Subject `إعادة تعيين كلمة المرور في خلّصني`; From `Khalsni <no-reply@khalisni.com>`; Arabic text; link starts with `https://khalisni.com/reset-password/` |
| 3 | Open the link on a phone, set a new password | Success message; you can sign in with the new password |
| 4 | Wait for the second mail | Subject `تم تغيير كلمة المرور في خلّصني`, Arabic text, no link |
| 5 | Open the same reset link again | Refused: the link is invalid or expired |
| 6 | Repeat 1-5 with the site in English | Subjects `Khalsni password reset` / `Khalsni password changed`, English text |
| 7 | Request a reset for an address that has no account | Same confirmation page, no mail arrives |

Record for each mail: time sent, time received, mailbox provider, inbox or spam, a screenshot (token in the link blurred) and the message headers' `Authentication-Results` (SPF/DKIM/DMARC `pass`).

Local pipeline proof already done (2026-11-01): against a local SMTP sink the four messages had the right subjects, language, sender (`Khalsni <no-reply@khalisni.com>`) and link host (`https://khalisni.com`), and the link worked once and was refused on reuse (`ops/smtp/`). That proves the application, not delivery: steps 1-7 are still required on production. Note: "password changed" mail is sent after a reset; there is no separate customer "change password" screen that sends it.

## 10. Real-device checklist

Run on three devices against https://khalisni.com after steps 1-9. Use the QA or a real test customer account, never a real customer's.

### Journeys

| ID | Journey | Android Chrome | iPhone Safari | Expo app |
|---|---|---|---|---|
| J1 | Home page loads in Arabic (RTL), switch to English and back | ✓ | ✓ | ✓ (language setting) |
| J2 | Browse categories, open a service, read required documents and price note | ✓ | ✓ | ✓ |
| J3 | Register a customer account; sign in; sign out | ✓ | ✓ | ✓ |
| J4 | Submit an order with documents: one photo taken with the camera, one PDF from files; accept the consent | ✓ | ✓ | ✓ (camera + gallery) |
| J5 | Order detail shows the timeline and documents; send a message to staff | ✓ | ✓ | ✓ |
| J6 | Track the order without signing in, phone typed as `079…`, then `+96279…`, then `0096279…` (all must find it) | ✓ | ✓ | n/a |
| J7 | Staff (desktop) requests a missing document; customer sees the request and uploads it from the device | ✓ | ✓ | ✓ |
| J8 | Notification of the status change appears | ✓ | ✓ | ✓ (push/in-app) |
| J9 | After staff complete the order, download and open the final result file | ✓ | ✓ | ✓ |
| J10 | Forgot password: the mail link opens on the device and resets the password | ✓ | ✓ | ✓ (opens in browser) |
| J11 | Upload a file over the limit / of a wrong type: clear localized error, nothing breaks | ✓ | ✓ | ✓ |
| J12 | Poor network (flight mode during upload, then back): clear message, no duplicate order | ✓ | ✓ | ✓ |
| J13 | Page footer/meta: view source shows `khalsni-build` = `<APPROVED_SHA>` (desktop is enough) | ✓ | – | – |

### Evidence template (copy once per device)

```text
Device model:             e.g. Samsung Galaxy A54 / iPhone 13
OS and version:           e.g. Android 14 / iOS 17.6
Browser or app + version: e.g. Chrome 130.0.6723 / Safari 17 / Khalsni Expo build <version>
Tester, date (Asia/Amman):
Build checked (J13):      <sha shown>
Account used:             <QA/test account, never a real customer>

| Journey | Result (PASS/FAIL/N/A) | Screenshot file names                 | Notes / defect id |
|---------|------------------------|---------------------------------------|-------------------|
| J1      |                        | <device>-J1-ar.png, <device>-J1-en.png |                   |
| J2      |                        |                                       |                   |
| J3      |                        |                                       |                   |
| J4      |                        |                                       |                   |
| J5      |                        |                                       |                   |
| J6      |                        |                                       |                   |
| J7      |                        |                                       |                   |
| J8      |                        |                                       |                   |
| J9      |                        |                                       |                   |
| J10     |                        |                                       |                   |
| J11     |                        |                                       |                   |
| J12     |                        |                                       |                   |
| J13     |                        |                                       |                   |
```

Store screenshots as `<device>-<journey>-<lang>.png` next to the filled template; blur phone numbers, emails and reset tokens.

## 11. Sign-off

| Step | Result | Evidence file | Operator |
|---|---|---|---|
| 1 Backup verified + off-server copy | | backup log, `backup-status.json` | |
| 2-3 Approved SHA live (backend + frontend) | | `curl` output | |
| 4-5 Migrations, roles, consent trigger | | command output | |
| 6 Release gate PASSED (final run) | | `release-gate-*.log` | |
| 7 Phones: dry run, collisions reviewed, applied, dry run 0 | | command output, private report path | |
| 8 F02: repaired orders listed, dry run 0 | | command output | |
| 9 Mail: AR/EN reset + changed received, SPF/DKIM/DMARC pass | | screenshots, headers | |
| 10 Devices: Android, iPhone, Expo | | filled templates | |

If the release has to be withdrawn, follow `docs/total-audit/RECOVERY_RUNBOOK.md` section 5: redeploy the previous code without reversing migrations, or restore the backup set from step 1.
