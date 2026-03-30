"""Seating suggestion & bulk-apply Pydantic schemas."""

from __future__ import annotations

import uuid
from typing import List, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Constraints for AI suggestion
# ---------------------------------------------------------------------------


class SeatingConstraint(BaseModel):
    """A single constraint for the AI seating suggester.

    Supported types:
    - group_together: seat these guests at the same table
    - keep_apart: seat these guests at different tables
    - near_head_table: seat these guests at/near the head table
    """

    type: str = Field(
        ...,
        description="Constraint type: group_together, keep_apart, or near_head_table",
    )
    guest_ids: List[uuid.UUID] = Field(
        ...,
        min_length=1,
        description="Guest IDs this constraint applies to",
    )


class SeatingSuggestRequest(BaseModel):
    """Request body for POST /seating/suggest."""

    constraints: List[SeatingConstraint] = Field(
        default_factory=list,
        description="Optional list of constraints for the AI",
    )


# ---------------------------------------------------------------------------
# Suggestion response
# ---------------------------------------------------------------------------


class SeatingSuggestion(BaseModel):
    """A single seat assignment suggestion."""

    seat_id: uuid.UUID
    guest_id: uuid.UUID
    guest_name: str
    table_name: str


class UnassignedGuest(BaseModel):
    """A guest the AI could not assign."""

    guest_id: uuid.UUID
    guest_name: str
    reason: str


class SeatingSuggestResponse(BaseModel):
    """Response body for POST /seating/suggest."""

    suggestions: List[SeatingSuggestion] = []
    unassigned: List[UnassignedGuest] = []


# ---------------------------------------------------------------------------
# Bulk apply
# ---------------------------------------------------------------------------


class SeatAssignment(BaseModel):
    """A single seat assignment to apply."""

    seat_id: uuid.UUID
    guest_id: uuid.UUID


class BulkApplyRequest(BaseModel):
    """Request body for POST /seating/apply."""

    assignments: List[SeatAssignment] = Field(
        ...,
        min_length=1,
        description="List of seat-guest assignments to apply",
    )


class BulkApplyResponse(BaseModel):
    """Response body for POST /seating/apply."""

    applied: int = Field(..., description="Number of assignments successfully applied")
    errors: List[str] = Field(
        default_factory=list,
        description="Any errors encountered during apply",
    )
