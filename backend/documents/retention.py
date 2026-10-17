"""Stored-file retention: current behaviour and the hook for a future policy.

Current behaviour (documented, not changed):

* Deleting a document is a soft delete. The row is flagged ``is_deleted`` and
  the stored file (local media or S3) is kept.
* A soft-deleted document cannot be downloaded by anyone: every download path
  (signed-in, signed token, public order-number + phone) reads only rows with
  ``is_deleted=False`` (documents/views.py, documents/selectors.py).
* No job removes files. Nothing is purged automatically.

How long files may be kept, and when they must be removed, is a client
data-retention policy (D06) that does not exist yet. Until it does, nothing
here deletes anything. When it exists, a purge job should take its candidates
from ``purge_candidates`` so that the selection rule lives in one place.
"""

from documents.models import Document


def purge_candidates(*, deleted_before):
    """Soft-deleted documents deleted before ``deleted_before`` whose file is still stored.

    Read-only: returns a queryset, removes nothing.
    """
    return (
        Document._base_manager.filter(is_deleted=True, deleted_at__lt=deleted_before)
        .exclude(file="")
        .select_related("order")
        .order_by("deleted_at", "pk")
    )
