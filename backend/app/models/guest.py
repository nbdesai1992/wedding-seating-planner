"""Guest model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    meal_preference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_plus_one: Mapped[bool] = mapped_column(Boolean, default=False)
    plus_one_of: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(), ForeignKey("guests.id", ondelete="SET NULL"), nullable=True
    )
    group_tag: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    table_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(), ForeignKey("tables.id", ondelete="SET NULL"), nullable=True, index=True
    )
    seat_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    event: Mapped["Event"] = relationship(back_populates="guests")  # noqa: F821
    table: Mapped[Optional["Table"]] = relationship(back_populates="guests")  # noqa: F821
    plus_one_guest: Mapped[Optional["Guest"]] = relationship(
        remote_side="Guest.id",
        foreign_keys=[plus_one_of],
    )

    def __repr__(self) -> str:
        return f"<Guest {self.name}>"
