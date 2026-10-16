# Run with `manage.py shell` while connected as the application role (khalsni_app).
# Ordinary application work (submit an order through the API) must succeed; every
# consent bypass available to these credentials must fail.
from django.db import connection, transaction
from rest_framework.test import APIClient

from accounts.models import CustomUser
from orders.models import Order, OrderConsent
from services.models import Service

print("connected as:", connection.settings_dict["USER"])
customer = CustomUser.objects.get(email="customer@khalisni.local")
template = Service.objects.filter(is_active=True, is_deleted=False).first()
service, _ = Service.objects.get_or_create(
    slug="rc-gate-no-documents",
    defaults={"category": template.category, "name_ar": "خدمة فحص الإصدار", "name_en": "RC gate service",
              "description_ar": "خدمة اختبار مؤقتة", "is_active": True, "show_on_public_site": True, "is_online": True},
)
print("APP insert service (ordinary admin data):", service.pk)
client = APIClient()
client.force_authenticate(customer)
client.credentials(HTTP_ACCEPT_LANGUAGE="ar", HTTP_IDEMPOTENCY_KEY=str(__import__("uuid").uuid4()))
response = client.post("/api/orders/", {
    "service": service.pk, "full_name": "RC Gate Customer", "phone": "0791234567", "city": "Amman",
    "consent": "true", "consent_version": "order-consent-web-v1", "consent_source": "web",
}, format="multipart")
print("APP create order:", response.status_code, getattr(response, "data", response.content[:200]))
order = Order.objects.get(pk=response.data["id"])
row = OrderConsent.objects.get(order=order)
print("APP consent row:", row.pk, row.accepted, row.consent_version, row.language, row.source)
print("APP ordinary order update (status-independent field):",
      Order.objects.filter(pk=order.pk).update(city="Irbid") == 1)


def attempt(label, sql):
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute(sql)
        print(f"BYPASS {label}: ALLOWED  <-- FAIL")
    except Exception as exc:  # noqa: BLE001 - we report every refusal
        print(f"BYPASS {label}: refused ({type(exc).__name__}: {str(exc).splitlines()[0][:90]})")


attempt("UPDATE consent row", f"UPDATE orders_orderconsent SET accepted = false WHERE consent_id = {row.pk}")
attempt("DELETE consent row", f"DELETE FROM orders_orderconsent WHERE consent_id = {row.pk}")
attempt("DISABLE TRIGGER", "ALTER TABLE orders_orderconsent DISABLE TRIGGER orders_orderconsent_append_only")
attempt("DROP TRIGGER", "DROP TRIGGER orders_orderconsent_append_only ON orders_orderconsent")
attempt("session_replication_role=replica", "SET session_replication_role = replica")
attempt("TRUNCATE", "TRUNCATE orders_orderconsent")
attempt("DROP TABLE", "DROP TABLE orders_orderconsent")
attempt("hard DELETE parent order", f"DELETE FROM orders_order WHERE id = {order.pk}")
row.refresh_from_db()
print("AFTER consent row intact:", row.accepted, row.consent_version, OrderConsent.objects.filter(order=order).count())
