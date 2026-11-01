#!/bin/sh
# Khalsni backup monitoring check: is the last scheduled backup recent and good?
#
#   sh scripts/backup_status_check.sh [status-file]
#
# Reads the JSON written by scripts/backup_scheduled.sh (default
# /srv/khalsni-backups/backup-status.json, or KHALSNI_BACKUP_STATUS_FILE).
# Exit 0: last_result is "success" and last_success_at is younger than
# KHALSNI_BACKUP_MAX_AGE_HOURS (default 26). Exit 1 otherwise, with the reason.
# Use it from a monitoring agent, a cron "dead man's switch", or by hand.
set -eu

FILE="${1:-${KHALSNI_BACKUP_STATUS_FILE:-/srv/khalsni-backups/backup-status.json}}"
MAX_HOURS="${KHALSNI_BACKUP_MAX_AGE_HOURS:-26}"
field() { sed -n "s/^  \"$1\": \"\([^\"]*\)\",\{0,1\}$/\1/p" "${FILE}" | head -n 1; }

[ -f "${FILE}" ] || { echo "BACKUP STATUS FAILED: ${FILE} does not exist (no scheduled run yet?)"; exit 1; }
RESULT="$(field last_result)"
SUCCESS_AT="$(field last_success_at)"
[ -n "${SUCCESS_AT}" ] || { echo "BACKUP STATUS FAILED: no successful backup recorded in ${FILE}"; exit 1; }
SUCCESS_EPOCH="$(date -u -d "${SUCCESS_AT}" +%s 2>/dev/null)" \
  || { echo "BACKUP STATUS FAILED: cannot read last_success_at=${SUCCESS_AT}"; exit 1; }
AGE_HOURS=$(( ( $(date -u +%s) - SUCCESS_EPOCH ) / 3600 ))
if [ "${RESULT}" != "success" ]; then
  echo "BACKUP STATUS FAILED: last run failed ($(field last_error)); last success ${SUCCESS_AT} (${AGE_HOURS} h ago)"
  exit 1
fi
if [ "${AGE_HOURS}" -ge "${MAX_HOURS}" ]; then
  echo "BACKUP STATUS FAILED: last success ${SUCCESS_AT} is ${AGE_HOURS} h old (limit ${MAX_HOURS} h)"
  exit 1
fi
echo "BACKUP STATUS OK: last success ${SUCCESS_AT} (${AGE_HOURS} h ago), set $(field backup_dir), offsite $(field offsite)"
