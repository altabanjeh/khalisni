from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

from core.models import SoftDeleteModel

class Organization(SoftDeleteModel):
    class OrganizationType(models.TextChoices):
        PLATFORM = "platform", "Platform"
        PARTNER = "partner", "Partner"
        PROVIDER = "provider", "Provider"
        CUSTOMER_COMPANY = "customer_company", "Customer company"

    organization_id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    organization_type = models.CharField(max_length=30, choices=OrganizationType.choices)
    legal_name = models.CharField(max_length=255, blank=True)
    tax_number = models.CharField(max_length=100, blank=True)
    commercial_registration_number = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["organization_type", "is_active"]),
            models.Index(fields=["is_active"]),
        ]
        permissions = [
            ("manage_organizations", "Can manage organizations, branches, branding, and memberships"),
            ("manage_partner_service_config", "Can manage partner service catalog configuration"),
            ("view_cross_tenant_data", "Can view cross-tenant data"),
            ("manage_billing_settings", "Can manage billing settings and commission rules"),
        ]

    def __str__(self):
        return self.name

    @property
    def id(self):
        return self.pk

    def clean(self):
        if self.slug:
            self.slug = slugify(self.slug)
        elif self.name:
            self.slug = slugify(self.name)


class Branch(SoftDeleteModel):
    branch_id = models.BigAutoField(primary_key=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="branches",
    )
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="unique_branch_name_per_organization",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self):
        return f"{self.organization.name} / {self.name}"

    @property
    def id(self):
        return self.pk

    def clean(self):
        if self.organization_id and not self.organization.is_active:
            raise ValidationError({"organization": "Branches can only belong to active organizations."})


class OrganizationMembership(SoftDeleteModel):
    class MembershipRole(models.TextChoices):
        PLATFORM_SUPER_ADMIN = "platform_super_admin", "Platform super admin"
        PLATFORM_SUPPORT = "platform_support", "Platform support"
        PARTNER_OWNER = "partner_owner", "Partner owner"
        PARTNER_ADMIN = "partner_admin", "Partner admin"
        BRANCH_MANAGER = "branch_manager", "Branch manager"
        PARTNER_EMPLOYEE = "partner_employee", "Partner employee"
        PROVIDER_ADMIN = "provider_admin", "Provider admin"
        PROVIDER_EMPLOYEE = "provider_employee", "Provider employee"
        FINANCE = "finance", "Finance"
        AUDITOR = "auditor", "Auditor"
        CUSTOMER = "customer", "Customer"

    membership_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="memberships",
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=40, choices=MembershipRole.choices)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["organization__name", "role", "user__full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization", "branch", "role"],
                name="unique_membership_per_user_org_branch_role",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "role", "is_active"]),
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["branch", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} -> {self.organization.name} ({self.role})"

    @property
    def id(self):
        return self.pk

    def clean(self):
        errors = {}
        if self.branch_id:
            if self.branch.organization_id != self.organization_id:
                errors["branch"] = "Membership branch must belong to the same organization."
            if self.role in {
                self.MembershipRole.PLATFORM_SUPER_ADMIN,
                self.MembershipRole.PLATFORM_SUPPORT,
                self.MembershipRole.PROVIDER_ADMIN,
                self.MembershipRole.PROVIDER_EMPLOYEE,
            }:
                errors["branch"] = "This membership role cannot be restricted to a branch."

        if self.organization_id:
            org_type = self.organization.organization_type
            role = self.role
            platform_roles = {
                self.MembershipRole.PLATFORM_SUPER_ADMIN,
                self.MembershipRole.PLATFORM_SUPPORT,
            }
            partner_roles = {
                self.MembershipRole.PARTNER_OWNER,
                self.MembershipRole.PARTNER_ADMIN,
                self.MembershipRole.BRANCH_MANAGER,
                self.MembershipRole.PARTNER_EMPLOYEE,
                self.MembershipRole.FINANCE,
                self.MembershipRole.AUDITOR,
                self.MembershipRole.CUSTOMER,
            }
            provider_roles = {
                self.MembershipRole.PROVIDER_ADMIN,
                self.MembershipRole.PROVIDER_EMPLOYEE,
            }
            if org_type == Organization.OrganizationType.PLATFORM and role not in platform_roles:
                errors["role"] = "Only platform roles are allowed on platform organizations."
            elif org_type == Organization.OrganizationType.PARTNER and role not in partner_roles:
                errors["role"] = "Only partner roles are allowed on partner organizations."
            elif org_type == Organization.OrganizationType.PROVIDER and role not in provider_roles:
                errors["role"] = "Only provider roles are allowed on provider organizations."
            elif org_type == Organization.OrganizationType.CUSTOMER_COMPANY and role not in {
                self.MembershipRole.CUSTOMER,
                self.MembershipRole.FINANCE,
                self.MembershipRole.AUDITOR,
            }:
                errors["role"] = "Only customer-company roles are allowed on customer-company organizations."

        if errors:
            raise ValidationError(errors)


class OrganizationBranding(SoftDeleteModel):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="branding",
    )
    logo = models.ImageField(upload_to="organizations/branding/", blank=True, null=True)
    primary_color = models.CharField(max_length=20, blank=True)
    secondary_color = models.CharField(max_length=20, blank=True)
    public_site_title = models.CharField(max_length=255, blank=True)
    public_site_description = models.TextField(blank=True)
    show_public_page = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization__name"]

    def __str__(self):
        return f"Branding: {self.organization.name}"

    @property
    def id(self):
        return self.pk


class PartnerServiceConfig(SoftDeleteModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="partner_service_configs",
        limit_choices_to={"organization_type": Organization.OrganizationType.PARTNER},
    )
    service = models.ForeignKey(
        "services.Service",
        on_delete=models.CASCADE,
        related_name="partner_configs",
    )
    is_enabled = models.BooleanField(default=True)
    custom_name = models.CharField(max_length=255, blank=True)
    custom_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    visible_to_customers = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization__name", "service__name_ar"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "service"],
                name="unique_partner_service_config_per_org_service",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "is_enabled", "visible_to_customers"]),
            models.Index(fields=["service", "is_enabled"]),
        ]

    def __str__(self):
        return f"{self.organization.name} / {self.service.name_ar}"

    @property
    def id(self):
        return self.pk

    def clean(self):
        errors = {}
        if self.organization_id and self.organization.organization_type != Organization.OrganizationType.PARTNER:
            errors["organization"] = "Partner service configuration can only be created for partner organizations."
        if self.service_id and not self.service.is_active:
            errors["service"] = "Only active services can be configured for partners."
        if self.custom_price is not None and self.custom_price < 0:
            errors["custom_price"] = "Custom price cannot be negative."
        if errors:
            raise ValidationError(errors)
