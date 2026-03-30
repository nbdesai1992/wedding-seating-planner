"""Event-related Pydantic schemas."""

import uuid
from datetime import date as DateType, datetime
from typing import Union

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    """Schema for creating an event."""

    name: str = Field(..., min_length=1, max_length=255)
    date: Union[DateType, None] = None
    venue_description: Union[str, None] = None


class EventUpdate(BaseModel):
    """Schema for updating an event. All fields optional."""

    name: Union[str, None] = Field(None, min_length=1, max_length=255)
    date: Union[DateType, None] = None
    venue_description: Union[str, None] = None


class EventResponse(BaseModel):
    """Public event representation returned in API responses."""

    id: uuid.UUID
    name: str
    date: Union[DateType, None] = None
    venue_description: Union[str, None] = None
    created_at: datetime
    updated_at: datetime
    guest_count: int = 0

    class Config:
        from_attributes = True
