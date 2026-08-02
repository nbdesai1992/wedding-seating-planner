"""Layout model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import Integer, Float, DateTime, ForeignKey
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Layout(Base):
    __tablename__ = "layouts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("events.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    canvas_width: Mapped[int] = mapped_column(Integer, default=2000)
    canvas_height: Mapped[int] = mapped_column(Integer, default=1500)
    zoom_level: Mapped[float] = mapped_column(Float, default=1.0)
    pan_x: Mapped[float] = mapped_column(Float, default=0.0)
    pan_y: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="layout")  # noqa: F821
    tables: Mapped[List["Table"]] = relationship(  # noqa: F821
        back_populates="layout", cascade="all, delete-orphan"
    )
    venue_features: Mapped[List["VenueFeature"]] = relationship(  # noqa: F821
        back_populates="layout", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Layout event_id={self.event_id}>"
