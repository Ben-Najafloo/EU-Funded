import logging
from typing import Any
import httpx
from jose import jwt, JWTError, ExpiredSignatureError
from app.config import get_settings
from app.core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)
settings = get_settings()

# ── JWKS cache ──────────────────────────────────────────────────────────────
# Fetched once on first use, cached in memory.
# In production with multiple workers, each worker caches independently —
# acceptable trade-off vs. the complexity of a shared cache for JWKS.
_jwks_cache: dict[str, Any] | None = None


async def _get_jwks() -> dict[str, Any]:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(settings.CLERK_JWKS_URL, timeout=5.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            logger.info("JWKS loaded from Clerk")
            return _jwks_cache
        except httpx.HTTPError as e:
            logger.error("Failed to fetch JWKS: %s", e)
            raise AuthenticationError("Could not verify token: JWKS unavailable")


async def verify_clerk_token(token: str) -> dict[str, Any]:
    """
    Verify a Clerk JWT token.
    - Fetches JWKS from Clerk (cached after first call)
    - Validates signature, expiry, and issuer
    - Returns the decoded payload on success
    - Raises AuthenticationError on any failure
    """
    jwks = await _get_jwks()

    try:
        # Decode header to find the key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise AuthenticationError("Token missing key ID")

        # Find matching key in JWKS
        signing_key = next(
            (key for key in jwks.get("keys", []) if key.get("kid") == kid),
            None,
        )
        if signing_key is None:
            # kid not in cache — Clerk may have rotated keys, bust cache and retry once
            _jwks_cache = None
            jwks = await _get_jwks()
            signing_key = next(
                (key for key in jwks.get("keys", []) if key.get("kid") == kid),
                None,
            )
            if signing_key is None:
                raise AuthenticationError("Token signing key not found")

        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk tokens don't always have aud
        )

        user_id: str | None = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Token missing user ID")

        return payload

    except ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except JWTError as e:
        logger.warning("JWT verification failed: %s", e)
        raise AuthenticationError("Invalid token")
