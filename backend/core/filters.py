from django.db.models import Q
from rest_framework.filters import SearchFilter

from accounts.validators import normalize_phone

PHONE_FIELD_NAMES = {"phone", "requester_phone"}


class PhoneAwareSearchFilter(SearchFilter):
    """DRF search that also finds a phone number typed in any equivalent format.

    When the whole search text is a valid phone number and the view searches a
    phone field, rows whose canonical phone equals that number are added to the
    normal text matches. ``079 123 4567`` therefore finds ``+962791234567``.
    """

    def filter_queryset(self, request, queryset, view):
        matches = super().filter_queryset(request, queryset, view)
        phone_fields = [
            field.lstrip("^=@$")
            for field in (self.get_search_fields(view, request) or [])
            if field.lstrip("^=@$").split("__")[-1] in PHONE_FIELD_NAMES
        ]
        raw = (request.query_params.get(self.search_param, "") or "").strip()
        canonical = normalize_phone(raw) if phone_fields and raw else None
        if not canonical:
            return matches
        same_phone = Q()
        for field in phone_fields:
            same_phone |= Q(**{field: canonical})
        return queryset.filter(Q(pk__in=matches.values("pk")) | same_phone)
