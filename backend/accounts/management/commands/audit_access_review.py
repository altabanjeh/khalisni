from django.core.management.base import BaseCommand, CommandError

from accounts.models import CustomUser
from organizations.models import Organization, OrganizationMembership
from organizations.selectors import (
    PLATFORM_STAFF_ROLES,
    has_tenant_membership_history,
    is_partner_user,
    platform_memberships_for_user,
)


INTERNAL_ROLES = (CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT)

GROUPS = {
    "LOSES_ACCESS": (
        "Employee/support accounts that were once attached to a partner or provider organization, "
        "have no working partner-staff membership now, and hold no platform membership. "
        "Before this release they could read every organization's orders; after it they can read none. "
        "ACTION: if the person is internal platform staff, add a platform_support (or "
        "platform_super_admin) membership on the platform organization before deploying. "
        "If the person left a partner, do nothing: losing access is the fix."
    ),
    "SUPPORT_ROLE_SCOPED": (
        "Accounts with the legacy 'support' role that are working partner staff. They keep their "
        "organization-scoped access but no longer count as platform support. "
        "ACTION: add a platform membership only if the person really is platform staff."
    ),
    "PROVIDER_ROLE_PARTNER_STAFF": (
        "Accounts with the legacy 'provider' role that are also partner staff. They are now scoped "
        "as partner staff of their own organization. ACTION: confirm the role is intended."
    ),
    "UNSCOPED_INTERNAL_STAFF": (
        "Employee/support accounts with no organization membership at all. Unchanged by this release: "
        "they keep platform-wide read access. ACTION: confirm each one is a real internal employee; "
        "deactivate any that is not."
    ),
}


def _mask(email):
    local, _, domain = (email or "").partition("@")
    return f"{local[:2]}***@{domain}" if domain else "***"


class Command(BaseCommand):
    help = (
        "READ-ONLY pre-deployment review: lists accounts whose access changes under the "
        "tenant-membership rule (organizations.selectors.has_tenant_membership_history). "
        "Changes nothing and grants nothing."
    )

    def add_arguments(self, parser):
        parser.add_argument("--counts-only", action="store_true", help="Print only the count per group.")
        parser.add_argument("--mask-emails", action="store_true", help="Mask email addresses in the output.")
        parser.add_argument(
            "--fail-on-findings",
            action="store_true",
            help="Exit with status 1 when any account is in LOSES_ACCESS (for use as a deployment gate).",
        )

    def classify(self):
        groups = {key: [] for key in GROUPS}
        users = CustomUser._base_manager.filter(is_active=True, is_deleted=False, is_superuser=False).exclude(
            role__in=(CustomUser.Role.ADMIN, CustomUser.Role.CUSTOMER)
        )
        for user in users.order_by("pk").iterator():
            has_platform = platform_memberships_for_user(user, PLATFORM_STAFF_ROLES).exists()
            partner_staff = is_partner_user(user)
            history = has_tenant_membership_history(user)
            if user.role in INTERNAL_ROLES:
                if has_platform:
                    continue
                if history and not partner_staff:
                    groups["LOSES_ACCESS"].append(user)
                elif user.role == CustomUser.Role.SUPPORT and partner_staff:
                    groups["SUPPORT_ROLE_SCOPED"].append(user)
                elif not history:
                    groups["UNSCOPED_INTERNAL_STAFF"].append(user)
            elif user.role == CustomUser.Role.PROVIDER and partner_staff and not has_platform:
                groups["PROVIDER_ROLE_PARTNER_STAFF"].append(user)
        return groups

    def _memberships(self, user):
        rows = (
            OrganizationMembership._base_manager.filter(user=user)
            .select_related("organization")
            .order_by("organization__name", "role")
        )
        parts = []
        for row in rows:
            org = row.organization
            if row.is_deleted:
                state = "removed"
            elif not row.is_active:
                state = "inactive"
            elif not org.is_active or org.is_deleted:
                state = "organization closed"
            else:
                state = "active"
            parts.append(f"{org.name} [{org.organization_type}] {row.role} ({state})")
        return "; ".join(parts) or "none"

    def handle(self, *args, **options):
        groups = self.classify()
        platform_exists = Organization.objects.filter(
            organization_type=Organization.OrganizationType.PLATFORM, is_active=True, is_deleted=False
        ).exists()
        self.stdout.write("Pre-deployment access review (read-only; nothing was changed)")
        self.stdout.write(f"Platform organization present: {'yes' if platform_exists else 'NO - create it before granting platform memberships'}")
        for key, explanation in GROUPS.items():
            users = groups[key]
            self.stdout.write("")
            self.stdout.write(f"{key}: {len(users)}")
            if options["counts_only"]:
                continue
            self.stdout.write(f"  {explanation}")
            for user in users:
                email = _mask(user.email) if options["mask_emails"] else user.email
                last_login = user.last_login.date().isoformat() if user.last_login else "never"
                self.stdout.write(
                    f"  - id={user.pk} {email} role={user.role} staff={user.is_staff} "
                    f"last_login={last_login} memberships: {self._memberships(user)}"
                )
        if options["fail_on_findings"] and groups["LOSES_ACCESS"]:
            raise CommandError(f"{len(groups['LOSES_ACCESS'])} account(s) will lose access; review them before deploying.")
