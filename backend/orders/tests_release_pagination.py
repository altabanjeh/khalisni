"""Release hardening: latent pagination.

Each list below pages on the server (PAGE_SIZE 20). With more than 20 rows,
every row must be reachable through ``?page=`` exactly once, filters must be
applied on the server so their counts are right across pages, and the
caller's scope (own orders, assigned orders) must still hold.
"""

import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from documents.models import Document
from documents.services import create_order_document
from notifications.models import Notification
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
PASSWORD = "Password@123"


class ReleasePaginationBase(APITestCase):
    phone_counter = 0

    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        media_override = override_settings(MEDIA_ROOT=self.media)
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="rp-category")
        self.service = Service.objects.create(
            category=self.category, name_ar="خدمة", name_en="Service", slug="rp-service", description_ar="وصف",
        )
        self.admin = self.make_user("rp-admin", CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        self.employee = self.make_user("rp-employee", CustomUser.Role.EMPLOYEE)
        self.customer = self.make_user("rp-customer", CustomUser.Role.CUSTOMER)
        self.client = APIClient()

    def make_user(self, name, role, **extra):
        ReleasePaginationBase.phone_counter += 1
        return CustomUser.objects.create_user(
            email=f"{name}@example.test",
            password=PASSWORD,
            full_name=extra.pop("full_name", name),
            # Unique, valid Jordanian mobile numbers (stored as +962...).
            phone=f"0795{ReleasePaginationBase.phone_counter:06d}",
            role=role,
            **extra,
        )

    def make_order(self, customer, **extra):
        return Order.objects.create(customer=customer, service=self.service, city=extra.pop("city", "Amman"), **extra)

    def collect(self, user, url):
        """Follow ``next`` from page one; return (ids, pages, first page payload)."""
        self.client.force_authenticate(user)
        ids, pages, first = [], 0, None
        while url:
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            first = first or response.data
            ids.extend(row["id"] for row in response.data["results"])
            url = response.data["next"]
            pages += 1
        return ids, pages, first

    def get_page(self, user, url):
        self.client.force_authenticate(user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def assert_every_row_once(self, ids, expected_ids, pages):
        self.assertEqual(len(ids), len(expected_ids))
        self.assertEqual(set(ids), set(expected_ids))
        self.assertEqual(pages, -(-len(expected_ids) // 20))
        self.assertGreater(pages, 1)


class AdminOrderPaginationTests(ReleasePaginationBase):
    def setUp(self):
        super().setUp()
        # 25 waiting for action, 12 in execution, 8 completed: 45 rows, 3 pages.
        statuses = [Order.Status.NEW] * 15 + [Order.Status.UNDER_REVIEW] * 10
        statuses += [Order.Status.IN_PROGRESS] * 12 + [Order.Status.COMPLETED] * 8
        provider_user = self.make_user("rp-admin-provider", CustomUser.Role.PROVIDER)
        provider = ProviderProfile.objects.create(user=provider_user, provider_type="individual", city="Amman",
                                                  is_approved=True)
        self.orders = [
            self.make_order(self.customer, status=value,
                            assigned_provider=provider if value == Order.Status.IN_PROGRESS else None)
            for value in statuses
        ]
        self.amman_orders = [order.pk for order in self.orders[:3]]
        Order.objects.filter(pk__in=[order.pk for order in self.orders[3:]]).update(city="Irbid")

    def test_every_admin_order_is_reachable_by_page(self):
        ids, pages, first = self.collect(self.admin, "/api/admin/orders/")
        self.assertEqual(first["count"], 45)
        self.assert_every_row_once(ids, [order.pk for order in self.orders], pages)
        page_two = self.get_page(self.admin, "/api/admin/orders/?page=2")
        self.assertEqual(len(page_two["results"]), 20)
        self.assertEqual([row["id"] for row in page_two["results"]], ids[20:40])

    def test_status_group_filter_is_applied_on_the_server(self):
        ids, pages, first = self.collect(self.admin, "/api/admin/orders/?status_group=action")
        self.assertEqual(first["count"], 25)
        self.assert_every_row_once(ids, [order.pk for order in self.orders[:25]], pages)
        completed = self.get_page(self.admin, "/api/admin/orders/?status_group=completed")
        self.assertEqual(completed["count"], 8)
        self.assertTrue(all(row["status"] == Order.Status.COMPLETED for row in completed["results"]))

    def test_unknown_status_group_is_rejected(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get("/api/admin/orders/?status_group=bogus").status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_counts_cover_every_row_not_one_page(self):
        data = self.get_page(self.admin, "/api/admin/orders/?include_status_counts=true")
        self.assertEqual(data["status_counts"], {"all": 45, "action": 25, "execution": 12, "completed": 8})
        self.assertEqual(len(data["results"]), 20)
        # The counts ignore the selected chip but follow the search.
        filtered = self.get_page(self.admin, "/api/admin/orders/?include_status_counts=true&status_group=completed&search=Amman")
        self.assertEqual(filtered["status_counts"], {"all": 3, "action": 3, "execution": 0, "completed": 0})
        self.assertEqual(filtered["count"], 0)

    def test_status_counts_are_opt_in(self):
        self.assertNotIn("status_counts", self.get_page(self.admin, "/api/admin/orders/"))


class AdminUserPaginationTests(ReleasePaginationBase):
    def setUp(self):
        super().setUp()
        # Same names on purpose: the pk tiebreak keeps every row on one page only.
        self.users = [self.make_user(f"rp-staff-{index:02d}", CustomUser.Role.EMPLOYEE, full_name="Same Name")
                      for index in range(23)]
        self.deleted = self.users[:2]
        for user in self.deleted:
            user.soft_delete(user=self.admin)

    def test_every_user_is_reachable_by_page(self):
        expected = list(CustomUser.objects.filter(is_deleted=False).values_list("pk", flat=True))
        self.assertGreater(len(expected), 20)
        ids, pages, first = self.collect(self.admin, "/api/admin/users/")
        self.assertEqual(first["count"], len(expected))
        self.assert_every_row_once(ids, expected, pages)

    def test_deleted_only_and_search_are_server_filters(self):
        deleted = self.get_page(self.admin, "/api/admin/users/?include_deleted=true&is_deleted=true")
        self.assertEqual({row["id"] for row in deleted["results"]}, {user.pk for user in self.deleted})
        self.assertEqual(deleted["count"], 2)
        found = self.get_page(self.admin, "/api/admin/users/?search=rp-staff-22")
        self.assertEqual([row["id"] for row in found["results"]], [self.users[22].pk])


class AdminProviderPaginationTests(ReleasePaginationBase):
    def setUp(self):
        super().setUp()
        self.providers = []
        for index in range(24):
            user = self.make_user(f"rp-provider-{index:02d}", CustomUser.Role.PROVIDER, full_name="Same Provider")
            self.providers.append(ProviderProfile.objects.create(user=user, provider_type="individual", city="Amman"))
        self.providers[0].soft_delete(user=self.admin)

    def test_every_provider_is_reachable_by_page(self):
        expected = [provider.pk for provider in self.providers[1:]]
        ids, pages, first = self.collect(self.admin, "/api/admin/providers/")
        self.assertEqual(first["count"], 23)
        self.assert_every_row_once(ids, expected, pages)

    def test_deleted_only_is_a_server_filter(self):
        data = self.get_page(self.admin, "/api/admin/providers/?include_deleted=true&is_deleted=true")
        self.assertEqual([row["id"] for row in data["results"]], [self.providers[0].pk])
        everything = self.get_page(self.admin, "/api/admin/providers/?include_deleted=true")
        self.assertEqual(everything["count"], 24)


class AdminNotificationPaginationTests(ReleasePaginationBase):
    def test_every_notification_is_reachable_by_page(self):
        rows = [
            Notification.objects.create(recipient=self.customer, title=f"Title {index}", message="Body",
                                        notification_type="order", context_data={})
            for index in range(27)
        ]
        ids, pages, first = self.collect(self.admin, "/api/admin/notifications/")
        self.assertEqual(first["count"], 27)
        self.assert_every_row_once(ids, [row.pk for row in rows], pages)


class StaffDocumentPaginationTests(ReleasePaginationBase):
    def test_every_queued_document_is_reachable_by_page(self):
        order = self.make_order(self.customer)
        documents = [
            create_order_document(order=order, uploaded_by=self.customer, document_type=f"doc-{index}",
                                  file_obj=SimpleUploadedFile(f"d{index}.pdf", PDF, content_type="application/pdf"))
            for index in range(22)
        ]
        # A decided document leaves the queue.
        Document.objects.filter(pk=documents[0].pk).update(status=Document.DocumentStatus.APPROVED)
        ids, pages, first = self.collect(self.employee, "/api/staff/documents/")
        self.assertEqual(first["count"], 21)
        self.assert_every_row_once(ids, [document.pk for document in documents[1:]], pages)


class CustomerOrderPaginationTests(ReleasePaginationBase):
    def setUp(self):
        super().setUp()
        self.own = [self.make_order(self.customer) for _ in range(21)]
        self.own += [self.make_order(self.customer, status=Order.Status.COMPLETED) for _ in range(3)]
        self.own += [self.make_order(self.customer, status=Order.Status.WAITING_CUSTOMER) for _ in range(2)]
        other = self.make_user("rp-other-customer", CustomUser.Role.CUSTOMER)
        self.foreign = [self.make_order(other) for _ in range(5)]

    def test_customer_reaches_every_own_order_and_nothing_else(self):
        ids, pages, first = self.collect(self.customer, "/api/customer/orders/")
        self.assertEqual(first["count"], 26)
        self.assert_every_row_once(ids, [order.pk for order in self.own], pages)
        self.assertFalse(set(ids) & {order.pk for order in self.foreign})

    def test_customer_chips_and_counts_come_from_the_server(self):
        data = self.get_page(self.customer, "/api/customer/orders/?include_status_counts=true")
        self.assertEqual(data["status_counts"], {"all": 26, "action": 2, "active": 21, "done": 3})
        done = self.get_page(self.customer, "/api/customer/orders/?status_group=done")
        self.assertEqual({row["id"] for row in done["results"]}, {order.pk for order in self.own[21:24]})
        number = self.own[5].order_number
        found = self.get_page(self.customer, f"/api/customer/orders/?search={number}")
        self.assertEqual([row["id"] for row in found["results"]], [self.own[5].pk])


class ProviderOrderPaginationTests(ReleasePaginationBase):
    def setUp(self):
        super().setUp()
        provider_user = self.make_user("rp-provider", CustomUser.Role.PROVIDER)
        self.provider_user = provider_user
        provider = ProviderProfile.objects.create(user=provider_user, provider_type="individual", city="Amman",
                                                  is_approved=True)
        other_user = self.make_user("rp-provider-other", CustomUser.Role.PROVIDER)
        other = ProviderProfile.objects.create(user=other_user, provider_type="individual", city="Amman",
                                               is_approved=True)
        self.assigned = [self.make_order(self.customer, status=Order.Status.ASSIGNED, assigned_provider=provider)
                         for _ in range(20)]
        self.assigned += [self.make_order(self.customer, status=Order.Status.READY_FOR_DELIVERY,
                                          assigned_provider=provider) for _ in range(3)]
        self.foreign = [self.make_order(self.customer, status=Order.Status.ASSIGNED, assigned_provider=other)
                        for _ in range(4)]
        self.unassigned = [self.make_order(self.customer) for _ in range(2)]

    def test_provider_reaches_every_assigned_order_and_nothing_else(self):
        ids, pages, first = self.collect(self.provider_user, "/api/provider/orders/")
        self.assertEqual(first["count"], 23)
        self.assert_every_row_once(ids, [order.pk for order in self.assigned], pages)
        self.assertFalse(set(ids) & {order.pk for order in self.foreign + self.unassigned})

    def test_provider_chips_and_counts_come_from_the_server(self):
        data = self.get_page(self.provider_user, "/api/provider/orders/?include_status_counts=true&status_group=ready")
        self.assertEqual(data["status_counts"], {"all": 23, "active": 20, "ready": 3, "done": 0})
        self.assertEqual({row["id"] for row in data["results"]}, {order.pk for order in self.assigned[20:]})
