"""Hardening closure regressions (release gate pass).

Finding IDs refer to docs/hardening/KHALSNI_FINDINGS.csv.
"""

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.test import RequestFactory, SimpleTestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import CustomUser
from audit.models import AuditLog
from config.tests_hardening import HardeningBase
from core.client_ip import get_client_ip
from notifications.models import Notification


def _with_proxies(count):
    return override_settings(REST_FRAMEWORK={**settings.REST_FRAMEWORK, "NUM_PROXIES": count})


class ClientIpTests(SimpleTestCase):
    """KHS-033: only addresses written by trusted proxies identify a client."""

    def _request(self, forwarded=None, remote="10.0.0.5"):
        extra = {"REMOTE_ADDR": remote}
        if forwarded is not None:
            extra["HTTP_X_FORWARDED_FOR"] = forwarded
        return RequestFactory().get("/", **extra)

    def test_trusted_proxy_count_selects_the_address_the_edge_proxy_saw(self):
        # client-supplied, real client (written by the edge proxy), edge proxy (written by nginx)
        request = self._request("6.6.6.6, 203.0.113.9, 172.18.0.2")
        with _with_proxies(2):
            self.assertEqual(get_client_ip(request), "203.0.113.9")
        with _with_proxies(1):
            self.assertEqual(get_client_ip(request), "172.18.0.2")
        with _with_proxies(0):
            self.assertEqual(get_client_ip(request), "10.0.0.5")

    def test_spoofed_left_entries_never_win(self):
        with _with_proxies(2):
            for spoof in ("1.1.1.1", "1.1.1.1, 2.2.2.2, 3.3.3.3", "127.0.0.1"):
                self.assertEqual(get_client_ip(self._request(f"{spoof}, 203.0.113.9, 172.18.0.2")), "203.0.113.9")

    def test_shorter_chain_than_configured_falls_back_to_the_outermost_entry(self):
        with _with_proxies(3):
            self.assertEqual(get_client_ip(self._request("203.0.113.9, 172.18.0.2")), "203.0.113.9")

    def test_unconfigured_never_uses_the_forwarded_header_for_audit(self):
        with _with_proxies(None):
            self.assertEqual(get_client_ip(self._request("6.6.6.6")), "10.0.0.5")
            self.assertEqual(get_client_ip(self._request("6.6.6.6, 7.7.7.7"), when_unconfigured="header"), "6.6.6.6,7.7.7.7")


class ProxyAwareThrottleTests(HardeningBase):
    """KHS-033: with the proxy count configured, header rotation does not reset rate limits."""

    def _login(self, forwarded, email=None):
        return APIClient().post(
            "/api/auth/login/", {"email": email or self.customer.email, "password": "wrong"},
            format="json", HTTP_X_FORWARDED_FOR=forwarded,
        ).status_code

    @_with_proxies(2)
    def test_rotating_the_spoofable_part_of_the_header_is_still_throttled(self):
        codes = [self._login(f"198.51.100.{index}, 203.0.113.9, 172.18.0.2") for index in range(30)]
        self.assertIn(429, codes)
        self.assertEqual(codes[:20], [401] * 20)
        self.assertEqual(set(codes[20:]), {429})

    @_with_proxies(2)
    def test_one_client_being_throttled_does_not_block_another(self):
        for index in range(25):
            self._login(f"198.51.100.{index}, 203.0.113.9, 172.18.0.2")
        self.assertEqual(self._login("203.0.113.9, 203.0.113.77, 172.18.0.2"), 401)

    @_with_proxies(2)
    def test_registration_is_throttled_per_real_client(self):
        codes = []
        for index in range(24):
            response = APIClient().post(
                "/api/auth/register/",
                {"email": f"flood-{index}@example.com", "password": "Str0ng!Passw0rd", "full_name": "Flood",
                 "phone": f"07977{index:05d}"},
                format="json", HTTP_X_FORWARDED_FOR=f"198.51.100.{index}, 203.0.113.50, 172.18.0.2",
            )
            codes.append(response.status_code)
        self.assertEqual(codes[:20], [201] * 20)
        self.assertEqual(set(codes[20:]), {429})

    @_with_proxies(2)
    def test_password_reset_ip_limit_ignores_the_spoofable_entry(self):
        codes = [
            APIClient().post(
                "/api/auth/forgot-password/", {"email": f"nobody-{index}@example.com"}, format="json",
                HTTP_X_FORWARDED_FOR=f"198.51.100.{index}, 203.0.113.60, 172.18.0.2",
            ).status_code
            for index in range(8)
        ]
        self.assertIn(429, codes)

    @_with_proxies(2)
    def test_audit_trail_records_the_real_client_address(self):
        APIClient().post(
            "/api/auth/register/",
            {"email": "audited@example.com", "password": "Str0ng!Passw0rd", "full_name": "Audited", "phone": "0797700001"},
            format="json", HTTP_X_FORWARDED_FOR="6.6.6.6, 203.0.113.70, 172.18.0.2",
        )
        entry = AuditLog.objects.filter(action="register").latest("pk")
        self.assertEqual(entry.ip_address, "203.0.113.70")

    def test_cache_backend_supports_the_atomic_operations_throttling_needs(self):
        cache.set("khs033:probe", 1, 30)
        self.assertEqual(cache.get("khs033:probe"), 1)
        self.assertEqual(cache.incr("khs033:probe"), 2)
        cache.delete("khs033:probe")
        self.assertIsNone(cache.get("khs033:probe"))


import threading
import unittest

from django.core.exceptions import ValidationError
from django.db import close_old_connections, connection
from django.test import TransactionTestCase

from orders import services as order_services
from orders.models import Order, OrderStatusLog
from organizations.models import Organization
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceProviderAssignment


@unittest.skipUnless(connection.vendor == "postgresql", "Row locks are real only on PostgreSQL")
class ConcurrentWorkflowRaceTests(TransactionTestCase):
    """KHS-007: two truly concurrent decisions on one order; exactly one wins."""

    def setUp(self):
        # TransactionTestCase flushes the tables, including the default organization.
        Organization.objects.get_or_create(
            slug="race-platform",
            defaults={"name": "Race Platform", "organization_type": Organization.OrganizationType.PLATFORM},
        )
        category = ServiceCategory.objects.create(name_ar="سباق", name_en="Race", slug="race-cat")
        self.service = Service.objects.create(
            category=category, name_ar="خدمة سباق", name_en="Race service", slug="race-svc",
            description_ar="d", estimated_duration=1, base_price="1.00", provider_required=True,
        )
        self.customer = CustomUser.objects.create_user(
            email="race-customer@example.com", password="Password@123", full_name="Race Customer",
            phone="0798800001", role=CustomUser.Role.CUSTOMER,
        )
        self.admin = CustomUser.objects.create_user(
            email="race-admin@example.com", password="Password@123", full_name="Race Admin",
            phone="0798800002", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        provider_user = CustomUser.objects.create_user(
            email="race-provider@example.com", password="Password@123", full_name="Race Provider",
            phone="0798800003", role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=provider_user, company_name="Race", provider_type="company", city="Amman", is_approved=True,
        )
        ServiceProviderAssignment.objects.create(service=self.service, provider=self.provider, is_active=True)

    def _order_under_review(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        order_services.review_order(order=order, actor=self.admin)
        return order.pk

    def _race(self, first, second):
        barrier = threading.Barrier(2)
        outcomes = []

        def run(action):
            try:
                barrier.wait(timeout=10)
                action()
                outcomes.append("ok")
            except ValidationError:
                outcomes.append("refused")
            except Exception as error:  # surfaced by the assertion below
                outcomes.append(f"error: {error!r}")
            finally:
                close_old_connections()

        threads = [threading.Thread(target=run, args=(action,)) for action in (first, second)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        return sorted(outcomes)

    def test_concurrent_reject_and_assign_leave_one_consistent_outcome(self):
        for _ in range(8):
            pk = self._order_under_review()
            outcomes = self._race(
                lambda: order_services.reject_order(order=Order.objects.get(pk=pk), actor=self.admin, reason="race"),
                lambda: order_services.assign_provider_to_order(
                    order=Order.objects.get(pk=pk), provider=self.provider, actor=self.admin
                ),
            )
            self.assertEqual(outcomes, ["ok", "refused"])
            order = Order.objects.get(pk=pk)
            logs = list(OrderStatusLog.objects.filter(order=order).exclude(new_status__in=["NEW", "UNDER_REVIEW"])
                        .values_list("new_status", flat=True))
            self.assertEqual(logs, [order.status])
            self.assertEqual(order.assigned_provider_id is not None, order.status == Order.Status.ASSIGNED)

    def test_concurrent_double_assignment_writes_one_assignment(self):
        for _ in range(8):
            pk = self._order_under_review()

            def assign():
                order_services.assign_provider_to_order(
                    order=Order.objects.get(pk=pk), provider=self.provider, actor=self.admin
                )

            self.assertEqual(self._race(assign, assign), ["ok", "refused"])
            self.assertEqual(OrderStatusLog.objects.filter(order_id=pk, new_status="ASSIGNED").count(), 1)
            self.assertEqual(
                Notification.objects.filter(order_id=pk, recipient=self.provider.user).count(), 1
            )


class ProfileIdentityChangeTests(HardeningBase):
    """KHS-038: a session alone cannot change the login email or the tracking phone."""

    def _patch(self, client, **payload):
        return client.patch("/api/customer/profile/", payload, format="json")

    def _session(self):
        tokens = APIClient().post(
            "/api/auth/login/", {"email": self.customer.email, "password": "Password@123"}, format="json"
        ).data
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return client, tokens

    def test_identity_change_requires_the_current_password(self):
        client, _ = self._session()
        for payload in ({"email": "taken-over@example.com"}, {"phone": "0790000999"},
                        {"email": "taken-over@example.com", "current_password": "wrong"}):
            response = self._patch(client, **payload)
            self.assertEqual(response.status_code, 400, payload)
            self.assertIn("current_password", response.data)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.email, "adv-cust@example.com")

    def test_other_details_change_without_password_and_keep_the_session(self):
        client, _ = self._session()
        response = self._patch(client, full_name="New Name", email=self.customer.email, phone=self.customer.phone)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn("tokens", response.data)
        self.assertNotIn("current_password", response.data)
        self.assertEqual(client.get("/api/auth/me/").status_code, 200)

    def test_email_change_revokes_other_sessions_and_reissues_this_one(self):
        other_device, _ = self._session()
        client, old_tokens = self._session()
        response = self._patch(client, email="moved@example.com", current_password="Password@123")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(other_device.get("/api/auth/me/").status_code, 401)
        self.assertEqual(client.get("/api/auth/me/").status_code, 401)  # this session's old access token too
        fresh = APIClient()
        fresh.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['tokens']['access']}")
        self.assertEqual(fresh.get("/api/auth/me/").data["email"], "moved@example.com")
        refreshed = APIClient().post("/api/auth/token/refresh/", {"refresh": old_tokens["refresh"]}, format="json")
        if refreshed.status_code == 200:
            stale = APIClient()
            stale.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}")
            self.assertEqual(stale.get("/api/auth/me/").status_code, 401)

    def test_phone_change_with_password_keeps_sessions(self):
        client, _ = self._session()
        response = self._patch(client, phone="0790000999", current_password="Password@123")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn("tokens", response.data)
        self.assertEqual(client.get("/api/auth/me/").status_code, 200)

    def test_profile_cannot_set_privileged_fields(self):
        client, _ = self._session()
        response = self._patch(client, full_name="X", role="admin", is_staff=True, is_verified=True, is_active=False)
        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.role, CustomUser.Role.CUSTOMER)
        self.assertFalse(self.customer.is_staff or self.customer.is_verified)
        self.assertTrue(self.customer.is_active)


class PasswordResetTimingTests(HardeningBase):
    """KHS-038: the reset request does not wait for the mail server."""

    def test_response_returns_before_the_email_is_sent(self):
        from unittest import mock

        release = threading.Event()
        sent = []

        def slow_send(*, user, raw_token):
            release.wait(timeout=10)
            sent.append(user.email)

        with self.settings(PASSWORD_RESET_EMAIL_ASYNC=True), mock.patch(
            "accounts.password_reset._send_password_reset_email", side_effect=slow_send
        ):
            known = APIClient().post("/api/auth/forgot-password/", {"email": self.customer.email}, format="json")
            # The request finished while the "mail server" is still busy.
            self.assertEqual(sent, [])
            unknown = APIClient().post("/api/auth/forgot-password/", {"email": "nobody@example.com"}, format="json")
            release.set()
            for thread in threading.enumerate():
                if thread.name == "password-reset-email":
                    thread.join(timeout=10)
        self.assertEqual(sent, [self.customer.email])
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.data, unknown.data)

    @override_settings(PASSWORD_RESET_EMAIL_ASYNC=False)
    def test_inline_mode_still_sends(self):
        APIClient().post("/api/auth/forgot-password/", {"email": self.customer.email}, format="json")
        self.assertEqual(len(mail.outbox), 1)


class NotificationLanguageTests(HardeningBase):
    """KHS-039: customer notifications written by code have Arabic and English titles."""

    ARABIC = __import__("re").compile("[\u0600-\u06FF]")

    def _titles(self, language):
        self._as(self.customer)
        data = self.client.get("/api/notifications/", HTTP_ACCEPT_LANGUAGE=language).data
        rows = data["results"] if isinstance(data, dict) else data
        return {row["template_key"]: row["title"] for row in rows}

    def test_rejection_and_staff_note_titles_follow_the_reader_language(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        self._as(self.admin)
        self.client.post(
            f"/api/admin/orders/{order.pk}/notes/", {"note": "Please call us.", "visibility": "CUSTOMER"}, format="json"
        )
        self.client.post(f"/api/admin/orders/{order.pk}/reject/", {"reason": "Not eligible"}, format="json")

        arabic, english = self._titles("ar"), self._titles("en")
        for key in ("manual_customer_order_update", "manual_order_rejected"):
            self.assertRegex(arabic[key], self.ARABIC, key)
            self.assertNotRegex(english[key], self.ARABIC, key)
        self.assertEqual(english["manual_order_rejected"], "Order rejected")

    def test_completion_recommendation_is_bilingual_and_skips_unpublished_services(self):
        from services.models import ServiceRelation
        from services.order_completion import create_related_service_notifications

        order = self._completed_order()
        hidden = Service.objects.create(
            category=self.cat, name_ar="مخفية", name_en="Hidden", slug="adv-hidden-svc",
            description_ar="d", estimated_duration=1, base_price="1.00", show_on_public_site=False,
        )
        for target in (self.simple, hidden):
            ServiceRelation.objects.create(
                source_service=self.svc, target_service=target,
                relation_type=ServiceRelation.RelationType.RECOMMENDED_AFTER, is_active=True, created_by=self.admin,
            )
        created = create_related_service_notifications(order=order, actor=self.admin)
        self.assertEqual([n.target_service_id for n in created], [self.simple.pk])

        arabic, english = self._titles("ar"), self._titles("en")
        key = "service_relation_recommendation"
        self.assertRegex(arabic[key], self.ARABIC)
        self.assertEqual(english[key], "Related service recommended")

    def test_event_notifications_stay_single_per_recipient_under_repeat_calls(self):
        from notifications.services import send_notification_event

        order = self._order_for(self.customer, self.svc)
        before = Notification.objects.filter(order=order).count()
        for _ in range(3):
            send_notification_event(
                event_key="order_submitted", order=order, actor=self.customer,
                dedupe_key=f"order_submitted:{order.pk}",
            )
        self.assertEqual(Notification.objects.filter(order=order).count(), before)
