"""Event model."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import List, Optional

from sqlalchemy import String, Date, Text, DateTime, ForeignKey
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    venue_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="events")  # noqa: F821
    guests: Mapped[List["Guest"]] = relationship(  # noqa: F821
        back_populates="event", cascade="all, delete-orphan"
    )
    layout: Mapped[Optional["Layout"]] = relationship(  # noqa: F821
        back_populates="event", cascade="all, delete-orphan", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Event {self.name}>"
