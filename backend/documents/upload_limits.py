"""Upload size limits (CN-BIZ-09: engineering drawings and other large files).

* ``FILE_UPLOAD_MAX_SIZE`` (default 10 MB) is the limit for ordinary uploads.
* A document definition may raise its own limit with
  ``RequiredDocumentDefinition.max_file_size_mb`` (for example 50 MB for
  «المخططات الهندسية»). The definition's ``max_file_size`` (bytes) and every
  service requirement linked to it carry that limit, so order snapshots and the
  web/mobile upload hints read it from ``max_file_size`` like any other limit.
* ``ENGINEERING_UPLOAD_MAX_SIZE`` (default 50 MB) is the hard ceiling: no
  definition and no requirement can allow more. nginx ``client_max_body_size``
  must stay above it (frontend/nginx.conf).
"""

from django.conf import settings

MB = 1024 * 1024


def default_max_size():
    return int(getattr(settings, "FILE_UPLOAD_MAX_SIZE", 10 * MB))


def hard_max_size():
    """The largest upload any requirement may allow."""
    return max(default_max_size(), int(getattr(settings, "ENGINEERING_UPLOAD_MAX_SIZE", 50 * MB)))


def hard_max_size_mb():
    return hard_max_size() // MB


def requirement_max_size(requirement):
    """The requirement's own limit in bytes, never above the hard ceiling (0 = no own limit)."""
    size = int(getattr(requirement, "max_file_size", 0) or 0)
    return min(size, hard_max_size()) if size > 0 else 0


# Every requirement row stores this size unless its definition sets
# ``max_file_size_mb``; only a larger value is a deliberate override.
STANDARD_REQUIREMENT_SIZE = 10 * MB


def allowed_upload_size(requirement=None):
    """The general size check for an upload: the default limit, raised (up to the
    ceiling) only when the requirement deliberately allows more than the standard
    size. A requirement's smaller limit is enforced separately by
    ``file_validation.requirement_upload_error``."""
    size = requirement_max_size(requirement)
    if size > STANDARD_REQUIREMENT_SIZE:
        return max(default_max_size(), size)
    return default_max_size()


def order_requirement_for(order, document_type):
    """The order's (frozen) requirement row for ``document_type``, or None."""
    if order is None or not document_type:
        return None
    from orders.readiness import order_requirements

    wanted = str(document_type).strip().lower()
    return next((row for row in order_requirements(order) if str(row.document_type or "").lower() == wanted), None)


def copy_request_data(data):
    """A mutable copy of request data that does not copy uploaded files.

    ``QueryDict.copy()`` deep-copies every value; an upload above
    FILE_UPLOAD_MAX_MEMORY_SIZE (2.5 MB) is a temporary file that cannot be
    copied, so any larger document failed with a server error.
    """
    if hasattr(data, "lists") and hasattr(data, "setlist"):
        from django.http import QueryDict

        payload = QueryDict(mutable=True)
        for key, values in data.lists():
            payload.setlist(key, list(values))
        return payload
    return data.copy() if hasattr(data, "copy") else dict(data)
