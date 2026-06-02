import os
from importlib.util import find_spec
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:  # pragma: no cover - fallback for minimal local environments
    pass

HAS_CORSHEADERS = find_spec("corsheaders") is not None
HAS_DRF = find_spec("rest_framework") is not None
HAS_DRF_AUTHTOKEN = find_spec("rest_framework.authtoken") is not None
HAS_SIMPLEJWT = find_spec("rest_framework_simplejwt") is not None
HAS_DJANGO_FILTERS = find_spec("django_filters") is not None
HAS_WHITENOISE = find_spec("whitenoise") is not None


def _get_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_list_env(name: str, default: str = "") -> list[str]:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        raw_value = default
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _host_from_origin(origin: str) -> str | None:
    parsed = urlparse(origin)
    return parsed.hostname

_secret_key = os.getenv("DJANGO_SECRET_KEY")
_debug = _get_bool_env("DJANGO_DEBUG", True)
if not _secret_key:
    if _debug:
        _secret_key = "dev-only-insecure-key-not-for-production"
    else:
        from django.core.exceptions import ImproperlyConfigured
        raise ImproperlyConfigured("DJANGO_SECRET_KEY environment variable must be set in production.")
SECRET_KEY = _secret_key
DEBUG = _debug
_cors_allowed_origins = _get_list_env(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
)
_csrf_trusted_origins = _get_list_env(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    ",".join(_cors_allowed_origins),
)
_derived_allowed_hosts = {
    host
    for host in (
        _host_from_origin(origin)
        for origin in [*_cors_allowed_origins, *_csrf_trusted_origins]
    )
    if host
}
ALLOWED_HOSTS = sorted(
    {
        *(_get_list_env("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")),
        *_derived_allowed_hosts,
        "localhost",
        "127.0.0.1",
        "[::1]",
    }
)
CORS_ALLOWED_ORIGINS = _cors_allowed_origins
CSRF_TRUSTED_ORIGINS = _csrf_trusted_origins

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
    "organizations",
    "accounts",
    "services",
    "orders",
    "documents",
    "workflow",
    "providers",
    "payment",
    "notifications",
    "reports",
    "audit",
    "public_site",
    "help_guides",
]

if HAS_CORSHEADERS:
    INSTALLED_APPS.insert(6, "corsheaders")
if HAS_DRF:
    INSTALLED_APPS.insert(7 if HAS_CORSHEADERS else 6, "rest_framework")
if HAS_DRF_AUTHTOKEN:
    INSTALLED_APPS.append("rest_framework.authtoken")
if HAS_SIMPLEJWT:
    INSTALLED_APPS.append("rest_framework_simplejwt.token_blacklist")
if HAS_DJANGO_FILTERS:
    INSTALLED_APPS.append("django_filters")

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

if HAS_WHITENOISE:
    MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

if HAS_CORSHEADERS:
    MIDDLEWARE.insert(2, "corsheaders.middleware.CorsMiddleware")

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

if os.getenv("POSTGRES_DB"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("POSTGRES_DB"),
            "USER": os.getenv("POSTGRES_USER"),
            "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
            "HOST": os.getenv("POSTGRES_HOST", "db"),
            "PORT": os.getenv("POSTGRES_PORT", "5432"),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "accounts.CustomUser"

LANGUAGE_CODE = "ar"
LANGUAGES = [("ar", "Arabic"), ("en", "English")]
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "Asia/Amman")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
            if HAS_WHITENOISE
            else "django.contrib.staticfiles.storage.StaticFilesStorage"
        )
    },
}

# Trust Coolify's Traefik proxy for HTTPS detection
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = _get_bool_env("DJANGO_SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = _get_bool_env("DJANGO_CSRF_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_SAMESITE = os.getenv("DJANGO_SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.getenv("DJANGO_CSRF_COOKIE_SAMESITE", "Lax")
SECURE_SSL_REDIRECT = _get_bool_env("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _get_bool_env("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = _get_bool_env("DJANGO_SECURE_HSTS_PRELOAD", not DEBUG)
SECURE_CONTENT_TYPE_NOSNIFF = _get_bool_env("DJANGO_SECURE_CONTENT_TYPE_NOSNIFF", True)
SECURE_REFERRER_POLICY = os.getenv("DJANGO_SECURE_REFERRER_POLICY", "strict-origin-when-cross-origin")
X_FRAME_OPTIONS = os.getenv("DJANGO_X_FRAME_OPTIONS", "DENY")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {}

if HAS_DRF:
    authentication_classes = ["rest_framework.authentication.SessionAuthentication"]
    if HAS_SIMPLEJWT:
        authentication_classes.insert(0, "rest_framework_simplejwt.authentication.JWTAuthentication")

    filter_backends = [
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ]
    if HAS_DJANGO_FILTERS:
        filter_backends.insert(0, "django_filters.rest_framework.DjangoFilterBackend")

    REST_FRAMEWORK = {
        "DEFAULT_AUTHENTICATION_CLASSES": tuple(authentication_classes),
        "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
        "DEFAULT_FILTER_BACKENDS": tuple(filter_backends),
        "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
        "PAGE_SIZE": 20,
    }

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "USER_ID_FIELD": "user_id",
}

_redis_url = os.getenv("REDIS_URL")
if _redis_url:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": _redis_url,
            "OPTIONS": {"db": "0"},
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "TIMEOUT": 300,
        }
    }

ALLOWED_UPLOAD_EXTENSIONS = [
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".doc",
    ".docx",
]

ALLOWED_UPLOAD_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

FILE_UPLOAD_MAX_SIZE = int(os.getenv("FILE_UPLOAD_MAX_SIZE", str(10 * 1024 * 1024)))
