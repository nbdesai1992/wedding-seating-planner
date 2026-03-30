"""Tests for event CRUD endpoints.

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
    email = f"evttest_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Event Test User",
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
    email = f"evttest2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second User",
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


# ---------------------------------------------------------------------------
# Tests: POST /api/events (Create)
# ---------------------------------------------------------------------------

class TestCreateEvent:
    def test_create_event_success(self, client, auth_headers):
        """Create event with all fields returns 201."""
        headers, user_id = auth_headers
        resp = client.post("/api/events", json={
            "name": "Our Wedding",
            "date": "2026-09-15",
            "venue_description": "Beautiful garden venue",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Our Wedding"
        assert data["date"] == "2026-09-15"
        assert data["venue_description"] == "Beautiful garden venue"
        assert data["guest_count"] == 0
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_event_minimal(self, client, auth_headers):
        """Create event with only required field (name)."""
        headers, _ = auth_headers
        resp = client.post("/api/events", json={
            "name": "Rehearsal Dinner",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Rehearsal Dinner"
        assert data["date"] is None
        assert data["venue_description"] is None
        assert data["guest_count"] == 0

    def test_create_event_missing_name_returns_422(self, client, auth_headers):
        """Missing name returns 422."""
        headers, _ = auth_headers
        resp = client.post("/api/events", json={
            "date": "2026-09-15",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_event_empty_name_returns_422(self, client, auth_headers):
        """Empty name returns 422."""
        headers, _ = auth_headers
        resp = client.post("/api/events", json={
            "name": "",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_event_without_auth_returns_401_or_403(self, client):
        """Creating event without auth returns 401 or 403."""
        resp = client.post("/api/events", json={
            "name": "No Auth Event",
        })
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: GET /api/events (List)
# ---------------------------------------------------------------------------

class TestListEvents:
    def test_list_events_empty(self, client, auth_headers):
        """List events for user with no events returns empty list."""
        headers, _ = auth_headers
        resp = client.get("/api/events", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_events_returns_own_events(self, client, auth_headers):
        """List returns only events belonging to the user."""
        headers, _ = auth_headers
        # Create two events
        client.post("/api/events", json={"name": "Event A"}, headers=headers)
        client.post("/api/events", json={"name": "Event B"}, headers=headers)

        resp = client.get("/api/events", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2
        names = [e["name"] for e in data]
        assert "Event A" in names
        assert "Event B" in names

    def test_list_events_excludes_other_users(self, client, auth_headers, second_auth_headers):
        """User cannot see another user's events."""
        headers_a, _ = auth_headers
        headers_b, _ = second_auth_headers

        # User A creates an event
        client.post("/api/events", json={"name": "A's Private Event"}, headers=headers_a)

        # User B should not see it
        resp = client.get("/api/events", headers=headers_b)
        assert resp.status_code == 200
        names = [e["name"] for e in resp.json()]
        assert "A's Private Event" not in names

    def test_list_events_without_auth_returns_401_or_403(self, client):
        """Listing events without auth returns 401 or 403."""
        resp = client.get("/api/events")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: GET /api/events/{event_id} (Get)
# ---------------------------------------------------------------------------

class TestGetEvent:
    def test_get_event_success(self, client, auth_headers):
        """Get event by ID returns the event."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={
            "name": "Get Me",
            "date": "2026-12-25",
        }, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        resp = client.get(f"/api/events/{event_id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == event_id
        assert data["name"] == "Get Me"
        assert data["date"] == "2026-12-25"

    def test_get_event_not_found_returns_404(self, client, auth_headers):
        """Getting nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/events/{fake_id}", headers=headers)
        assert resp.status_code == 404

    def test_get_event_other_user_returns_403(self, client, auth_headers, second_auth_headers):
        """Accessing another user's event returns 403."""
        headers_a, _ = auth_headers
        headers_b, _ = second_auth_headers

        # User A creates event
        create_resp = client.post("/api/events", json={"name": "A's Event"}, headers=headers_a)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        # User B tries to access it
        resp = client.get(f"/api/events/{event_id}", headers=headers_b)
        assert resp.status_code == 403

    def test_get_event_without_auth_returns_401_or_403(self, client, auth_headers):
        """Getting event without auth returns 401 or 403."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={"name": "NoAuth Get"}, headers=headers)
        event_id = create_resp.json()["id"]
        resp = client.get(f"/api/events/{event_id}")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: PUT /api/events/{event_id} (Update)
# ---------------------------------------------------------------------------

class TestUpdateEvent:
    def test_update_event_all_fields(self, client, auth_headers):
        """Update all fields of an event."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={
            "name": "Original Name",
        }, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}", json={
            "name": "Updated Name",
            "date": "2027-01-01",
            "venue_description": "New venue",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated Name"
        assert data["date"] == "2027-01-01"
        assert data["venue_description"] == "New venue"

    def test_update_event_partial(self, client, auth_headers):
        """Update only the name, leaving other fields untouched."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={
            "name": "Partial Test",
            "date": "2026-06-01",
            "venue_description": "Keep this",
        }, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}", json={
            "name": "Partial Updated",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Partial Updated"
        assert data["date"] == "2026-06-01"
        assert data["venue_description"] == "Keep this"

    def test_update_event_empty_body(self, client, auth_headers):
        """Update with empty body (no changes) succeeds."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={
            "name": "No Change",
        }, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}", json={}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "No Change"

    def test_update_event_not_found_returns_404(self, client, auth_headers):
        """Updating nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.put(f"/api/events/{fake_id}", json={"name": "X"}, headers=headers)
        assert resp.status_code == 404

    def test_update_event_other_user_returns_403(self, client, auth_headers, second_auth_headers):
        """Updating another user's event returns 403."""
        headers_a, _ = auth_headers
        headers_b, _ = second_auth_headers

        create_resp = client.post("/api/events", json={"name": "A's Event"}, headers=headers_a)
        event_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}", json={"name": "Hacked"}, headers=headers_b)
        assert resp.status_code == 403

    def test_update_event_empty_name_returns_422(self, client, auth_headers):
        """Update with empty name returns 422."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={"name": "Valid"}, headers=headers)
        event_id = create_resp.json()["id"]

        resp = client.put(f"/api/events/{event_id}", json={"name": ""}, headers=headers)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests: DELETE /api/events/{event_id}
# ---------------------------------------------------------------------------

class TestDeleteEvent:
    def test_delete_event_success(self, client, auth_headers):
        """Delete event returns 204 and event is gone."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={"name": "Delete Me"}, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        resp = client.delete(f"/api/events/{event_id}", headers=headers)
        assert resp.status_code == 204

        # Confirm it's gone
        get_resp = client.get(f"/api/events/{event_id}", headers=headers)
        assert get_resp.status_code == 404

    def test_delete_event_cascades_to_guests(self, client, auth_headers, db):
        """Deleting an event also deletes associated guests."""
        headers, user_id = auth_headers
        create_resp = client.post("/api/events", json={"name": "Cascade Test"}, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        # Insert a guest directly
        session = SessionLocal()
        try:
            guest = Guest(
                event_id=event_id,
                name="Test Guest",
            )
            session.add(guest)
            session.commit()
            guest_id = guest.id
        finally:
            session.close()

        # Delete event
        resp = client.delete(f"/api/events/{event_id}", headers=headers)
        assert resp.status_code == 204

        # Confirm guest is also gone
        session = SessionLocal()
        try:
            remaining = session.query(Guest).filter(Guest.id == guest_id).first()
            assert remaining is None
        finally:
            session.close()

    def test_delete_event_not_found_returns_404(self, client, auth_headers):
        """Deleting nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.delete(f"/api/events/{fake_id}", headers=headers)
        assert resp.status_code == 404

    def test_delete_event_other_user_returns_403(self, client, auth_headers, second_auth_headers):
        """Deleting another user's event returns 403."""
        headers_a, _ = auth_headers
        headers_b, _ = second_auth_headers

        create_resp = client.post("/api/events", json={"name": "Don't Delete"}, headers=headers_a)
        event_id = create_resp.json()["id"]

        resp = client.delete(f"/api/events/{event_id}", headers=headers_b)
        assert resp.status_code == 403

    def test_delete_event_without_auth_returns_401_or_403(self, client, auth_headers):
        """Deleting event without auth returns 401 or 403."""
        headers, _ = auth_headers
        create_resp = client.post("/api/events", json={"name": "NoAuth Del"}, headers=headers)
        event_id = create_resp.json()["id"]
        resp = client.delete(f"/api/events/{event_id}")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: Guest Count Computed Field
# ---------------------------------------------------------------------------

class TestGuestCount:
    def test_guest_count_reflects_guests(self, client, auth_headers):
        """guest_count in response reflects actual guest count."""
        headers, user_id = auth_headers
        create_resp = client.post("/api/events", json={"name": "Count Test"}, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]
        assert create_resp.json()["guest_count"] == 0

        # Add guests directly to DB
        session = SessionLocal()
        try:
            for i in range(3):
                session.add(Guest(event_id=event_id, name=f"Guest {i}"))
            session.commit()
        finally:
            session.close()

        # Now check guest_count
        resp = client.get(f"/api/events/{event_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["guest_count"] == 3

    def test_guest_count_in_list(self, client, auth_headers):
        """guest_count is correct in the list endpoint too."""
        headers, user_id = auth_headers
        create_resp = client.post("/api/events", json={"name": "List Count"}, headers=headers)
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        session = SessionLocal()
        try:
            for i in range(2):
                session.add(Guest(event_id=event_id, name=f"LG {i}"))
            session.commit()
        finally:
            session.close()

        resp = client.get("/api/events", headers=headers)
        assert resp.status_code == 200
        events_data = resp.json()
        matching = [e for e in events_data if e["id"] == event_id]
        assert len(matching) == 1
        assert matching[0]["guest_count"] == 2
