"""Layout modifier service.

Takes the current layout state and a natural language modification request,
calls Claude to produce an updated layout, and applies changes via diffing.
Preserved tables keep their IDs, seats, and guest assignments.
Removed tables get proper guest unassignment.
New tables get auto-generated seats.
"""

from __future__ import annotations

import json
from typing import Optional

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.guest import Guest
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table, TableShape
from app.models.venue_feature import VenueFeature, VenueFeatureType, VenueFeatureShape
from app.services.claude_client import call_claude
from app.services.layout_generator import (
    _extract_json,
    _validate_table,
    _validate_feature,
    _generate_seat_positions,
    _resolve_overlaps,
)


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

MODIFY_SYSTEM_PROMPT = """You are a wedding venue layout designer. You are given the current layout
of a venue (tables and features on a 2000x1500 canvas) and a modification request from the user.

Your job is to apply the requested modifications and return the COMPLETE updated layout.

CRITICAL RULES:
1. PRESERVE all elements that the user did NOT mention. Do not remove or change anything
   unless the user explicitly asks for it.
2. NEVER place any element on top of another. Ensure at least 40px padding between
   ALL elements. Features like the dance floor and stage are obstacles — place tables
   AROUND them, never on top.
3. Keep all elements within the canvas bounds (0-2000 for x, 0-1500 for y), accounting
   for width/height so nothing extends past edges.
4. Use sensible default sizes for new elements:
   - Round tables: width=140, height=140 for 8-10 seats; width=120, height=120 for 6 or fewer
   - Rectangle tables: width=200, height=100 for 8 seats; scale proportionally
   - Sweetheart tables: width=120, height=80 for 2 seats
   - Dance floor: typically 350x350 to 500x500
   - Bar: typically 250x80
   - Stage: typically 400x150
   - Cake table: typically 100x100
5. Name new tables sequentially after existing ones (e.g., if "Table 5" exists, start at "Table 6")
   unless the user specifies names.
6. Each table must have a seat_count between 1 and 50.
7. When the user asks to modify an existing element (e.g., "make the head table longer"),
   change ONLY the properties mentioned. Keep the name and other properties the same.
8. When the user asks to remove an element, remove ONLY that element.

You MUST respond with ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "tables": [
    {
      "name": "Table 1",
      "shape": "round",
      "x": 200,
      "y": 200,
      "width": 120,
      "height": 120,
      "seat_count": 8
    }
  ],
  "features": [
    {
      "name": "Dance Floor",
      "type": "dance_floor",
      "shape": "rectangle",
      "x": 800,
      "y": 600,
      "width": 400,
      "height": 400
    }
  ]
}

Valid table shapes: "round", "rectangle", "sweetheart"
Valid feature types: "dance_floor", "bar", "cake_table", "stage", "custom"
Valid feature shapes: "rectangle", "circle"

IMPORTANT: Return the COMPLETE layout including ALL tables and features (both
modified and unmodified). Do NOT return only the changed elements.
"""


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------


def _serialize_current_layout(layout: Layout, db: Session) -> dict:
    """Serialize the current layout state to a dict for Claude context.

    Returns a dict with 'tables' and 'features' lists matching the JSON
    format that Claude produces/consumes.
    """
    tables = db.query(Table).filter(Table.layout_id == layout.id).all()
    features = db.query(VenueFeature).filter(
        VenueFeature.layout_id == layout.id
    ).all()

    return {
        "tables": [
            {
                "name": t.name,
                "shape": t.shape.value,
                "x": t.x,
                "y": t.y,
                "width": t.width,
                "height": t.height,
                "seat_count": t.seat_count,
            }
            for t in tables
        ],
        "features": [
            {
                "name": f.name,
                "type": f.type.value,
                "shape": f.shape.value,
                "x": f.x,
                "y": f.y,
                "width": f.width,
                "height": f.height,
            }
            for f in features
        ],
    }


def _build_modify_prompt(current_layout: dict, modification_request: str) -> str:
    """Build the user prompt for layout modification."""
    current_json = json.dumps(current_layout, indent=2)
    return (
        f"Here is the current venue layout:\n\n"
        f"{current_json}\n\n"
        f"Please apply the following modification:\n\n"
        f"{modification_request}\n\n"
        f"Return the COMPLETE updated layout as JSON, including ALL tables and "
        f"features (both modified and unmodified ones). Respond with ONLY the JSON object."
    )


# ---------------------------------------------------------------------------
# Diff-based change application
# ---------------------------------------------------------------------------


def _apply_layout_changes(
    layout: Layout,
    old_data: dict,
    new_data: dict,
    db: Session,
) -> None:
    """Compare old and new layout data and apply changes to the database.

    Tables are matched by name (case-insensitive):
    - In old but not new → removed (guests unassigned, seats/table deleted)
    - In new but not old → added (with auto-generated seats)
    - In both → updated (seats regenerated if seat_count changed)

    Features are matched by (name, type) key (case-insensitive):
    - In old but not new → removed
    - In new but not old → added
    - In both → updated
    """
    # ---- Tables ----
    new_tables_by_name = {}
    for t in new_data.get("tables", []):
        new_tables_by_name[t["name"].lower()] = t

    # Map existing DB tables by lowercase name
    db_tables = db.query(Table).filter(Table.layout_id == layout.id).all()
    db_tables_by_name = {t.name.lower(): t for t in db_tables}

    # Remove tables not in new layout
    for name_lower, db_table in db_tables_by_name.items():
        if name_lower not in new_tables_by_name:
            _remove_table(db_table, db)

    # Add or update tables
    for name_lower, new_t in new_tables_by_name.items():
        db_table = db_tables_by_name.get(name_lower)
        if db_table:
            _update_table(db_table, new_t, db)
        else:
            _add_table(layout, new_t, db)

    # ---- Features ----
    new_features_by_key = {}
    for f in new_data.get("features", []):
        key = (f["name"].lower(), f.get("type", "custom").lower())
        new_features_by_key[key] = f

    db_features = db.query(VenueFeature).filter(
        VenueFeature.layout_id == layout.id
    ).all()
    db_features_by_key = {
        (f.name.lower(), f.type.value.lower()): f for f in db_features
    }

    # Remove features not in new layout
    for key, db_feature in db_features_by_key.items():
        if key not in new_features_by_key:
            db.delete(db_feature)

    # Add or update features
    for key, new_f in new_features_by_key.items():
        db_feature = db_features_by_key.get(key)
        if db_feature:
            _update_feature(db_feature, new_f)
        else:
            _add_feature(layout, new_f, db)


def _remove_table(table: Table, db: Session) -> None:
    """Remove a table, first unassigning any guests seated at it."""
    guests = db.query(Guest).filter(Guest.table_id == table.id).all()
    for guest in guests:
        guest.table_id = None
        guest.seat_index = None

    # Delete seats (cascade should handle, but be explicit)
    db.query(Seat).filter(Seat.table_id == table.id).delete()
    db.delete(table)


def _update_table(table: Table, new_data: dict, db: Session) -> None:
    """Update an existing table's properties. Regenerate seats if seat_count changes."""
    old_seat_count = table.seat_count

    # Update properties
    shape = new_data.get("shape", table.shape.value)
    if shape not in ("round", "rectangle", "sweetheart"):
        shape = "round"
    table.shape = TableShape(shape)

    table.name = new_data.get("name", table.name)
    table.x = float(new_data.get("x", table.x))
    table.y = float(new_data.get("y", table.y))
    table.width = float(new_data.get("width", table.width))
    table.height = float(new_data.get("height", table.height))

    new_seat_count = int(new_data.get("seat_count", old_seat_count))
    new_seat_count = max(1, min(50, new_seat_count))
    table.seat_count = new_seat_count

    if new_seat_count != old_seat_count:
        _adjust_seats(table, old_seat_count, new_seat_count, db)


def _adjust_seats(
    table: Table, old_count: int, new_count: int, db: Session
) -> None:
    """Adjust seats when seat count changes on a table.

    If decreasing: remove excess seats (unassigning guests).
    If increasing: add new seats with calculated positions.
    """
    existing_seats = (
        db.query(Seat)
        .filter(Seat.table_id == table.id)
        .order_by(Seat.seat_index)
        .all()
    )

    if new_count < old_count:
        # Remove excess seats
        seats_to_remove = existing_seats[new_count:]
        for seat in seats_to_remove:
            if seat.guest_id is not None:
                guest = db.query(Guest).filter(Guest.id == seat.guest_id).first()
                if guest:
                    guest.table_id = None
                    guest.seat_index = None
            db.delete(seat)

        # Recalculate positions for remaining seats
        positions = _generate_seat_positions(new_count, table.shape.value)
        remaining = existing_seats[:new_count]
        for i, seat in enumerate(remaining):
            if i < len(positions):
                seat.x_offset = positions[i][0]
                seat.y_offset = positions[i][1]

    elif new_count > old_count:
        # Recalculate all positions for new count
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


def _add_table(layout: Layout, table_data: dict, db: Session) -> None:
    """Add a new table with auto-generated seats."""
    validated = _validate_table(table_data)

    table = Table(
        layout_id=layout.id,
        name=validated["name"],
        shape=TableShape(validated["shape"]),
        x=validated["x"],
        y=validated["y"],
        width=validated["width"],
        height=validated["height"],
        seat_count=validated["seat_count"],
    )
    db.add(table)
    db.flush()  # Get table.id

    # Generate seats
    positions = _generate_seat_positions(validated["seat_count"], validated["shape"])
    for i, (x_off, y_off) in enumerate(positions):
        seat = Seat(
            table_id=table.id,
            seat_index=i,
            x_offset=x_off,
            y_offset=y_off,
        )
        db.add(seat)


def _update_feature(feature: VenueFeature, new_data: dict) -> None:
    """Update an existing feature's properties."""
    if "name" in new_data:
        feature.name = new_data["name"]

    ftype = new_data.get("type", feature.type.value)
    if ftype not in ("dance_floor", "bar", "cake_table", "stage", "custom"):
        ftype = "custom"
    feature.type = VenueFeatureType(ftype)

    shape = new_data.get("shape", feature.shape.value)
    if shape not in ("rectangle", "circle"):
        shape = "rectangle"
    feature.shape = VenueFeatureShape(shape)

    feature.x = float(new_data.get("x", feature.x))
    feature.y = float(new_data.get("y", feature.y))
    feature.width = float(new_data.get("width", feature.width))
    feature.height = float(new_data.get("height", feature.height))


def _add_feature(layout: Layout, feature_data: dict, db: Session) -> None:
    """Add a new feature to the layout."""
    validated = _validate_feature(feature_data)

    feature = VenueFeature(
        layout_id=layout.id,
        name=validated["name"],
        type=VenueFeatureType(validated["type"]),
        shape=VenueFeatureShape(validated["shape"]),
        x=validated["x"],
        y=validated["y"],
        width=validated["width"],
        height=validated["height"],
    )
    db.add(feature)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def modify_layout(
    prompt: str,
    event: Event,
    layout: Layout,
    db: Session,
    claude_response_override: Optional[str] = None,
) -> dict:
    """Modify an existing layout based on a natural language prompt.

    Serializes the current layout, sends it to Claude along with the
    modification request, then applies a diff between old and new layouts
    to the database. Preserved tables keep their IDs, seats, and guest
    assignments.

    Args:
        prompt: The user's modification request.
        event: The Event ORM object.
        layout: The Layout ORM object with existing tables/features.
        db: SQLAlchemy session.
        claude_response_override: If provided, skip the Claude API call and
            use this string as the response (for testing).

    Returns:
        The validated layout data dict with tables and features.

    Raises:
        ValueError: If Claude returns invalid JSON.
    """
    # Serialize current layout for context
    current_data = _serialize_current_layout(layout, db)

    # Call Claude (or use override for tests)
    if claude_response_override is not None:
        raw_response = claude_response_override
    else:
        raw_response = call_claude(
            system_prompt=MODIFY_SYSTEM_PROMPT,
            user_message=_build_modify_prompt(current_data, prompt),
        )

    # Parse and validate (reuse helpers from layout_generator)
    try:
        raw_data = _extract_json(raw_response)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse AI response as JSON: {e}")

    new_data = {
        "tables": [_validate_table(t) for t in raw_data.get("tables", [])],
        "features": [_validate_feature(f) for f in raw_data.get("features", [])],
    }

    # Resolve any overlapping elements
    new_data = _resolve_overlaps(new_data)

    # Apply diff between current and new layout
    _apply_layout_changes(layout, current_data, new_data, db)
    db.commit()

    return new_data
