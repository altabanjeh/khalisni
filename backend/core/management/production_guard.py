"""One rule for "is this a production system?" used by the demo/QA seed commands.

Demo and QA seeds create accounts with published passwords (including a
superuser). They refuse to run when:

* ``KHALSNI_ENVIRONMENT`` (or ``DJANGO_ENVIRONMENT``) says production
  (``production``/``prod``/``live``): always, no override; or
* ``DEBUG`` is False and the caller did not pass its explicit override flag.
"""

import os

from django.conf import settings
from django.core.management.base import CommandError

PRODUCTION_NAMES = {"production", "prod", "live"}
ENVIRONMENT_VARIABLES = ("KHALSNI_ENVIRONMENT", "DJANGO_ENVIRONMENT")


def declared_environment():
    for name in ENVIRONMENT_VARIABLES:
        value = os.getenv(name, "").strip().lower()
        if value:
            return name, value
    return None, ""


def is_declared_production():
    _name, value = declared_environment()
    return value in PRODUCTION_NAMES


def refuse_in_production(command_name, *, allow_non_debug=False):
    """Raise ``CommandError`` when demo/QA data must not be created here."""
    name, value = declared_environment()
    if value in PRODUCTION_NAMES:
        raise CommandError(
            f"{command_name} is refused: {name}={value} marks this system as production. "
            "Demo and QA data are never created on production."
        )
    if not settings.DEBUG and not allow_non_debug:
        raise CommandError(
            f"{command_name} is refused when DJANGO_DEBUG is False. "
            "Use it only on a disposable development or demo system."
        )
