"""PDF generator service for seating chart export.

Renders a professional, print-ready PDF of the seating chart layout
with tables, guest names, venue features, and unassigned guest list.
"""

from __future__ import annotations

import io
import math
from datetime import date
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# ---------------------------------------------------------------------------
# Color palette — elegant, bride-appropriate
# ---------------------------------------------------------------------------

COLOR_PRIMARY = colors.HexColor("#8B7355")       # Warm brown
COLOR_ACCENT = colors.HexColor("#D4A574")         # Soft gold
COLOR_TABLE_FILL = colors.HexColor("#FFF8F0")     # Cream
COLOR_TABLE_STROKE = colors.HexColor("#C9A882")   # Gold stroke
COLOR_SWEETHEART = colors.HexColor("#FFE4E1")     # Misty rose
COLOR_FEATURE_FILL = colors.HexColor("#F0EDE8")   # Light taupe
COLOR_FEATURE_STROKE = colors.HexColor("#B8A898") # Taupe stroke
COLOR_TEXT = colors.HexColor("#4A3728")            # Dark brown
COLOR_LIGHT_TEXT = colors.HexColor("#8B7355")      # Muted brown
COLOR_HEADER_BG = colors.HexColor("#FAF5EF")      # Light cream
COLOR_BORDER = colors.HexColor("#E8DDD0")         # Soft border


def generate_seating_chart_pdf(
    event_name: str,
    event_date: Optional[date],
    canvas_width: int,
    canvas_height: int,
    tables: list[dict],
    venue_features: list[dict],
    unassigned_guests: list[str],
) -> bytes:
    """Generate a seating chart PDF and return it as bytes.

    Parameters
    ----------
    event_name : str
        Name of the event.
    event_date : date or None
        Event date (shown in header).
    canvas_width : int
        The layout canvas width (used for scaling).
    canvas_height : int
        The layout canvas height (used for scaling).
    tables : list of dict
        Each dict has keys: name, shape, x, y, width, height, rotation,
        seats (list of dicts with guest_name, seat_index, x_offset, y_offset).
    venue_features : list of dict
        Each dict has keys: name, type, shape, x, y, width, height, rotation.
    unassigned_guests : list of str
        Names of guests not assigned to any seat.

    Returns
    -------
    bytes
        The PDF file content.
    """
    buf = io.BytesIO()
    page_width, page_height = landscape(letter)
    c = canvas.Canvas(buf, pagesize=landscape(letter))

    # Margins and layout areas
    margin = 0.5 * inch
    header_height = 0.9 * inch
    footer_height = 0.3 * inch
    sidebar_width = 2.2 * inch  # for unassigned guests

    # Draw header
    _draw_header(c, event_name, event_date, page_width, page_height, margin, header_height)

    # Determine chart area
    chart_left = margin
    chart_top = page_height - margin - header_height - 0.1 * inch
    chart_right = page_width - margin - (sidebar_width if unassigned_guests else 0)
    chart_bottom = margin + footer_height
    chart_w = chart_right - chart_left
    chart_h = chart_top - chart_bottom

    # Check if we have any tables or features
    has_content = len(tables) > 0 or len(venue_features) > 0

    if not has_content:
        _draw_empty_layout(c, chart_left, chart_bottom, chart_w, chart_h)
    else:
        # Calculate scale factor to fit canvas into chart area
        scale_x = chart_w / max(canvas_width, 1)
        scale_y = chart_h / max(canvas_height, 1)
        scale = min(scale_x, scale_y) * 0.9  # 90% to leave padding

        # Offset to center the content
        content_w = canvas_width * scale
        content_h = canvas_height * scale
        offset_x = chart_left + (chart_w - content_w) / 2
        offset_y = chart_bottom + (chart_h - content_h) / 2

        # Draw chart border
        c.setStrokeColor(COLOR_BORDER)
        c.setLineWidth(0.5)
        c.rect(chart_left - 2, chart_bottom - 2, chart_w + 4, chart_h + 4)

        # Draw venue features first (underneath tables)
        for feature in venue_features:
            _draw_venue_feature(c, feature, scale, offset_x, offset_y, content_h)

        # Draw tables with seats and guest names
        for table in tables:
            _draw_table(c, table, scale, offset_x, offset_y, content_h)

    # Draw unassigned guests sidebar
    if unassigned_guests:
        sidebar_left = page_width - margin - sidebar_width + 0.15 * inch
        _draw_unassigned_sidebar(
            c, unassigned_guests, sidebar_left, chart_bottom, sidebar_width - 0.15 * inch, chart_h
        )

    # Draw footer
    _draw_footer(c, page_width, margin, footer_height)

    c.save()
    buf.seek(0)
    return buf.read()


def generate_empty_layout_pdf(event_name: str, event_date: Optional[date]) -> bytes:
    """Generate a simple PDF for events with no layout at all."""
    return generate_seating_chart_pdf(
        event_name=event_name,
        event_date=event_date,
        canvas_width=2000,
        canvas_height=1500,
        tables=[],
        venue_features=[],
        unassigned_guests=[],
    )


# ---------------------------------------------------------------------------
# Internal drawing helpers
# ---------------------------------------------------------------------------


def _draw_header(
    c: canvas.Canvas,
    event_name: str,
    event_date: Optional[date],
    page_width: float,
    page_height: float,
    margin: float,
    header_height: float,
):
    """Draw the page header with event name and date."""
    header_y = page_height - margin - header_height

    # Header background
    c.setFillColor(COLOR_HEADER_BG)
    c.rect(margin, header_y, page_width - 2 * margin, header_height, fill=1, stroke=0)

    # Decorative line at bottom of header
    c.setStrokeColor(COLOR_ACCENT)
    c.setLineWidth(1.5)
    c.line(margin + 0.3 * inch, header_y, page_width - margin - 0.3 * inch, header_y)

    # Event name
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 20)
    name_y = header_y + header_height * 0.5
    c.drawCentredString(page_width / 2, name_y, event_name)

    # "Seating Chart" subtitle
    c.setFont("Helvetica", 10)
    c.setFillColor(COLOR_LIGHT_TEXT)
    c.drawCentredString(page_width / 2, name_y - 16, "Seating Chart")

    # Date (if available)
    if event_date:
        date_str = event_date.strftime("%B %d, %Y")
        c.setFont("Helvetica", 9)
        c.setFillColor(COLOR_LIGHT_TEXT)
        c.drawCentredString(page_width / 2, name_y - 28, date_str)


def _draw_footer(
    c: canvas.Canvas,
    page_width: float,
    margin: float,
    footer_height: float,
):
    """Draw a subtle footer."""
    c.setFont("Helvetica", 7)
    c.setFillColor(COLOR_LIGHT_TEXT)
    c.drawCentredString(page_width / 2, margin * 0.5, "Generated by Wedding Seating Planner")


def _draw_empty_layout(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
):
    """Draw a centered message for empty layouts."""
    c.setStrokeColor(COLOR_BORDER)
    c.setLineWidth(0.5)
    c.setDash(4, 4)
    c.rect(x, y, w, h)
    c.setDash()  # reset

    c.setFillColor(COLOR_LIGHT_TEXT)
    c.setFont("Helvetica", 14)
    c.drawCentredString(x + w / 2, y + h / 2 + 10, "No layout created yet")
    c.setFont("Helvetica", 10)
    c.drawCentredString(
        x + w / 2, y + h / 2 - 10, "Use the layout editor to design your seating chart"
    )


def _canvas_to_pdf_coords(
    cx: float,
    cy: float,
    scale: float,
    offset_x: float,
    offset_y: float,
    content_h: float,
) -> tuple[float, float]:
    """Convert canvas coordinates to PDF coordinates.

    Canvas has origin top-left (y increases downward).
    PDF has origin bottom-left (y increases upward).
    """
    px = offset_x + cx * scale
    py = offset_y + content_h - cy * scale
    return px, py


def _draw_venue_feature(
    c: canvas.Canvas,
    feature: dict,
    scale: float,
    offset_x: float,
    offset_y: float,
    content_h: float,
):
    """Draw a venue feature (dance floor, bar, etc.)."""
    fx, fy = _canvas_to_pdf_coords(
        feature["x"], feature["y"], scale, offset_x, offset_y, content_h
    )
    fw = feature["width"] * scale
    fh = feature["height"] * scale

    c.saveState()

    # Handle rotation
    if feature.get("rotation", 0) != 0:
        c.translate(fx, fy)
        c.rotate(-feature["rotation"])
        c.translate(-fx, -fy)

    c.setFillColor(COLOR_FEATURE_FILL)
    c.setStrokeColor(COLOR_FEATURE_STROKE)
    c.setLineWidth(0.8)
    c.setDash(3, 3)

    if feature.get("shape") == "circle":
        radius = min(fw, fh) / 2
        c.circle(fx, fy, radius, fill=1, stroke=1)
    else:
        c.rect(fx - fw / 2, fy - fh / 2, fw, fh, fill=1, stroke=1)

    c.setDash()  # reset

    # Feature label
    c.setFillColor(COLOR_LIGHT_TEXT)
    font_size = max(6, min(9, fw * 0.12))
    c.setFont("Helvetica-Oblique", font_size)
    label = feature.get("name", feature.get("type", ""))
    c.drawCentredString(fx, fy - font_size * 0.35, label)

    c.restoreState()


def _draw_table(
    c: canvas.Canvas,
    table: dict,
    scale: float,
    offset_x: float,
    offset_y: float,
    content_h: float,
):
    """Draw a table with its seats and guest names."""
    tx, ty = _canvas_to_pdf_coords(
        table["x"], table["y"], scale, offset_x, offset_y, content_h
    )
    tw = table["width"] * scale
    th = table["height"] * scale
    shape = table.get("shape", "round")

    c.saveState()

    # Handle rotation
    if table.get("rotation", 0) != 0:
        c.translate(tx, ty)
        c.rotate(-table["rotation"])
        c.translate(-tx, -ty)

    # Table fill color
    fill_color = COLOR_SWEETHEART if shape == "sweetheart" else COLOR_TABLE_FILL
    c.setFillColor(fill_color)
    c.setStrokeColor(COLOR_TABLE_STROKE)
    c.setLineWidth(1.0)

    if shape in ("round", "sweetheart"):
        radius = min(tw, th) / 2
        c.circle(tx, ty, radius, fill=1, stroke=1)

        # Sweetheart gets a small heart indicator
        if shape == "sweetheart":
            c.setFillColor(colors.HexColor("#E8B4B8"))
            heart_size = max(4, radius * 0.2)
            c.circle(tx, ty + radius * 0.25, heart_size, fill=1, stroke=0)
    else:
        # Rectangle
        c.rect(tx - tw / 2, ty - th / 2, tw, th, fill=1, stroke=1)

    # Table name/number
    c.setFillColor(COLOR_TEXT)
    name_font_size = max(5, min(8, min(tw, th) * 0.15))
    c.setFont("Helvetica-Bold", name_font_size)
    c.drawCentredString(tx, ty - name_font_size * 0.35, table.get("name", ""))

    # Draw seats and guest names
    seats = table.get("seats", [])
    for seat in seats:
        _draw_seat(c, seat, tx, ty, scale, shape, tw, th)

    c.restoreState()


def _draw_seat(
    c: canvas.Canvas,
    seat: dict,
    table_x: float,
    table_y: float,
    scale: float,
    table_shape: str,
    table_w: float,
    table_h: float,
):
    """Draw a single seat with guest name (if assigned)."""
    # Seat position relative to table center
    sx = table_x + seat["x_offset"] * scale
    sy = table_y - seat["y_offset"] * scale  # Flip Y for PDF

    seat_radius = max(2.5, min(5, min(table_w, table_h) * 0.06))

    guest_name = seat.get("guest_name")

    if guest_name:
        # Filled seat
        c.setFillColor(COLOR_ACCENT)
        c.setStrokeColor(COLOR_TABLE_STROKE)
        c.setLineWidth(0.5)
        c.circle(sx, sy, seat_radius, fill=1, stroke=1)

        # Guest name label
        c.setFillColor(COLOR_TEXT)
        font_size = max(4, min(6, seat_radius * 1.2))
        c.setFont("Helvetica", font_size)

        # Position name outside the seat, radiating from table center
        dx = sx - table_x
        dy = sy - table_y
        dist = math.sqrt(dx * dx + dy * dy) if (dx != 0 or dy != 0) else 1
        label_offset = seat_radius + font_size * 0.8
        label_x = sx + (dx / dist) * label_offset if dist > 0 else sx
        label_y = sy + (dy / dist) * label_offset - font_size * 0.35 if dist > 0 else sy + label_offset

        # Truncate long names
        display_name = guest_name if len(guest_name) <= 14 else guest_name[:12] + ".."
        c.drawCentredString(label_x, label_y, display_name)
    else:
        # Empty seat
        c.setFillColor(colors.white)
        c.setStrokeColor(COLOR_BORDER)
        c.setLineWidth(0.3)
        c.circle(sx, sy, seat_radius, fill=1, stroke=1)


def _draw_unassigned_sidebar(
    c: canvas.Canvas,
    guests: list[str],
    x: float,
    y: float,
    w: float,
    h: float,
):
    """Draw a sidebar listing unassigned guests."""
    # Sidebar background
    c.setFillColor(COLOR_HEADER_BG)
    c.setStrokeColor(COLOR_BORDER)
    c.setLineWidth(0.5)
    c.rect(x - 0.1 * inch, y, w, h, fill=1, stroke=1)

    # Sidebar title
    title_y = y + h - 18
    c.setFillColor(COLOR_PRIMARY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, title_y, "Unassigned Guests")

    # Decorative line
    c.setStrokeColor(COLOR_ACCENT)
    c.setLineWidth(0.8)
    c.line(x, title_y - 4, x + w - 0.2 * inch, title_y - 4)

    # Guest count
    c.setFont("Helvetica", 7)
    c.setFillColor(COLOR_LIGHT_TEXT)
    c.drawString(x, title_y - 14, f"({len(guests)} guest{'s' if len(guests) != 1 else ''})")

    # List guests
    c.setFont("Helvetica", 7)
    c.setFillColor(COLOR_TEXT)
    line_height = 11
    start_y = title_y - 28
    max_lines = int((start_y - y - 10) / line_height)

    for i, name in enumerate(guests):
        if i >= max_lines:
            # Show overflow indicator
            c.setFillColor(COLOR_LIGHT_TEXT)
            c.drawString(x + 4, start_y - i * line_height, f"... and {len(guests) - i} more")
            break

        display_name = name if len(name) <= 24 else name[:22] + ".."
        c.setFillColor(COLOR_TEXT)
        c.drawString(x + 4, start_y - i * line_height, f"\u2022 {display_name}")
