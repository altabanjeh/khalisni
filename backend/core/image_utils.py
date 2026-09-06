"""Server-side image normalisation for admin-managed public images.

Re-encoding every uploaded image through Pillow does three things at once:

* **Security** – a "polyglot" upload that is simultaneously a valid image and,
  say, an HTML/JS payload does not survive a full decode + re-encode, and EXIF
  metadata (which can carry scripts or PII) is dropped.
* **Performance** – oversized photos are capped to a sane display size and
  recompressed, so a 8 MB camera JPEG becomes a ~150 KB web asset.
* **Integrity** – truncated / corrupt uploads raise here instead of rendering
  as a broken image on the public site.

Kept deliberately small: no thumbnail table, no derivative pipeline. Storage of
the resulting file still goes through Django's configured storage backend
(local disk or S3), so nothing about the media-security model changes.
"""
from __future__ import annotations

import io
import os

from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError

try:  # Pillow is a hard dependency (requirements.txt) but stay import-safe.
    from PIL import Image, ImageOps, UnidentifiedImageError

    _PIL_AVAILABLE = True
except Exception:  # pragma: no cover - only when Pillow missing
    _PIL_AVAILABLE = False


_FORMAT_BY_EXT = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
    ".gif": "GIF",
}

_CONTENT_TYPE = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "GIF": "image/gif",
}


def optimize_image_upload(
    uploaded_file,
    *,
    max_width: int = 1600,
    max_height: int = 1600,
    quality: int = 82,
):
    """Return a sanitised, resized copy of ``uploaded_file`` as a ``ContentFile``.

    Returns ``None`` (caller keeps the original) when Pillow is unavailable or
    the format is animated GIF (which we do not want to flatten). Raises
    ``django.core.exceptions.ValidationError`` for unreadable / corrupt input.
    """
    if not uploaded_file or not _PIL_AVAILABLE:
        return None

    name = getattr(uploaded_file, "name", "") or "image"
    ext = os.path.splitext(name)[1].lower()
    target_format = _FORMAT_BY_EXT.get(ext, "JPEG")

    try:
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)
        image.load()  # force decode -> raises on truncated files
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValidationError("The uploaded file is not a readable image.") from exc

    # Leave animated GIFs untouched rather than flattening to a single frame.
    if target_format == "GIF" and getattr(image, "is_animated", False):
        uploaded_file.seek(0)
        return None

    image = ImageOps.exif_transpose(image)  # honour orientation, then drop EXIF

    if target_format in {"JPEG", "GIF"} and image.mode not in ("RGB", "L"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode in ("RGBA", "LA", "P"):
            rgba = image.convert("RGBA")
            background.paste(rgba, mask=rgba.split()[-1])
            image = background
        else:
            image = image.convert("RGB")
    elif target_format in {"PNG", "WEBP"} and image.mode == "P":
        image = image.convert("RGBA")

    image.thumbnail((max_width, max_height), Image.LANCZOS)

    buffer = io.BytesIO()
    save_kwargs = {"format": target_format}
    if target_format in {"JPEG", "WEBP"}:
        save_kwargs.update(quality=quality, optimize=True)
        if target_format == "JPEG":
            save_kwargs.update(progressive=True)
    elif target_format == "PNG":
        save_kwargs.update(optimize=True)
    image.save(buffer, **save_kwargs)
    buffer.seek(0)

    base, _ = os.path.splitext(os.path.basename(name))
    safe_ext = ".jpg" if target_format == "JPEG" else ext or ".img"
    content = ContentFile(buffer.read(), name=f"{base or 'image'}{safe_ext}")
    content.content_type = _CONTENT_TYPE.get(target_format, "application/octet-stream")
    return content
