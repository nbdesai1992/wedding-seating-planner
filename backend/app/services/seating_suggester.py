"""AI seating suggestion service.

Fetches event guests, tables, and seats, builds a context prompt for Claude,
then parses the structured response into seat assignment suggestions.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.guest import Guest
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table
from app.services.claude_client import call_claude


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a wedding seating assignment assistant. Given information about
guests, tables with available seats, and optional constraints, suggest optimal seat assignments.

RULES:
1. Each guest should be assigned to exactly one available seat.
2. Respect constraints as much as possible (they are hints, not hard rules):
   - group_together: try to seat these guests at the same table
   - keep_apart: seat these guests at different tables
   - near_head_table: assign these guests to tables whose names suggest they are head/main tables
3. Group guests with the same group_tag at the same table when possible.
4. Plus-ones (is_plus_one=true) should be seated at the same table as their host (plus_one_of).
5. If a guest cannot be assigned (not enough seats, conflicting constraints), add them to unassigned with a reason.
6. Only assign to seats that are currently available (guest_id is null).
7. Do NOT reassign already-seated guests unless they appear in a constraint.

You MUST respond with ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "assignments": [
    {"seat_id": "uuid-string", "guest_id": "uuid-string"}
  ],
  "unassigned": [
    {"guest_id": "uuid-string", "reason": "Why this guest couldn't be assigned"}
  ]
}
"""


def _build_context(
    guests: list[Guest],
    tables: list[Table],
    constraints: list[dict],
) -> str:
    """Build the user message with all context for Claude."""
    lines = []

    # Unseated guests
    unseated = [g for g in guests if g.table_id is None]
    seated = [g for g in guests if g.table_id is not None]

    lines.append("=== GUESTS NEEDING SEATS ===")
    if not unseated:
        lines.append("(none — all guests are already seated)")
    for g in unseated:
        parts = [f"id={g.id}", f"name={g.name}"]
        if g.group_tag:
            parts.append(f"group={g.group_tag}")
        if g.meal_preference:
            parts.append(f"meal={g.meal_preference}")
        if g.is_plus_one:
            parts.append(f"plus_one_of={g.plus_one_of}")
        lines.append("  " + ", ".join(parts))

    lines.append("")
    lines.append("=== ALREADY SEATED GUESTS (do not move) ===")
    for g in seated:
        lines.append(f"  id={g.id}, name={g.name}, table_id={g.table_id}")

    lines.append("")
    lines.append("=== TABLES AND AVAILABLE SEATS ===")
    for table in tables:
        available_seats = [s for s in table.seats if s.guest_id is None]
        total_seats = len(table.seats)
        occupied = total_seats - len(available_seats)
        lines.append(
            f"Table: {table.name} (id={table.id}, shape={table.shape.value}, "
            f"seats: {occupied}/{total_seats} occupied)"
        )
        for seat in available_seats:
            lines.append(f"  Available seat: id={seat.id}, index={seat.seat_index}")

    if constraints:
        lines.append("")
        lines.append("=== CONSTRAINTS ===")
        for c in constraints:
            lines.append(f"  {c['type']}: guest_ids={c['guest_ids']}")

    lines.append("")
    lines.append(
        "Please assign the unseated guests to available seats. "
        "Respond with ONLY the JSON object."
    )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------


def _extract_json(text: str) -> dict:
    """Extract JSON from Claude's response, handling markdown code blocks."""
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    return json.loads(text)


def _parse_suggestions(
    raw_response: str,
    guests_by_id: dict,
    seats_by_id: dict,
    tables_by_id: dict,
) -> tuple[list[dict], list[dict]]:
    """Parse Claude's response into structured suggestions and unassigned lists.

    Returns:
        (suggestions, unassigned) where each is a list of dicts.

    Raises:
        ValueError: If the response cannot be parsed as JSON.
    """
    try:
        data = _extract_json(raw_response)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse AI response as JSON: {e}")

    suggestions = []
    unassigned = []

    for assignment in data.get("assignments", []):
        seat_id = str(assignment.get("seat_id", ""))
        guest_id = str(assignment.get("guest_id", ""))

        # Validate the IDs exist
        if seat_id not in seats_by_id:
            continue  # skip invalid seat
        if guest_id not in guests_by_id:
            continue  # skip invalid guest

        seat = seats_by_id[seat_id]
        guest = guests_by_id[guest_id]
        table = tables_by_id.get(str(seat.table_id))

        suggestions.append({
            "seat_id": seat_id,
            "guest_id": guest_id,
            "guest_name": guest.name,
            "table_name": table.name if table else "Unknown",
        })

    for item in data.get("unassigned", []):
        guest_id = str(item.get("guest_id", ""))
        reason = str(item.get("reason", "No reason provided"))
        guest = guests_by_id.get(guest_id)

        unassigned.append({
            "guest_id": guest_id,
            "guest_name": guest.name if guest else "Unknown",
            "reason": reason,
        })

    return suggestions, unassigned


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def suggest_seating(
    event_id: str,
    constraints: list[dict],
    db: Session,
    claude_response_override: Optional[str] = None,
) -> tuple[list[dict], list[dict]]:
    """Generate AI seating suggestions for an event.

    Args:
        event_id: UUID of the event (as string).
        constraints: List of constraint dicts with 'type' and 'guest_ids'.
        db: SQLAlchemy session.
        claude_response_override: If provided, skip the Claude API call and
            use this string as the response (for testing).

    Returns:
        (suggestions, unassigned) tuple.

    Raises:
        ValueError: If Claude returns invalid JSON.
        RuntimeError: If ANTHROPIC_API_KEY is not set (from call_claude).
    """
    # Fetch all guests for the event
    guests = (
        db.query(Guest)
        .filter(Guest.event_id == event_id)
        .all()
    )

    # Fetch the layout and tables with seats
    layout = db.query(Layout).filter(Layout.event_id == event_id).first()
    if layout is None:
        # No layout yet — return empty
        return [], [
            {
                "guest_id": str(g.id),
                "guest_name": g.name,
                "reason": "No layout/tables exist for this event",
            }
            for g in guests
            if g.table_id is None
        ]

    tables = (
        db.query(Table)
        .options(joinedload(Table.seats))
        .filter(Table.layout_id == layout.id)
        .all()
    )

    if not tables:
        return [], [
            {
                "guest_id": str(g.id),
                "guest_name": g.name,
                "reason": "No tables exist in the layout",
            }
            for g in guests
            if g.table_id is None
        ]

    # Check if there are any unseated guests
    unseated = [g for g in guests if g.table_id is None]
    if not unseated:
        return [], []

    # Check if there are available seats
    all_available_seats = [
        s for t in tables for s in t.seats if s.guest_id is None
    ]
    if not all_available_seats:
        return [], [
            {
                "guest_id": str(g.id),
                "guest_name": g.name,
                "reason": "No available seats",
            }
            for g in unseated
        ]

    # Build lookup maps
    guests_by_id = {str(g.id): g for g in guests}
    seats_by_id = {str(s.id): s for t in tables for s in t.seats}
    tables_by_id = {str(t.id): t for t in tables}

    # Serialize constraints for prompt
    serialized_constraints = [
        {"type": c["type"], "guest_ids": [str(gid) for gid in c["guest_ids"]]}
        for c in constraints
    ]

    # Build context prompt
    context = _build_context(guests, tables, serialized_constraints)

    # Call Claude (or use override for tests)
    if claude_response_override is not None:
        raw_response = claude_response_override
    else:
        raw_response = call_claude(
            system_prompt=SYSTEM_PROMPT,
            user_message=context,
            max_tokens=4096,
        )

    # Parse and return
    return _parse_suggestions(raw_response, guests_by_id, seats_by_id, tables_by_id)
