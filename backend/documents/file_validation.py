"""Server-side upload content validation (defect D5).

Extension and browser-declared ``Content-Type`` are both trivially spoofable.
This module reads the first bytes of an upload and checks that its real
signature matches one of the allowed types and is consistent with the claimed
extension. No third-party dependency is required for the six formats Khalisni
accepts (pdf, jpg/jpeg, png, doc, docx).
"""

import os

from django.core.exceptions import ValidationError

# extension -> tuple of acceptable magic-byte prefixes
_SIGNATURES = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    # Legacy OLE2 compound-file container (.doc)
    ".doc": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",),
    # OOXML is a ZIP container (.docx). Empty/spanned ZIP markers included.
    ".docx": (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"),
}

_MAX_SNIFF_BYTES = 8


def sniff_matches_extension(file_obj, extension):
    """Return True if the file's leading bytes match the given extension."""
    expected = _SIGNATURES.get((extension or "").lower())
    if not expected:
        # Unknown extension: signature check cannot help; the extension
        # allow-list is enforced separately by the caller.
        return True

    try:
        pos = file_obj.tell()
    except (OSError, AttributeError):
        pos = None
    try:
        file_obj.seek(0)
        head = file_obj.read(_MAX_SNIFF_BYTES)
    finally:
        try:
            file_obj.seek(pos or 0)
        except (OSError, AttributeError):
            pass

    if isinstance(head, str):  # pragma: no cover - text-mode files are not expected
        head = head.encode("latin-1", "ignore")
    return any(head.startswith(sig) for sig in expected)


REQUIREMENT_EXTENSION_ERROR = "Unsupported file extension for this document."
REQUIREMENT_SIZE_ERROR = "This document exceeds the allowed file size."
CONTENT_MISMATCH_ERROR = "File content does not match its extension."


def requirement_upload_error(upload, requirement):
    """Return why ``upload`` breaks a document requirement's own rules, or None.

    ``requirement`` is any object exposing ``allowed_extensions`` and
    ``max_file_size`` (a ``ServiceRequiredDocument`` or an order requirement
    snapshot row). An empty extension list or a zero size means the
    requirement adds no restriction beyond the global upload policy.
    """
    extension = os.path.splitext(getattr(upload, "name", "") or "")[1].lower()
    allowed_extensions = [
        str(item).lower() for item in (getattr(requirement, "allowed_extensions", None) or []) if str(item).strip()
    ]
    if allowed_extensions and extension not in allowed_extensions:
        return REQUIREMENT_EXTENSION_ERROR
    max_file_size = getattr(requirement, "max_file_size", None) or 0
    if max_file_size and upload.size > max_file_size:
        return REQUIREMENT_SIZE_ERROR
    if not sniff_matches_extension(upload, extension):
        return CONTENT_MISMATCH_ERROR
    return None


def validate_upload_signature(file_obj, extension):
    """Raise ``ValidationError`` when the real content contradicts the extension."""
    if not sniff_matches_extension(file_obj, extension):
        raise ValidationError(
            "File content does not match its extension. Upload a genuine "
            f"{(extension or '').lstrip('.').upper() or 'document'} file."
        )
