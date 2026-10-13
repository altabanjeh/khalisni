"""Rate limits that survive a cache outage.

DRF throttles keep their counters in the cache. With Redis configured and
unreachable, the stock classes raise on every request and the whole API,
login included, answers 500. A rate limit is a protection, not a dependency:
when its counter store is down the request is allowed and the failure is
logged, so the outage is visible without taking the service down with it.
"""

import logging
import time

from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle

logger = logging.getLogger("khalsni.throttle")


_TRACEBACK_INTERVAL_SECONDS = 60
# After a failure the store is left alone for this long. Without the pause every
# request would wait on the dead connection (seconds each), which on a small
# worker pool is an outage of its own.
STORE_RETRY_AFTER_SECONDS = 30
_last_traceback_at = None
_store_down_until = 0.0


def store_marked_down():
    """True while the counter store is being left alone after a failure."""
    return time.monotonic() < _store_down_until


def mark_store_down(scope="", path=""):
    """Record a counter-store failure: pause its use and log it (traceback at most once a minute)."""
    global _store_down_until, _last_traceback_at
    now = time.monotonic()
    _store_down_until = now + STORE_RETRY_AFTER_SECONDS
    with_traceback = _last_traceback_at is None or now - _last_traceback_at >= _TRACEBACK_INTERVAL_SECONDS
    if with_traceback:
        _last_traceback_at = now
    logger.error(
        "Rate-limit store unavailable; requests are allowed without a limit for %ss (scope=%s, path=%s)",
        STORE_RETRY_AFTER_SECONDS,
        scope,
        path,
        exc_info=with_traceback,
    )


def reset_store_state():
    """Forget a recorded failure (tests; also safe to call after the store is repaired)."""
    global _store_down_until, _last_traceback_at
    _store_down_until = 0.0
    _last_traceback_at = None


class _FailOpenMixin:
    def allow_request(self, request, view):
        if store_marked_down():
            return True
        try:
            return super().allow_request(request, view)
        except Exception:  # cache backend unavailable
            mark_store_down(getattr(self, "scope", ""), getattr(request, "path", ""))
            return True

    def wait(self):
        try:
            return super().wait()
        except Exception:
            return None


class ResilientAnonRateThrottle(_FailOpenMixin, AnonRateThrottle):
    pass


class ResilientUserRateThrottle(_FailOpenMixin, UserRateThrottle):
    pass


class ResilientScopedRateThrottle(_FailOpenMixin, ScopedRateThrottle):
    pass
