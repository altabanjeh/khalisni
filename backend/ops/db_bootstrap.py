"""PostgreSQL role bootstrap for the Khalsni Compose deployment.

Run by the one-shot ``db-init`` service with the cluster admin credentials
(``POSTGRES_ADMIN_USER`` / ``POSTGRES_ADMIN_PASSWORD``). Idempotent: safe on a
fresh database and on an existing one whose tables are still owned by the admin.

    python ops/db_bootstrap.py roles    # before migrations
    python ops/db_bootstrap.py grants   # after migrations

Roles (names and passwords come from the environment, never from the repository):

* owner  (KHALSNI_DB_OWNER_USER): LOGIN, not superuser, no CREATEDB/CREATEROLE.
  Owns the database, the ``public`` schema and every object in it. Runs migrations.
  Never used by the running backend.
* app    (KHALSNI_DB_APP_USER): LOGIN, not superuser, no CREATEDB/CREATEROLE, owns
  nothing. CONNECT, schema USAGE, SELECT/INSERT/UPDATE/DELETE on tables and
  USAGE/SELECT on sequences. Without ownership it cannot ALTER, DROP or TRUNCATE
  tables, disable or drop triggers, or set ``session_replication_role``, so the
  append-only consent triggers (``orders.0019``) bind it.
"""

import os
import sys
import time

import psycopg
from psycopg import sql


def env(name):
    value = os.environ.get(name, "").strip()
    if not value:
        sys.exit(f"db_bootstrap: {name} is required.")
    return value


def connect(dbname):
    host = os.environ.get("POSTGRES_HOST", "db")
    port = int(os.environ.get("POSTGRES_PORT", "5432"))
    admin, password = env("POSTGRES_ADMIN_USER"), env("POSTGRES_ADMIN_PASSWORD")
    for attempt in range(1, 91):
        try:
            return psycopg.connect(dbname=dbname, user=admin, password=password, host=host, port=port,
                                   connect_timeout=5, autocommit=True)
        except psycopg.OperationalError as exc:
            print(f"db_bootstrap: database not ready (attempt {attempt}): {exc}".strip(), flush=True)
            time.sleep(2)
    sys.exit("db_bootstrap: database unreachable.")


def ensure_role(cur, name, password):
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (name,))
    verb = "ALTER" if cur.fetchone() else "CREATE"
    cur.execute(sql.SQL(
        "{} ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD {}"
    ).format(sql.SQL(verb), sql.Identifier(name), sql.Literal(password)))
    print(f"db_bootstrap: role {name} {'updated' if verb == 'ALTER' else 'created'}.")


def roles():
    database = env("POSTGRES_DB")
    admin = env("POSTGRES_ADMIN_USER")
    owner, owner_password = env("KHALSNI_DB_OWNER_USER"), env("KHALSNI_DB_OWNER_PASSWORD")
    app, app_password = env("KHALSNI_DB_APP_USER"), env("KHALSNI_DB_APP_PASSWORD")
    if len({admin, owner, app}) != 3:
        sys.exit("db_bootstrap: the admin, owner and app roles must be three different roles.")
    if owner_password == app_password:
        sys.exit("db_bootstrap: the owner and app roles must have different passwords.")

    with connect(database) as conn, conn.cursor() as cur:
        ensure_role(cur, owner, owner_password)
        ensure_role(cur, app, app_password)
        ident = sql.Identifier
        cur.execute(sql.SQL("ALTER DATABASE {} OWNER TO {}").format(ident(database), ident(owner)))
        cur.execute(sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(ident(database)))
        cur.execute(sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(ident(database), ident(app)))
        cur.execute(sql.SQL("ALTER SCHEMA public OWNER TO {}").format(ident(owner)))
        cur.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
        # Existing deployments: objects created by the old single superuser move
        # to the owner role (tables, views, sequences, functions such as the
        # consent trigger function). Nothing is dropped or rewritten.
        cur.execute(
            """
            SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
              AND pg_get_userbyid(c.relowner) <> %s
              AND NOT (c.relkind = 'S' AND EXISTS (
                  SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a', 'i')))
            """,
            (owner,),
        )
        kinds = {"r": "TABLE", "p": "TABLE", "v": "VIEW", "m": "MATERIALIZED VIEW", "S": "SEQUENCE", "f": "FOREIGN TABLE"}
        moved = 0
        for name, kind in cur.fetchall():
            cur.execute(sql.SQL("ALTER {} {} OWNER TO {}").format(sql.SQL(kinds[kind]), ident("public", name), ident(owner)))
            moved += 1
        cur.execute(
            """
            SELECT p.oid::regprocedure::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND pg_get_userbyid(p.proowner) <> %s
            """,
            (owner,),
        )
        for (signature,) in cur.fetchall():
            cur.execute(sql.SQL("ALTER FUNCTION {} OWNER TO {}").format(sql.SQL(signature), ident(owner)))
            moved += 1
        print(f"db_bootstrap: {moved} object(s) moved to {owner}.")
    grants()


def grants():
    database = env("POSTGRES_DB")
    owner, app = env("KHALSNI_DB_OWNER_USER"), env("KHALSNI_DB_APP_USER")
    ident = sql.Identifier
    with connect(database) as conn, conn.cursor() as cur:
        cur.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(ident(app)))
        cur.execute(sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}").format(ident(app)))
        cur.execute(sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {}").format(ident(app)))
        # Tables and sequences the owner creates in later migrations.
        cur.execute(sql.SQL(
            "ALTER DEFAULT PRIVILEGES FOR ROLE {} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {}"
        ).format(ident(owner), ident(app)))
        cur.execute(sql.SQL(
            "ALTER DEFAULT PRIVILEGES FOR ROLE {} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {}"
        ).format(ident(owner), ident(app)))
        # The app role must never hold more than DML.
        cur.execute(sql.SQL("REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM {}").format(ident(app)))
        cur.execute(
            "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'public' AND pg_get_userbyid(c.relowner) = %s",
            (app,),
        )
        if cur.fetchone()[0]:
            sys.exit(f"db_bootstrap: {app} owns objects in schema public; it must own nothing.")
        cur.execute("SELECT rolsuper FROM pg_roles WHERE rolname = %s", (app,))
        if cur.fetchone()[0]:
            sys.exit(f"db_bootstrap: {app} is a superuser; refusing.")
        print(f"db_bootstrap: DML grants for {app} applied.")


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else ""
    if step == "roles":
        roles()
    elif step == "grants":
        grants()
    else:
        sys.exit("usage: python ops/db_bootstrap.py roles|grants")
