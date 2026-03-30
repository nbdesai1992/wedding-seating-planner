"""Guest-related Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Union

from pydantic import BaseModel, Field


class GuestCreate(BaseModel):
    """Schema for creating a guest."""

    name: str = Field(..., min_length=1, max_length=255)
    email: Union[str, None] = None
    meal_preference: Union[str, None] = None
    is_plus_one: bool = False
    plus_one_of: Union[uuid.UUID, None] = None
    group_tag: Union[str, None] = None
    notes: Union[str, None] = None


class GuestUpdate(BaseModel):
    """Schema for updating a guest. All fields optional."""

    name: Union[str, None] = Field(None, min_length=1, max_length=255)
    email: Union[str, None] = None
    meal_preference: Union[str, None] = None
    is_plus_one: Union[bool, None] = None
    plus_one_of: Union[uuid.UUID, None] = None
    group_tag: Union[str, None] = None
    notes: Union[str, None] = None


class GuestResponse(BaseModel):
    """Public guest representation returned in API responses."""

    id: uuid.UUID
    event_id: uuid.UUID
    name: str
    email: Union[str, None] = None
    meal_preference: Union[str, None] = None
    is_plus_one: bool = False
    plus_one_of: Union[uuid.UUID, None] = None
    group_tag: Union[str, None] = None
    notes: Union[str, None] = None
    table_id: Union[uuid.UUID, None] = None
    seat_index: Union[int, None] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
