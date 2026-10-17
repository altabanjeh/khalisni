# Khalsni recovery runbook

Written 2026-10-13. For the operator of the Docker Compose deployment (Coolify or a plain server).

**Status of what is described here**

| Item | Status |
|---|---|
| `scripts/backup.sh`, `scripts/restore.sh` | Run on a local Compose stack built from this release (PostgreSQL 16, production settings). **Not run against the deployed stack.** |
| Backup failure handling | Tested locally: with the database container stopped, and separately with the backend container stopped, the script exits 1 and leaves only a `.partial` directory. |
| Restore drill, database and media | Done locally on 2026-10-13 into a separate Compose project: 12 s, row counts identical, the test document readable, `check_system_consistency` clean. Repeated on 2026-10-17 with the database-role layout (`db-init`): backup, `verify_backup.sh`, then `restore.sh` over a modified stack in 52 s; row counts back to the backup, all objects owned by the owner role, the consent trigger enabled, the backend connected as the app role. Local seeded data, not a production copy. |
| Scheduled backups, off-server copy | `scripts/backup_scheduled.sh` and `scripts/verify_backup.sh` exist (section 3, Schedule). **Nothing is scheduled on any server yet**: until the cron entry and the off-server copy are set up on production, losing the server disk loses every order and every customer document. |

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

### What a backup contains

`sh scripts/backup.sh <directory>` writes `<directory>/khalsni-<UTC time>/`:

| File | Content |
|---|---|
| `database.dump` | `pg_dump` custom format of the whole database |
| `database.toc` | The dump's table of contents, produced by reading the dump back |
| `media.tar.gz` | The whole media volume: customer documents, final results, payment receipts, catalog and CMS images |
| `manifest.txt` | UTC time, release commit, media file counts, object-storage bucket (or `none`), PostgreSQL version, row counts for orders, documents, users, payments, audit log, migrations |
| `SHA256SUMS` | Checksums of the dump, the archive and the manifest |

The script exits non-zero, and the directory keeps the suffix `.partial`, when any of these fails: the dump, reading the dump back, the orders table missing from the dump, the media archive, the archive integrity test, an empty archive while the volume has files, the row counts, the checksums. **A directory without `.partial` is a complete backup; anything else is not.**

### Production commands

```bash
cd /srv/khalsni                      # the repository root on the server

# 1. back up
sh scripts/backup.sh /srv/khalsni-backups
echo "exit status: $?"               # must be 0

# 2. confirm
ls /srv/khalsni-backups              # newest entry has no .partial suffix
cat /srv/khalsni-backups/khalsni-*/manifest.txt | tail -13

# 3. copy off the server (example; use the storage the client approves)
rsync -a /srv/khalsni-backups/ backup-host:/backups/khalsni/
```

Under Coolify the Compose project has its own name. Find it with `docker compose ls`, then:

```bash
COMPOSE="docker compose -p <project name> -f docker-compose.yml" sh scripts/backup.sh /srv/khalsni-backups
```

If `manifest.txt` shows a bucket name instead of `object_storage_bucket=none`, uploads live in object storage: the archive holds only what is on the volume, and the bucket needs its own backup. That path was not exercised.

### Schedule

Nightly is the minimum for a service that holds customer identity documents:

`scripts/backup_scheduled.sh` runs one scheduled cycle: `backup.sh`, then `verify_backup.sh` on the new backup, then an optional off-server copy, then optional rotation. It exits non-zero if any step fails.

```cron
15 2 * * * cd /srv/khalsni && KHALSNI_BACKUP_COPY_COMMAND="<copy command>" sh scripts/backup_scheduled.sh /srv/khalsni-backups >> /var/log/khalsni-backup.log 2>&1 || echo "Khalsni backup FAILED $(date -u)" | mail -s "Khalsni backup failed" ops@<domain>
```

| Variable | Meaning | Default |
|---|---|---|
| `KHALSNI_BACKUP_COPY_COMMAND` | Command that copies one finished backup off the server; the backup directory is appended as the last argument (for example an `rclone copy` or `rsync` invocation). | Unset: a warning is logged and the backup stays only on this server. |
| `KHALSNI_BACKUP_KEEP` | Number of newest complete local backups to keep. Older complete backups are deleted; `.partial` directories are never deleted. | Unset: nothing is deleted. |

There is deliberately no default retention. How long backups of identity documents may be kept is a client policy decision (D06), not an engineering one; set `KHALSNI_BACKUP_KEEP` (and the retention of the off-server copy) once that policy exists. Production schedule confirmation remains a release gate.

### Verify a backup

```sh
sh scripts/verify_backup.sh /srv/khalsni-backups/khalsni-<UTC time>
```

Needs no running stack, so it can be run on the off-server copy as well. It checks the checksums, that the media archive is readable, that the database file is a PostgreSQL custom-format dump, and that the manifest records the time, commit and row counts. It does not prove the backup restores; only the restore drill (section 4) does.

### Restore

```bash
# DESTRUCTIVE for the stack it runs against
sh scripts/restore.sh /srv/khalsni-backups/khalsni-<UTC time> --yes-overwrite
docker compose -f docker-compose.yml exec backend python manage.py check_system_consistency
docker compose -f docker-compose.yml exec backend python manage.py audit_requirements_snapshot --strict
```

The restore verifies the checksums, stops the application, replaces the database contents and the media folder, runs `db-init` (which gives the restored objects back to the owner role, applies any migrations newer than the backup as the owner and re-grants the app role), then starts the application as the app role. Restore database and media from the **same** backup: a newer database with older media has document rows whose files are missing.

## 4. Restore drill

A backup that has never been restored is not proven. Do this once before go-live and after every change to the backup setup, on a **separate** stack, never on production. A second machine is best; a second Compose project on the same machine also works because the base Compose file publishes no ports.

```bash
# on the drill machine, same commit as production
git clone <repository> khalsni-drill && cd khalsni-drill && git checkout <production commit>
cp /path/to/drill.env .env           # same variable names as production, different secrets

# 1. empty stack under its own project name
export COMPOSE="docker compose -p khalsni-drill -f docker-compose.yml"
$COMPOSE up -d --build
$COMPOSE ps                          # wait until backend is healthy

# 2. restore the copied backup
START=$(date +%s)
sh scripts/restore.sh /backups/khalsni/khalsni-<UTC time> --yes-overwrite
echo "restore took $(( $(date +%s) - START )) s"

# 3. compare with manifest.txt
$COMPOSE exec db sh -c 'psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  select count(*) from orders_order; select count(*) from documents_document;
  select count(*) from accounts_customuser; select count(*) from payment_payment"'
$COMPOSE exec backend sh -c 'find /app/media -type f | wc -l'

# 4. consistency
$COMPOSE exec backend python manage.py check_system_consistency
$COMPOSE exec backend python manage.py audit_requirements_snapshot --strict

# 5. sign in as a staff user and download one customer document and one final result

# 6. remove the drill stack and its volumes
$COMPOSE down -v
```

Record the restore time (the observed recovery time) and the age of the backup (the data-loss window).

Local result on 2026-10-13: backup of 21 users, 33 audit rows and 1 media file; restore into project `kta-drill` in 12 s; counts identical; the document readable; consistency check clean. This proves the scripts, not the production data volume or timing.

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
