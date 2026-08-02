"""Seat model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Integer, Float, DateTime, ForeignKey
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Seat(Base):
    __tablename__ = "seats"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    table_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("tables.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seat_index: Mapped[int] = mapped_column(Integer, nullable=False)
    guest_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(), ForeignKey("guests.id", ondelete="SET NULL"), nullable=True
    )
    x_offset: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y_offset: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    table: Mapped["Table"] = relationship(back_populates="seats")  # noqa: F821
    guest: Mapped[Optional["Guest"]] = relationship()  # noqa: F821

    def __repr__(self) -> str:
        return f"<Seat table_id={self.table_id} index={self.seat_index}>"
