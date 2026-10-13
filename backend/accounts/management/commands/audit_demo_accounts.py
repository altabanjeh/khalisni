import os

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from accounts.management.commands.seed_initial_data import DEMO_ACCOUNT_SPECS
from accounts.models import CustomUser
from organizations.models import OrganizationMembership


# Addresses the repository's seed commands can create. The first four are also
# listed, with their passwords, in docs/demo_seed_accounts.csv, which is public.
SEED_SYSTEM_EMAIL = "seed-system@internal.local"
QA_EMAIL_PREFIX = "client-audit-qa-"
QA_EMAIL_DOMAIN = "@example.test"
DEMO_DOMAIN = "@khalisni.local"


def published_identities():
    """email -> published password (used only to test whether it still works; never printed)."""
    identities = {}
    for spec in DEMO_ACCOUNT_SPECS.values():
        identities[spec["default_email"].lower()] = spec["default_password"]
        override = os.getenv(spec["email_env"], "").strip().lower()
        if override:
            identities.setdefault(override, spec["default_password"])
    return identities


class Command(BaseCommand):
    help = (
        "READ-ONLY check: reports whether the published demo/QA identities exist in this database. "
        "Never prints a password and changes nothing."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fail-on-findings",
            action="store_true",
            help="Exit with status 1 when any published demo or QA account can sign in (deployment gate).",
        )

    def _organizations(self, user):
        names = [
            f"{row.organization.name} ({row.role}{'' if row.is_active and not row.is_deleted else ', inactive'})"
            for row in OrganizationMembership._base_manager.filter(user=user).select_related("organization")
        ]
        profile = getattr(user, "customer_profile", None)
        if profile is not None and profile.organization_id:
            names.append(f"{profile.organization.name} (customer profile)")
        return "; ".join(names) or "none"

    def collect(self):
        published = published_identities()
        users = CustomUser._base_manager.filter(
            Q(email__in=list(published))
            | Q(email__iexact=SEED_SYSTEM_EMAIL)
            | Q(email__iendswith=DEMO_DOMAIN)
            | Q(email__istartswith=QA_EMAIL_PREFIX, email__iendswith=QA_EMAIL_DOMAIN)
        ).order_by("email")
        rows = []
        for user in users:
            email = user.email.lower()
            if email in published:
                kind = "published demo account"
            elif email.startswith(QA_EMAIL_PREFIX):
                kind = "QA seed account"
            elif email == SEED_SYSTEM_EMAIL:
                kind = "seed system actor"
            else:
                kind = "demo domain"
            usable = user.has_usable_password()
            published_password = published.get(email)
            password_is_published = bool(usable and published_password and user.check_password(published_password))
            can_sign_in = bool(user.is_active and not user.is_deleted and usable)
            if kind == "seed system actor" and not can_sign_in:
                action = "none; inactive service identity without a password"
            elif not can_sign_in:
                action = "none (cannot sign in); DELETE when no orders depend on it"
            elif user.is_superuser or user.is_staff or user.role in (CustomUser.Role.ADMIN, CustomUser.Role.SUPPORT, CustomUser.Role.EMPLOYEE):
                action = "DISABLE now, then DELETE; staff-level demo account"
            elif password_is_published:
                action = "DISABLE or ROTATE now; the published password still works"
            else:
                action = "DISABLE, or ROTATE if a real person owns it"
            rows.append(
                {
                    "user": user,
                    "kind": kind,
                    "can_sign_in": can_sign_in,
                    "password_is_published": password_is_published,
                    "action": action,
                }
            )
        missing = sorted(set(published) - {row["user"].email.lower() for row in rows})
        return rows, missing

    def handle(self, *args, **options):
        rows, missing = self.collect()
        self.stdout.write("Demo / QA account check (read-only; nothing was changed; passwords are never shown)")
        for email in missing:
            self.stdout.write(f"- {email}: exists=no")
        for row in rows:
            user = row["user"]
            last_login = user.last_login.date().isoformat() if user.last_login else "never"
            self.stdout.write(
                f"- {user.email}: exists=yes id={user.pk} type={row['kind']} active={user.is_active} "
                f"deleted={user.is_deleted} role={user.role} superuser={user.is_superuser} staff={user.is_staff} "
                f"can_sign_in={row['can_sign_in']} published_password_works={row['password_is_published']} "
                f"last_login={last_login} organizations: {self._organizations(user)}"
            )
            self.stdout.write(f"    remediation: {row['action']}")
        live = [row for row in rows if row["can_sign_in"] and row["kind"] != "seed system actor"]
        self.stdout.write("")
        self.stdout.write(
            f"Summary: {len(rows)} found, {len(live)} can sign in, "
            f"{sum(1 for row in rows if row['password_is_published'])} still use a published password."
        )
        if options["fail_on_findings"] and live:
            raise CommandError(f"{len(live)} demo/QA account(s) can sign in; disable, delete or rotate them.")
