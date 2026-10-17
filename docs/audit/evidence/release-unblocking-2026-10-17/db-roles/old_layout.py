# Old single-superuser layout: create real data, then show the consent gap (rolled back).
import uuid
from django.db import connection, transaction
from rest_framework.test import APIClient
from accounts.models import CustomUser
from orders.models import Order, OrderConsent
from services.models import Service

with connection.cursor() as c:
    c.execute("select current_user, (select rolsuper from pg_roles where rolname = current_user)")
    print("old layout connected as:", c.fetchone())
customer = CustomUser.objects.get(email="customer@khalisni.local")
template = Service.objects.filter(is_active=True, is_deleted=False).first()
service, _ = Service.objects.get_or_create(slug="ub-upgrade-service", defaults={
    "category": template.category, "name_ar": "خدمة اختبار الترقية", "name_en": "Upgrade test service",
    "description_ar": "مؤقتة", "is_active": True, "show_on_public_site": True, "is_online": True})
client = APIClient(); client.force_authenticate(customer)
client.credentials(HTTP_ACCEPT_LANGUAGE="ar", HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4()))
r = client.post("/api/orders/", {"service": service.pk, "full_name": "Upgrade Customer", "phone": "0791234567", "city": "Amman",
                                 "consent": "true", "consent_version": "order-consent-web-v1", "consent_source": "web"}, format="multipart")
print("order:", r.status_code, r.data.get("order_number"))
row = OrderConsent.objects.get(order_id=r.data["id"])


class Rollback(Exception):
    pass


try:
    with transaction.atomic(), connection.cursor() as c:
        c.execute("ALTER TABLE orders_orderconsent DISABLE TRIGGER orders_orderconsent_append_only")
        c.execute(f"UPDATE orders_orderconsent SET accepted = false WHERE consent_id = {row.pk}")
        print("OLD LAYOUT GAP: superuser disabled the trigger and rewrote consent (rows changed:", c.rowcount, ") -- rolled back")
        raise Rollback
except Rollback:
    pass
row.refresh_from_db()
print("after rollback: consent intact:", row.accepted, "orders:", Order.objects.count(), "consents:", OrderConsent.objects.count())
