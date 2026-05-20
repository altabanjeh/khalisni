import os

from django.core.management.base import BaseCommand

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

        user = CustomUser.objects.filter(email=email).first()
        if user:
            user.full_name = full_name
            user.role = CustomUser.Role.ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.is_email_verified = True
            if reset_password:
                user.set_password(password)
            user.save()
            sync_user_role_group(user)
            action = "password updated" if reset_password else "verified"
            self.stdout.write(self.style.SUCCESS(f"Admin user {action}: {email}"))
            return

        user = CustomUser.objects.create_superuser(
            email=email,
            password=password,
            full_name=full_name,
        )
        sync_user_role_group(user)
        self.stdout.write(self.style.SUCCESS(f"Admin user created: {email}"))
