"""Deployment checks (``manage.py check --deploy``)."""

from django.conf import settings
from django.core.checks import Tags, Warning, register

from core.reserved_domains import is_reserved_email


@register(Tags.security, deploy=True)
def sender_address_is_deliverable(app_configs, **kwargs):
    """D05/SMTP: a sender on a reserved domain (no-reply@khalisni.local) is not a real mailbox."""
    sender = getattr(settings, "DEFAULT_FROM_EMAIL", "")
    if is_reserved_email(sender):
        return [
            Warning(
                f"DEFAULT_FROM_EMAIL ({sender}) is on a reserved domain that cannot send or receive real mail.",
                hint="Set DJANGO_DEFAULT_FROM_EMAIL to an address on the approved sending domain.",
                id="khalsni.W001",
            )
        ]
    return []
