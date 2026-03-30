"""VenueFeature-related Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Union

from pydantic import BaseModel, Field


class VenueFeatureCreate(BaseModel):
    """Schema for creating a venue feature."""

    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(...)  # dance_floor, bar, cake_table, stage, custom
    shape: str = Field(default="rectangle")  # rectangle, circle
    x: float = Field(default=0.0)
    y: float = Field(default=0.0)
    width: float = Field(default=100.0)
    height: float = Field(default=100.0)
    rotation: float = Field(default=0.0)


class VenueFeatureUpdate(BaseModel):
    """Schema for updating a venue feature. All fields optional."""

    name: Union[str, None] = Field(None, min_length=1, max_length=255)
    type: Union[str, None] = None
    shape: Union[str, None] = None
    x: Union[float, None] = None
    y: Union[float, None] = None
    width: Union[float, None] = None
    height: Union[float, None] = None
    rotation: Union[float, None] = None


class VenueFeatureResponse(BaseModel):
    """Venue feature representation in API responses."""

    id: uuid.UUID
    layout_id: uuid.UUID
    name: str
    type: str
    shape: str
    x: float
    y: float
    width: float
    height: float
    rotation: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
