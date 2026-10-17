"""Pick Arabic or English for text the API writes itself.

The web client sends the screen language as ``Accept-Language``. Anything
else (no header, other languages) gets Arabic, the site default.
"""


def request_language(request):
    header = ""
    if request is not None:
        header = (request.headers.get("Accept-Language", "") or "").split(",", 1)[0].strip().lower()
    return "en" if header.startswith("en") else "ar"


def pick(messages, language):
    """Return ``messages[language]`` for an ``{"ar": ..., "en": ...}`` mapping."""
    return messages.get(language) or messages["ar"]


def explicit_request_language(request, default):
    """Like ``request_language`` but returns ``default`` when the caller named no language."""
    header = ""
    if request is not None:
        header = (request.headers.get("Accept-Language", "") or "").split(",", 1)[0].strip().lower()
    if header.startswith("en"):
        return "en"
    if header.startswith("ar"):
        return "ar"
    return default
