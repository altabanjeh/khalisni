import hashlib
import logging
import secrets
from datetime import timedelta
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from accounts.models import CustomUser, PasswordResetToken
from audit.utils import create_audit_log


logger = logging.getLogger(__name__)

FORGOT_PASSWORD_RESPONSE_MESSAGE = "If this email is registered, a password reset link has been sent."
INVALID_RESET_TOKEN_MESSAGE = "This password reset link is invalid or has expired."
PASSWORD_RESET_SUCCESS_MESSAGE = "Your password has been reset. You can now log in."


class InvalidPasswordResetToken(Exception):
    pass


def _normalize_email(email: str) -> str:
    return CustomUser.objects.normalize_email((email or "").strip())


def _get_request_ip(request) -> str:
    forwarded_for = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")
    if forwarded_for and forwarded_for[0].strip():
        return forwarded_for[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _cache_rate_limit_key(*, scope: str, identifier: str) -> str:
    return f"password_reset:{scope}:{identifier}"


def _mask_email(email: str) -> str:
    local_part, _, domain = email.partition("@")
    if not local_part or not domain:
        return ""
    if len(local_part) <= 2:
        masked_local = f"{local_part[:1]}*"
    else:
        masked_local = f"{local_part[:2]}***"
    return f"{masked_local}@{domain}"


def _increment_rate_limit(cache_key: str, *, max_attempts: int, window_seconds: int) -> bool:
    added = cache.add(cache_key, 1, timeout=window_seconds)
    if added:
        current = 1
    else:
        try:
            current = cache.incr(cache_key)
        except ValueError:
            cache.set(cache_key, 1, timeout=window_seconds)
            current = 1
    return current > max_attempts


def _build_reset_link(raw_token: str) -> str:
    base_url = settings.FRONTEND_BASE_URL.rstrip("/")
    return f"{base_url}/reset-password/{quote(raw_token)}"


def _send_password_reset_email(*, user: CustomUser, raw_token: str) -> None:
    reset_link = _build_reset_link(raw_token)
    send_mail(
        subject="Khalisni password reset",
        message=(
            "We received a request to reset your Khalisni password.\n\n"
            f"Use this link within 30 minutes:\n{reset_link}\n\n"
            "If you did not request this change, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_changed_notification(*, user: CustomUser) -> None:
    send_mail(
        subject="Khalisni password changed",
        message=(
            "Your Khalisni password was changed successfully.\n\n"
            "If you did not perform this change, contact support immediately."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def _send_password_changed_notification_safely(user_id: int) -> None:
    try:
        user = CustomUser.objects.get(pk=user_id)
        send_password_changed_notification(user=user)
    except Exception:
        logger.exception("Failed to send password changed notification for user %s", user_id)


def request_password_reset(*, email: str, request) -> str:
    normalized_email = _normalize_email(email)
    request_ip = _get_request_ip(request)
    email_key = _cache_rate_limit_key(scope="email", identifier=_hash_value(normalized_email))
    ip_key = _cache_rate_limit_key(scope="ip", identifier=_hash_value(request_ip or "unknown"))
    rate_limited = _increment_rate_limit(
        email_key,
        max_attempts=settings.PASSWORD_RESET_RATE_LIMIT_EMAIL,
        window_seconds=settings.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS,
    )
    rate_limited = _increment_rate_limit(
        ip_key,
        max_attempts=settings.PASSWORD_RESET_RATE_LIMIT_IP,
        window_seconds=settings.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS,
    ) or rate_limited

    user = (
        CustomUser.objects.filter(
            email=normalized_email,
            role=CustomUser.Role.CUSTOMER,
            is_active=True,
        )
        .only("pk", "email", "full_name", "role", "password", "is_active")
        .first()
    )

    if user and not rate_limited and user.has_usable_password():
        raw_token = secrets.token_urlsafe(48)
        token_record = PasswordResetToken.objects.create(
            user=user,
            token_hash=_hash_value(raw_token),
            expires_at=timezone.now() + timedelta(seconds=settings.PASSWORD_RESET_TOKEN_TTL_SECONDS),
            request_ip=request_ip or None,
            user_agent=request.META.get("HTTP_USER_AGENT", "") or None,
        )
        try:
            _send_password_reset_email(user=user, raw_token=raw_token)
        except Exception:
            token_record.delete()
            logger.exception("Failed to send password reset email for user %s", user.pk)
    else:
        _hash_value(secrets.token_urlsafe(32))

    create_audit_log(
        request=request,
        user=user,
        action="password_reset_request",
        entity_type="PasswordResetRequest",
        entity_id=str(user.pk if user else _hash_value(normalized_email)[:12]),
        new_value={
            "email": _mask_email(normalized_email),
            "rate_limited": rate_limited,
        },
    )
    return FORGOT_PASSWORD_RESPONSE_MESSAGE


def validate_password_reset_token(raw_token: str) -> PasswordResetToken:
    token_record = (
        PasswordResetToken.objects.select_related("user")
        .filter(token_hash=_hash_value(raw_token))
        .first()
    )
    if (
        token_record is None
        or token_record.is_used
        or token_record.is_expired
        or not token_record.user.is_active
        or token_record.user.role != CustomUser.Role.CUSTOMER
    ):
        raise InvalidPasswordResetToken(INVALID_RESET_TOKEN_MESSAGE)
    return token_record


def reset_password_with_token(*, token_record: PasswordResetToken, raw_password: str, request) -> int:
    now = timezone.now()
    try:
        with transaction.atomic():
            locked_token = (
                PasswordResetToken.objects.select_for_update()
                .select_related("user")
                .get(pk=token_record.pk)
            )
            if locked_token.is_used or locked_token.is_expired:
                raise InvalidPasswordResetToken(INVALID_RESET_TOKEN_MESSAGE)

            user = locked_token.user
            validate_password(raw_password, user=user)
            user.set_password(raw_password)
            user.save(update_fields=["password", "updated_at"])

            locked_token.used_at = now
            locked_token.save(update_fields=["used_at"])

            invalidated_tokens = (
                PasswordResetToken.objects.filter(
                    user=user,
                    used_at__isnull=True,
                    expires_at__gt=now,
                )
                .exclude(pk=locked_token.pk)
                .update(used_at=now)
            )

            transaction.on_commit(lambda user_id=user.pk: _send_password_changed_notification_safely(user_id))
    except PasswordResetToken.DoesNotExist as exc:
        raise InvalidPasswordResetToken(INVALID_RESET_TOKEN_MESSAGE) from exc

    create_audit_log(
        request=request,
        user=token_record.user,
        action="password_reset_success",
        entity_type="CustomUser",
        entity_id=token_record.user.pk,
        old_value={"reset_token_id": token_record.pk},
        new_value={"invalidated_token_count": invalidated_tokens},
    )
    return invalidated_tokens
