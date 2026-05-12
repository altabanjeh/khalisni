from django.core.management.base import BaseCommand

from accounts.models import CustomUser
from accounts.role_groups import ensure_role_groups, sync_user_role_group


class Command(BaseCommand):
    help = "Create role groups and sync all existing users into the correct group."

    def handle(self, *args, **options):
        groups = ensure_role_groups()
        synced = 0
        for user in CustomUser.objects.all().only("pk", "role"):
            sync_user_role_group(user)
            synced += 1

        group_names = ", ".join(sorted(groups))
        self.stdout.write(self.style.SUCCESS(f"Created/synced groups: {group_names}. Users synced: {synced}."))
