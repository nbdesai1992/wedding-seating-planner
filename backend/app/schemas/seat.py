"""Seat-related Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Union

from pydantic import BaseModel


class SeatResponse(BaseModel):
    """Seat representation in API responses."""

    id: uuid.UUID
    table_id: uuid.UUID
    seat_index: int
    guest_id: Union[uuid.UUID, None] = None
    guest_name: Union[str, None] = None
    x_offset: float
    y_offset: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SeatAssign(BaseModel):
    """Schema for assigning a guest to a seat."""

    guest_id: uuid.UUID
