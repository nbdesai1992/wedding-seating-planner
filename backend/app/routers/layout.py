"""Layout, Table, Seat & VenueFeature CRUD endpoints."""

from __future__ import annotations

import math
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.event import Event
from app.models.guest import Guest
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table, TableShape
from app.models.venue_feature import VenueFeature, VenueFeatureType, VenueFeatureShape
from app.models.user import User
from app.schemas.layout import LayoutResponse, LayoutUpdate
from app.schemas.table import TableCreate, TableUpdate, TableResponse
from app.schemas.seat import SeatResponse, SeatAssign
from app.schemas.venue_feature import (
    VenueFeatureCreate,
    VenueFeatureUpdate,
    VenueFeatureResponse,
)

router = APIRouter(prefix="/api/events/{event_id}/layout", tags=["layout"])


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


def _get_or_create_layout(event_id: uuid.UUID, db: Session) -> Layout:
    """Lazily initialize layout for an event — create if it doesn't exist."""
    layout = db.query(Layout).filter(Layout.event_id == event_id).first()
    if layout is None:
        layout = Layout(event_id=event_id)
        db.add(layout)
        db.commit()
        db.refresh(layout)
    return layout


def _generate_seat_positions(seat_count: int, shape: str) -> list[tuple[float, float]]:
    """Calculate seat positions around a table based on its shape.

    Returns list of (x_offset, y_offset) tuples representing seat positions
    relative to the table center.
    """
    positions = []
    if shape == "round" or shape == "sweetheart":
        # Distribute seats evenly around a circle
        radius = 50.0  # relative offset radius
        for i in range(seat_count):
            angle = (2 * math.pi * i) / seat_count
            x = round(radius * math.cos(angle), 2)
            y = round(radius * math.sin(angle), 2)
            positions.append((x, y))
    else:
        # Rectangle: distribute along the perimeter
        # Split seats along the long sides
        if seat_count <= 2:
            # One on each short side
            for i in range(seat_count):
                x = -50.0 + i * 100.0
                positions.append((x, 0.0))
        else:
            # Distribute evenly: half on top, half on bottom
            top_count = seat_count // 2
            bottom_count = seat_count - top_count
            spacing_top = 100.0 / (top_count + 1)
            for i in range(top_count):
                x = -50.0 + spacing_top * (i + 1)
                positions.append((round(x, 2), -30.0))
            spacing_bottom = 100.0 / (bottom_count + 1)
            for i in range(bottom_count):
                x = -50.0 + spacing_bottom * (i + 1)
                positions.append((round(x, 2), 30.0))
    return positions


def _create_seats_for_table(table: Table, db: Session) -> list[Seat]:
    """Generate Seat records for a table based on its seat_count and shape."""
    positions = _generate_seat_positions(table.seat_count, table.shape.value)
    seats = []
    for i, (x_off, y_off) in enumerate(positions):
        seat = Seat(
            table_id=table.id,
            seat_index=i,
            x_offset=x_off,
            y_offset=y_off,
        )
        db.add(seat)
        seats.append(seat)
    return seats


def _seat_to_response(seat: Seat) -> SeatResponse:
    """Convert a Seat ORM object to SeatResponse, including guest_name."""
    guest_name = None
    if seat.guest is not None:
        guest_name = seat.guest.name
    return SeatResponse(
        id=seat.id,
        table_id=seat.table_id,
        seat_index=seat.seat_index,
        guest_id=seat.guest_id,
        guest_name=guest_name,
        x_offset=seat.x_offset,
        y_offset=seat.y_offset,
        created_at=seat.created_at,
        updated_at=seat.updated_at,
    )


def _table_to_response(table: Table) -> TableResponse:
    """Convert a Table ORM object to TableResponse with nested seats."""
    sorted_seats = sorted(table.seats, key=lambda s: s.seat_index)
    return TableResponse(
        id=table.id,
        layout_id=table.layout_id,
        name=table.name,
        shape=table.shape.value,
        x=table.x,
        y=table.y,
        width=table.width,
        height=table.height,
        rotation=table.rotation,
        seat_count=table.seat_count,
        seats=[_seat_to_response(s) for s in sorted_seats],
        created_at=table.created_at,
        updated_at=table.updated_at,
    )


def _feature_to_response(feature: VenueFeature) -> VenueFeatureResponse:
    """Convert a VenueFeature ORM object to VenueFeatureResponse."""
    return VenueFeatureResponse(
        id=feature.id,
        layout_id=feature.layout_id,
        name=feature.name,
        type=feature.type.value,
        shape=feature.shape.value,
        x=feature.x,
        y=feature.y,
        width=feature.width,
        height=feature.height,
        rotation=feature.rotation,
        created_at=feature.created_at,
        updated_at=feature.updated_at,
    )


def _layout_to_response(layout: Layout) -> LayoutResponse:
    """Convert a Layout ORM object to LayoutResponse with nested data."""
    return LayoutResponse(
        id=layout.id,
        event_id=layout.event_id,
        canvas_width=layout.canvas_width,
        canvas_height=layout.canvas_height,
        zoom_level=layout.zoom_level,
        pan_x=layout.pan_x,
        pan_y=layout.pan_y,
        tables=[_table_to_response(t) for t in layout.tables],
        features=[_feature_to_response(f) for f in layout.venue_features],
        created_at=layout.created_at,
        updated_at=layout.updated_at,
    )


# ---------------------------------------------------------------------------
# Layout Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=LayoutResponse)
def get_layout(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get layout for an event. Creates layout lazily if it doesn't exist."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    # Eagerly load relationships
    layout = (
        db.query(Layout)
        .options(
            joinedload(Layout.tables).joinedload(Table.seats).joinedload(Seat.guest),
            joinedload(Layout.venue_features),
        )
        .filter(Layout.id == layout.id)
        .first()
    )
    return _layout_to_response(layout)


@router.put("", response_model=LayoutResponse)
def update_layout(
    event_id: uuid.UUID,
    payload: LayoutUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update layout canvas properties (width, height, zoom, pan)."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(layout, field, value)

    db.commit()
    db.refresh(layout)

    # Reload with relationships
    layout = (
        db.query(Layout)
        .options(
            joinedload(Layout.tables).joinedload(Table.seats).joinedload(Seat.guest),
            joinedload(Layout.venue_features),
        )
        .filter(Layout.id == layout.id)
        .first()
    )
    return _layout_to_response(layout)


# ---------------------------------------------------------------------------
# Table Endpoints
# ---------------------------------------------------------------------------


@router.post("/tables", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
def create_table(
    event_id: uuid.UUID,
    payload: TableCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a table and auto-generate seats based on seat_count."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    # Validate shape
    try:
        shape_enum = TableShape(payload.shape)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid table shape: {payload.shape}. Must be one of: round, rectangle, sweetheart",
        )

    table = Table(
        layout_id=layout.id,
        name=payload.name,
        shape=shape_enum,
        x=payload.x,
        y=payload.y,
        width=payload.width,
        height=payload.height,
        rotation=payload.rotation,
        seat_count=payload.seat_count,
    )
    db.add(table)
    db.commit()
    db.refresh(table)

    # Auto-generate seats
    seats = _create_seats_for_table(table, db)
    db.commit()
    for s in seats:
        db.refresh(s)

    # Reload table with seats
    table = (
        db.query(Table)
        .options(joinedload(Table.seats).joinedload(Seat.guest))
        .filter(Table.id == table.id)
        .first()
    )
    return _table_to_response(table)


@router.put("/tables/{table_id}", response_model=TableResponse)
def update_table(
    event_id: uuid.UUID,
    table_id: uuid.UUID,
    payload: TableUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update table properties. If seat_count changes, regenerate seats."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    table = (
        db.query(Table)
        .filter(Table.id == table_id, Table.layout_id == layout.id)
        .first()
    )
    if table is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Validate shape if provided
    if "shape" in update_data:
        try:
            update_data["shape"] = TableShape(update_data["shape"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid table shape: {update_data['shape']}. Must be one of: round, rectangle, sweetheart",
            )

    old_seat_count = table.seat_count
    new_seat_count = update_data.get("seat_count", old_seat_count)

    # Apply updates
    for field, value in update_data.items():
        setattr(table, field, value)

    # If seat_count changed, adjust seats
    if new_seat_count != old_seat_count:
        _adjust_seats(table, old_seat_count, new_seat_count, db)

    db.commit()
    db.refresh(table)

    # Reload with seats
    table = (
        db.query(Table)
        .options(joinedload(Table.seats).joinedload(Seat.guest))
        .filter(Table.id == table.id)
        .first()
    )
    return _table_to_response(table)


def _adjust_seats(table: Table, old_count: int, new_count: int, db: Session):
    """Adjust seats when seat_count changes.

    If decreasing: remove excess seats (unassigning any guests).
    If increasing: add new seats with calculated positions.
    """
    existing_seats = sorted(
        db.query(Seat).filter(Seat.table_id == table.id).all(),
        key=lambda s: s.seat_index,
    )

    if new_count < old_count:
        # Remove seats with highest indices
        seats_to_remove = existing_seats[new_count:]
        for seat in seats_to_remove:
            # Unassign guest if any
            if seat.guest_id is not None:
                guest = db.query(Guest).filter(Guest.id == seat.guest_id).first()
                if guest:
                    guest.table_id = None
                    guest.seat_index = None
            db.delete(seat)

    if new_count > old_count:
        # Regenerate all seat positions for the new count
        positions = _generate_seat_positions(new_count, table.shape.value)
        # Update existing seat positions
        for i, seat in enumerate(existing_seats):
            if i < len(positions):
                seat.x_offset = positions[i][0]
                seat.y_offset = positions[i][1]
        # Add new seats
        for i in range(old_count, new_count):
            seat = Seat(
                table_id=table.id,
                seat_index=i,
                x_offset=positions[i][0],
                y_offset=positions[i][1],
            )
            db.add(seat)


@router.delete("/tables/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(
    event_id: uuid.UUID,
    table_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a table and all its seats."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    table = (
        db.query(Table)
        .filter(Table.id == table_id, Table.layout_id == layout.id)
        .first()
    )
    if table is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    # Unassign any guests seated at this table
    guests_at_table = db.query(Guest).filter(Guest.table_id == table.id).all()
    for guest in guests_at_table:
        guest.table_id = None
        guest.seat_index = None

    db.delete(table)
    db.commit()

    return None


# ---------------------------------------------------------------------------
# Venue Feature Endpoints
# ---------------------------------------------------------------------------


@router.post("/features", response_model=VenueFeatureResponse, status_code=status.HTTP_201_CREATED)
def create_feature(
    event_id: uuid.UUID,
    payload: VenueFeatureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a venue feature (dance floor, bar, etc.)."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    # Validate type
    try:
        type_enum = VenueFeatureType(payload.type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid feature type: {payload.type}. Must be one of: dance_floor, bar, cake_table, stage, custom",
        )

    # Validate shape
    try:
        shape_enum = VenueFeatureShape(payload.shape)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid feature shape: {payload.shape}. Must be one of: rectangle, circle",
        )

    feature = VenueFeature(
        layout_id=layout.id,
        name=payload.name,
        type=type_enum,
        shape=shape_enum,
        x=payload.x,
        y=payload.y,
        width=payload.width,
        height=payload.height,
        rotation=payload.rotation,
    )
    db.add(feature)
    db.commit()
    db.refresh(feature)

    return _feature_to_response(feature)


@router.put("/features/{feature_id}", response_model=VenueFeatureResponse)
def update_feature(
    event_id: uuid.UUID,
    feature_id: uuid.UUID,
    payload: VenueFeatureUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a venue feature."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    feature = (
        db.query(VenueFeature)
        .filter(VenueFeature.id == feature_id, VenueFeature.layout_id == layout.id)
        .first()
    )
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue feature not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Validate type if provided
    if "type" in update_data:
        try:
            update_data["type"] = VenueFeatureType(update_data["type"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid feature type: {update_data['type']}",
            )

    # Validate shape if provided
    if "shape" in update_data:
        try:
            update_data["shape"] = VenueFeatureShape(update_data["shape"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid feature shape: {update_data['shape']}",
            )

    for field, value in update_data.items():
        setattr(feature, field, value)

    db.commit()
    db.refresh(feature)

    return _feature_to_response(feature)


@router.delete("/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feature(
    event_id: uuid.UUID,
    feature_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a venue feature."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    feature = (
        db.query(VenueFeature)
        .filter(VenueFeature.id == feature_id, VenueFeature.layout_id == layout.id)
        .first()
    )
    if feature is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venue feature not found",
        )

    db.delete(feature)
    db.commit()

    return None


# ---------------------------------------------------------------------------
# Seating Assignment Endpoints
# ---------------------------------------------------------------------------


@router.put("/seats/{seat_id}/assign", response_model=SeatResponse)
def assign_seat(
    event_id: uuid.UUID,
    seat_id: uuid.UUID,
    payload: SeatAssign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a guest to a seat. Validates guest belongs to the same event."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    # Find the seat and verify it belongs to this layout
    seat = (
        db.query(Seat)
        .join(Table, Seat.table_id == Table.id)
        .filter(Seat.id == seat_id, Table.layout_id == layout.id)
        .first()
    )
    if seat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seat not found",
        )

    # Validate the guest belongs to this event
    guest = (
        db.query(Guest)
        .filter(Guest.id == payload.guest_id, Guest.event_id == event_id)
        .first()
    )
    if guest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest not found in this event",
        )

    # Unassign guest from any previous seat
    previous_seat = (
        db.query(Seat)
        .filter(Seat.guest_id == payload.guest_id)
        .first()
    )
    if previous_seat is not None and previous_seat.id != seat_id:
        previous_seat.guest_id = None

    # Also clear the guest's old table_id / seat_index
    guest.table_id = seat.table_id
    guest.seat_index = seat.seat_index

    # Unassign existing guest from this seat if any
    if seat.guest_id is not None and seat.guest_id != payload.guest_id:
        old_guest = db.query(Guest).filter(Guest.id == seat.guest_id).first()
        if old_guest:
            old_guest.table_id = None
            old_guest.seat_index = None

    # Assign
    seat.guest_id = payload.guest_id

    db.commit()
    db.refresh(seat)

    # Load guest relationship for response
    seat = (
        db.query(Seat)
        .options(joinedload(Seat.guest))
        .filter(Seat.id == seat.id)
        .first()
    )
    return _seat_to_response(seat)


@router.put("/seats/{seat_id}/unassign", response_model=SeatResponse)
def unassign_seat(
    event_id: uuid.UUID,
    seat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a guest from a seat."""
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    # Find the seat and verify it belongs to this layout
    seat = (
        db.query(Seat)
        .join(Table, Seat.table_id == Table.id)
        .filter(Seat.id == seat_id, Table.layout_id == layout.id)
        .first()
    )
    if seat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seat not found",
        )

    # Clear guest reference
    if seat.guest_id is not None:
        guest = db.query(Guest).filter(Guest.id == seat.guest_id).first()
        if guest:
            guest.table_id = None
            guest.seat_index = None
        seat.guest_id = None

    db.commit()
    db.refresh(seat)

    return _seat_to_response(seat)
