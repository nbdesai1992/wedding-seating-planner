"""Layout generator service.

Takes a natural language venue description, calls Claude to produce
structured JSON, and persists the generated layout to the database.
"""

from __future__ import annotations

import json
import math
import re
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table, TableShape
from app.models.venue_feature import VenueFeature, VenueFeatureType, VenueFeatureShape
from app.services.claude_client import call_claude


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a wedding venue layout designer. Given a venue description,
you produce a structured JSON layout with tables and features positioned on a 2000x1500
canvas (pixels).

CRITICAL — NO OVERLAPPING:
- NEVER place any element on top of another. Every table and feature must have its own
  clear space with at least 40px of padding between all elements.
- Features like the dance floor, stage, and bar are large obstacles. Place tables AROUND
  them, never overlapping or on top of them.
- The sweetheart or head table should FACE the dance floor from a nearby position, not
  sit inside it.
- Before finalizing positions, mentally verify that no two bounding boxes
  (x, y, x+width, y+height) intersect when expanded by 40px on each side.

LAYOUT RULES:
1. Keep all elements within canvas bounds (0-2000 for x, 0-1500 for y), accounting
   for element width/height so nothing extends past the edges.
2. Use these default sizes:
   - Round tables: width=140, height=140 for 8-10 seats; width=120, height=120 for 6 or fewer
   - Rectangle tables: width=200, height=100 for 8 seats; scale proportionally
   - Sweetheart tables: width=120, height=80 for 2 seats
   - Dance floor: typically 350x350 to 500x500
   - Bar: typically 250x80
   - Stage: typically 400x150
   - Cake table: typically 100x100
3. Distribute tables evenly across the space NOT occupied by features. Use a grid
   or organic arrangement with generous spacing.
4. Name tables sequentially: "Table 1", "Table 2", etc. unless the description specifies names.
5. Each table must have a seat_count between 1 and 50.

POSITIONING STRATEGY:
- First, place large features (dance floor, stage) in their logical positions.
- Then arrange tables in the remaining open space around those features.
- Leave wide aisles (at least 60px) between rows of tables for walkways.
- Place the sweetheart/head table in a prominent position facing the dance floor or stage.

You MUST respond with ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "tables": [
    {
      "name": "Table 1",
      "shape": "round",
      "x": 200,
      "y": 200,
      "width": 140,
      "height": 140,
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
"""


def _build_user_prompt(description: str) -> str:
    """Build the user prompt from the venue description."""
    return (
        f"Please design a venue layout based on this description:\n\n"
        f"{description}\n\n"
        f"Remember: respond with ONLY the JSON object, no other text."
    )


# ---------------------------------------------------------------------------
# JSON parsing & validation
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> dict:
    """Extract JSON from Claude's response, handling markdown code blocks."""
    # Try to extract from markdown code block first
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        text = match.group(1).strip()

    return json.loads(text)


def _validate_table(table_data: dict) -> dict:
    """Validate and normalize a table entry from the AI response."""
    name = str(table_data.get("name", "Unnamed Table"))
    shape = str(table_data.get("shape", "round")).lower()
    if shape not in ("round", "rectangle", "sweetheart"):
        shape = "round"

    seat_count = int(table_data.get("seat_count", 8))
    seat_count = max(1, min(50, seat_count))

    x = float(table_data.get("x", 0))
    y = float(table_data.get("y", 0))
    width = float(table_data.get("width", 120))
    height = float(table_data.get("height", 120))

    # Clamp to canvas
    x = max(0, min(2000 - width, x))
    y = max(0, min(1500 - height, y))

    return {
        "name": name,
        "shape": shape,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "seat_count": seat_count,
    }


def _validate_feature(feature_data: dict) -> dict:
    """Validate and normalize a feature entry from the AI response."""
    name = str(feature_data.get("name", "Feature"))
    ftype = str(feature_data.get("type", "custom")).lower()
    if ftype not in ("dance_floor", "bar", "cake_table", "stage", "custom"):
        ftype = "custom"

    shape = str(feature_data.get("shape", "rectangle")).lower()
    if shape not in ("rectangle", "circle"):
        shape = "rectangle"

    x = float(feature_data.get("x", 0))
    y = float(feature_data.get("y", 0))
    width = float(feature_data.get("width", 100))
    height = float(feature_data.get("height", 100))

    # Clamp to canvas
    x = max(0, min(2000 - width, x))
    y = max(0, min(1500 - height, y))

    return {
        "name": name,
        "type": ftype,
        "shape": shape,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
    }


def _validate_layout_json(data: dict) -> dict:
    """Validate the full layout JSON response from Claude."""
    tables = [_validate_table(t) for t in data.get("tables", [])]
    features = [_validate_feature(f) for f in data.get("features", [])]
    return {"tables": tables, "features": features}


# ---------------------------------------------------------------------------
# Overlap resolution
# ---------------------------------------------------------------------------

OVERLAP_PADDING = 40  # px minimum gap between elements


def _boxes_overlap(a: dict, b: dict, padding: int = OVERLAP_PADDING) -> bool:
    """Check if two element bounding boxes overlap (with padding)."""
    return not (
        a["x"] + a["width"] + padding <= b["x"]
        or b["x"] + b["width"] + padding <= a["x"]
        or a["y"] + a["height"] + padding <= b["y"]
        or b["y"] + b["height"] + padding <= a["y"]
    )


def _resolve_overlaps(layout_data: dict) -> dict:
    """Shift overlapping elements apart as a post-processing safety net.

    Features are treated as anchors (placed first, don't move).
    Tables are shifted if they overlap with anything.
    """
    features = layout_data.get("features", [])
    tables = layout_data.get("tables", [])

    # All anchors: features come first and stay fixed
    anchors: list[dict] = list(features)

    resolved_tables = []
    for table in tables:
        t = dict(table)  # work on a copy
        # Try to resolve overlaps with up to 20 attempts
        for _ in range(20):
            has_overlap = False
            for other in anchors + resolved_tables:
                if other is t:
                    continue
                if _boxes_overlap(t, other):
                    has_overlap = True
                    # Shift table to the right of the overlapping element
                    t["x"] = other["x"] + other["width"] + OVERLAP_PADDING
                    # If pushed past canvas right edge, wrap to next row
                    if t["x"] + t["width"] > 2000:
                        t["x"] = OVERLAP_PADDING
                        t["y"] = t["y"] + t["height"] + OVERLAP_PADDING
                    # Clamp to canvas
                    t["x"] = max(0, min(2000 - t["width"], t["x"]))
                    t["y"] = max(0, min(1500 - t["height"], t["y"]))
                    break  # re-check from the start
            if not has_overlap:
                break
        resolved_tables.append(t)

    return {"tables": resolved_tables, "features": features}


# ---------------------------------------------------------------------------
# Seat position generation (reuse logic from layout router)
# ---------------------------------------------------------------------------

def _generate_seat_positions(seat_count: int, shape: str) -> list[tuple[float, float]]:
    """Calculate seat positions around a table based on its shape."""
    positions = []
    if shape in ("round", "sweetheart"):
        radius = 50.0
        for i in range(seat_count):
            angle = (2 * math.pi * i) / seat_count
            x = round(radius * math.cos(angle), 2)
            y = round(radius * math.sin(angle), 2)
            positions.append((x, y))
    else:
        # Rectangle
        if seat_count <= 2:
            for i in range(seat_count):
                x = -50.0 + i * 100.0
                positions.append((x, 0.0))
        else:
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


# ---------------------------------------------------------------------------
# Database persistence
# ---------------------------------------------------------------------------

def _clear_existing_layout(layout: Layout, db: Session) -> None:
    """Remove existing tables (with seats) and features from a layout."""
    # Delete all tables (cascades to seats via ORM relationship)
    db.query(Table).filter(Table.layout_id == layout.id).delete()
    # Delete all venue features
    db.query(VenueFeature).filter(VenueFeature.layout_id == layout.id).delete()
    db.flush()


def _persist_layout(
    layout: Layout,
    layout_data: dict,
    db: Session,
) -> None:
    """Create tables, seats, and features in the database from parsed layout data."""
    # Create tables
    for table_data in layout_data["tables"]:
        table = Table(
            layout_id=layout.id,
            name=table_data["name"],
            shape=TableShape(table_data["shape"]),
            x=table_data["x"],
            y=table_data["y"],
            width=table_data["width"],
            height=table_data["height"],
            seat_count=table_data["seat_count"],
        )
        db.add(table)
        db.flush()  # Get table.id

        # Generate seats
        positions = _generate_seat_positions(
            table_data["seat_count"], table_data["shape"]
        )
        for i, (x_off, y_off) in enumerate(positions):
            seat = Seat(
                table_id=table.id,
                seat_index=i,
                x_offset=x_off,
                y_offset=y_off,
            )
            db.add(seat)

    # Create features
    for feature_data in layout_data["features"]:
        feature = VenueFeature(
            layout_id=layout.id,
            name=feature_data["name"],
            type=VenueFeatureType(feature_data["type"]),
            shape=VenueFeatureShape(feature_data["shape"]),
            x=feature_data["x"],
            y=feature_data["y"],
            width=feature_data["width"],
            height=feature_data["height"],
        )
        db.add(feature)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_layout(
    description: str,
    event: Event,
    layout: Layout,
    db: Session,
    claude_response_override: Optional[str] = None,
) -> dict:
    """Generate a venue layout from a natural language description.

    Args:
        description: Natural language venue description.
        event: The Event ORM object (to store venue_description).
        layout: The Layout ORM object to populate.
        db: SQLAlchemy session.
        claude_response_override: If provided, skip the Claude API call and
            use this string as the response (for testing).

    Returns:
        The validated layout data dict with tables and features.

    Raises:
        ValueError: If Claude returns invalid JSON.
    """
    # Store venue description on the event
    event.venue_description = description

    # Call Claude (or use override for tests)
    if claude_response_override is not None:
        raw_response = claude_response_override
    else:
        raw_response = call_claude(
            system_prompt=SYSTEM_PROMPT,
            user_message=_build_user_prompt(description),
        )

    # Parse and validate
    try:
        raw_data = _extract_json(raw_response)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse AI response as JSON: {e}")

    layout_data = _validate_layout_json(raw_data)

    # Resolve any overlapping elements the AI produced
    layout_data = _resolve_overlaps(layout_data)

    # Clear existing and persist new
    _clear_existing_layout(layout, db)
    _persist_layout(layout, layout_data, db)
    db.commit()

    return layout_data
