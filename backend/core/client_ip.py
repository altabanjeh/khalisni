"""Client address behind the reverse-proxy chain.

Django sits behind nginx, which sits behind the platform proxy. Each proxy
appends the address it received the request from to ``X-Forwarded-For``, so
only the right-most ``NUM_PROXIES`` entries were written by infrastructure we
control. Everything to their left is supplied by the caller and must never be
used as an identity.

``REST_FRAMEWORK["NUM_PROXIES"]`` (env ``API_THROTTLE_NUM_PROXIES``) is the
single place that states how many trusted proxies there are. The rule here is
the one DRF's throttles apply, so rate limits, password-reset limits and the
audit trail all agree on who the client is.
"""

from rest_framework.settings import api_settings


def get_client_ip(request, *, when_unconfigured="remote"):
    """
    Return the client address.

    With ``NUM_PROXIES`` configured, the address recorded by the outermost
    trusted proxy. Without it there is no trustworthy forwarded address:
    ``when_unconfigured="remote"`` returns the socket peer (right for an audit
    record), ``"header"`` returns the same identity DRF throttles fall back to.
    """
    meta = getattr(request, "META", {}) or {}
    forwarded = meta.get("HTTP_X_FORWARDED_FOR")
    remote = meta.get("REMOTE_ADDR", "") or ""
    num_proxies = api_settings.NUM_PROXIES

    if num_proxies is not None:
        if num_proxies == 0 or not forwarded:
            return remote
        addresses = forwarded.split(",")
        return addresses[-min(num_proxies, len(addresses))].strip()

    if when_unconfigured == "header" and forwarded:
        return "".join(forwarded.split())
    return remote
