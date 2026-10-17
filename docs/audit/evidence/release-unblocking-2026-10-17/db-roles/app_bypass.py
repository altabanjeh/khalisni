# Run inside the backend container with its runtime (app-role) credentials.
from django.db import connection, transaction
from orders.models import OrderConsent

with connection.cursor() as c:
    c.execute("select current_user, (select rolsuper from pg_roles where rolname = current_user)")
    print("connected as:", c.fetchone())
row = OrderConsent.objects.order_by("-pk").first()
print("consent row:", row.pk, row.order.order_number, row.accepted, row.consent_version, row.language, row.source)


def attempt(label, statement):
    try:
        with transaction.atomic(), connection.cursor() as c:
            c.execute(statement)
        print(f"{label}: ALLOWED  <-- FAIL")
    except Exception as exc:  # noqa: BLE001 - every refusal is reported
        print(f"{label}: refused ({type(exc).__name__}: {str(exc).splitlines()[0][:100]})")


attempt("UPDATE consent row", f"UPDATE orders_orderconsent SET accepted = false WHERE consent_id = {row.pk}")
attempt("DELETE consent row", f"DELETE FROM orders_orderconsent WHERE consent_id = {row.pk}")
attempt("ALTER TABLE DISABLE TRIGGER", "ALTER TABLE orders_orderconsent DISABLE TRIGGER orders_orderconsent_append_only")
attempt("ALTER TABLE DISABLE TRIGGER ALL", "ALTER TABLE orders_orderconsent DISABLE TRIGGER ALL")
attempt("DROP TRIGGER", "DROP TRIGGER orders_orderconsent_append_only ON orders_orderconsent")
attempt("DROP FUNCTION", "DROP FUNCTION orders_orderconsent_append_only() CASCADE")
attempt("TRUNCATE orders_orderconsent", "TRUNCATE orders_orderconsent")
attempt("DROP TABLE orders_orderconsent", "DROP TABLE orders_orderconsent")
attempt("ALTER TABLE add column", "ALTER TABLE orders_orderconsent ADD COLUMN x int")
attempt("SET session_replication_role = replica", "SET session_replication_role = replica")
attempt("CREATE TABLE in public", "CREATE TABLE ub_probe (id int)")
attempt("ALTER ROLE self SUPERUSER", "ALTER ROLE current_user SUPERUSER")
attempt("hard DELETE parent order", f"DELETE FROM orders_order WHERE id = {row.order_id}")
row.refresh_from_db()
print("after: consent row intact:", row.accepted, row.consent_version, OrderConsent.objects.filter(pk=row.pk).count())
