"""Authentication endpoints.

With Clerk handling registration, login, and session management,
only the ``/me`` endpoint remains — it returns the currently
authenticated user based on the Clerk JWT.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.user import UserResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return UserResponse.model_validate(current_user)
