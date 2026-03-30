"""Tests for PDF export endpoint.

Tests run against the real Render PostgreSQL database via TestClient.
Each test creates unique users/events to avoid conflicts, and cleans up after itself.
"""

from __future__ import annotations

import uuid
import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal
from app.models.user import User
from app.models.event import Event
from app.models.guest import Guest
from app.models.layout import Layout
from app.models.table import Table, TableShape
from app.models.seat import Seat
from app.models.venue_feature import VenueFeature, VenueFeatureType, VenueFeatureShape


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    """Create a TestClient for the FastAPI app."""
    app = create_app()
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    """Yield a database session, closing on teardown."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def auth_headers(client, db):
    """Register a unique user and return (headers_dict, user_id).
    Cleans up user (and cascade-deleted events) after test.
    """
    email = f"exporttest_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Export Test User",
    })
    assert resp.status_code == 201
    data = resp.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    yield headers, user_id

    # Cleanup: delete user (cascades to events, guests, etc.)
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            session.delete(user)
            session.commit()
    finally:
        session.close()


@pytest.fixture()
def second_auth_headers(client, db):
    """Register a second unique user for cross-user tests."""
    email = f"exporttest2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second Export User",
    })
    assert resp.status_code == 201
    data = resp.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    yield headers, user_id

    session = SessionLocal()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            session.delete(user)
            session.commit()
    finally:
        session.close()


def _create_event_with_layout(client, headers, event_name="Test Wedding", event_date="2026-09-15"):
    """Helper: create an event, layout, table with seats, venue feature, and guests."""
    # Create event
    resp = client.post("/api/events", json={
        "name": event_name,
        "date": event_date,
        "venue_description": "Beautiful garden venue",
    }, headers=headers)
    assert resp.status_code == 201
    event_id = resp.json()["id"]

    # Initialize layout (GET creates it lazily)
    resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
    assert resp.status_code == 200

    # Create a round table
    resp = client.post(f"/api/events/{event_id}/layout/tables", json={
        "name": "Table 1",
        "shape": "round",
        "x": 400,
        "y": 300,
        "width": 120,
        "height": 120,
        "seat_count": 4,
    }, headers=headers)
    assert resp.status_code == 201
    table_data = resp.json()
    table_id = table_data["id"]
    seats = table_data["seats"]

    # Create a venue feature (dance floor)
    resp = client.post(f"/api/events/{event_id}/layout/features", json={
        "name": "Dance Floor",
        "type": "dance_floor",
        "shape": "rectangle",
        "x": 800,
        "y": 500,
        "width": 200,
        "height": 200,
    }, headers=headers)
    assert resp.status_code == 201

    # Add guests via API
    guest_names = ["Alice Smith", "Bob Jones", "Carol Davis", "Dave Wilson", "Eve Brown"]
    guest_ids = []
    for name in guest_names:
        resp = client.post(f"/api/events/{event_id}/guests", json={
            "name": name,
        }, headers=headers)
        assert resp.status_code == 201
        guest_ids.append(resp.json()["id"])

    # Assign first 3 guests to seats
    for i in range(3):
        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seats[i]['id']}/assign",
            json={"guest_id": guest_ids[i]},
            headers=headers,
        )
        assert resp.status_code == 200

    return event_id, table_id, guest_ids


# ---------------------------------------------------------------------------
# Tests: GET /api/events/{event_id}/export/pdf
# ---------------------------------------------------------------------------


class TestExportPDF:
    """Tests for the PDF export endpoint."""

    def test_export_pdf_success(self, client, auth_headers):
        """Export PDF for event with layout returns valid PDF."""
        headers, user_id = auth_headers
        event_id, _, _ = _create_event_with_layout(client, headers)

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "attachment" in resp.headers["content-disposition"]
        assert "seating-chart.pdf" in resp.headers["content-disposition"]
        # Check it's a valid PDF (starts with %PDF)
        assert resp.content[:5] == b"%PDF-"
        # Non-empty body
        assert len(resp.content) > 100

    def test_export_pdf_content_disposition_filename(self, client, auth_headers):
        """Content-Disposition header contains sanitized event name."""
        headers, user_id = auth_headers
        event_id, _, _ = _create_event_with_layout(
            client, headers, event_name="Our Beautiful Wedding"
        )

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert "Our-Beautiful-Wedding-seating-chart.pdf" in resp.headers["content-disposition"]

    def test_export_pdf_empty_layout(self, client, auth_headers):
        """Export PDF for event with no layout returns valid PDF with empty message."""
        headers, user_id = auth_headers

        # Create event but don't set up layout
        resp = client.post("/api/events", json={
            "name": "Empty Layout Event",
            "date": "2026-10-01",
        }, headers=headers)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:5] == b"%PDF-"
        assert len(resp.content) > 100

    def test_export_pdf_layout_with_no_tables(self, client, auth_headers):
        """Export PDF for event with layout but no tables returns valid PDF."""
        headers, user_id = auth_headers

        resp = client.post("/api/events", json={
            "name": "No Tables Event",
        }, headers=headers)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        # Initialize layout (empty)
        resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp.status_code == 200

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:5] == b"%PDF-"

    def test_export_pdf_event_not_found(self, client, auth_headers):
        """Export PDF for nonexistent event returns 404."""
        headers, user_id = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/events/{fake_id}/export/pdf", headers=headers)
        assert resp.status_code == 404

    def test_export_pdf_other_user_forbidden(self, client, auth_headers, second_auth_headers):
        """Export PDF for another user's event returns 403."""
        headers_a, _ = auth_headers
        headers_b, _ = second_auth_headers

        # User A creates event
        resp = client.post("/api/events", json={"name": "A's Private Event"}, headers=headers_a)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        # User B tries to export
        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers_b)
        assert resp.status_code == 403

    def test_export_pdf_no_auth_returns_401_or_403(self, client, auth_headers):
        """Export PDF without auth returns 401 or 403."""
        headers, _ = auth_headers
        resp = client.post("/api/events", json={"name": "NoAuth Export"}, headers=headers)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        resp = client.get(f"/api/events/{event_id}/export/pdf")
        assert resp.status_code in (401, 403)

    def test_export_pdf_with_date(self, client, auth_headers):
        """Export PDF for event with date includes proper header."""
        headers, user_id = auth_headers
        event_id, _, _ = _create_event_with_layout(
            client, headers, event_name="Dated Wedding", event_date="2026-12-25"
        )

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.content[:5] == b"%PDF-"

    def test_export_pdf_without_date(self, client, auth_headers):
        """Export PDF for event without date still succeeds."""
        headers, user_id = auth_headers

        resp = client.post("/api/events", json={
            "name": "No Date Event",
        }, headers=headers)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.content[:5] == b"%PDF-"

    def test_export_pdf_with_all_guests_assigned(self, client, auth_headers):
        """Export PDF when all guests are assigned (no unassigned section needed)."""
        headers, user_id = auth_headers

        # Create event with layout
        resp = client.post("/api/events", json={
            "name": "All Assigned Event",
            "date": "2026-09-15",
        }, headers=headers)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        # Initialize layout
        client.get(f"/api/events/{event_id}/layout", headers=headers)

        # Create table with 2 seats
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Table A",
            "shape": "round",
            "x": 300,
            "y": 300,
            "width": 100,
            "height": 100,
            "seat_count": 2,
        }, headers=headers)
        assert resp.status_code == 201
        seats = resp.json()["seats"]

        # Create 2 guests
        guest_ids = []
        for name in ["Guest One", "Guest Two"]:
            resp = client.post(f"/api/events/{event_id}/guests", json={"name": name}, headers=headers)
            assert resp.status_code == 201
            guest_ids.append(resp.json()["id"])

        # Assign both
        for i in range(2):
            client.put(
                f"/api/events/{event_id}/layout/seats/{seats[i]['id']}/assign",
                json={"guest_id": guest_ids[i]},
                headers=headers,
            )

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        assert resp.content[:5] == b"%PDF-"

    def test_export_pdf_special_characters_in_name(self, client, auth_headers):
        """Export PDF with special characters in event name produces safe filename."""
        headers, user_id = auth_headers

        resp = client.post("/api/events", json={
            "name": "Smith & Jones Wedding!",
        }, headers=headers)
        assert resp.status_code == 201
        event_id = resp.json()["id"]

        resp = client.get(f"/api/events/{event_id}/export/pdf", headers=headers)
        assert resp.status_code == 200
        # Filename should not contain & or !
        disposition = resp.headers["content-disposition"]
        assert "seating-chart.pdf" in disposition
        assert "&" not in disposition.split("filename=")[1]


class TestPDFGeneratorUnit:
    """Unit tests for the PDF generator service."""

    def test_generate_pdf_basic(self):
        """Basic PDF generation returns valid PDF bytes."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Test Wedding",
            event_date=date(2026, 9, 15),
            canvas_width=2000,
            canvas_height=1500,
            tables=[{
                "name": "Table 1",
                "shape": "round",
                "x": 400,
                "y": 300,
                "width": 120,
                "height": 120,
                "rotation": 0,
                "seats": [
                    {"seat_index": 0, "guest_name": "Alice", "x_offset": 50, "y_offset": 0},
                    {"seat_index": 1, "guest_name": None, "x_offset": -50, "y_offset": 0},
                ],
            }],
            venue_features=[{
                "name": "Dance Floor",
                "type": "dance_floor",
                "shape": "rectangle",
                "x": 800,
                "y": 500,
                "width": 200,
                "height": 200,
                "rotation": 0,
            }],
            unassigned_guests=["Bob Jones", "Carol Davis"],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"
        assert len(pdf_bytes) > 100

    def test_generate_pdf_empty_tables(self):
        """PDF generation with empty tables list returns valid PDF."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Empty Wedding",
            event_date=None,
            canvas_width=2000,
            canvas_height=1500,
            tables=[],
            venue_features=[],
            unassigned_guests=[],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_pdf_rectangle_table(self):
        """PDF generation with rectangular table."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Rectangle Test",
            event_date=date(2026, 6, 1),
            canvas_width=2000,
            canvas_height=1500,
            tables=[{
                "name": "Head Table",
                "shape": "rectangle",
                "x": 500,
                "y": 200,
                "width": 200,
                "height": 80,
                "rotation": 0,
                "seats": [
                    {"seat_index": 0, "guest_name": "Bride", "x_offset": -30, "y_offset": -30},
                    {"seat_index": 1, "guest_name": "Groom", "x_offset": 30, "y_offset": -30},
                ],
            }],
            venue_features=[],
            unassigned_guests=[],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_pdf_sweetheart_table(self):
        """PDF generation with sweetheart table shape."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Sweetheart Test",
            event_date=None,
            canvas_width=2000,
            canvas_height=1500,
            tables=[{
                "name": "Sweetheart",
                "shape": "sweetheart",
                "x": 400,
                "y": 200,
                "width": 80,
                "height": 80,
                "rotation": 0,
                "seats": [
                    {"seat_index": 0, "guest_name": "Bride", "x_offset": -30, "y_offset": 0},
                    {"seat_index": 1, "guest_name": "Groom", "x_offset": 30, "y_offset": 0},
                ],
            }],
            venue_features=[],
            unassigned_guests=[],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_pdf_circle_feature(self):
        """PDF generation with circle venue feature."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Circle Feature Test",
            event_date=None,
            canvas_width=2000,
            canvas_height=1500,
            tables=[],
            venue_features=[{
                "name": "Round Bar",
                "type": "bar",
                "shape": "circle",
                "x": 500,
                "y": 500,
                "width": 100,
                "height": 100,
                "rotation": 0,
            }],
            unassigned_guests=[],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_pdf_many_unassigned_guests(self):
        """PDF generation with many unassigned guests handles overflow."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        many_guests = [f"Guest {i}" for i in range(100)]
        pdf_bytes = generate_seating_chart_pdf(
            event_name="Big Wedding",
            event_date=date(2026, 9, 15),
            canvas_width=2000,
            canvas_height=1500,
            tables=[{
                "name": "Table 1",
                "shape": "round",
                "x": 400,
                "y": 300,
                "width": 120,
                "height": 120,
                "rotation": 0,
                "seats": [],
            }],
            venue_features=[],
            unassigned_guests=many_guests,
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_pdf_rotated_elements(self):
        """PDF generation with rotated tables and features."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Rotated Test",
            event_date=None,
            canvas_width=2000,
            canvas_height=1500,
            tables=[{
                "name": "Rotated Table",
                "shape": "rectangle",
                "x": 500,
                "y": 300,
                "width": 150,
                "height": 80,
                "rotation": 45,
                "seats": [
                    {"seat_index": 0, "guest_name": "Test Guest", "x_offset": 0, "y_offset": -30},
                ],
            }],
            venue_features=[{
                "name": "Angled Stage",
                "type": "stage",
                "shape": "rectangle",
                "x": 800,
                "y": 200,
                "width": 200,
                "height": 100,
                "rotation": 30,
            }],
            unassigned_guests=[],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_pdf_long_guest_names(self):
        """PDF generation truncates very long guest names."""
        from app.services.pdf_generator import generate_seating_chart_pdf

        pdf_bytes = generate_seating_chart_pdf(
            event_name="Long Names Test",
            event_date=None,
            canvas_width=2000,
            canvas_height=1500,
            tables=[{
                "name": "Table 1",
                "shape": "round",
                "x": 400,
                "y": 300,
                "width": 120,
                "height": 120,
                "rotation": 0,
                "seats": [
                    {"seat_index": 0, "guest_name": "This Is A Very Long Guest Name Indeed", "x_offset": 50, "y_offset": 0},
                ],
            }],
            venue_features=[],
            unassigned_guests=["Another Very Long Guest Name That Should Be Truncated"],
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_generate_empty_layout_pdf(self):
        """Empty layout PDF helper returns valid PDF."""
        from app.services.pdf_generator import generate_empty_layout_pdf

        pdf_bytes = generate_empty_layout_pdf(
            event_name="Empty Event",
            event_date=date(2026, 1, 1),
        )

        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"
        assert len(pdf_bytes) > 100
