"""AI Seating Suggestions & Bulk-Apply endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.event import Event
from app.models.guest import Guest
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table
from app.models.user import User
from app.schemas.seating import (
    BulkApplyRequest,
    BulkApplyResponse,
    SeatingSuggestRequest,
    SeatingSuggestResponse,
    SeatingSuggestion,
    UnassignedGuest,
)
from app.services.seating_suggester import suggest_seating

router = APIRouter(
    prefix="/api/events/{event_id}/seating",
    tags=["seating"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# POST /seating/suggest
# ---------------------------------------------------------------------------


@router.post("/suggest", response_model=SeatingSuggestResponse)
def suggest(
    event_id: uuid.UUID,
    payload: SeatingSuggestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Use AI to suggest seating assignments for unseated guests.

    Accepts optional constraints (group_together, keep_apart, near_head_table).
    Returns suggestions that the user can accept or reject — does NOT auto-apply.
    """
    _get_user_event_or_404(event_id, current_user.id, db)

    # Validate constraint types
    valid_types = {"group_together", "keep_apart", "near_head_table"}
    for constraint in payload.constraints:
        if constraint.type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid constraint type: {constraint.type}. Must be one of: {', '.join(sorted(valid_types))}",
            )

    # Build constraints as plain dicts for the service
    constraints = [
        {"type": c.type, "guest_ids": c.guest_ids}
        for c in payload.constraints
    ]

    try:
        suggestions, unassigned = suggest_seating(
            event_id=str(event_id),
            constraints=constraints,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    except RuntimeError as e:
        # ANTHROPIC_API_KEY not configured
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    return SeatingSuggestResponse(
        suggestions=[SeatingSuggestion(**s) for s in suggestions],
        unassigned=[UnassignedGuest(**u) for u in unassigned],
    )


# ---------------------------------------------------------------------------
# POST /seating/apply
# ---------------------------------------------------------------------------


@router.post("/apply", response_model=BulkApplyResponse)
def bulk_apply(
    event_id: uuid.UUID,
    payload: BulkApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Apply multiple seat assignments at once.

    Validates each assignment:
    - Seat must exist and belong to this event's layout
    - Guest must exist and belong to this event
    """
    _get_user_event_or_404(event_id, current_user.id, db)

    applied = 0
    errors = []

    for assignment in payload.assignments:
        # Find the seat — must belong to a table in this event's layout
        seat = (
            db.query(Seat)
            .join(Table, Seat.table_id == Table.id)
            .join(Layout, Table.layout_id == Layout.id)
            .filter(
                Seat.id == assignment.seat_id,
                Layout.event_id == event_id,
            )
            .first()
        )
        if seat is None:
            errors.append(
                f"Seat {assignment.seat_id} not found in this event's layout"
            )
            continue

        # Find the guest — must belong to this event
        guest = (
            db.query(Guest)
            .filter(Guest.id == assignment.guest_id, Guest.event_id == event_id)
            .first()
        )
        if guest is None:
            errors.append(
                f"Guest {assignment.guest_id} not found in this event"
            )
            continue

        # Unassign guest from any previous seat
        previous_seat = (
            db.query(Seat)
            .filter(Seat.guest_id == assignment.guest_id)
            .first()
        )
        if previous_seat is not None and previous_seat.id != assignment.seat_id:
            previous_seat.guest_id = None

        # Unassign existing guest from this seat if occupied by someone else
        if seat.guest_id is not None and seat.guest_id != assignment.guest_id:
            old_guest = db.query(Guest).filter(Guest.id == seat.guest_id).first()
            if old_guest:
                old_guest.table_id = None
                old_guest.seat_index = None

        # Assign
        seat.guest_id = assignment.guest_id
        guest.table_id = seat.table_id
        guest.seat_index = seat.seat_index
        applied += 1

    db.commit()

    return BulkApplyResponse(applied=applied, errors=errors)
