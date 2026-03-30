"""Guest CRUD endpoints + CSV import for an event."""

from __future__ import annotations

import csv
import io
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.event import Event
from app.models.guest import Guest
from app.models.user import User
from app.schemas.guest import GuestCreate, GuestUpdate, GuestResponse

router = APIRouter(prefix="/api/events/{event_id}/guests", tags=["guests"])


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


def _guest_to_response(guest: Guest) -> GuestResponse:
    """Convert a Guest ORM object to a GuestResponse."""
    return GuestResponse(
        id=guest.id,
        event_id=guest.event_id,
        name=guest.name,
        email=guest.email,
        meal_preference=guest.meal_preference,
        is_plus_one=guest.is_plus_one,
        plus_one_of=guest.plus_one_of,
        group_tag=guest.group_tag,
        notes=guest.notes,
        table_id=guest.table_id,
        seat_index=guest.seat_index,
        created_at=guest.created_at,
        updated_at=guest.updated_at,
    )


@router.get("", response_model=List[GuestResponse])
def list_guests(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all guests for the given event."""
    _get_user_event_or_404(event_id, current_user.id, db)

    guests = (
        db.query(Guest)
        .filter(Guest.event_id == event_id)
        .order_by(Guest.created_at.asc())
        .all()
    )
    return [_guest_to_response(g) for g in guests]


@router.post("", response_model=GuestResponse, status_code=status.HTTP_201_CREATED)
def create_guest(
    event_id: uuid.UUID,
    payload: GuestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a single guest for the given event."""
    _get_user_event_or_404(event_id, current_user.id, db)

    guest = Guest(
        event_id=event_id,
        name=payload.name,
        email=payload.email,
        meal_preference=payload.meal_preference,
        is_plus_one=payload.is_plus_one,
        plus_one_of=payload.plus_one_of,
        group_tag=payload.group_tag,
        notes=payload.notes,
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)

    return _guest_to_response(guest)


@router.put("/{guest_id}", response_model=GuestResponse)
def update_guest(
    event_id: uuid.UUID,
    guest_id: uuid.UUID,
    payload: GuestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a guest. Must belong to an event owned by the authenticated user."""
    _get_user_event_or_404(event_id, current_user.id, db)

    guest = (
        db.query(Guest)
        .filter(Guest.id == guest_id, Guest.event_id == event_id)
        .first()
    )
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guest, field, value)

    db.commit()
    db.refresh(guest)

    return _guest_to_response(guest)


@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(
    event_id: uuid.UUID,
    guest_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a guest. Must belong to an event owned by the authenticated user."""
    _get_user_event_or_404(event_id, current_user.id, db)

    guest = (
        db.query(Guest)
        .filter(Guest.id == guest_id, Guest.event_id == event_id)
        .first()
    )
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest not found",
        )

    db.delete(guest)
    db.commit()

    return None


@router.post(
    "/import-csv",
    response_model=List[GuestResponse],
    status_code=status.HTTP_201_CREATED,
)
async def import_csv(
    event_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk import guests from a CSV file upload.

    Required column: name
    Optional columns: email, meal_preference, group_tag, notes
    Rows with empty names are skipped.
    """
    _get_user_event_or_404(event_id, current_user.id, db)

    # Read and decode CSV content
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handles BOM if present
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded CSV",
        )

    reader = csv.DictReader(io.StringIO(text))

    # Validate that 'name' column exists
    if reader.fieldnames is None or "name" not in reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must contain a 'name' column",
        )

    created_guests: list[Guest] = []
    for row in reader:
        name = (row.get("name") or "").strip()
        if not name:
            continue  # skip rows with empty names

        guest = Guest(
            event_id=event_id,
            name=name,
            email=(row.get("email") or "").strip() or None,
            meal_preference=(row.get("meal_preference") or "").strip() or None,
            group_tag=(row.get("group_tag") or "").strip() or None,
            notes=(row.get("notes") or "").strip() or None,
        )
        db.add(guest)
        created_guests.append(guest)

    db.commit()

    # Refresh all to get IDs and timestamps
    for guest in created_guests:
        db.refresh(guest)

    return [_guest_to_response(g) for g in created_guests]
