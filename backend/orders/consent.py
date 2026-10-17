"""Order consent evidence.

The order form requires the customer to accept a consent statement. Each
accepted submission stores an ``OrderConsent`` row: who, which order, which
statement (version id and the exact text shown), the language, the client and
the time. This is technical evidence of what was accepted; the wording itself
and whether it is legally sufficient are a legal/content decision (D06).

A client names the statement it showed with ``consent_version``. The texts
below must stay identical to what that client displays; changing a text means
adding a new version, never editing an old one.
"""

CONSENT_TEXTS = {
    # frontend/src/utils/orderConsent.js
    "order-consent-web-v1": {
        "ar": "أوافق على استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط، وإشعاري بأي نواقص.",
        "en": "I agree that my details and documents are used only to complete this service, and to be notified of anything missing.",
    },
    # mobile/src/features/client/screens/CreateOrderScreen.tsx
    "order-consent-mobile-v1": {
        "ar": "أوافق على استخدام بياناتي ووثائقي لأغراض تنفيذ الخدمة فقط.",
    },
}

# A client that does not say which statement it showed. The acceptance is
# still recorded, but no text is claimed for it.
UNVERSIONED = "unversioned-client"

SOURCES = ("web", "mobile")
UNKNOWN_SOURCE = "unknown"


def consent_evidence(*, version, source, request_language):
    """Return the fields of an ``OrderConsent`` row for an accepted submission."""
    texts = CONSENT_TEXTS.get(version)
    if not texts:
        return {"consent_version": UNVERSIONED, "consent_text": "", "language": request_language, "source": source or UNKNOWN_SOURCE}
    language = request_language if request_language in texts else next(iter(texts))
    return {"consent_version": version, "consent_text": texts[language], "language": language, "source": source or UNKNOWN_SOURCE}
