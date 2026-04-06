"""AI-powered layout generation endpoint.

POST /api/events/{event_id}/layout/generate
Takes a venue description and uses Claude to generate tables, seats, and features.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.event import Event
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table
from app.models.user import User
from app.models.venue_feature import VenueFeature
from app.schemas.ai_layout import LayoutGenerateRequest, LayoutModifyRequest, LayoutConfigRequest
from app.schemas.layout import LayoutResponse
from app.services.layout_generator import generate_layout
from app.services.layout_modifier import modify_layout
from app.services.layout_config_generator import generate_layout_from_config

# Reuse the response helpers from the layout router
from app.routers.layout import (
    _get_user_event_or_404,
    _get_or_create_layout,
    _layout_to_response,
)

router = APIRouter(prefix="/api/events/{event_id}/layout", tags=["ai-layout"])


def _reload_layout(layout_id, db):
    """Reload a layout with all nested relationships."""
    return (
        db.query(Layout)
        .options(
            joinedload(Layout.tables).joinedload(Table.seats).joinedload(Seat.guest),
            joinedload(Layout.venue_features),
        )
        .filter(Layout.id == layout_id)
        .first()
    )


@router.post("/generate", response_model=LayoutResponse)
def generate_venue_layout(
    event_id: uuid.UUID,
    payload: LayoutGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a venue layout from a natural language description using AI.

    Clears any existing tables and features, then creates new ones based on
    the AI-generated layout. The venue description is saved on the event.
    """
    event = _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    try:
        generate_layout(
            description=payload.description,
            event=event,
            layout=layout,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI layout generation failed: {str(e)}",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    return _layout_to_response(_reload_layout(layout.id, db))


@router.post("/modify", response_model=LayoutResponse)
def modify_venue_layout(
    event_id: uuid.UUID,
    payload: LayoutModifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Modify an existing venue layout based on a natural language prompt.

    Takes the current layout state and applies the requested modifications
    using AI. Elements not mentioned in the prompt are preserved.
    If no layout exists yet, creates one first.
    """
    event = _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    try:
        modify_layout(
            prompt=payload.prompt,
            event=event,
            layout=layout,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI layout modification failed: {str(e)}",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    return _layout_to_response(_reload_layout(layout.id, db))


@router.post("/generate-config", response_model=LayoutResponse)
def generate_layout_from_config_endpoint(
    event_id: uuid.UUID,
    payload: LayoutConfigRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a venue layout from structured configuration (no AI).

    Takes table count, shape, features etc. and computes positions
    deterministically. Instant, reliable, zero-overlap results.
    """
    _get_user_event_or_404(event_id, current_user.id, db)
    layout = _get_or_create_layout(event_id, db)

    generate_layout_from_config(
        config=payload.model_dump(),
        layout=layout,
        db=db,
    )

    return _layout_to_response(_reload_layout(layout.id, db))
