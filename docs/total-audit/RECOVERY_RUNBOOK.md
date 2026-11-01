# Khalsni recovery runbook

Written 2026-10-13, backup/restore sections updated 2026-11-01 (backup set format 2). For the operator of the Docker Compose deployment (Coolify or a plain server).

**Status of what is described here**

| Item | Status |
|---|---|
| `scripts/backup.sh`, `scripts/restore.sh` | Run on a local Compose stack built from this release (PostgreSQL 16, production settings). **Not run against the deployed stack.** |
| Backup failure handling | Tested locally: with the database container stopped, and separately with the backend container stopped, the script exits 1 and leaves only a `.partial` directory. |
| Restore drill, database and media | Done locally on 2026-10-13 into a separate Compose project: 12 s, row counts identical, the test document readable, `check_system_consistency` clean. Repeated on 2026-10-17 with the database-role layout (`db-init`): backup, `verify_backup.sh`, then `restore.sh` over a modified stack in 52 s; row counts back to the backup, all objects owned by the owner role, the consent trigger enabled, the backend connected as the app role. Local seeded data, not a production copy. |
| Backup set format 2 (2026-11-01) | Dump + media archive + per-file media inventory + `manifest.json` + checksums in one set; verification with `pg_restore --list`; machine-readable status file; off-server copy command; rotation. Drill on 2026-11-01 (section 4): scheduled backup 25 s, full restore into an emptied stack 61 s; counts, media sha256 and API downloads identical. Local seeded data, not a production copy. |
| Scheduled backups, off-server copy | `scripts/backup_scheduled.sh`, `scripts/verify_backup.sh`, `scripts/backup_status_check.sh` (section 3, Schedule). **Nothing is scheduled on any server yet**: until the cron entry and the off-server copy are set up on production, losing the server disk loses every order and every customer document. |

## 1. Where the data lives

| Data | Location | Lost if | Rebuildable from the repository |
|---|---|---|---|
| Orders, users, catalog, audit log, notifications, payments | Docker volume `postgres_data` | the volume or disk is lost | No |
| Customer documents, final results | Docker volume `backend_media`, folder `secure_orders/` | the volume or disk is lost | No |
| Payment receipts | `backend_media`, folder `payments/` | same | No |
| Catalog and CMS images | `backend_media`, folders `services/`, `service_categories/`, `public_site/`, `organizations/branding/`, `manual/` | same | Partly: `seed_service_images` restores the shipped defaults; admin uploads are lost |
| Collected static files | Docker volume `backend_static` | never matters | Yes, `collectstatic` runs on every start |
| Rate-limit counters | Redis, in memory only | every restart | Not needed |
| Frontend | built into the image | never matters | Yes, rebuild |
| Secrets (`DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, admin password, mail and storage credentials) | Coolify environment or the server's `.env` | the server or the Coolify project is lost | **No.** Keep a copy in a password manager. |

If `AWS_STORAGE_BUCKET_NAME` is set, uploads go to object storage instead of `backend_media`; back up the bucket with its own tooling. That path was not exercised in this audit.

## 2. What each loss means

| Lost | Effect | Recovery |
|---|---|---|
| Frontend container | Site unreachable; no data lost | `docker compose -f docker-compose.yml up -d --build frontend` |
| Backend container | API down; no data lost | `docker compose -f docker-compose.yml up -d --build backend`. The `db-init` job (owner role) applies any pending migrations before the backend starts. |
| Redis | Rate limits stop counting; requests are allowed and each failure is logged (`khalsni.throttle`). No data lost. | `docker compose -f docker-compose.yml up -d redis` |
| Database volume | Everything in section 1, row 1 | Restore the latest dump (section 3). Data since that dump is gone. |
| Media volume | Every uploaded document. Orders remain but their files return errors on download. | Restore the latest media archive (section 3). |
| Whole server | All of the above | New server, restore secrets, deploy the same commit, restore database and media. |
| `DJANGO_SECRET_KEY` | Every session and every unused download or reset link stops working. Stored data is not encrypted with it, so nothing else is lost. | Set a new key; users sign in again. |
| `POSTGRES_PASSWORD` | Backend cannot connect | Set the password inside PostgreSQL to match the new value (`ALTER USER`), or restore the old value. |

## 3. Back up and restore

Run from the repository root on the server. The scripts lack the executable bit when checked out on Windows, so call them with `sh`.

### What a backup set contains

`sh scripts/backup.sh <directory>` writes one set, `<directory>/khalsni-<UTC time>/`:

| File | Content |
|---|---|
| `database.dump` | `pg_dump` custom format of the whole database (taken as the cluster admin inside the db container) |
| `database.toc` | `pg_restore --list` of that dump, produced by reading the dump back |
| `media.tar.gz` | Every file of the media volume (`media/...`): customer documents, final results, payment receipts, catalog and CMS images |
| `media.inventory.tsv` | One line per archived file: sha256, size in bytes, path. The archive holds exactly these files (checked). |
| `manifest.json` | `created_at` (UTC), `release_sha` (the running backend image's `BUILD_SHA`), `repository_commit` (the scripts checkout), database name and PostgreSQL version, `row_counts` of users, services, orders, documents, order consents, payments, audit log and migrations (counted before and after the dump; `row_counts_stable` says whether they changed meanwhile), media `file_count` and `bytes`, object-storage bucket (or `none`), size and sha256 of every artifact |
| `SHA256SUMS` | Checksums of all of the above |

The script exits non-zero, logs `BACKUP FAILED: <reason>` and leaves the directory with the suffix `.partial` when any step fails: database unreachable, the dump, reading it back, a key table missing from the dump, the media inventory, the archive, the archive list differing from the inventory, the manifest, the checksums. **A directory without `.partial` is a complete backup set; anything else is not.** Every line is logged with a UTC timestamp.

### Production commands

```bash
cd /srv/khalsni                      # the repository checkout on the server (scripts only)
export COMPOSE="docker compose -p <project> -f <config file>"   # both from: docker compose ls

sh scripts/backup.sh /srv/khalsni-backups      # one set
sh scripts/verify_backup.sh /srv/khalsni-backups/khalsni-<UTC time>
```

If `manifest.json` shows a bucket name instead of `"object_storage_bucket": "none"`, uploads live in object storage: the archive holds only what is on the volume, and the bucket needs its own backup. That path was not exercised.

### Schedule

Nightly is the minimum for a service that holds customer identity documents. `scripts/backup_scheduled.sh` runs one cycle: `backup.sh`, `verify_backup.sh` on the new set, the off-server copy, rotation, then writes the status file. It takes a lock (one run at a time) and exits non-zero if any step fails.

```cron
# /etc/cron.d/khalsni-backup   (server clock in UTC: 02:15 UTC = 05:15 Amman)
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
COMPOSE="docker compose -p <project> -f <config file>"
KHALSNI_BACKUP_OFFSITE_CMD=rclone copy "$KHALSNI_BACKUP_DIR" offsite:khalsni/"$KHALSNI_BACKUP_NAME"
KHALSNI_BACKUP_KEEP=<number of sets, per retention policy D06>
15 2 * * * root cd /srv/khalsni && sh scripts/backup_scheduled.sh /srv/khalsni-backups >> /var/log/khalsni-backup.log 2>&1 || echo "Khalsni backup FAILED $(date -u)" | mail -s "Khalsni backup failed" ops@<domain>
# monitoring: alert when the last good backup is older than 26 h or the last run failed
30 * * * * root sh /srv/khalsni/scripts/backup_status_check.sh /srv/khalsni-backups/backup-status.json > /dev/null || echo "Khalsni backup status FAILED" | mail -s "Khalsni backup status" ops@<domain>
```

(cron passes variable values literally; the quotes in `KHALSNI_BACKUP_OFFSITE_CMD` reach the shell that runs the command.)

| Variable | Meaning | Default |
|---|---|---|
| `KHALSNI_BACKUP_OFFSITE_CMD` | Shell command that copies **one** finished set off the server. It runs with `KHALSNI_BACKUP_DIR` (full path) and `KHALSNI_BACKUP_NAME` (folder name) exported and the path as `$1`; if it mentions neither, the path is appended. Examples: `rclone copy "$KHALSNI_BACKUP_DIR" offsite:khalsni/"$KHALSNI_BACKUP_NAME"`, `rsync -a "$1" backup@vault.example:/srv/khalsni/`. Its exit code is checked; non-zero fails the run. **Credentials live in the tool's own configuration (`rclone.conf`, `~/.ssh/`), never in this variable or in the repository.** | Unset: a warning is logged, `"offsite": "not_configured"`, the set stays only on this server. |
| `KHALSNI_BACKUP_COPY_COMMAND` | Older name (path always appended). Still honoured. | |
| `KHALSNI_BACKUP_KEEP` | Number of newest complete local sets to keep. Older complete sets are deleted; `.partial` directories are never deleted (a warning lists them). | Unset: nothing is deleted. |
| `KHALSNI_BACKUP_STATUS_FILE` | Status file path | `<backup root>/backup-status.json` |

Status file (rewritten on every run, also on failure):

```json
{
  "last_run_at": "2026-11-01T08:26:11Z",
  "last_result": "success",
  "last_success_at": "2026-11-01T08:26:35Z",
  "last_failure_at": "2026-11-01T08:25:46Z",
  "last_error": "",
  "backup_dir": "/srv/khalsni-backups/khalsni-20261101T082611Z",
  "offsite": "copied",
  "artifacts": [
    {"name": "database.dump", "bytes": 475512, "sha256": "4bac0ae3..."},
    {"name": "media.tar.gz", "bytes": 694425, "sha256": "30719584..."}
  ]
}
```

On failure `last_result` is `"failure"`, `last_error` names the step (`settings`, `backup`, `verify`, `offsite`, `rotate`) and `last_success_at` keeps the previous good run. `scripts/backup_status_check.sh` exits 1 when the last run failed or the last success is older than `KHALSNI_BACKUP_MAX_AGE_HOURS` (default 26): use it from cron (above) or any monitoring agent.

There is deliberately no default retention. How long backups of identity documents may be kept is a client policy decision (D06), not an engineering one; set `KHALSNI_BACKUP_KEEP` (and the retention of the off-server copy) once that policy exists. Production schedule confirmation remains a release gate.

### Verify a backup set

```sh
sh scripts/verify_backup.sh /srv/khalsni-backups/khalsni-<UTC time>
```

Needs no running stack, so it also runs on the off-server copy. Checks: `SHA256SUMS` and the sha256 recorded in `manifest.json` match every artifact; `pg_restore --list` reads the dump and finds the key tables and the consent append-only trigger (host `pg_restore`, otherwise the `postgres:16-alpine` image through Docker); the media archive is valid and its file list equals `media.inventory.tsv`; the manifest has every field. Sets written before format 2 (`manifest.txt`) get the older checks. Exit 0 means every check passed; only the restore drill (section 4) proves a restore.

### Restore

```bash
# DESTRUCTIVE for the stack COMPOSE names
sh scripts/restore.sh /srv/khalsni-backups/khalsni-<UTC time> --yes-overwrite
$COMPOSE exec backend python manage.py check_system_consistency
```

`restore.sh`, each step fatal on failure:

1. `verify_backup.sh` on the set (nothing changes if it fails);
2. stops backend and frontend;
3. database: converts the dump to SQL, then in **one transaction** drops and re-creates the `public` schema and loads it. Any error rolls the database back to its state before the restore (seen in the drill: a failed attempt left the target untouched);
4. media: extracts into a temporary folder on the media volume, checks every file against `media.inventory.tsv` (sha256), then swaps it in; a failure leaves the current media untouched;
5. `db-init`: restored objects go to the owner role, migrations newer than the backup are applied as the owner, the app role is re-granted;
6. starts backend and frontend and waits until they are healthy;
7. checks: key-table row counts equal `manifest.json` (migrations may grow), every backed-up media file present and byte-identical (files added by the backend start, such as a default service image, are listed), backend connected as the app role (not superuser, owns nothing), consent trigger enabled.

Restore database and media from the **same** set. A newer database with older media has document rows whose files are missing.

## 4. Restore drill

A backup that has never been restored is not proven. Do this once before go-live and after every change to the backup setup, on a **separate** stack, never on production. A second Compose project on the same machine works because the base Compose file publishes no ports; `scripts/drill/docker-compose.drill.yml` adds a loopback port and an SMTP sink, for drills only.

```bash
# same commit as production; a throwaway env file with the production variable names and NEW secrets
export COMPOSE="docker compose -p khalsni-drill --env-file /path/drill.env -f docker-compose.yml -f scripts/drill/docker-compose.drill.yml"
BUILD_SHA=$(git rev-parse --short HEAD) BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) $COMPOSE up -d --build --wait

# 1. restore the copied production set into the empty drill stack
time sh scripts/restore.sh /backups/khalsni/khalsni-<UTC time> --yes-overwrite     # ends with "RESTORE OK"

# 2. consistency
$COMPOSE exec backend python manage.py check_system_consistency

# 3. sign in as a staff user and download one customer document and one final result
#    (on a seeded drill stack: python scripts/drill/drill_api.py journey|check, see the script header)

# 4. remove the drill stack and its volumes
$COMPOSE down -v
```

Record the restore time (observed recovery time) and the age of the backup (data-loss window).

### Drill results

- 2026-10-13: backup of 21 users, 33 audit rows, 1 media file; restore into project `kta-drill` in 12 s; counts identical.
- 2026-10-17: with the database-role layout; `restore.sh` over a modified stack in 52 s.
- **2026-11-01 (format 2)**, project `khalsni-tc`, images built from the release tree with `BUILD_SHA=fa5a19b`, production settings, roles split (admin / owner / app). Seeded `seed_demo` and `seed_client_audit_qa`; through the API a QA customer submitted an order with a document and consent, staff verified it and assigned the provider, the provider uploaded the final result, staff verified it and completed the order, and the customer downloaded it. Then: `backup_scheduled.sh` (backup, verify, off-server copy, rotation) 25 s for 11 users, 8 services, 11 orders, 15 documents, 3 consents and 22 media files (699 141 bytes); `docker compose down -v` (all data destroyed) 11 s; fresh empty stack 52 s; `restore.sh` 61 s. Afterwards: row counts equal the manifest; all 22 media files byte-identical; the customer upload and the final result downloaded through the API with the recorded sha256; backend as the app role (not superuser, owns nothing); consent trigger enabled, and as the app role `UPDATE` and `DELETE` of consent rows, `DISABLE TRIGGER`, `TRUNCATE` and `session_replication_role` were all refused; `check_system_consistency` clean. Two defects found and fixed during the drill: the first restore attempt failed on the `public` schema (and rolled back cleanly), the second flagged a service image the backend start adds. Evidence: `docs/audit/evidence/khalsni-total-closure-2026-11-01/ops/`. This proves the scripts on seeded data, not the production data volume or timing.

## 5. Rolling back a release

Updated 2026-10-17 for the migrations added by the audit remediation chain.

### The rule

**Restore from a backup taken just before the deploy is the preferred recovery.** Code can be redeployed freely, but most of the recent migrations change data or add evidence that a reverse migration either does not restore or would destroy. Do not run a backward `migrate` on production unless the table below says it is safe, and even then take and verify a backup first.

### Migrations added since the previous runbook

| Migration | Forward effect | Reverse | Safe to reverse on production? |
|---|---|---|---|
| `orders.0015` | Adds nullable `Order.requirements_snapshot` | Drops the column | Yes, tested on PostgreSQL 16 (previous audits); the older code runs without it |
| `orders.0016` | Backfills `requirements_snapshot` in batches | No-op (`RunPython.noop`) | Reversing it changes nothing; reverse `0015` instead if needed |
| `orders.0017` | Adds `OrderStatusLog.system_event` (code for system-written timeline notes) | Drops the column | Technically yes. Notes keep their English text, so older code still shows a timeline. Not tested backward in this chain. |
| `orders.0018` | Creates `OrderConsent` (append-only consent evidence per order) | Drops the table **and every consent record in it** | **No.** Reversing destroys legal evidence that cannot be re-created. Once any order has been submitted under this release, treat `0018` as irreversible. |
| `orders.0019` | Makes consent evidence append-only: guarded manager, and database triggers refusing `UPDATE`/`DELETE` on `orders_orderconsent` (SQLite and PostgreSQL) | Drops the triggers (tested forward and backward on PostgreSQL 16) | **No, except to recover from a trigger defect.** Reversing removes the database protection while the data stays. |
| `services.0014` | Applies the approved catalogue decisions: D02 wording in price and delivery notes, the parcel/basin yes/no gate, optional "additional notes" | No-op: the old wording and field shapes are not restored | Reversing changes nothing. To undo the data, restore the catalogue from backup. |
| `services.0015` | National-ID form fields `number` → `text` (type only) | No-op | Reversing changes nothing. Older code renders `text` fields correctly. |

No migration in this chain rewrites orders, documents or users. The catalogue migrations touch only `Service` note and schema columns, and prices are unchanged.

### What a rollback means once consent data exists

- **Redeploying older code is not a database rollback.** Code older than `orders.0018` does not know `OrderConsent`. While the table is still there, submitting orders with that code writes no consent evidence. Customers would submit without a consent record, so do not run pre-`0018` code for order intake.
- **Keep the schema forward.** If a release must be withdrawn, redeploy the previous code **without** reversing `0018`/`0019`. Newer columns and tables are ignored by older code (`0017` adds a column the older code does not read).
- **The triggers block any data cleanup.** Nothing, the application owner role included, can update or delete consent rows while `0019` is applied. That is intended. A database owner can still drop the triggers deliberately, which is recorded in `docs/audit/KHALSNI_FINAL_PRE_RELEASE_HARDENING.md` section 3.
- **Full rollback means a backup restore.** Restore the backup taken before the deploy (section 3). This also removes orders and consent records created after that backup, so record what is lost before you do it.

### Database roles after a rollback or restore

The backend runs as the app role and does not migrate (see `docs/DEPLOYMENT.md`, "Database roles"). Migrations, forward or backward, run as the owner role:

```bash
docker compose -f docker-compose.yml run --rm --entrypoint sh db-init -c 'POSTGRES_USER="$KHALSNI_DB_OWNER_USER" POSTGRES_PASSWORD="$KHALSNI_DB_OWNER_PASSWORD" python manage.py showmigrations orders services'
```

After any manual schema work or restore, run `docker compose -f docker-compose.yml run --rm db-init`. It restores ownership to the owner role and re-grants the app role. `scripts/restore.sh` does this automatically.

## 6. After any recovery

- `GET /api/health/` returns 200.
- A staff sign-in works and the order list loads.
- One document downloads.
- The backend log shows no `ERROR` lines for `django.request`.
- Set `DJANGO_ADMIN_RESET_PASSWORD=True` for one start only if the admin password has to be replaced; it now also ends that admin's existing sessions. Set it back to `False`.
