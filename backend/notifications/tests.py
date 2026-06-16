from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from notifications.models import Notification, NotificationTemplate
from notifications.services import send_notification_event
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory


class NotificationCenterTests(APITestCase):
    @staticmethod
    def _rows(response):
        return response.data if isinstance(response.data, list) else response.data["results"]

    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="notif-category")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="notif-service",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="notif-customer@example.com",
            password="Password@123",
            full_name="Notif Customer",
            phone="0795000001",
            role=CustomUser.Role.CUSTOMER,
        )
        self.other_customer = CustomUser.objects.create_user(
            email="notif-customer2@example.com",
            password="Password@123",
            full_name="Notif Customer 2",
            phone="0795000002",
            role=CustomUser.Role.CUSTOMER,
        )
        self.admin = CustomUser.objects.create_user(
            email="notif-admin-monitor@example.com",
            password="Password@123",
            full_name="Notif Admin Monitor",
            phone="0795000007",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="notif-provider@example.com",
            password="Password@123",
            full_name="Notif Provider",
            phone="0795000008",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            provider_type="Agent",
            city="Amman",
            is_approved=True,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")
        self.other_order = Order.objects.create(customer=self.other_customer, service=service, city="Irbid")
        Notification.objects.create(recipient=self.customer, order=self.order, title="Own", message="Own notification", status=Notification.Status.SENT)
        Notification.objects.create(recipient=self.other_customer, order=self.other_order, title="Other", message="Other notification", status=Notification.Status.SENT)

    def test_customer_sees_only_own_notifications(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = self._rows(response)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["title"], "Own")

    def test_admin_can_crud_notifications_and_templates(self):
        admin = CustomUser.objects.create_user(
            email="notif-admin@example.com",
            password="Password@123",
            full_name="Notif Admin",
            phone="0795000003",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.client.force_authenticate(admin)

        template_response = self.client.post(
            "/api/admin/notification-templates/",
            {
                "key": "custom_notice",
                "channel": "system",
                "title_ar": "تنبيه",
                "message_ar": "رسالة تجريبية",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(template_response.status_code, status.HTTP_201_CREATED)
        template_id = template_response.data["template_id"]

        create_response = self.client.post(
            "/api/admin/notifications/",
            {
                "recipient": self.customer.id,
                "actor": admin.id,
                "order": self.order.id,
                "notification_type": Notification.NotificationType.ORDER,
                "channel": Notification.Channel.SYSTEM,
                "status": Notification.Status.PENDING,
                "priority": Notification.Priority.NORMAL,
                "title": "Admin Created",
                "message": "Created by admin",
                "template": template_id,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        notification_id = create_response.data["notification_id"]

        update_response = self.client.patch(
            f"/api/admin/notifications/{notification_id}/",
            {"message": "Updated by admin"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        delete_response = self.client.delete(f"/api/admin/notifications/{notification_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_employee_can_send_manual_template_notification_for_reviewable_order(self):
        employee = CustomUser.objects.create_user(
            email="notif-employee@example.com",
            password="Password@123",
            full_name="Notif Employee",
            phone="0795000004",
            role=CustomUser.Role.EMPLOYEE,
        )
        template = NotificationTemplate.objects.create(
            key="missing_documents_followup",
            channel=NotificationTemplate.Channel.SYSTEM,
            title_ar="متابعة المستندات",
            message_ar="يرجى مراجعة آخر تحديث على طلبك.",
            is_active=True,
        )
        self.order.assigned_employee = employee
        self.order.status = Order.Status.UNDER_REVIEW
        self.order.save(update_fields=["assigned_employee", "status", "updated_at"])

        self.client.force_authenticate(employee)
        template_response = self.client.get("/api/employee/notification-templates/")
        self.assertEqual(template_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(template_response.data), 1)

        response = self.client.post(
            f"/api/orders/{self.order.id}/manual-notification/",
            {"template_id": template.template_id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        notification = Notification.objects.get(order=self.order, template=template)
        self.assertEqual(notification.recipient_id, self.customer.id)
        self.assertEqual(notification.actor_id, employee.id)
        self.assertEqual(notification.template_key, template.key)
        self.assertEqual(notification.title, template.title_ar)

    def test_notification_template_rejects_unsafe_html(self):
        admin = CustomUser.objects.create_user(
            email="notif-safe-admin@example.com",
            password="Password@123",
            full_name="Notif Safe Admin",
            phone="0795000005",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(
            "/api/admin/notification-templates/",
            {
                "key": "unsafe_notice",
                "channel": "system",
                "title_ar": "تنبيه",
                "message_ar": "<script>alert(1)</script>",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_preview_safe_notification_template(self):
        admin = CustomUser.objects.create_user(
            email="notif-preview-admin@example.com",
            password="Password@123",
            full_name="Notif Preview Admin",
            phone="0795000006",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(
            "/api/admin/notification-templates/preview/",
            {
                "title_ar": "تحديث {{order_number}}",
                "message_ar": "أهلا {{customer_name}} - {{service_name}} أصبح {{status_label}}",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("KH-2026-000123", response.data["title_ar"])
        self.assertIn("Sample Customer", response.data["message_ar"])

    def test_notification_event_dedupes_same_workflow_action(self):
        send_notification_event(
            event_key="order_under_review",
            order=self.order,
            actor=self.customer,
            dedupe_key=f"order_under_review:{self.order.pk}:NEW:UNDER_REVIEW",
        )
        send_notification_event(
            event_key="order_under_review",
            order=self.order,
            actor=self.customer,
            dedupe_key=f"order_under_review:{self.order.pk}:NEW:UNDER_REVIEW",
        )

        self.assertEqual(
            Notification.objects.filter(order=self.order, template_key="order_under_review").count(),
            1,
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="notification_event_skipped",
                entity_type="Notification",
            ).exists()
        )

    def test_order_submitted_event_notifies_customer_and_admins(self):
        Notification.objects.all().delete()

        send_notification_event(
            event_key="order_submitted",
            order=self.order,
            actor=self.customer,
            dedupe_key=f"order_submitted:{self.order.pk}",
        )

        recipients = set(Notification.objects.filter(order=self.order, template_key="order_submitted").values_list("recipient_id", flat=True))
        self.assertEqual(recipients, {self.customer.id, self.admin.id})

    def test_order_completed_event_notifies_customer_and_assigned_provider(self):
        Notification.objects.all().delete()
        self.order.assigned_provider = self.provider
        self.order.status = Order.Status.COMPLETED
        self.order.save(update_fields=["assigned_provider", "status", "updated_at", "completed_at"])

        send_notification_event(
            event_key="order_completed",
            order=self.order,
            actor=self.admin,
            dedupe_key=f"order_completed:{self.order.pk}",
        )

        recipients = set(Notification.objects.filter(order=self.order, template_key="order_completed").values_list("recipient_id", flat=True))
        self.assertEqual(recipients, {self.customer.id, self.provider_user.id})
