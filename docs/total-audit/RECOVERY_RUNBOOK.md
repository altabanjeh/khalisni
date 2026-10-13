# Khalsni recovery runbook

Written 2026-10-13. For the operator of the Docker Compose deployment (Coolify or a plain server).

**Status of what is described here**

| Item | Status |
|---|---|
| `scripts/backup.sh`, `scripts/restore.sh` | Run on a local Compose stack built from this release (PostgreSQL 16, production settings). **Not run against the deployed stack.** |
| Backup failure handling | Tested locally: with the database container stopped, and separately with the backend container stopped, the script exits 1 and leaves only a `.partial` directory. |
| Restore drill, database and media | Done locally on 2026-10-13 into a separate Compose project: 12 s, row counts identical, the test document readable, `check_system_consistency` clean. Local seeded data, not a production copy. |
| Scheduled backups, off-server copy | **Do not exist.** Nothing in the repository schedules a backup. Until this is set up, losing the server disk loses every order and every customer document. |

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
| Backend container | API down; no data lost | `docker compose -f docker-compose.yml up -d --build backend`. Start-up applies migrations. |
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

```cron
15 2 * * * cd /srv/khalsni && sh scripts/backup.sh /srv/khalsni-backups >> /var/log/khalsni-backup.log 2>&1 || echo "Khalsni backup FAILED $(date -u)" | mail -s "Khalsni backup failed" ops@<domain>
```

Add the off-server copy and a retention rule (for example 14 daily, 8 weekly). How long backups of identity documents may be kept is a client policy decision, not an engineering one.

### Restore

```bash
# DESTRUCTIVE for the stack it runs against
sh scripts/restore.sh /srv/khalsni-backups/khalsni-<UTC time> --yes-overwrite
docker compose -f docker-compose.yml exec backend python manage.py check_system_consistency
docker compose -f docker-compose.yml exec backend python manage.py audit_requirements_snapshot --strict
```

The restore verifies the checksums, stops the application, replaces the database contents and the media folder, then starts the application, which applies any migrations newer than the backup. Restore database and media from the **same** backup: a newer database with older media has document rows whose files are missing.

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

1. Redeploy the previous commit.
2. Schema: the only recent schema change is `orders.0015` (adds the nullable `requirements_snapshot` column) with data migration `orders.0016`. `python manage.py migrate orders 0014` removes the column and nothing else. Tested forward and backward on PostgreSQL 16 in this audit and in the previous one. The previous code runs without the column.
3. This audit adds **no migration**, so rolling back its code needs no schema step.
4. A rollback does not undo data written by the newer code (orders, documents). It does not need to: the newer code writes the same tables.

No other migration was tested for reversal. Treat every other backward migration as untested.

## 6. After any recovery

- `GET /api/health/` returns 200.
- A staff sign-in works and the order list loads.
- One document downloads.
- The backend log shows no `ERROR` lines for `django.request`.
- Set `DJANGO_ADMIN_RESET_PASSWORD=True` for one start only if the admin password has to be replaced; it now also ends that admin's existing sessions. Set it back to `False`.
