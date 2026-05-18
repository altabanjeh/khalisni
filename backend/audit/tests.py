from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from audit.utils import create_audit_log


class AuditLogPermissionTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="audit-admin@example.com",
            password="Password@123",
            full_name="Audit Admin",
            phone="0798000001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.employee = CustomUser.objects.create_user(
            email="audit-employee@example.com",
            password="Password@123",
            full_name="Audit Employee",
            phone="0798000002",
            role=CustomUser.Role.EMPLOYEE,
        )
        create_audit_log(
            user=self.admin,
            action="system_event",
            entity_type="Service",
            entity_id="1",
        )

    def test_admin_can_filter_audit_logs(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/audit-logs/?module=Service")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(record["entity_type"], "Service")
        self.assertEqual(record["entity_id"], "1")
        self.assertEqual(record["user_role"], CustomUser.Role.ADMIN)
        self.assertEqual(record["source"], AuditLog.Source.ADMIN)

    def test_non_admin_cannot_access_audit_logs(self):
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/admin/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_logs_cannot_be_modified_or_deleted_by_normal_admin(self):
        self.client.force_authenticate(self.admin)
        patch_response = self.client.patch("/api/admin/audit-logs/", {"action": "update"}, format="json")
        delete_response = self.client.delete("/api/admin/audit-logs/")
        self.assertIn(patch_response.status_code, {status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND})
        self.assertIn(delete_response.status_code, {status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND})
