"""Authentication middleware: FastAPI dependency for Clerk JWT-protected endpoints.

Verifies Clerk-issued RS256 JWTs against Clerk's JWKS endpoint.
On first request from a new Clerk user, auto-creates a local User record.
"""

from __future__ import annotations

import base64
import logging
import os
from typing import Optional

import httpx
import jwt as pyjwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# HTTPBearer extracts the token from `Authorization: Bearer <token>`
security = HTTPBearer()

# Module-level JWKS client (lazy-initialized, cached)
_jwks_client: Optional[PyJWKClient] = None


def _get_clerk_domain() -> str:
    """Derive Clerk's FAPI domain from the publishable key.

    The publishable key format is ``pk_{env}_{base64}``, where the
    base64 portion decodes to ``{domain}$``.
    """
    pk = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
    parts = pk.split("_", 2)
    if len(parts) == 3:
        encoded = parts[2]
        # Add base64 padding if needed
        padding = 4 - len(encoded) % 4
        if padding != 4:
            encoded += "=" * padding
        decoded = base64.b64decode(encoded).decode("utf-8").rstrip("$")
        return decoded
    raise ValueError("Invalid Clerk publishable key format")


def _get_jwks_client() -> PyJWKClient:
    """Get or create the cached JWKS client for Clerk token verification."""
    global _jwks_client
    if _jwks_client is None:
        domain = _get_clerk_domain()
        jwks_url = f"https://{domain}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


def reset_jwks_client() -> None:
    """Reset the cached JWKS client (useful for testing)."""
    global _jwks_client
    _jwks_client = None


def _fetch_clerk_user(clerk_user_id: str) -> dict:
    """Fetch user details from Clerk Backend API.

    Returns the Clerk user object with email, name, etc.
    """
    secret_key = os.getenv("CLERK_SECRET_KEY", "")
    resp = httpx.get(
        f"https://api.clerk.com/v1/users/{clerk_user_id}",
        headers={"Authorization": f"Bearer {secret_key}"},
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency that verifies a Clerk JWT from the Authorization
    header and returns the authenticated local User.

    On first request from a new Clerk user, auto-creates a local User
    by fetching their profile from the Clerk Backend API.

    Raises 401 if the token is missing, invalid, expired, or cannot be
    verified against Clerk's JWKS.
    """
    token = credentials.credentials

    try:
        # Get the signing key from Clerk's JWKS
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode and verify the JWT
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk doesn't set aud by default
        )
    except Exception as e:
        logger.warning("JWT verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Look up existing user by clerk_id
    user = db.query(User).filter(User.clerk_id == clerk_user_id).first()

    if user is not None:
        return user

    # First-time user → fetch profile from Clerk and create local record
    try:
        clerk_data = _fetch_clerk_user(clerk_user_id)
        email_addresses = clerk_data.get("email_addresses", [])
        email = (
            email_addresses[0].get("email_address", "")
            if email_addresses
            else ""
        )
        first_name = clerk_data.get("first_name", "") or ""
        last_name = clerk_data.get("last_name", "") or ""
        name = f"{first_name} {last_name}".strip() or email.split("@")[0]
    except Exception as e:
        logger.warning("Failed to fetch Clerk user details: %s", e)
        # Fallback: use minimal info from the token
        email = payload.get("email", f"{clerk_user_id}@clerk.user")
        name = payload.get("name", clerk_user_id)

    if not email:
        email = f"{clerk_user_id}@clerk.user"

    user = User(
        clerk_id=clerk_user_id,
        email=email,
        name=name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Auto-created local user for Clerk ID %s", clerk_user_id)
    return user
