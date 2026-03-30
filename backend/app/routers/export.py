"""Export endpoints: PDF seating chart download."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.event import Event
from app.models.guest import Guest
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table
from app.models.venue_feature import VenueFeature
from app.models.user import User
from app.services.pdf_generator import generate_seating_chart_pdf

import io

router = APIRouter(prefix="/api/events/{event_id}/export", tags=["export"])


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


def _sanitize_filename(name: str) -> str:
    """Create a safe filename from the event name."""
    # Remove characters that are problematic in filenames
    safe = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_")).strip()
    safe = safe.replace(" ", "-")
    return safe or "seating-chart"


# ---------------------------------------------------------------------------
# PDF Export Endpoint
# ---------------------------------------------------------------------------


@router.get("/pdf")
def export_pdf(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and download a PDF seating chart for the event.

    Returns a print-ready landscape PDF with tables, guest names,
    venue features, and an unassigned guest list.
    """
    event = _get_user_event_or_404(event_id, current_user.id, db)

    # Load layout with all related data
    layout = (
        db.query(Layout)
        .options(
            joinedload(Layout.tables).joinedload(Table.seats).joinedload(Seat.guest),
            joinedload(Layout.venue_features),
        )
        .filter(Layout.event_id == event_id)
        .first()
    )

    # Get all guests for the event to determine unassigned ones
    all_guests = db.query(Guest).filter(Guest.event_id == event_id).all()

    # Build table data
    tables_data = []
    assigned_guest_ids = set()

    if layout and layout.tables:
        for table in layout.tables:
            seats_data = []
            sorted_seats = sorted(table.seats, key=lambda s: s.seat_index)
            for seat in sorted_seats:
                guest_name = None
                if seat.guest_id is not None and seat.guest is not None:
                    guest_name = seat.guest.name
                    assigned_guest_ids.add(seat.guest_id)
                seats_data.append({
                    "seat_index": seat.seat_index,
                    "guest_name": guest_name,
                    "x_offset": seat.x_offset,
                    "y_offset": seat.y_offset,
                })
            tables_data.append({
                "name": table.name,
                "shape": table.shape.value,
                "x": table.x,
                "y": table.y,
                "width": table.width,
                "height": table.height,
                "rotation": table.rotation,
                "seats": seats_data,
            })

    # Build venue features data
    features_data = []
    if layout and layout.venue_features:
        for feature in layout.venue_features:
            features_data.append({
                "name": feature.name,
                "type": feature.type.value,
                "shape": feature.shape.value,
                "x": feature.x,
                "y": feature.y,
                "width": feature.width,
                "height": feature.height,
                "rotation": feature.rotation,
            })

    # Unassigned guests
    unassigned_names = [g.name for g in all_guests if g.id not in assigned_guest_ids]
    unassigned_names.sort()

    # Canvas dimensions
    canvas_width = layout.canvas_width if layout else 2000
    canvas_height = layout.canvas_height if layout else 1500

    # Generate PDF
    pdf_bytes = generate_seating_chart_pdf(
        event_name=event.name,
        event_date=event.date,
        canvas_width=canvas_width,
        canvas_height=canvas_height,
        tables=tables_data,
        venue_features=features_data,
        unassigned_guests=unassigned_names,
    )

    # Create safe filename
    filename = f"{_sanitize_filename(event.name)}-seating-chart.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
