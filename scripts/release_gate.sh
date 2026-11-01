#!/bin/sh
# Khalsni release gate: production validation commands against one deployed stack.
#
#   KHALSNI_GATE_EXPECTED_SHA=<approved short sha> KHALSNI_GATE_URL=https://khalisni.com \
#   KHALSNI_BACKUP_ROOT=/srv/khalsni-backups sh scripts/release_gate.sh
#
# Runs, in order, and exits non-zero if ANY check fails:
#   1. version     GET <URL>/api/health/version/ and <URL>/version.json report
#                  the expected commit (backend and frontend images)
#   2. migrations  manage.py migrate --check (nothing unapplied)
#   3. deploy      manage.py check --deploy --fail-level WARNING
#   4. content     manage.py check_public_content --strict
#   5. catalogue   manage.py validate_catalogue --strict
#   6. demo data   manage.py audit_demo_data --strict (reported as NOT AVAILABLE,
#                  not failed, while the command does not exist in the image)
#   7. phones      manage.py normalize_phones (dry run): 0 rows to normalize and
#                  0 collisions
#   8. backup      scripts/verify_backup.sh on the newest complete backup set,
#                  which must be younger than KHALSNI_GATE_BACKUP_MAX_AGE_HOURS
#
# Environment:
#   COMPOSE                         Compose command for the deployed stack
#                                   (default docker compose -f docker-compose.yml;
#                                   Coolify: docker compose -p <project> -f docker-compose.yml)
#   KHALSNI_GATE_EXPECTED_SHA       Required. Commit approved for release (7+ hex).
#   KHALSNI_GATE_URL                Required. Public base URL, no trailing slash.
#   KHALSNI_GATE_CURL_OPTS          Extra curl options (local drills: -H "X-Forwarded-Proto: https").
#   KHALSNI_GATE_BACKUP_DIR         Backup set to verify; default: newest complete set in
#   KHALSNI_BACKUP_ROOT             (default /srv/khalsni-backups).
#   KHALSNI_GATE_BACKUP_MAX_AGE_HOURS  Default 24.
set -u

COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml}"
HERE="$(cd "$(dirname "$0")" && pwd)"
EXPECTED="$(printf '%s' "${KHALSNI_GATE_EXPECTED_SHA:-}" | tr 'A-F' 'a-f')"
URL="${KHALSNI_GATE_URL:-}"
URL="${URL%/}"
MAX_AGE="${KHALSNI_GATE_BACKUP_MAX_AGE_HOURS:-24}"
RESULTS=""
FAILED=0

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-gate: $*"; }
record() { RESULTS="${RESULTS}$(printf '%-11s %-14s %s' "$1" "$2" "$3")
"; [ "$2" != "FAIL" ] || FAILED=1; log "$1: $2 $3"; }
manage() { ${COMPOSE} exec -T backend python manage.py "$@"; }
section() { echo; echo "===== $1 ====="; }

case "${EXPECTED}" in
  ""|*[!0-9a-f]*) echo "KHALSNI_GATE_EXPECTED_SHA must be the approved commit (hex)." >&2; exit 2;;
esac
[ "${#EXPECTED}" -ge 7 ] || { echo "KHALSNI_GATE_EXPECTED_SHA needs at least 7 characters." >&2; exit 2; }
[ -n "${URL}" ] || { echo "KHALSNI_GATE_URL is required (e.g. https://khalisni.com)." >&2; exit 2; }
log "release gate: expected ${EXPECTED} at ${URL}; stack: ${COMPOSE}"

same_sha() {
  # Either may be the longer form of the other (7 vs 12 characters).
  [ "${#1}" -ge 7 ] || return 1
  case "$1" in "$2"*) return 0;; esac
  case "$2" in "$1"*) return 0;; esac
  return 1
}

section "1. version"
# shellcheck disable=SC2086 # extra curl options are intentionally word-split
BODY="$(eval "curl -fsS --max-time 20 ${KHALSNI_GATE_CURL_OPTS:-} \"${URL}/api/health/version/\"" 2>&1)"; RC=$?
echo "backend  ${URL}/api/health/version/ -> ${BODY}"
BACKEND_SHA="$(printf '%s' "${BODY}" | sed -n 's/.*"sha": *"\([^"]*\)".*/\1/p')"
FBODY="$(eval "curl -fsS --max-time 20 ${KHALSNI_GATE_CURL_OPTS:-} \"${URL}/version.json\"" 2>&1)"; FRC=$?
echo "frontend ${URL}/version.json -> ${FBODY}"
FRONTEND_SHA="$(printf '%s' "${FBODY}" | sed -n 's/.*"sha": *"\([^"]*\)".*/\1/p')"
if [ "${RC}" -eq 0 ] && [ "${FRC}" -eq 0 ] && same_sha "${BACKEND_SHA}" "${EXPECTED}" && same_sha "${FRONTEND_SHA}" "${EXPECTED}"; then
  record version PASS "backend ${BACKEND_SHA}, frontend ${FRONTEND_SHA} = expected ${EXPECTED}"
else
  record version FAIL "backend '${BACKEND_SHA:-?}' frontend '${FRONTEND_SHA:-?}' expected ${EXPECTED}"
fi

section "2. migrate --check"
if manage migrate --check; then record migrations PASS "no unapplied migrations"
else record migrations FAIL "unapplied migrations: run db-init (docker compose ... run --rm db-init)"; fi

section "3. check --deploy"
if manage check --deploy --fail-level WARNING; then record deploy PASS "no deploy warnings"
else record deploy FAIL "check --deploy reported issues (see above)"; fi

section "4. check_public_content --strict"
if manage check_public_content --strict; then record content PASS "public content complete"
else record content FAIL "public content needs owner input (see above)"; fi

section "5. validate_catalogue --strict"
if manage validate_catalogue --strict --no-warnings; then record catalogue PASS "no error-level findings"
else record catalogue FAIL "catalogue has error-level findings (see above)"; fi

section "6. audit_demo_data --strict"
if manage help audit_demo_data >/dev/null 2>&1; then
  if manage audit_demo_data --strict; then record demo_data PASS "no demo data"
  else record demo_data FAIL "demo data present (see above)"; fi
else
  echo "audit_demo_data is not part of this image; run it once the release that adds it is deployed."
  record demo_data "NOT_AVAILABLE" "command absent in this image (not counted as a failure)"
fi

section "7. normalize_phones (dry run)"
PHONES="$(manage normalize_phones 2>&1)"; PRC=$?
printf '%s\n' "${PHONES}" | grep -v -E '^(normalize|collision|invalid) ' || true
printf '%s\n' "${PHONES}" | grep -E '^(normalize|collision|invalid) ' | head -n 20
TO_NORMALIZE="$(printf '%s\n' "${PHONES}" | awk '$2 == "normalize" { n += $3 } END { print n + 0 }')"
COLLISIONS="$(printf '%s\n' "${PHONES}" | awk '$2 == "collision" { n += $3 } END { print n + 0 }')"
INVALID="$(printf '%s\n' "${PHONES}" | awk '$2 == "invalid" { n += $3 } END { print n + 0 }')"
if [ "${PRC}" -ne 0 ] || ! printf '%s\n' "${PHONES}" | grep -q "^Dry run: nothing was changed"; then
  record phones FAIL "normalize_phones did not complete a dry run"
elif [ "${TO_NORMALIZE}" -eq 0 ] && [ "${COLLISIONS}" -eq 0 ]; then
  record phones PASS "0 to normalize, 0 collisions, ${INVALID} invalid (left for a person)"
else
  record phones FAIL "${TO_NORMALIZE} to normalize, ${COLLISIONS} collision(s): review and apply (runbook step 7)"
fi

section "8. backup verification"
SET="${KHALSNI_GATE_BACKUP_DIR:-}"
if [ -z "${SET}" ]; then
  ROOT="${KHALSNI_BACKUP_ROOT:-/srv/khalsni-backups}"
  SET="$(ls -1d "${ROOT}"/khalsni-* 2>/dev/null | grep -v '\.partial$' | sort | tail -n 1)"
fi
if [ -z "${SET}" ]; then
  record backup FAIL "no complete backup set found (KHALSNI_GATE_BACKUP_DIR / KHALSNI_BACKUP_ROOT)"
elif sh "${HERE}/verify_backup.sh" "${SET}"; then
  CREATED="$(sed -n 's/^  "created_at": "\([^"]*\)",$/\1/p' "${SET}/manifest.json" 2>/dev/null)"
  CREATED_EPOCH="$(date -u -d "${CREATED}" +%s 2>/dev/null || echo 0)"
  AGE=$(( ( $(date -u +%s) - CREATED_EPOCH ) / 3600 ))
  if [ "${CREATED_EPOCH}" -gt 0 ] && [ "${AGE}" -lt "${MAX_AGE}" ]; then
    record backup PASS "${SET##*/} verified, ${AGE} h old"
  else
    record backup FAIL "${SET##*/} verified but ${AGE} h old (limit ${MAX_AGE} h): take a fresh backup"
  fi
else
  record backup FAIL "${SET##*/} did not verify"
fi

echo
echo "===== RELEASE GATE SUMMARY ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ====="
printf '%s' "${RESULTS}"
if [ "${FAILED}" -ne 0 ]; then
  echo "RELEASE GATE: FAILED"
  exit 1
fi
echo "RELEASE GATE: PASSED"
