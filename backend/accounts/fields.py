from rest_framework import serializers

from accounts.validators import PHONE_MESSAGES, normalize_phone
from core.i18n import pick, request_language


class CanonicalPhoneField(serializers.CharField):
    """A phone number accepted in any common local or international form and returned in E.164.

    See ``accounts.validators`` for the policy. Errors are localized from the
    request's ``Accept-Language``.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 30)
        super().__init__(**kwargs)

    def _message(self, key):
        return pick(PHONE_MESSAGES[key], request_language(self.context.get("request")))

    def fail_message(self, key):
        raise serializers.ValidationError(self._message(key))

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        canonical = normalize_phone(value)
        if canonical is None:
            self.fail_message("invalid")
        if canonical == "" and not self.allow_blank:
            self.fail_message("required")
        return canonical

    def bind(self, field_name, parent):
        super().bind(field_name, parent)
        required = self._message("required")
        self.error_messages.update(required=required, null=required, blank=required)
