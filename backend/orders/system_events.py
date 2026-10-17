"""Structured codes for system-written order timeline notes (audit D03).

Status-log notes mix two kinds of text: remarks typed by staff, customers or
providers (shown exactly as written) and fixed English sentences the system
writes when nobody typed anything ("Order under review"). The second kind is
stored with a ``system_event`` code so every screen can render it in its own
language; the English sentence stays in ``note`` for API clients that only
read text.

Rows written before the code existed are recognised by the exact sentence at
read time. Anything that does not match a sentence below exactly is treated as
authored text and is never translated.
"""

SYSTEM_STATUS_NOTES = {
    "Order submitted": "order_submitted",
    "Order under review": "order_under_review",
    "Order returned to review": "order_returned_to_review",
    "Customer uploaded missing documents": "customer_uploaded_missing_documents",
    "Customer uploaded all requested missing documents": "customer_uploaded_all_missing_documents",
    "Staff approved all requested documents.": "staff_approved_requested_documents",
    "Order assigned to provider.": "provider_assigned",
    "Order assigned to provider": "provider_assigned",
    "Provider started work": "provider_started_work",
    "Provider completed work and uploaded final result": "provider_completed_work",
    "Final document uploaded": "final_document_uploaded",
    "Final document rejected and returned for rework.": "final_document_returned",
    "Order completed": "order_completed",
    "Order archived": "order_archived",
    "Archived from admin delete action.": "order_archived",
}

# System prefix followed by text a person typed; the typed part is a parameter.
SYSTEM_NOTE_PREFIXES = (
    ("Missing-document request recovered by staff: ", "missing_request_recovered", "reason"),
)

SYSTEM_EVENT_CODES = frozenset(SYSTEM_STATUS_NOTES.values()) | {code for _, code, _ in SYSTEM_NOTE_PREFIXES}


def system_event_for_note(note):
    """Return ``(code, params)`` for a system-written note, else ``("", {})``."""
    text = (note or "").strip()
    if text in SYSTEM_STATUS_NOTES:
        return SYSTEM_STATUS_NOTES[text], {}
    for prefix, code, param in SYSTEM_NOTE_PREFIXES:
        if text.startswith(prefix):
            return code, {param: text[len(prefix):].strip()}
    return "", {}


def describe_status_log(log):
    """Code and parameters for a status log, preferring the stored code."""
    code, params = system_event_for_note(log.note)
    stored = getattr(log, "system_event", "") or ""
    if stored:
        return stored, params if code == stored else {}
    return code, params
