from django.contrib.auth.models import Permission
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from orders.models import Order
from services.models import Service, ServiceCategory, ServiceProviderAssignment, ServiceRelation, ServiceRequiredDocument


class ServiceManagementPermissionTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="service-mgmt-category")
        self.employee = CustomUser.objects.create_user(
            email="service-employee@example.com",
            password="Password@123",
            full_name="Service Employee",
            phone="0794000001",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.admin = CustomUser.objects.create_user(
            email="service-admin@example.com",
            password="Password@123",
            full_name="Service Admin",
            phone="0794000002",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )

    def test_employee_cannot_access_service_management(self):
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/admin/services/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_service_management(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/services/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_edit_safe_service_fields_and_change_is_audited(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة",
            name_en="Service",
            slug="service-edit-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/admin/services/{service.id}/",
            {
                "category_id": self.category.id,
                "name_ar": "خدمة محدثة",
                "name_en": "Updated Service",
                "description_ar": "تفاصيل محدثة",
                "description_en": "Updated description",
                "base_price": "12.00",
                "government_fee": "4.00",
                "service_fee": "5.00",
                "estimated_duration": 3,
                "estimated_duration_unit": "days",
                "price_type": "fixed",
                "provider_required": True,
                "requires_manual_review": True,
                "requires_appointment": False,
                "is_online": True,
                "is_featured": False,
                "is_active": True,
                "display_order": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service.refresh_from_db()
        self.assertEqual(service.name_ar, "خدمة محدثة")
        self.assertEqual(str(service.base_price), "12.00")
        self.assertTrue(
            AuditLog.objects.filter(
                action="update_service",
                entity_type="Service",
                entity_id=str(service.id),
            ).exists()
        )

    def test_admin_can_manage_required_documents_safely(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مستندات",
            name_en="Doc Service",
            slug="doc-service-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        self.client.force_authenticate(self.admin)

        create_response = self.client.post(
            "/api/admin/service-documents/",
            {
                "service_id": service.id,
                "document_type": "national_id",
                "name_ar": "هوية",
                "name_en": "National ID",
                "is_required": True,
                "allowed_extensions": [".pdf", ".jpg"],
                "max_file_size": 5242880,
                "requires_verification": True,
                "client_can_replace_file": False,
                "provider_can_view_file": True,
                "display_order": 1,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        requirement_id = create_response.data["id"]

        update_response = self.client.patch(
            f"/api/admin/service-documents/{requirement_id}/",
            {"provider_can_view_file": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        requirement = ServiceRequiredDocument.objects.get(pk=requirement_id)
        self.assertFalse(requirement.provider_can_view_file)
        self.assertTrue(
            AuditLog.objects.filter(
                entity_type="ServiceRequiredDocument",
                entity_id=str(requirement_id),
            ).exists()
        )

    def test_admin_service_delete_soft_disables_used_service(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مستخدمة",
            name_en="Used Service",
            slug="used-service-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        customer = CustomUser.objects.create_user(
            email="service-customer@example.com",
            password="Password@123",
            full_name="Customer",
            phone="0794999999",
            role=CustomUser.Role.CUSTOMER,
        )
        Order.objects.create(customer=customer, service=service, city="Amman")
        self.client.force_authenticate(self.admin)

        response = self.client.delete(f"/api/admin/services/{service.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        service.refresh_from_db()
        self.assertFalse(service.is_active)

    def test_admin_can_manage_service_provider_assignment(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مزود",
            name_en="Provider Service",
            slug="provider-service-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        provider_user = CustomUser.objects.create_user(
            email="assign-provider@example.com",
            password="Password@123",
            full_name="Assign Provider",
            phone="0794777777",
            role=CustomUser.Role.PROVIDER,
        )
        from providers.models import ProviderProfile

        provider = ProviderProfile.objects.create(user=provider_user, provider_type="Agent", city="Amman", is_approved=True)
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/service-provider-assignments/",
            {"service_id": service.id, "provider_id": provider.id, "is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ServiceProviderAssignment.objects.filter(service=service, provider=provider).exists())


class ServiceRelationManagementTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name_ar="خدمات التراخيص",
            name_en="Licensing",
            slug="licensing-category",
        )
        self.source_service = Service.objects.create(
            category=self.category,
            name_ar="Municipality Approval",
            name_en="Municipality Approval",
            slug="municipality-approval",
            description_ar="Approval details",
            estimated_duration=2,
            base_price=10,
            government_fee=5,
            service_fee=4,
        )
        self.target_service = Service.objects.create(
            category=self.category,
            name_ar="Restaurant License",
            name_en="Restaurant License",
            slug="restaurant-license",
            description_ar="License details",
            estimated_duration=3,
            base_price=10,
            government_fee=5,
            service_fee=6,
        )
        self.third_service = Service.objects.create(
            category=self.category,
            name_ar="Food Safety Certificate",
            name_en="Food Safety Certificate",
            slug="food-safety-certificate",
            description_ar="Certificate details",
            estimated_duration=2,
            base_price=8,
            government_fee=4,
            service_fee=3,
        )
        self.admin = CustomUser.objects.create_user(
            email="relations-admin@example.com",
            password="Password@123",
            full_name="Relations Admin",
            phone="0794010001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.support = CustomUser.objects.create_user(
            email="relations-support@example.com",
            password="Password@123",
            full_name="Relations Support",
            phone="0794010002",
            role=CustomUser.Role.SUPPORT,
        )
        self.employee = CustomUser.objects.create_user(
            email="relations-employee@example.com",
            password="Password@123",
            full_name="Relations Employee",
            phone="0794010003",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.client_user = CustomUser.objects.create_user(
            email="relations-client@example.com",
            password="Password@123",
            full_name="Relations Client",
            phone="0794010004",
            role=CustomUser.Role.CUSTOMER,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="relations-provider@example.com",
            password="Password@123",
            full_name="Relations Provider",
            phone="0794010005",
            role=CustomUser.Role.PROVIDER,
        )

    def _payload(self, **overrides):
        payload = {
            "source_service_id": self.source_service.id,
            "target_service_id": self.target_service.id,
            "relation_type": ServiceRelation.RelationType.PREREQUISITE,
            "is_required": True,
            "message_to_customer": "Complete municipality approval first.",
            "is_active": True,
        }
        payload.update(overrides)
        return payload

    def test_admin_can_create_valid_relation(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post("/api/admin/service-relations/", self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        relation = ServiceRelation.objects.get(pk=response.data["id"])
        self.assertEqual(relation.created_by_id, self.admin.id)
        self.assertTrue(
            AuditLog.objects.filter(
                action="create_service_relation",
                entity_type="ServiceRelation",
                entity_id=str(relation.id),
            ).exists()
        )

    def test_relation_rejects_self_reference(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/service-relations/",
            self._payload(target_service_id=self.source_service.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_service", response.data)

    def test_relation_rejects_duplicate_triplet(self):
        ServiceRelation.objects.create(
            source_service=self.source_service,
            target_service=self.target_service,
            relation_type=ServiceRelation.RelationType.PREREQUISITE,
            is_required=True,
            created_by=self.admin,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post("/api/admin/service-relations/", self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_relation_rejects_circular_required_prerequisite(self):
        ServiceRelation.objects.create(
            source_service=self.source_service,
            target_service=self.target_service,
            relation_type=ServiceRelation.RelationType.PREREQUISITE,
            is_required=True,
            created_by=self.admin,
        )
        ServiceRelation.objects.create(
            source_service=self.target_service,
            target_service=self.third_service,
            relation_type=ServiceRelation.RelationType.PREREQUISITE,
            is_required=True,
            created_by=self.admin,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/service-relations/",
            self._payload(source_service_id=self.third_service.id, target_service_id=self.source_service.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_service", response.data)

    def test_permission_restrictions_by_role(self):
        for user in (self.client_user, self.provider_user, self.employee):
            self.client.force_authenticate(user)
            response = self.client.get("/api/admin/service-relations/")
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.support)
        support_create = self.client.post(
            "/api/admin/service-relations/",
            self._payload(relation_type=ServiceRelation.RelationType.RECOMMENDED_AFTER, is_required=False),
            format="json",
        )
        self.assertEqual(support_create.status_code, status.HTTP_201_CREATED)
        relation_id = support_create.data["id"]

        support_update = self.client.patch(
            f"/api/admin/service-relations/{relation_id}/",
            {"message_to_customer": "Suggest this after completion."},
            format="json",
        )
        self.assertEqual(support_update.status_code, status.HTTP_200_OK)

        support_delete = self.client.delete(f"/api/admin/service-relations/{relation_id}/")
        self.assertEqual(support_delete.status_code, status.HTTP_403_FORBIDDEN)

        deactivate_permission = Permission.objects.get(
            content_type__app_label="services",
            codename="manage_service_prices",
        )
        self.support.user_permissions.add(deactivate_permission)
        self.support.refresh_from_db()
        for cache_name in ("_perm_cache", "_user_perm_cache", "_group_perm_cache"):
            if hasattr(self.support, cache_name):
                delattr(self.support, cache_name)
        self.assertTrue(self.support.has_perm("services.manage_service_prices"))
        self.client.force_authenticate(self.support)

        allowed_delete = self.client.delete(f"/api/admin/service-relations/{relation_id}/")
        self.assertEqual(allowed_delete.status_code, status.HTTP_204_NO_CONTENT)

        self.client.force_authenticate(self.admin)
        hard_delete_relation = ServiceRelation.objects.create(
            source_service=self.source_service,
            target_service=self.third_service,
            relation_type=ServiceRelation.RelationType.ALTERNATIVE,
            is_required=False,
            created_by=self.admin,
        )
        hard_delete_response = self.client.delete(
            f"/api/admin/service-relations/{hard_delete_relation.id}/hard-delete/"
        )
        self.assertEqual(hard_delete_response.status_code, status.HTTP_204_NO_CONTENT)


class ServiceCategoryFeatureTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="category-admin@example.com",
            password="Password@123",
            full_name="Category Admin",
            phone="0794020001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.support = CustomUser.objects.create_user(
            email="category-support@example.com",
            password="Password@123",
            full_name="Category Support",
            phone="0794020002",
            role=CustomUser.Role.SUPPORT,
        )
        self.client_user = CustomUser.objects.create_user(
            email="category-client@example.com",
            password="Password@123",
            full_name="Category Client",
            phone="0794020003",
            role=CustomUser.Role.CUSTOMER,
        )

    def test_admin_can_create_category_and_child_category(self):
        self.client.force_authenticate(self.admin)

        root_response = self.client.post(
            "/api/admin/categories/",
            {
                "name_ar": "Government Services",
                "name_en": "Government Services",
                "slug": "government-services",
                "sort_order": 1,
                "show_on_public_site": True,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(root_response.status_code, status.HTTP_201_CREATED)
        child_response = self.client.post(
            "/api/admin/categories/",
            {
                "name_ar": "Shipping Services",
                "name_en": "Shipping Services",
                "slug": "shipping-services",
                "parent_id": root_response.data["id"],
                "sort_order": 2,
                "show_on_public_site": True,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(child_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(child_response.data["parent_id"], root_response.data["id"])

    def test_category_parent_cannot_be_circular(self):
        root = ServiceCategory.objects.create(name_ar="Parent", name_en="Parent", slug="parent")
        child = ServiceCategory.objects.create(name_ar="Child", name_en="Child", slug="child", parent=root)
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/admin/categories/{root.id}/",
            {"parent_id": child.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_prevent_active_service_under_inactive_category(self):
        inactive_category = ServiceCategory.objects.create(
            name_ar="Internal",
            name_en="Internal",
            slug="internal-category",
            is_active=False,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/services/",
            {
                "category_id": inactive_category.id,
                "name_ar": "Internal Service",
                "name_en": "Internal Service",
                "slug": "internal-service",
                "description_ar": "Details",
                "description_en": "Details",
                "required_information_schema": [],
                "terms_ar": "",
                "terms_en": "",
                "base_price": "1.00",
                "government_fee": "1.00",
                "service_fee": "1.00",
                "estimated_duration": 1,
                "estimated_duration_unit": "days",
                "price_type": "fixed",
                "is_online": True,
                "provider_required": True,
                "requires_manual_review": True,
                "requires_appointment": False,
                "is_featured": False,
                "is_active": True,
                "display_order": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)

    def test_public_api_hides_inactive_or_internal_categories_and_services(self):
        visible_category = ServiceCategory.objects.create(
            name_ar="Visible",
            name_en="Visible",
            slug="visible-category",
            is_active=True,
            show_on_public_site=True,
        )
        hidden_category = ServiceCategory.objects.create(
            name_ar="Hidden",
            name_en="Hidden",
            slug="hidden-category",
            is_active=True,
            show_on_public_site=False,
        )
        inactive_category = ServiceCategory.objects.create(
            name_ar="Inactive",
            name_en="Inactive",
            slug="inactive-category",
            is_active=False,
            show_on_public_site=True,
        )
        Service.objects.create(
            category=visible_category,
            name_ar="Visible Service",
            name_en="Visible Service",
            slug="visible-service",
            description_ar="Details",
            estimated_duration=1,
            base_price=1,
            government_fee=1,
            service_fee=1,
        )
        Service.objects.create(
            category=hidden_category,
            name_ar="Hidden Service",
            name_en="Hidden Service",
            slug="hidden-service",
            description_ar="Details",
            estimated_duration=1,
            base_price=1,
            government_fee=1,
            service_fee=1,
        )
        Service.objects.create(
            category=inactive_category,
            name_ar="Inactive Service",
            name_en="Inactive Service",
            slug="inactive-service",
            description_ar="Details",
            estimated_duration=1,
            base_price=1,
            government_fee=1,
            service_fee=1,
            is_active=False,
        )

        categories_response = self.client.get("/api/services/categories/")
        services_response = self.client.get("/api/services/")

        self.assertEqual(categories_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["slug"] for item in categories_response.data],
            ["visible-category"],
        )
        self.assertEqual(
            [item["slug"] for item in services_response.data],
            ["visible-service"],
        )

    def test_services_list_filters_by_category_for_client_order_flow(self):
        government = ServiceCategory.objects.create(name_ar="Government", name_en="Government", slug="government")
        shipping = ServiceCategory.objects.create(name_ar="Shipping", name_en="Shipping", slug="shipping")
        first_service = Service.objects.create(
            category=government,
            name_ar="License",
            name_en="License",
            slug="license-service",
            description_ar="Details",
            estimated_duration=1,
            base_price=1,
            government_fee=1,
            service_fee=1,
        )
        Service.objects.create(
            category=shipping,
            name_ar="Courier",
            name_en="Courier",
            slug="courier-service",
            description_ar="Details",
            estimated_duration=1,
            base_price=1,
            government_fee=1,
            service_fee=1,
        )

        response = self.client.get("/api/services/?category=government")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], first_service.id)

    def test_support_has_read_only_category_access_without_service_permission(self):
        self.client.force_authenticate(self.support)

        list_response = self.client.get("/api/admin/categories/")
        create_response = self.client.post(
            "/api/admin/categories/",
            {"name_ar": "Legal", "name_en": "Legal", "slug": "legal"},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
