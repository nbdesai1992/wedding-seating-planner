"""Table model."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TableShape(str, enum.Enum):
    round = "round"
    rectangle = "rectangle"
    sweetheart = "sweetheart"


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    layout_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("layouts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    shape: Mapped[TableShape] = mapped_column(
        Enum(TableShape, name="table_shape", create_constraint=True),
        nullable=False,
        default=TableShape.round,
    )
    x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    width: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    height: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    rotation: Mapped[float] = mapped_column(Float, default=0.0)
    seat_count: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    layout: Mapped["Layout"] = relationship(back_populates="tables")  # noqa: F821
    seats: Mapped[List["Seat"]] = relationship(  # noqa: F821
        back_populates="table", cascade="all, delete-orphan"
    )
    guests: Mapped[List["Guest"]] = relationship(back_populates="table")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Table {self.name}>"
