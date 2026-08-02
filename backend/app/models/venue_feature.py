"""VenueFeature model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, ForeignKey, Enum
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VenueFeatureType(str, enum.Enum):
    dance_floor = "dance_floor"
    bar = "bar"
    cake_table = "cake_table"
    stage = "stage"
    custom = "custom"


class VenueFeatureShape(str, enum.Enum):
    rectangle = "rectangle"
    circle = "circle"


class VenueFeature(Base):
    __tablename__ = "venue_features"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    layout_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("layouts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[VenueFeatureType] = mapped_column(
        Enum(VenueFeatureType, name="venue_feature_type", create_constraint=True),
        nullable=False,
    )
    shape: Mapped[VenueFeatureShape] = mapped_column(
        Enum(VenueFeatureShape, name="venue_feature_shape", create_constraint=True),
        nullable=False,
        default=VenueFeatureShape.rectangle,
    )
    x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    width: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    height: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    rotation: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    layout: Mapped["Layout"] = relationship(back_populates="venue_features")  # noqa: F821

    def __repr__(self) -> str:
        return f"<VenueFeature {self.name} ({self.type.value})>"
