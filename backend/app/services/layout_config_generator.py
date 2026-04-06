"""Deterministic layout generator.

Takes structured config (table count, shape, features) and computes
element positions algorithmically. No AI call needed — instant, reliable,
zero-overlap layouts.
"""

from __future__ import annotations

import math
from typing import Optional

from sqlalchemy.orm import Session

from app.models.layout import Layout
from app.models.seat import Seat
from app.models.table import Table, TableShape
from app.models.venue_feature import VenueFeature, VenueFeatureType, VenueFeatureShape
from app.routers.layout import _create_seats_for_table

# Canvas dimensions
CANVAS_W = 2000
CANVAS_H = 1500
PADDING = 60  # minimum gap between elements


# ---------------------------------------------------------------------------
# Feature placement
# ---------------------------------------------------------------------------

def _place_features(config: dict) -> list[dict]:
    """Place features (dance floor, bar, stage, cake table) on the canvas."""
    features = []

    if config["include_dance_floor"]:
        pos = config["dance_floor_position"]
        if pos == "center":
            features.append({
                "name": "Dance Floor",
                "type": "dance_floor",
                "shape": "rectangle",
                "x": 750, "y": 500,
                "width": 500, "height": 500,
            })
        elif pos == "front":
            features.append({
                "name": "Dance Floor",
                "type": "dance_floor",
                "shape": "rectangle",
                "x": 750, "y": 50,
                "width": 500, "height": 400,
            })
        elif pos == "left":
            features.append({
                "name": "Dance Floor",
                "type": "dance_floor",
                "shape": "rectangle",
                "x": 50, "y": 400,
                "width": 400, "height": 500,
            })
        elif pos == "right":
            features.append({
                "name": "Dance Floor",
                "type": "dance_floor",
                "shape": "rectangle",
                "x": 1550, "y": 400,
                "width": 400, "height": 500,
            })

    if config["include_bar"]:
        # Place bar along the back wall, avoiding dance floor
        features.append({
            "name": "Bar",
            "type": "bar",
            "shape": "rectangle",
            "x": 50, "y": CANVAS_H - 130,
            "width": 280, "height": 80,
        })

    if config["include_stage"]:
        # Place stage at the front center
        features.append({
            "name": "Stage",
            "type": "stage",
            "shape": "rectangle",
            "x": 700, "y": 30,
            "width": 400, "height": 140,
        })

    if config["include_cake_table"]:
        # Place cake table in a corner
        features.append({
            "name": "Cake Table",
            "type": "cake_table",
            "shape": "rectangle",
            "x": CANVAS_W - 160, "y": CANVAS_H - 160,
            "width": 110, "height": 110,
        })

    return features


# ---------------------------------------------------------------------------
# Overlap detection
# ---------------------------------------------------------------------------

def _overlaps_any(x: float, y: float, w: float, h: float,
                  placed: list[dict], pad: int = PADDING) -> bool:
    """Check if a rectangle overlaps with any already-placed element."""
    for p in placed:
        if not (x + w + pad <= p["x"] or p["x"] + p["width"] + pad <= x or
                y + h + pad <= p["y"] or p["y"] + p["height"] + pad <= y):
            return True
    return False


# ---------------------------------------------------------------------------
# Table placement
# ---------------------------------------------------------------------------

def _place_tables(config: dict, features: list[dict]) -> list[dict]:
    """Place tables in a grid around features."""
    tables = []
    placed: list[dict] = list(features)  # features are obstacles

    shape = config["table_shape"]
    seats = config["seats_per_table"]

    # Table dimensions based on shape and seat count
    if shape == "round":
        tw = 140 if seats >= 8 else 120
        th = tw
    else:  # rectangle
        tw = 200
        th = 100

    # Place sweetheart table first if requested
    if config["include_sweetheart"]:
        sw_w, sw_h = 130, 85
        # Try to place it centered horizontally, near the front
        sw_x = (CANVAS_W - sw_w) / 2
        sw_y = 60
        # If there's a stage at the front, place below it
        for f in features:
            if f["type"] == "stage":
                sw_y = f["y"] + f["height"] + PADDING
                break
        # If that overlaps, shift down
        for _ in range(20):
            if not _overlaps_any(sw_x, sw_y, sw_w, sw_h, placed):
                break
            sw_y += th + PADDING

        sweetheart = {
            "name": "Sweetheart Table",
            "shape": "sweetheart",
            "x": sw_x, "y": sw_y,
            "width": sw_w, "height": sw_h,
            "seat_count": 2,
        }
        tables.append(sweetheart)
        placed.append(sweetheart)

    # Calculate grid for guest tables
    table_count = config["table_count"]

    # Determine grid dimensions
    cols = math.ceil(math.sqrt(table_count * (CANVAS_W / CANVAS_H)))
    rows = math.ceil(table_count / cols)

    # Spacing between table centers
    cell_w = (CANVAS_W - PADDING * 2) / cols
    cell_h = (CANVAS_H - PADDING * 2) / rows

    # Ensure minimum spacing
    cell_w = max(cell_w, tw + PADDING)
    cell_h = max(cell_h, th + PADDING)

    placed_count = 0
    table_num = 1

    for row in range(rows):
        if placed_count >= table_count:
            break
        for col in range(cols):
            if placed_count >= table_count:
                break

            # Calculate position (centered in cell)
            x = PADDING + col * cell_w + (cell_w - tw) / 2
            y = PADDING + row * cell_h + (cell_h - th) / 2

            # Clamp to canvas
            x = max(PADDING, min(CANVAS_W - tw - PADDING, x))
            y = max(PADDING, min(CANVAS_H - th - PADDING, y))

            # Check for overlap with features and other tables
            if _overlaps_any(x, y, tw, th, placed):
                # Try shifting right, then down
                resolved = False
                for offset_x in range(0, CANVAS_W - int(tw), int(cell_w)):
                    for offset_y in range(0, CANVAS_H - int(th), int(cell_h)):
                        test_x = PADDING + offset_x
                        test_y = PADDING + offset_y
                        if not _overlaps_any(test_x, test_y, tw, th, placed):
                            x, y = test_x, test_y
                            resolved = True
                            break
                    if resolved:
                        break
                if not resolved:
                    # Skip this table if we can't find space
                    continue

            table = {
                "name": f"Table {table_num}",
                "shape": shape,
                "x": round(x, 1),
                "y": round(y, 1),
                "width": tw,
                "height": th,
                "seat_count": seats,
            }
            tables.append(table)
            placed.append(table)
            placed_count += 1
            table_num += 1

    return tables


# ---------------------------------------------------------------------------
# Database persistence
# ---------------------------------------------------------------------------

def _clear_layout(layout: Layout, db: Session) -> None:
    """Remove all tables and features from a layout."""
    db.query(Table).filter(Table.layout_id == layout.id).delete()
    db.query(VenueFeature).filter(VenueFeature.layout_id == layout.id).delete()
    db.flush()


def _persist_tables(layout: Layout, tables: list[dict], db: Session) -> None:
    """Create tables and auto-generate seats."""
    for table_data in tables:
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
        db.flush()
        _create_seats_for_table(table, db)


def _persist_features(layout: Layout, features: list[dict], db: Session) -> None:
    """Create venue features."""
    for f in features:
        feature = VenueFeature(
            layout_id=layout.id,
            name=f["name"],
            type=VenueFeatureType(f["type"]),
            shape=VenueFeatureShape(f["shape"]),
            x=f["x"],
            y=f["y"],
            width=f["width"],
            height=f["height"],
        )
        db.add(feature)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_layout_from_config(
    config: dict,
    layout: Layout,
    db: Session,
) -> dict:
    """Generate a venue layout from structured configuration.

    Args:
        config: Dict with table_count, table_shape, seats_per_table,
                include_sweetheart, include_dance_floor, dance_floor_position,
                include_bar, include_stage, include_cake_table.
        layout: The Layout ORM object to populate.
        db: SQLAlchemy session.

    Returns:
        Dict with "tables" and "features" lists.
    """
    features = _place_features(config)
    tables = _place_tables(config, features)

    _clear_layout(layout, db)
    _persist_tables(layout, tables, db)
    _persist_features(layout, features, db)
    db.commit()

    return {"tables": tables, "features": features}
