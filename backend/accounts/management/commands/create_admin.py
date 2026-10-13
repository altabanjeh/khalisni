import os

from django.core.management.base import BaseCommand, CommandError
from django.db.models import F

from accounts.models import CustomUser
from accounts.role_groups import sync_user_role_group


class Command(BaseCommand):
    help = "Create the initial admin user from DJANGO_ADMIN_* environment variables (idempotent)."

    def handle(self, *args, **options):
        email = os.getenv("DJANGO_ADMIN_EMAIL", "").strip()
        password = os.getenv("DJANGO_ADMIN_PASSWORD", "").strip()
        full_name = os.getenv("DJANGO_ADMIN_NAME", "Admin").strip()
        reset_password = os.getenv("DJANGO_ADMIN_RESET_PASSWORD", "False").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

        if not email or not password:
            self.stdout.write("DJANGO_ADMIN_EMAIL or DJANGO_ADMIN_PASSWORD not set; skipping admin creation.")
            return

        user = CustomUser.objects.filter(email=CustomUser.objects.normalize_email(email)).first()
        if user:
            # This runs on every container start. It must not hand platform
            # authority to whichever account happens to own the address, nor
            # undo an administrator being deactivated on purpose.
            if user.role != CustomUser.Role.ADMIN or not user.is_superuser:
                raise CommandError(
                    f"{email} already belongs to a non-admin account; it was not promoted. "
                    "Use a different DJANGO_ADMIN_EMAIL or promote the account deliberately."
                )
            if not reset_password:
                self.stdout.write(f"Admin user exists: {email} (unchanged)")
                return
            user.set_password(password)
            user.is_active = True
            user.is_deleted = False
            user.save()
            # A replaced password ends every session opened with the old one.
            CustomUser.objects.filter(pk=user.pk).update(token_version=F("token_version") + 1)
            sync_user_role_group(user)
            self.stdout.write(self.style.SUCCESS(f"Admin user password updated: {email}"))
            return

        user = CustomUser.objects.create_superuser(
            email=email,
            password=password,
            full_name=full_name,
        )
        sync_user_role_group(user)
        self.stdout.write(self.style.SUCCESS(f"Admin user created: {email}"))