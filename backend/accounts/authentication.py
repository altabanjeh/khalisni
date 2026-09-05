"""Versioned JWT authentication (defect D4).

Every access/refresh token issued by :class:`accounts.serializers.CustomTokenObtainPairSerializer`
carries a ``token_version`` claim equal to the user's ``CustomUser.token_version``
at issue time. When a password is reset, or the user explicitly logs out from all
devices, that counter is incremented and every outstanding token becomes invalid
immediately -- closing the "stolen access token stays valid until it expires"
gap that a plain ``JWTAuthentication`` + refresh-blacklist leaves open.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class VersionedJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        token_version = validated_token.get("token_version")
        current_version = int(getattr(user, "token_version", 1) or 1)

        # Tokens minted before this feature shipped have no claim; treat the
        # baseline version (1) as acceptable so existing sessions are not broken
        # on deploy. Any later reset/logout-all bumps the counter past 1.
        if token_version is None:
            if current_version != 1:
                raise AuthenticationFailed(
                    "Token has been revoked. Please sign in again.",
                    code="token_revoked",
                )
            return user

        if int(token_version) != current_version:
            raise AuthenticationFailed(
                {"detail": "Token has been revoked. Please sign in again.", "code": "token_revoked"},
                code="token_revoked",
            )
        return user
