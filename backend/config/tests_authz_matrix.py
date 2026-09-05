"""Direct-API multi-role authorization matrix (Gate 1R §10).

Frontend route hiding is not authorization -- this exercises the HTTP layer
directly for every role against a representative set of protected endpoints,
asserting allow / deny (401/403/404) exactly as the current source-of-truth
roles imply. Object-ownership tampering (IDOR) is covered too.
"""

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceProviderAssignment

ANON = "anon"
ROLES = ["anon", "customer", "employee", "support", "provider", "admin"]

# endpoint -> {method, path, per-role expected outcome}
#   "ok"    -> 2xx
#   "deny"  -> 401 / 403 / 404 (any non-2xx auth rejection)
CASES = [
    ("GET", "/api/services/", {r: "ok" for r in ROLES}),
    ("GET", "/api/public-site/service-categories/", {r: "ok" for r in ROLES}),
    ("GET", "/api/admin/orders/", {"anon": "deny", "customer": "deny", "provider": "deny",
                                    "employee": "ok", "support": "ok", "admin": "ok"}),
    ("GET", "/api/admin/services/", {"anon": "deny", "customer": "deny", "provider": "deny",
                                      "employee": "deny", "support": "ok", "admin": "ok"}),
    ("GET", "/api/admin/users/", {"anon": "deny", "customer": "deny", "provider": "deny",
                                   "employee": "deny", "support": "deny", "admin": "ok"}),
    ("GET", "/api/admin/system-settings/", {"anon": "deny", "customer": "deny", "provider": "deny",
                                             "employee": "deny", "support": "deny", "admin": "ok"}),
    # audit-logs: IsAdminRole only (SRS FR7 does not grant Support audit access)
    ("GET", "/api/admin/audit-logs/", {"anon": "deny", "customer": "deny", "provider": "deny",
                                        "employee": "deny", "support": "deny", "admin": "ok"}),
    # NOTE (finding D-AZ1): providers currently pass CanViewReportsDashboard and
    # receive an org-scoped ops dashboard that includes a revenue_estimate card.
    # SRS BR7 says providers cannot access finance reports -- flagged for Gate 2.
    ("GET", "/api/admin/dashboard/", {"anon": "deny", "customer": "deny", "provider": "ok",
                                       "employee": "ok", "support": "ok", "admin": "ok"}),
    ("GET", "/api/customer/orders/", {"anon": "deny", "customer": "ok", "provider": "deny",
                                       "employee": "deny", "support": "deny", "admin": "deny"}),
    ("GET", "/api/provider/orders/", {"anon": "deny", "customer": "deny", "provider": "ok",
                                       "employee": "deny", "support": "deny", "admin": "deny"}),
    ("GET", "/api/notifications/", {"anon": "deny", "customer": "ok", "provider": "ok",
                                     "employee": "ok", "support": "ok", "admin": "ok"}),
    ("GET", "/api/notifications/unread-count/", {"anon": "deny", "customer": "ok", "provider": "ok",
                                                  "employee": "ok", "support": "ok", "admin": "ok"}),
    ("POST", "/api/admin/services/", {"anon": "deny", "customer": "deny", "provider": "deny",
                                       "employee": "deny", "support": "deny", "admin": "ok"}),
]


class AuthorizationMatrixTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.users = {"anon": None}
        for role, key in [
            (CustomUser.Role.CUSTOMER, "customer"),
            (CustomUser.Role.EMPLOYEE, "employee"),
            (CustomUser.Role.SUPPORT, "support"),
            (CustomUser.Role.PROVIDER, "provider"),
            (CustomUser.Role.ADMIN, "admin"),
        ]:
            cls.users[key] = CustomUser.objects.create_user(
                email=f"authz-{key}@example.com", password="Password@123",
                full_name=f"Authz {key}", phone=f"079{5500000 + ord(key[0])}",
                role=role, is_staff=key in ("admin",), is_superuser=key == "admin",
            )
        cls.category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="authz-cat")
        cls.service = Service.objects.create(
            category=cls.category, name_ar="خ", name_en="S", slug="authz-svc",
            description_ar="d", estimated_duration=1, base_price="1.00",
        )
        cls._svc_create_body = {
            "category_id": cls.category.category_id, "name_ar": "n", "name_en": "n",
            "slug": "authz-created", "description_ar": "d", "description_en": "d",
            "estimated_duration": 1, "base_price": "1.00", "government_fee": "0.00", "service_fee": "0.00",
        }

    def _auth(self, role):
        self.client.force_authenticate(user=self.users[role])

    def test_matrix(self):
        failures = []
        for method, path, expectations in CASES:
            for role in ROLES:
                self.client.force_authenticate(user=self.users[role])
                body = self._svc_create_body if (method == "POST" and path.endswith("/services/")) else {}
                resp = getattr(self.client, method.lower())(path, body, format="json")
                got_ok = 200 <= resp.status_code < 300
                want = expectations[role]
                ok = (want == "ok" and got_ok) or (want == "deny" and not got_ok)
                if not ok:
                    failures.append(f"{method} {path} as {role}: expected {want}, got HTTP {resp.status_code}")
        self.assertEqual(failures, [], "\n".join(failures))

    def test_customer_cannot_read_another_customers_order_idor(self):
        c1 = self.users["customer"]
        c2 = CustomUser.objects.create_user(
            email="authz-c2@example.com", password="Password@123", full_name="C2",
            phone="0796600001", role=CustomUser.Role.CUSTOMER,
        )
        # create an order for c2 via the API
        self.client.force_authenticate(user=c2)
        r = self.client.post(
            "/api/orders/",
            {"service": self.service.id, "full_name": "C2", "phone": c2.phone, "city": "Amman", "consent": True},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        oid = r.data["id"]
        # c1 must not see it
        self.client.force_authenticate(user=c1)
        self.assertEqual(self.client.get(f"/api/customer/orders/{oid}/").status_code, 404)

    def test_provider_cannot_access_unassigned_order(self):
        cust = self.users["customer"]
        self.client.force_authenticate(user=cust)
        r = self.client.post(
            "/api/orders/",
            {"service": self.service.id, "full_name": "x", "phone": cust.phone, "city": "Amman", "consent": True},
            format="json",
        )
        oid = r.data["id"]
        self.client.force_authenticate(user=self.users["provider"])
        self.assertEqual(self.client.get(f"/api/provider/orders/{oid}/").status_code, 404)

    def test_customer_cannot_drive_workflow_transitions(self):
        cust = self.users["customer"]
        self.client.force_authenticate(user=cust)
        r = self.client.post(
            "/api/orders/",
            {"service": self.service.id, "full_name": "x", "phone": cust.phone, "city": "Amman", "consent": True},
            format="json",
        )
        oid = r.data["id"]
        # customer hitting the admin status endpoint -> denied
        resp = self.client.patch(f"/api/admin/orders/{oid}/status/", {"status": "UNDER_REVIEW"}, format="json")
        self.assertIn(resp.status_code, (401, 403, 404))
