"""Tests for guest CRUD endpoints + CSV import.

Tests run against the real Render PostgreSQL database via TestClient.
Each test creates unique users/events to avoid conflicts, and cleans up after itself.
"""

from __future__ import annotations

import io
import uuid
import pytest
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
    Cleans up user (and cascade-deleted events/guests) after test.
    """
    email = f"gsttest_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Guest Test User",
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
    email = f"gsttest2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second Guest User",
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
        "name": "Guest Test Event",
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


def _base_url(event_id: str) -> str:
    """Return the base URL for guest endpoints."""
    return f"/api/events/{event_id}/guests"


# ---------------------------------------------------------------------------
# Tests: POST /api/events/{event_id}/guests (Create)
# ---------------------------------------------------------------------------

class TestCreateGuest:
    def test_create_guest_all_fields(self, client, auth_headers, event_id):
        """Create a guest with all fields returns 201."""
        headers, _ = auth_headers
        resp = client.post(_base_url(event_id), json={
            "name": "Alice Smith",
            "email": "alice@example.com",
            "meal_preference": "vegetarian",
            "is_plus_one": False,
            "group_tag": "bride-family",
            "notes": "Allergic to nuts",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Alice Smith"
        assert data["email"] == "alice@example.com"
        assert data["meal_preference"] == "vegetarian"
        assert data["is_plus_one"] is False
        assert data["plus_one_of"] is None
        assert data["group_tag"] == "bride-family"
        assert data["notes"] == "Allergic to nuts"
        assert data["event_id"] == event_id
        assert data["table_id"] is None
        assert data["seat_index"] is None
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_guest_minimal(self, client, auth_headers, event_id):
        """Create guest with only name (required field)."""
        headers, _ = auth_headers
        resp = client.post(_base_url(event_id), json={
            "name": "Bob Jones",
        }, headers=headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Bob Jones"
        assert data["email"] is None
        assert data["meal_preference"] is None
        assert data["is_plus_one"] is False
        assert data["group_tag"] is None
        assert data["notes"] is None

    def test_create_guest_missing_name_returns_422(self, client, auth_headers, event_id):
        """Missing name returns 422."""
        headers, _ = auth_headers
        resp = client.post(_base_url(event_id), json={
            "email": "noname@example.com",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_guest_empty_name_returns_422(self, client, auth_headers, event_id):
        """Empty name returns 422."""
        headers, _ = auth_headers
        resp = client.post(_base_url(event_id), json={
            "name": "",
        }, headers=headers)
        assert resp.status_code == 422

    def test_create_guest_nonexistent_event_returns_404(self, client, auth_headers):
        """Creating guest for nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.post(_base_url(fake_id), json={
            "name": "Ghost Guest",
        }, headers=headers)
        assert resp.status_code == 404

    def test_create_guest_other_user_event_returns_403(
        self, client, auth_headers, second_auth_headers, event_id
    ):
        """Creating guest on another user's event returns 403."""
        headers_b, _ = second_auth_headers
        resp = client.post(_base_url(event_id), json={
            "name": "Intruder Guest",
        }, headers=headers_b)
        assert resp.status_code == 403

    def test_create_guest_without_auth_returns_401_or_403(self, client, event_id):
        """Creating guest without auth returns 401 or 403."""
        resp = client.post(_base_url(event_id), json={
            "name": "No Auth Guest",
        })
        assert resp.status_code in (401, 403)

    def test_create_guest_plus_one(self, client, auth_headers, event_id):
        """Create a plus-one guest linked to another guest."""
        headers, _ = auth_headers
        # Create the primary guest first
        resp1 = client.post(_base_url(event_id), json={
            "name": "Primary Guest",
        }, headers=headers)
        assert resp1.status_code == 201
        primary_id = resp1.json()["id"]

        # Create plus-one
        resp2 = client.post(_base_url(event_id), json={
            "name": "Plus One Guest",
            "is_plus_one": True,
            "plus_one_of": primary_id,
        }, headers=headers)
        assert resp2.status_code == 201
        data = resp2.json()
        assert data["is_plus_one"] is True
        assert data["plus_one_of"] == primary_id


# ---------------------------------------------------------------------------
# Tests: GET /api/events/{event_id}/guests (List)
# ---------------------------------------------------------------------------

class TestListGuests:
    def test_list_guests_empty(self, client, auth_headers, event_id):
        """List guests for event with no guests returns empty list."""
        headers, _ = auth_headers
        resp = client.get(_base_url(event_id), headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_guests_returns_event_guests(self, client, auth_headers, event_id):
        """List returns guests belonging to the event."""
        headers, _ = auth_headers
        client.post(_base_url(event_id), json={"name": "Guest A"}, headers=headers)
        client.post(_base_url(event_id), json={"name": "Guest B"}, headers=headers)

        resp = client.get(_base_url(event_id), headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        names = [g["name"] for g in data]
        assert "Guest A" in names
        assert "Guest B" in names

    def test_list_guests_excludes_other_event_guests(self, client, auth_headers):
        """Guests from one event don't appear in another event's list."""
        headers, _ = auth_headers
        # Create two events
        resp1 = client.post("/api/events", json={"name": "Event Alpha"}, headers=headers)
        event1_id = resp1.json()["id"]
        resp2 = client.post("/api/events", json={"name": "Event Beta"}, headers=headers)
        event2_id = resp2.json()["id"]

        # Add guest to event 1 only
        client.post(_base_url(event1_id), json={"name": "Alpha Guest"}, headers=headers)

        # Event 2 should have no guests
        resp = client.get(_base_url(event2_id), headers=headers)
        assert resp.status_code == 200
        names = [g["name"] for g in resp.json()]
        assert "Alpha Guest" not in names

    def test_list_guests_other_user_returns_403(
        self, client, auth_headers, second_auth_headers, event_id
    ):
        """Another user cannot list guests for an event they don't own."""
        headers_b, _ = second_auth_headers
        resp = client.get(_base_url(event_id), headers=headers_b)
        assert resp.status_code == 403

    def test_list_guests_without_auth_returns_401_or_403(self, client, event_id):
        """Listing guests without auth returns 401 or 403."""
        resp = client.get(_base_url(event_id))
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: PUT /api/events/{event_id}/guests/{guest_id} (Update)
# ---------------------------------------------------------------------------

class TestUpdateGuest:
    def test_update_guest_all_fields(self, client, auth_headers, event_id):
        """Update all fields of a guest."""
        headers, _ = auth_headers
        create_resp = client.post(_base_url(event_id), json={
            "name": "Original Name",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.put(f"{_base_url(event_id)}/{guest_id}", json={
            "name": "Updated Name",
            "email": "updated@example.com",
            "meal_preference": "vegan",
            "is_plus_one": True,
            "group_tag": "updated-group",
            "notes": "Updated notes",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated Name"
        assert data["email"] == "updated@example.com"
        assert data["meal_preference"] == "vegan"
        assert data["is_plus_one"] is True
        assert data["group_tag"] == "updated-group"
        assert data["notes"] == "Updated notes"

    def test_update_guest_partial(self, client, auth_headers, event_id):
        """Partial update changes only the specified field."""
        headers, _ = auth_headers
        create_resp = client.post(_base_url(event_id), json={
            "name": "Partial Test",
            "email": "keep@example.com",
            "group_tag": "keep-group",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.put(f"{_base_url(event_id)}/{guest_id}", json={
            "name": "Partial Updated",
        }, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Partial Updated"
        assert data["email"] == "keep@example.com"
        assert data["group_tag"] == "keep-group"

    def test_update_guest_empty_body(self, client, auth_headers, event_id):
        """Update with empty body (no changes) succeeds."""
        headers, _ = auth_headers
        create_resp = client.post(_base_url(event_id), json={
            "name": "No Change Guest",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.put(f"{_base_url(event_id)}/{guest_id}", json={}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "No Change Guest"

    def test_update_guest_not_found_returns_404(self, client, auth_headers, event_id):
        """Updating nonexistent guest returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.put(f"{_base_url(event_id)}/{fake_id}", json={
            "name": "X",
        }, headers=headers)
        assert resp.status_code == 404

    def test_update_guest_other_user_returns_403(
        self, client, auth_headers, second_auth_headers, event_id
    ):
        """Updating a guest on another user's event returns 403."""
        headers, _ = auth_headers
        headers_b, _ = second_auth_headers

        create_resp = client.post(_base_url(event_id), json={
            "name": "Protected Guest",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.put(f"{_base_url(event_id)}/{guest_id}", json={
            "name": "Hacked",
        }, headers=headers_b)
        assert resp.status_code == 403

    def test_update_guest_empty_name_returns_422(self, client, auth_headers, event_id):
        """Update with empty name returns 422."""
        headers, _ = auth_headers
        create_resp = client.post(_base_url(event_id), json={
            "name": "Valid Name",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.put(f"{_base_url(event_id)}/{guest_id}", json={
            "name": "",
        }, headers=headers)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests: DELETE /api/events/{event_id}/guests/{guest_id}
# ---------------------------------------------------------------------------

class TestDeleteGuest:
    def test_delete_guest_success(self, client, auth_headers, event_id):
        """Delete guest returns 204 and guest is gone."""
        headers, _ = auth_headers
        create_resp = client.post(_base_url(event_id), json={
            "name": "Delete Me",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.delete(f"{_base_url(event_id)}/{guest_id}", headers=headers)
        assert resp.status_code == 204

        # Confirm it's no longer in the list
        list_resp = client.get(_base_url(event_id), headers=headers)
        guest_ids = [g["id"] for g in list_resp.json()]
        assert guest_id not in guest_ids

    def test_delete_guest_not_found_returns_404(self, client, auth_headers, event_id):
        """Deleting nonexistent guest returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.delete(f"{_base_url(event_id)}/{fake_id}", headers=headers)
        assert resp.status_code == 404

    def test_delete_guest_other_user_returns_403(
        self, client, auth_headers, second_auth_headers, event_id
    ):
        """Deleting a guest on another user's event returns 403."""
        headers, _ = auth_headers
        headers_b, _ = second_auth_headers

        create_resp = client.post(_base_url(event_id), json={
            "name": "Don't Delete",
        }, headers=headers)
        guest_id = create_resp.json()["id"]

        resp = client.delete(f"{_base_url(event_id)}/{guest_id}", headers=headers_b)
        assert resp.status_code == 403

    def test_delete_guest_without_auth_returns_401_or_403(self, client, auth_headers, event_id):
        """Deleting guest without auth returns 401 or 403."""
        headers, _ = auth_headers
        create_resp = client.post(_base_url(event_id), json={
            "name": "NoAuth Del Guest",
        }, headers=headers)
        guest_id = create_resp.json()["id"]
        resp = client.delete(f"{_base_url(event_id)}/{guest_id}")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: POST /api/events/{event_id}/guests/import-csv
# ---------------------------------------------------------------------------

class TestImportCSV:
    def test_import_csv_success(self, client, auth_headers, event_id):
        """Import CSV with all columns creates guests."""
        headers, _ = auth_headers
        csv_content = "name,email,meal_preference,group_tag,notes\n"
        csv_content += "Alice,alice@example.com,vegetarian,family,VIP\n"
        csv_content += "Bob,bob@example.com,chicken,friends,\n"
        csv_content += "Carol,,fish,colleagues,Late RSVP\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 3
        names = [g["name"] for g in data]
        assert "Alice" in names
        assert "Bob" in names
        assert "Carol" in names

        # Check field values
        alice = next(g for g in data if g["name"] == "Alice")
        assert alice["email"] == "alice@example.com"
        assert alice["meal_preference"] == "vegetarian"
        assert alice["group_tag"] == "family"
        assert alice["notes"] == "VIP"

        carol = next(g for g in data if g["name"] == "Carol")
        assert carol["email"] is None  # empty string becomes None

    def test_import_csv_name_only(self, client, auth_headers, event_id):
        """Import CSV with only name column."""
        headers, _ = auth_headers
        csv_content = "name\nDiana\nEdward\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 2
        names = [g["name"] for g in data]
        assert "Diana" in names
        assert "Edward" in names

    def test_import_csv_skips_empty_names(self, client, auth_headers, event_id):
        """Rows with empty names are skipped."""
        headers, _ = auth_headers
        csv_content = "name,email\nFrank,frank@example.com\n,empty@example.com\n  ,spaces@example.com\nGrace,grace@example.com\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 2
        names = [g["name"] for g in data]
        assert "Frank" in names
        assert "Grace" in names

    def test_import_csv_missing_name_column_returns_400(self, client, auth_headers, event_id):
        """CSV without 'name' column returns 400."""
        headers, _ = auth_headers
        csv_content = "email,group_tag\nalice@example.com,family\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 400

    def test_import_csv_handles_extra_columns(self, client, auth_headers, event_id):
        """Extra columns in CSV are ignored gracefully."""
        headers, _ = auth_headers
        csv_content = "name,email,phone,address\nHank,hank@example.com,555-1234,123 Main St\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Hank"
        assert data[0]["email"] == "hank@example.com"

    def test_import_csv_empty_file(self, client, auth_headers, event_id):
        """CSV with headers but no data rows returns empty list."""
        headers, _ = auth_headers
        csv_content = "name,email\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 201
        assert resp.json() == []

    def test_import_csv_other_user_returns_403(
        self, client, auth_headers, second_auth_headers, event_id
    ):
        """Importing CSV to another user's event returns 403."""
        headers_b, _ = second_auth_headers
        csv_content = "name\nIntruder\n"

        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers_b,
        )
        assert resp.status_code == 403

    def test_import_csv_without_auth_returns_401_or_403(self, client, event_id):
        """Importing CSV without auth returns 401 or 403."""
        csv_content = "name\nNoAuth\n"
        resp = client.post(
            f"{_base_url(event_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
        )
        assert resp.status_code in (401, 403)

    def test_import_csv_nonexistent_event_returns_404(self, client, auth_headers):
        """Importing CSV to nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        csv_content = "name\nGhost\n"

        resp = client.post(
            f"{_base_url(fake_id)}/import-csv",
            files={"file": ("guests.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=headers,
        )
        assert resp.status_code == 404
