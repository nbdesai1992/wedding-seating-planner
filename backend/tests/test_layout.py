"""Tests for Layout, Table, Seat & VenueFeature CRUD endpoints.

Tests run against the real Render PostgreSQL database via TestClient.
Each test creates unique users/events to avoid conflicts, and cleans up after itself.
"""

from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal
from app.models.user import User


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
    email = f"layouttest_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Layout Test User",
    })
    assert resp.status_code == 201
    data = resp.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    yield headers, user_id

    # Cleanup: delete user (cascades to events, layouts, tables, seats, etc.)
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
    email = f"layouttest2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second Layout User",
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


@pytest.fixture()
def event_id(client, auth_headers):
    """Create an event and return its ID."""
    headers, _ = auth_headers
    resp = client.post("/api/events", json={
        "name": "Layout Test Wedding",
        "date": "2026-09-15",
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Tests: GET /api/events/{event_id}/layout (Get/Create Layout)
# ---------------------------------------------------------------------------

class TestGetLayout:
    def test_get_layout_creates_lazily(self, client, auth_headers, event_id):
        """First GET creates layout with defaults."""
        headers, _ = auth_headers
        resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["event_id"] == event_id
        assert data["canvas_width"] == 2000
        assert data["canvas_height"] == 1500
        assert data["zoom_level"] == 1.0
        assert data["pan_x"] == 0.0
        assert data["pan_y"] == 0.0
        assert data["tables"] == []
        assert data["features"] == []
        assert "id" in data

    def test_get_layout_idempotent(self, client, auth_headers, event_id):
        """Multiple GETs return the same layout."""
        headers, _ = auth_headers
        resp1 = client.get(f"/api/events/{event_id}/layout", headers=headers)
        resp2 = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp1.json()["id"] == resp2.json()["id"]

    def test_get_layout_nonexistent_event_returns_404(self, client, auth_headers):
        """Getting layout for nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/events/{fake_id}/layout", headers=headers)
        assert resp.status_code == 404

    def test_get_layout_other_user_returns_403(self, client, auth_headers, second_auth_headers, event_id):
        """Accessing another user's layout returns 403."""
        _, _ = auth_headers
        headers_b, _ = second_auth_headers
        resp = client.get(f"/api/events/{event_id}/layout", headers=headers_b)
        assert resp.status_code == 403

    def test_get_layout_without_auth_returns_401_or_403(self, client, event_id):
        """Getting layout without auth returns 401 or 403."""
        resp = client.get(f"/api/events/{event_id}/layout")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: PUT /api/events/{event_id}/layout (Update Layout)
# ---------------------------------------------------------------------------

class TestUpdateLayout:
    def test_update_layout_all_fields(self, client, auth_headers, event_id):
        """Update all canvas properties."""
        headers, _ = auth_headers
        # Ensure layout exists
        client.get(f"/api/events/{event_id}/layout", headers=headers)

        resp = client.put(f"/api/events/{event_id}/layout", json={
            "canvas_width": 3000,
            "canvas_height": 2000,
            "zoom_level": 1.5,
            "pan_x": 100.0,
            "pan_y": 200.0,
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["canvas_width"] == 3000
        assert data["canvas_height"] == 2000
        assert data["zoom_level"] == 1.5
        assert data["pan_x"] == 100.0
        assert data["pan_y"] == 200.0

    def test_update_layout_partial(self, client, auth_headers, event_id):
        """Partial update only changes specified fields."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)

        resp = client.put(f"/api/events/{event_id}/layout", json={
            "zoom_level": 2.0,
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["zoom_level"] == 2.0
        # Default values should remain
        assert data["canvas_width"] == 2000
        assert data["canvas_height"] == 1500

    def test_update_layout_empty_body(self, client, auth_headers, event_id):
        """Empty body update succeeds without changes."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)

        resp = client.put(f"/api/events/{event_id}/layout", json={}, headers=headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Tests: POST /api/events/{event_id}/layout/tables (Create Table)
# ---------------------------------------------------------------------------

class TestCreateTable:
    def test_create_table_success(self, client, auth_headers, event_id):
        """Create table with all fields returns 201 with auto-generated seats."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Table 1",
            "shape": "round",
            "x": 100.0,
            "y": 200.0,
            "width": 150.0,
            "height": 150.0,
            "rotation": 0.0,
            "seat_count": 8,
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Table 1"
        assert data["shape"] == "round"
        assert data["seat_count"] == 8
        assert len(data["seats"]) == 8
        # Verify seat indices
        indices = [s["seat_index"] for s in data["seats"]]
        assert sorted(indices) == list(range(8))

    def test_create_table_minimal(self, client, auth_headers, event_id):
        """Create table with minimal fields uses defaults."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Minimal Table",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Minimal Table"
        assert data["shape"] == "round"
        assert data["seat_count"] == 8
        assert len(data["seats"]) == 8

    def test_create_table_rectangle(self, client, auth_headers, event_id):
        """Create a rectangle table generates seats correctly."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Head Table",
            "shape": "rectangle",
            "seat_count": 6,
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["shape"] == "rectangle"
        assert len(data["seats"]) == 6

    def test_create_table_sweetheart(self, client, auth_headers, event_id):
        """Create a sweetheart table."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Sweetheart",
            "shape": "sweetheart",
            "seat_count": 2,
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["shape"] == "sweetheart"
        assert len(resp.json()["seats"]) == 2

    def test_create_table_invalid_shape_returns_422(self, client, auth_headers, event_id):
        """Invalid shape returns 422."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Bad Shape",
            "shape": "hexagon",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_table_missing_name_returns_422(self, client, auth_headers, event_id):
        """Missing name returns 422."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "shape": "round",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_table_zero_seats_returns_422(self, client, auth_headers, event_id):
        """Zero seat count returns 422."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "No Seats",
            "seat_count": 0,
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_table_appears_in_layout(self, client, auth_headers, event_id):
        """Created table appears in layout GET response."""
        headers, _ = auth_headers
        client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Visible Table",
            "seat_count": 4,
        }, headers=headers)

        resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp.status_code == 200
        table_names = [t["name"] for t in resp.json()["tables"]]
        assert "Visible Table" in table_names


# ---------------------------------------------------------------------------
# Tests: PUT /api/events/{event_id}/layout/tables/{table_id} (Update Table)
# ---------------------------------------------------------------------------

class TestUpdateTable:
    def test_update_table_name(self, client, auth_headers, event_id):
        """Update table name only."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Original",
            "seat_count": 4,
        }, headers=headers)
        table_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}/layout/tables/{table_id}", json={
            "name": "Renamed",
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed"
        # Seats unchanged
        assert len(resp.json()["seats"]) == 4

    def test_update_table_increase_seats(self, client, auth_headers, event_id):
        """Increasing seat_count adds new seats."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Growing",
            "seat_count": 4,
        }, headers=headers)
        table_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}/layout/tables/{table_id}", json={
            "seat_count": 8,
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["seat_count"] == 8
        assert len(resp.json()["seats"]) == 8

    def test_update_table_decrease_seats(self, client, auth_headers, event_id):
        """Decreasing seat_count removes excess seats."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Shrinking",
            "seat_count": 8,
        }, headers=headers)
        table_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}/layout/tables/{table_id}", json={
            "seat_count": 4,
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["seat_count"] == 4
        assert len(resp.json()["seats"]) == 4

    def test_update_table_position(self, client, auth_headers, event_id):
        """Update position and size."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Moveable",
            "seat_count": 2,
        }, headers=headers)
        table_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}/layout/tables/{table_id}", json={
            "x": 500.0,
            "y": 300.0,
            "width": 200.0,
            "height": 200.0,
            "rotation": 45.0,
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["x"] == 500.0
        assert data["y"] == 300.0
        assert data["rotation"] == 45.0

    def test_update_table_not_found_returns_404(self, client, auth_headers, event_id):
        """Updating nonexistent table returns 404."""
        headers, _ = auth_headers
        # Ensure layout exists
        client.get(f"/api/events/{event_id}/layout", headers=headers)
        fake_id = str(uuid.uuid4())
        resp = client.put(f"/api/events/{event_id}/layout/tables/{fake_id}", json={
            "name": "X",
        }, headers=headers)
        assert resp.status_code == 404

    def test_update_table_invalid_shape_returns_422(self, client, auth_headers, event_id):
        """Invalid shape in update returns 422."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Shape Test",
            "seat_count": 2,
        }, headers=headers)
        table_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}/layout/tables/{table_id}", json={
            "shape": "triangle",
        }, headers=headers)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests: DELETE /api/events/{event_id}/layout/tables/{table_id}
# ---------------------------------------------------------------------------

class TestDeleteTable:
    def test_delete_table_success(self, client, auth_headers, event_id):
        """Delete table returns 204 and removes it from layout."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Delete Me",
            "seat_count": 4,
        }, headers=headers)
        table_id = create_resp.json()["id"]

        resp = client.delete(f"/api/events/{event_id}/layout/tables/{table_id}", headers=headers)
        assert resp.status_code == 204

        # Verify removed from layout
        layout_resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        table_ids = [t["id"] for t in layout_resp.json()["tables"]]
        assert table_id not in table_ids

    def test_delete_table_not_found_returns_404(self, client, auth_headers, event_id):
        """Deleting nonexistent table returns 404."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)
        fake_id = str(uuid.uuid4())
        resp = client.delete(f"/api/events/{event_id}/layout/tables/{fake_id}", headers=headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tests: Venue Features CRUD
# ---------------------------------------------------------------------------

class TestVenueFeatures:
    def test_create_feature_success(self, client, auth_headers, event_id):
        """Create a venue feature returns 201."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Dance Floor",
            "type": "dance_floor",
            "shape": "rectangle",
            "x": 400.0,
            "y": 400.0,
            "width": 300.0,
            "height": 300.0,
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Dance Floor"
        assert data["type"] == "dance_floor"
        assert data["shape"] == "rectangle"
        assert data["x"] == 400.0

    def test_create_feature_circle(self, client, auth_headers, event_id):
        """Create a circular feature."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Bar Area",
            "type": "bar",
            "shape": "circle",
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["shape"] == "circle"

    def test_create_feature_invalid_type_returns_422(self, client, auth_headers, event_id):
        """Invalid feature type returns 422."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Bad Type",
            "type": "swimming_pool",
            "shape": "rectangle",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_feature_invalid_shape_returns_422(self, client, auth_headers, event_id):
        """Invalid feature shape returns 422."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Bad Shape",
            "type": "custom",
            "shape": "triangle",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_feature_missing_name_returns_422(self, client, auth_headers, event_id):
        """Missing name returns 422."""
        headers, _ = auth_headers
        resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "type": "bar",
        }, headers=headers)
        assert resp.status_code == 422

    def test_update_feature_success(self, client, auth_headers, event_id):
        """Update a venue feature."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Stage",
            "type": "stage",
        }, headers=headers)
        feature_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}/layout/features/{feature_id}", json={
            "name": "Main Stage",
            "x": 500.0,
            "y": 100.0,
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Main Stage"
        assert resp.json()["x"] == 500.0

    def test_update_feature_not_found_returns_404(self, client, auth_headers, event_id):
        """Updating nonexistent feature returns 404."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)
        fake_id = str(uuid.uuid4())
        resp = client.put(f"/api/events/{event_id}/layout/features/{fake_id}", json={
            "name": "X",
        }, headers=headers)
        assert resp.status_code == 404

    def test_delete_feature_success(self, client, auth_headers, event_id):
        """Delete a venue feature returns 204."""
        headers, _ = auth_headers
        create_resp = client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Cake Table",
            "type": "cake_table",
        }, headers=headers)
        feature_id = create_resp.json()["id"]

        resp = client.delete(f"/api/events/{event_id}/layout/features/{feature_id}", headers=headers)
        assert resp.status_code == 204

        # Verify removed from layout
        layout_resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        feature_ids = [f["id"] for f in layout_resp.json()["features"]]
        assert feature_id not in feature_ids

    def test_delete_feature_not_found_returns_404(self, client, auth_headers, event_id):
        """Deleting nonexistent feature returns 404."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)
        fake_id = str(uuid.uuid4())
        resp = client.delete(f"/api/events/{event_id}/layout/features/{fake_id}", headers=headers)
        assert resp.status_code == 404

    def test_feature_appears_in_layout(self, client, auth_headers, event_id):
        """Created feature appears in layout GET response."""
        headers, _ = auth_headers
        client.post(f"/api/events/{event_id}/layout/features", json={
            "name": "Visible Feature",
            "type": "custom",
            "shape": "rectangle",
        }, headers=headers)

        resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp.status_code == 200
        feature_names = [f["name"] for f in resp.json()["features"]]
        assert "Visible Feature" in feature_names


# ---------------------------------------------------------------------------
# Tests: Seating Assignment
# ---------------------------------------------------------------------------

class TestSeatingAssignment:
    def _create_table_and_guest(self, client, headers, event_id):
        """Helper: create a table with 4 seats and a guest, return (table_data, guest_data)."""
        table_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Seating Test Table",
            "seat_count": 4,
        }, headers=headers)
        assert table_resp.status_code == 201
        table_data = table_resp.json()

        guest_resp = client.post(f"/api/events/{event_id}/guests", json={
            "name": "Jane Doe",
        }, headers=headers)
        assert guest_resp.status_code == 201
        guest_data = guest_resp.json()

        return table_data, guest_data

    def test_assign_guest_to_seat(self, client, auth_headers, event_id):
        """Assign a guest to a seat."""
        headers, _ = auth_headers
        table_data, guest_data = self._create_table_and_guest(client, headers, event_id)
        seat_id = table_data["seats"][0]["id"]
        guest_id = guest_data["id"]

        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/assign",
            json={"guest_id": guest_id},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["guest_id"] == guest_id
        assert data["guest_name"] == "Jane Doe"

    def test_unassign_guest_from_seat(self, client, auth_headers, event_id):
        """Unassign a guest from a seat."""
        headers, _ = auth_headers
        table_data, guest_data = self._create_table_and_guest(client, headers, event_id)
        seat_id = table_data["seats"][0]["id"]
        guest_id = guest_data["id"]

        # Assign first
        client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/assign",
            json={"guest_id": guest_id},
            headers=headers,
        )

        # Unassign
        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/unassign",
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["guest_id"] is None
        assert data["guest_name"] is None

    def test_assign_moves_guest_from_previous_seat(self, client, auth_headers, event_id):
        """Assigning guest to a new seat removes them from the old seat."""
        headers, _ = auth_headers
        table_data, guest_data = self._create_table_and_guest(client, headers, event_id)
        seat_0_id = table_data["seats"][0]["id"]
        seat_1_id = table_data["seats"][1]["id"]
        guest_id = guest_data["id"]

        # Assign to seat 0
        client.put(
            f"/api/events/{event_id}/layout/seats/{seat_0_id}/assign",
            json={"guest_id": guest_id},
            headers=headers,
        )

        # Assign to seat 1 (should auto-remove from seat 0)
        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seat_1_id}/assign",
            json={"guest_id": guest_id},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["guest_id"] == guest_id

        # Verify seat 0 is now empty
        layout_resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        tables = layout_resp.json()["tables"]
        for table in tables:
            for seat in table["seats"]:
                if seat["id"] == seat_0_id:
                    assert seat["guest_id"] is None

    def test_assign_guest_from_different_event_returns_404(self, client, auth_headers, event_id):
        """Cannot assign a guest from a different event."""
        headers, _ = auth_headers
        # Create table in event
        table_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Cross Event Test",
            "seat_count": 2,
        }, headers=headers)
        seat_id = table_resp.json()["seats"][0]["id"]

        # Create a different event and guest
        event2_resp = client.post("/api/events", json={"name": "Other Event"}, headers=headers)
        event2_id = event2_resp.json()["id"]
        guest_resp = client.post(f"/api/events/{event2_id}/guests", json={
            "name": "Wrong Event Guest",
        }, headers=headers)
        wrong_guest_id = guest_resp.json()["id"]

        # Try to assign wrong-event guest
        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/assign",
            json={"guest_id": wrong_guest_id},
            headers=headers,
        )
        assert resp.status_code == 404

    def test_assign_nonexistent_seat_returns_404(self, client, auth_headers, event_id):
        """Assigning to nonexistent seat returns 404."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)
        guest_resp = client.post(f"/api/events/{event_id}/guests", json={
            "name": "Lonely Guest",
        }, headers=headers)

        fake_seat_id = str(uuid.uuid4())
        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{fake_seat_id}/assign",
            json={"guest_id": guest_resp.json()["id"]},
            headers=headers,
        )
        assert resp.status_code == 404

    def test_unassign_nonexistent_seat_returns_404(self, client, auth_headers, event_id):
        """Unassigning nonexistent seat returns 404."""
        headers, _ = auth_headers
        client.get(f"/api/events/{event_id}/layout", headers=headers)
        fake_seat_id = str(uuid.uuid4())
        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{fake_seat_id}/unassign",
            headers=headers,
        )
        assert resp.status_code == 404

    def test_unassign_already_empty_seat(self, client, auth_headers, event_id):
        """Unassigning an empty seat succeeds (idempotent)."""
        headers, _ = auth_headers
        table_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Empty Unassign",
            "seat_count": 2,
        }, headers=headers)
        seat_id = table_resp.json()["seats"][0]["id"]

        resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/unassign",
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["guest_id"] is None

    def test_assigned_guest_visible_in_layout(self, client, auth_headers, event_id):
        """Assigned guest appears in layout GET response with guest_name."""
        headers, _ = auth_headers
        table_data, guest_data = self._create_table_and_guest(client, headers, event_id)
        seat_id = table_data["seats"][0]["id"]

        client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/assign",
            json={"guest_id": guest_data["id"]},
            headers=headers,
        )

        layout_resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        tables = layout_resp.json()["tables"]
        found = False
        for table in tables:
            for seat in table["seats"]:
                if seat["id"] == seat_id:
                    assert seat["guest_id"] == guest_data["id"]
                    assert seat["guest_name"] == "Jane Doe"
                    found = True
        assert found


# ---------------------------------------------------------------------------
# Tests: Seat Count Adjustment Edge Cases
# ---------------------------------------------------------------------------

class TestSeatCountAdjustment:
    def test_decrease_seats_unassigns_displaced_guests(self, client, auth_headers, event_id):
        """Decreasing seat count unassigns guests from removed seats."""
        headers, _ = auth_headers
        # Create table with 4 seats
        table_resp = client.post(f"/api/events/{event_id}/layout/tables", json={
            "name": "Adjust Test",
            "seat_count": 4,
        }, headers=headers)
        table_data = table_resp.json()
        table_id = table_data["id"]

        # Create guest and assign to last seat (index 3)
        guest_resp = client.post(f"/api/events/{event_id}/guests", json={
            "name": "Displaced Guest",
        }, headers=headers)
        guest_id = guest_resp.json()["id"]
        last_seat_id = table_data["seats"][-1]["id"]

        client.put(
            f"/api/events/{event_id}/layout/seats/{last_seat_id}/assign",
            json={"guest_id": guest_id},
            headers=headers,
        )

        # Decrease to 2 seats (should remove seats 2 and 3)
        resp = client.put(f"/api/events/{event_id}/layout/tables/{table_id}", json={
            "seat_count": 2,
        }, headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()["seats"]) == 2

        # Guest should have no seat assignments now
        guests_resp = client.get(f"/api/events/{event_id}/guests", headers=headers)
        for g in guests_resp.json():
            if g["id"] == guest_id:
                assert g["table_id"] is None
