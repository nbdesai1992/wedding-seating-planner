"""Layout-related Pydantic schemas."""

import uuid
from datetime import datetime
from typing import List, Union

from pydantic import BaseModel, Field

from app.schemas.table import TableResponse
from app.schemas.venue_feature import VenueFeatureResponse


class LayoutUpdate(BaseModel):
    """Schema for updating layout canvas properties. All fields optional."""

    canvas_width: Union[int, None] = None
    canvas_height: Union[int, None] = None
    zoom_level: Union[float, None] = None
    pan_x: Union[float, None] = None
    pan_y: Union[float, None] = None


class LayoutResponse(BaseModel):
    """Full layout representation with nested tables and features."""

    id: uuid.UUID
    event_id: uuid.UUID
    canvas_width: int
    canvas_height: int
    zoom_level: float
    pan_x: float
    pan_y: float
    tables: List[TableResponse] = []
    features: List[VenueFeatureResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
