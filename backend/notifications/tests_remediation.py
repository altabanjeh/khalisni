"""Regression tests for the notification endpoints added for defect D8."""

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from notifications.models import Notification


class NotificationUnreadEndpointsTests(APITestCase):
    def setUp(self):
        self.customer = CustomUser.objects.create_user(
            email="d8-customer@example.com",
            password="Password@123",
            full_name="D8 Customer",
            phone="0798000123",
            role=CustomUser.Role.CUSTOMER,
        )
        self.other = CustomUser.objects.create_user(
            email="d8-other@example.com",
            password="Password@123",
            full_name="D8 Other",
            phone="0798000124",
            role=CustomUser.Role.CUSTOMER,
        )
        for i in range(3):
            Notification.objects.create(
                recipient=self.customer,
                title=f"Unread {i}",
                message="body",
                is_read=False,
            )
        now = timezone.now()
        Notification.objects.create(
            recipient=self.customer,
            title="Already read",
            message="body",
            is_read=True,
            sent_at=now,
            read_at=now,
        )
        Notification.objects.create(
            recipient=self.other, title="Someone else", message="body", is_read=False
        )

    def test_unread_count_is_scoped_to_the_caller(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["unread"], 3)

    def test_unread_count_requires_authentication(self):
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, 401)

    def test_mark_all_read_clears_only_the_callers_notifications(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated"], 3)

        self.assertEqual(
            Notification.objects.filter(recipient=self.customer, is_read=False).count(), 0
        )
        # The other user's unread notification is untouched.
        self.assertEqual(
            Notification.objects.filter(recipient=self.other, is_read=False).count(), 1
        )

        # Idempotent: a second call clears nothing.
        again = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(again.data["updated"], 0)
