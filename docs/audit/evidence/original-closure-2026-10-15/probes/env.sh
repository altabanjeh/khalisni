# usage: source env.sh A|B
S="C:/Users/LENOVO/AppData/Local/Temp/claude/d--ghassan/dc81cbcb-b135-455f-8bd2-a381931b3af1/scratchpad"
export AUDIT_ENV_ROOT="$S/env$1"
export DJANGO_SQLITE_NAME="$S/env$1/db.sqlite3"
export PYTHONPATH="$S/cfg"
export DJANGO_SETTINGS_MODULE=audit_settings
export DJANGO_DEBUG=True DJANGO_SECRET_KEY=audit-only-insecure POSTGRES_DB=
export DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
export KHALSNI_QA_PASSWORD="${KHALSNI_QA_PASSWORD:?set a 12+ char QA password}"
export PYTHONIOENCODING=utf-8
