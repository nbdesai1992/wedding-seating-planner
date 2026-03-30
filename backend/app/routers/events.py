"""Event CRUD endpoints: list, create, get, update, delete."""

from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.event import Event
from app.models.guest import Guest
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventResponse

router = APIRouter(prefix="/api/events", tags=["events"])


def _event_to_response(event: Event, guest_count: int) -> EventResponse:
    """Convert an Event ORM object + guest count to an EventResponse."""
    return EventResponse(
        id=event.id,
        name=event.name,
        date=event.date,
        venue_description=event.venue_description,
        created_at=event.created_at,
        updated_at=event.updated_at,
        guest_count=guest_count,
    )


def _get_user_event_or_404(
    event_id: uuid.UUID, user_id: uuid.UUID, db: Session
) -> Event:
    """Fetch an event by ID. Raise 404 if not found, 403 if not owned by user."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    if event.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this event",
        )
    return event


@router.get("", response_model=List[EventResponse])
def list_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all events for the authenticated user."""
    # Query events with guest counts via a subquery
    guest_count_subq = (
        db.query(Guest.event_id, func.count(Guest.id).label("cnt"))
        .group_by(Guest.event_id)
        .subquery()
    )

    results = (
        db.query(Event, func.coalesce(guest_count_subq.c.cnt, 0).label("guest_count"))
        .outerjoin(guest_count_subq, Event.id == guest_count_subq.c.event_id)
        .filter(Event.user_id == current_user.id)
        .order_by(Event.created_at.desc())
        .all()
    )

    return [_event_to_response(event, guest_count) for event, guest_count in results]


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new event for the authenticated user."""
    event = Event(
        user_id=current_user.id,
        name=payload.name,
        date=payload.date,
        venue_description=payload.venue_description,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return _event_to_response(event, 0)


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get an event by ID. Must belong to the authenticated user."""
    event = _get_user_event_or_404(event_id, current_user.id, db)

    guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0

    return _event_to_response(event, guest_count)


@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an event. Must belong to the authenticated user."""
    event = _get_user_event_or_404(event_id, current_user.id, db)

    # Apply only the fields that were explicitly set
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    guest_count = db.query(func.count(Guest.id)).filter(Guest.event_id == event.id).scalar() or 0

    return _event_to_response(event, guest_count)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an event and all associated data. Must belong to the authenticated user."""
    event = _get_user_event_or_404(event_id, current_user.id, db)

    db.delete(event)
    db.commit()

    return None
