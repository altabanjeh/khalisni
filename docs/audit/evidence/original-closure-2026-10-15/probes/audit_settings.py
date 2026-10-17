# Audit-only settings overlay: isolates media and outbound email for the closure audit.
import os
from pathlib import Path
from config.settings import *  # noqa
_root = Path(os.environ["AUDIT_ENV_ROOT"])
MEDIA_ROOT = _root / "media"
EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
EMAIL_FILE_PATH = str(_root / "mail")
PASSWORD_RESET_EMAIL_ASYNC = False
