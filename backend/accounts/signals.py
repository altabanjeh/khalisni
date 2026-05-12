from django.apps import apps
from django.db.utils import OperationalError, ProgrammingError
from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

from accounts.models import CustomUser
from accounts.role_groups import ensure_role_groups, sync_user_role_group


@receiver(post_save, sender=CustomUser)
def sync_saved_user_role_group(sender, instance, **kwargs):
    sync_user_role_group(instance)


@receiver(post_migrate)
def setup_role_groups(sender, **kwargs):
    try:
        ensure_role_groups()
        CustomUser = apps.get_model("accounts", "CustomUser")
        for user in CustomUser.objects.all().only("pk", "role"):
            sync_user_role_group(user)
    except (OperationalError, ProgrammingError):
        return
