"""Authentication-related Pydantic schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Schema returned after successful registration or login."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
