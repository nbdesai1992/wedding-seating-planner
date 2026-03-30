"""Table-related Pydantic schemas."""

import uuid
from datetime import datetime
from typing import List, Union

from pydantic import BaseModel, Field

from app.schemas.seat import SeatResponse


class TableCreate(BaseModel):
    """Schema for creating a table."""

    name: str = Field(..., min_length=1, max_length=255)
    shape: str = Field(default="round")  # round, rectangle, sweetheart
    x: float = Field(default=0.0)
    y: float = Field(default=0.0)
    width: float = Field(default=100.0)
    height: float = Field(default=100.0)
    rotation: float = Field(default=0.0)
    seat_count: int = Field(default=8, ge=1, le=50)


class TableUpdate(BaseModel):
    """Schema for updating a table. All fields optional."""

    name: Union[str, None] = Field(None, min_length=1, max_length=255)
    shape: Union[str, None] = None
    x: Union[float, None] = None
    y: Union[float, None] = None
    width: Union[float, None] = None
    height: Union[float, None] = None
    rotation: Union[float, None] = None
    seat_count: Union[int, None] = Field(None, ge=1, le=50)


class TableResponse(BaseModel):
    """Table representation with nested seats."""

    id: uuid.UUID
    layout_id: uuid.UUID
    name: str
    shape: str
    x: float
    y: float
    width: float
    height: float
    rotation: float
    seat_count: int
    seats: List[SeatResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
