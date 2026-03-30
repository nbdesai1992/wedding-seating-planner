"""User-related Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    """Public user representation returned in API responses."""

    id: uuid.UUID
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
