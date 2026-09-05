"""Server-side upload content validation (defect D5).

Extension and browser-declared ``Content-Type`` are both trivially spoofable.
This module reads the first bytes of an upload and checks that its real
signature matches one of the allowed types and is consistent with the claimed
extension. No third-party dependency is required for the six formats Khalisni
accepts (pdf, jpg/jpeg, png, doc, docx).
"""

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


def validate_upload_signature(file_obj, extension):
    """Raise ``ValidationError`` when the real content contradicts the extension."""
    if not sniff_matches_extension(file_obj, extension):
        raise ValidationError(
            "File content does not match its extension. Upload a genuine "
            f"{(extension or '').lstrip('.').upper() or 'document'} file."
        )
