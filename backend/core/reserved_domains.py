"""Addresses on reserved, non-deliverable top-level domains (RFC 2606, RFC 6761, RFC 6762).

Mail to ``name@khalisni.local`` or ``name@example.test`` never arrives. Such an
address must not be published as a support contact or used as a sender
(audit D05). This only recognises the reserved names; it does not decide
which real address is correct.
"""

RESERVED_SUFFIXES = (".local", ".localhost", ".test", ".example", ".invalid", ".internal")


def email_domain(address):
    address = (address or "").strip().lower()
    return address.rsplit("@", 1)[1] if "@" in address else ""


def is_reserved_email(address):
    """True when the address is on a reserved domain that cannot receive mail."""
    domain = email_domain(address).rstrip(".")
    if not domain:
        return False
    return domain == "localhost" or domain.endswith(RESERVED_SUFFIXES)
