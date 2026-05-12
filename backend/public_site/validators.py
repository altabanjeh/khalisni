import os
import re
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.deconstruct import deconstructible


HEX_COLOR_VALIDATOR = RegexValidator(
    regex=r"^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
    message="Enter a valid hex color such as #0b67b2.",
)

SCRIPT_PATTERNS = (
    re.compile(r"<\s*script", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),
    re.compile(r"data\s*:\s*text/html", re.IGNORECASE),
)

SAFE_URL_SCHEMES = {"http", "https", "mailto", "tel"}
DEFAULT_PUBLIC_SITE_IMAGE_MAX_SIZE = int(getattr(settings, "FILE_UPLOAD_MAX_SIZE", 5 * 1024 * 1024))


def validate_no_script_content(value):
    text = str(value or "").strip()
    if not text:
        return
    for pattern in SCRIPT_PATTERNS:
        if pattern.search(text):
            raise ValidationError("JavaScript or unsafe HTML is not allowed in public site content.")


def validate_safe_url(value):
    url = str(value or "").strip()
    if not url:
        return

    validate_no_script_content(url)

    if url.startswith("/"):
        if url.startswith("//"):
            raise ValidationError("Protocol-relative URLs are not allowed.")
        return

    parsed = urlparse(url)
    scheme = (parsed.scheme or "").lower()
    if scheme not in SAFE_URL_SCHEMES:
        raise ValidationError("Only relative, http, https, mailto, and tel URLs are allowed.")

    if scheme in {"http", "https"} and not parsed.netloc:
        raise ValidationError("Enter a complete URL including the domain name.")

    if scheme in {"mailto", "tel"} and not parsed.path:
        raise ValidationError("Enter a complete contact URL.")


@deconstructible
class PublicSiteImageValidator:
    default_extensions = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    default_content_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    favicon_extensions = default_extensions | {".ico"}
    favicon_content_types = default_content_types | {"image/x-icon", "image/vnd.microsoft.icon"}

    def __init__(self, *, allow_favicon_types=False, max_size=None):
        self.allow_favicon_types = allow_favicon_types
        self.max_size = max_size or DEFAULT_PUBLIC_SITE_IMAGE_MAX_SIZE

    @property
    def allowed_extensions(self):
        return self.favicon_extensions if self.allow_favicon_types else self.default_extensions

    @property
    def allowed_content_types(self):
        return self.favicon_content_types if self.allow_favicon_types else self.default_content_types

    def __call__(self, uploaded_file):
        if not uploaded_file:
            return

        extension = os.path.splitext(getattr(uploaded_file, "name", "") or "")[1].lower()
        if extension not in self.allowed_extensions:
            allowed = ", ".join(sorted(self.allowed_extensions))
            raise ValidationError(f"Allowed image extensions are: {allowed}.")

        content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
        if content_type and content_type not in self.allowed_content_types:
            raise ValidationError("Unsupported image type.")

        if getattr(uploaded_file, "size", 0) > self.max_size:
            raise ValidationError(f"Image size must not exceed {self.max_size} bytes.")

    def __eq__(self, other):
        return (
            isinstance(other, PublicSiteImageValidator)
            and self.allow_favicon_types == other.allow_favicon_types
            and self.max_size == other.max_size
        )
