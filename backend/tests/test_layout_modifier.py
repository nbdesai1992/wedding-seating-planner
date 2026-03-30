"""Tests for AI Layout Modification endpoint.

POST /api/events/{event_id}/layout/modify

Tests mock the Claude API call for deterministic testing. They validate:
- Happy path: modifications applied correctly, unmentioned elements preserved
- Validation: bad requests rejected properly
- Error handling: Claude failures handled gracefully
- Edge cases: no existing layout, guest unassignment on table removal
- Unit tests: serialization, prompt building, guest cleanup
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal
from app.models.user import User


# ---------------------------------------------------------------------------
# Mock Claude responses for modification scenarios
# ---------------------------------------------------------------------------

# Original layout: 2 round tables + dance floor
MOCK_ORIGINAL_LAYOUT = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "round",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
        {
            "name": "Table 2",
            "shape": "round",
            "x": 400,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
    ],
    "features": [
        {
            "name": "Dance Floor",
            "type": "dance_floor",
            "shape": "rectangle",
            "x": 800,
            "y": 600,
            "width": 400,
            "height": 400,
        },
    ],
})

# Modified: added a 3rd table, preserved the rest
MOCK_ADD_TABLE_RESPONSE = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "round",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
        {
            "name": "Table 2",
            "shape": "round",
            "x": 400,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
        {
            "name": "Table 3",
            "shape": "round",
            "x": 600,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 6,
        },
    ],
    "features": [
        {
            "name": "Dance Floor",
            "type": "dance_floor",
            "shape": "rectangle",
            "x": 800,
            "y": 600,
            "width": 400,
            "height": 400,
        },
    ],
})

# Modified: removed Table 2, kept Table 1 and Dance Floor
MOCK_REMOVE_TABLE_RESPONSE = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "round",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
    ],
    "features": [
        {
            "name": "Dance Floor",
            "type": "dance_floor",
            "shape": "rectangle",
            "x": 800,
            "y": 600,
            "width": 400,
            "height": 400,
        },
    ],
})

# Modified: made Table 1 a rectangle and wider
MOCK_MODIFY_TABLE_RESPONSE = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "rectangle",
            "x": 200,
            "y": 200,
            "width": 250,
            "height": 100,
            "seat_count": 10,
        },
        {
            "name": "Table 2",
            "shape": "round",
            "x": 400,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
    ],
    "features": [
        {
            "name": "Dance Floor",
            "type": "dance_floor",
            "shape": "rectangle",
            "x": 800,
            "y": 600,
            "width": 400,
            "height": 400,
        },
    ],
})

# Modified: added a bar feature
MOCK_ADD_FEATURE_RESPONSE = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "round",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
        {
            "name": "Table 2",
            "shape": "round",
            "x": 400,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
    ],
    "features": [
        {
            "name": "Dance Floor",
            "type": "dance_floor",
            "shape": "rectangle",
            "x": 800,
            "y": 600,
            "width": 400,
            "height": 400,
        },
        {
            "name": "Bar",
            "type": "bar",
            "shape": "rectangle",
            "x": 1600,
            "y": 100,
            "width": 250,
            "height": 80,
        },
    ],
})

# Empty layout (all removed)
MOCK_EMPTY_RESULT = json.dumps({
    "tables": [],
    "features": [],
})

# Markdown-wrapped response
MOCK_MARKDOWN_RESPONSE = """```json
{
    "tables": [
        {
            "name": "Table 1",
            "shape": "round",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 4
        }
    ],
    "features": []
}
```"""


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
    """Register a unique user and return (headers_dict, user_id)."""
    email = f"modtest_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Modify Test User",
    })
    assert resp.status_code == 201
    data = resp.json()
    token = data["access_token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    yield headers, user_id

    # Cleanup
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
    """Register a second user for cross-user tests."""
    email = f"modtest2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second Modify User",
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
        "name": "Modify Layout Test Wedding",
        "date": "2026-09-15",
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


def _mock_generate(mock_response: str):
    """Return a patch context manager that mocks call_claude in layout_generator."""
    return patch(
        "app.services.layout_generator.call_claude",
        return_value=mock_response,
    )


def _mock_modify(mock_response: str):
    """Return a patch context manager that mocks call_claude in layout_modifier."""
    return patch(
        "app.services.layout_modifier.call_claude",
        return_value=mock_response,
    )


def _setup_initial_layout(client, headers, event_id):
    """Helper: generate an initial layout with 2 tables + dance floor."""
    with _mock_generate(MOCK_ORIGINAL_LAYOUT):
        resp = client.post(
            f"/api/events/{event_id}/layout/generate",
            json={"description": "A ballroom with 2 round tables and a dance floor"},
            headers=headers,
        )
    assert resp.status_code == 200
    return resp.json()


# ---------------------------------------------------------------------------
# Tests: Happy Path
# ---------------------------------------------------------------------------

class TestModifyLayoutHappyPath:
    def test_add_table(self, client, auth_headers, event_id):
        """Adding a table via modify preserves existing tables and adds new one."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a third round table with 6 seats next to Table 2"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        # Should have 3 tables now
        assert len(data["tables"]) == 3
        table_names = {t["name"] for t in data["tables"]}
        assert table_names == {"Table 1", "Table 2", "Table 3"}

        # New table should have 6 seats
        table_3 = next(t for t in data["tables"] if t["name"] == "Table 3")
        assert table_3["seat_count"] == 6
        assert len(table_3["seats"]) == 6

        # Dance floor preserved
        assert len(data["features"]) == 1
        assert data["features"][0]["name"] == "Dance Floor"

    def test_remove_table(self, client, auth_headers, event_id):
        """Removing a table via modify removes it and preserves others."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        with _mock_modify(MOCK_REMOVE_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "remove Table 2"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        # Should have 1 table
        assert len(data["tables"]) == 1
        assert data["tables"][0]["name"] == "Table 1"

        # Dance floor preserved
        assert len(data["features"]) == 1

    def test_modify_table_properties(self, client, auth_headers, event_id):
        """Modifying a table's shape/size preserves other elements."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        with _mock_modify(MOCK_MODIFY_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "make Table 1 a rectangle with 10 seats and wider"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        # Table 1 should be modified
        table_1 = next(t for t in data["tables"] if t["name"] == "Table 1")
        assert table_1["shape"] == "rectangle"
        assert table_1["seat_count"] == 10
        assert table_1["width"] == 250
        assert len(table_1["seats"]) == 10

        # Table 2 should be unchanged
        table_2 = next(t for t in data["tables"] if t["name"] == "Table 2")
        assert table_2["shape"] == "round"
        assert table_2["seat_count"] == 8

    def test_add_feature(self, client, auth_headers, event_id):
        """Adding a feature preserves existing tables and features."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        with _mock_modify(MOCK_ADD_FEATURE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a bar in the top right corner"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        # Tables preserved
        assert len(data["tables"]) == 2

        # Features: dance floor + bar
        assert len(data["features"]) == 2
        feature_types = {f["type"] for f in data["features"]}
        assert feature_types == {"dance_floor", "bar"}

    def test_modify_on_empty_layout(self, client, auth_headers, event_id):
        """Modifying a layout with no existing tables/features works (creates from scratch)."""
        headers, _ = auth_headers
        # Don't generate initial layout — just call modify directly
        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add three round tables"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tables"]) == 3


# ---------------------------------------------------------------------------
# Tests: Guest unassignment on table removal
# ---------------------------------------------------------------------------

class TestModifyLayoutGuestUnassignment:
    def test_guests_unassigned_when_table_removed(self, client, auth_headers, event_id):
        """When a table is removed via modify, seated guests are properly unassigned."""
        headers, _ = auth_headers
        layout_data = _setup_initial_layout(client, headers, event_id)

        # Create a guest
        guest_resp = client.post(
            f"/api/events/{event_id}/guests",
            json={"name": "Jane Smith"},
            headers=headers,
        )
        assert guest_resp.status_code == 201
        guest_id = guest_resp.json()["id"]

        # Assign guest to a seat on Table 2
        table_2 = next(t for t in layout_data["tables"] if t["name"] == "Table 2")
        seat_id = table_2["seats"][0]["id"]
        assign_resp = client.put(
            f"/api/events/{event_id}/layout/seats/{seat_id}/assign",
            json={"guest_id": guest_id},
            headers=headers,
        )
        assert assign_resp.status_code == 200

        # Now remove Table 2 via modify
        with _mock_modify(MOCK_REMOVE_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "remove Table 2"},
                headers=headers,
            )
        assert resp.status_code == 200
        assert len(resp.json()["tables"]) == 1

        # Verify guest is unassigned
        guest_resp = client.get(
            f"/api/events/{event_id}/guests",
            headers=headers,
        )
        assert guest_resp.status_code == 200
        guests = guest_resp.json()
        guest = next(g for g in guests if g["id"] == guest_id)
        assert guest["table_id"] is None
        assert guest["seat_index"] is None

    def test_all_guests_unassigned_on_full_clear(self, client, auth_headers, event_id):
        """When all tables are removed, all guests are unassigned."""
        headers, _ = auth_headers
        layout_data = _setup_initial_layout(client, headers, event_id)

        # Create two guests
        g1_resp = client.post(
            f"/api/events/{event_id}/guests",
            json={"name": "Guest 1"},
            headers=headers,
        )
        g2_resp = client.post(
            f"/api/events/{event_id}/guests",
            json={"name": "Guest 2"},
            headers=headers,
        )
        g1_id = g1_resp.json()["id"]
        g2_id = g2_resp.json()["id"]

        # Assign guests to seats on different tables
        t1 = next(t for t in layout_data["tables"] if t["name"] == "Table 1")
        t2 = next(t for t in layout_data["tables"] if t["name"] == "Table 2")
        client.put(
            f"/api/events/{event_id}/layout/seats/{t1['seats'][0]['id']}/assign",
            json={"guest_id": g1_id},
            headers=headers,
        )
        client.put(
            f"/api/events/{event_id}/layout/seats/{t2['seats'][0]['id']}/assign",
            json={"guest_id": g2_id},
            headers=headers,
        )

        # Clear everything via modify
        with _mock_modify(MOCK_EMPTY_RESULT):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "remove all tables and features"},
                headers=headers,
            )
        assert resp.status_code == 200
        assert len(resp.json()["tables"]) == 0
        assert len(resp.json()["features"]) == 0

        # Verify both guests are unassigned
        guests_resp = client.get(
            f"/api/events/{event_id}/guests",
            headers=headers,
        )
        for g in guests_resp.json():
            assert g["table_id"] is None
            assert g["seat_index"] is None


# ---------------------------------------------------------------------------
# Tests: Validation & Error Handling
# ---------------------------------------------------------------------------

class TestModifyLayoutValidation:
    def test_missing_prompt_returns_422(self, client, auth_headers, event_id):
        """Missing prompt field returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/layout/modify",
            json={},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_empty_prompt_returns_422(self, client, auth_headers, event_id):
        """Empty prompt returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/layout/modify",
            json={"prompt": ""},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_short_prompt_returns_422(self, client, auth_headers, event_id):
        """Prompt too short (< 3 chars) returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/layout/modify",
            json={"prompt": "hi"},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_nonexistent_event_returns_404(self, client, auth_headers):
        """Modifying for nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{fake_id}/layout/modify",
                json={"prompt": "add a table"},
                headers=headers,
            )
        assert resp.status_code == 404

    def test_other_user_event_returns_403(self, client, auth_headers, second_auth_headers, event_id):
        """Modifying another user's event layout returns 403."""
        headers_b, _ = second_auth_headers
        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a table to someone else's event"},
                headers=headers_b,
            )
        assert resp.status_code == 403

    def test_no_auth_returns_401_or_403(self, client, event_id):
        """Request without auth returns 401 or 403."""
        resp = client.post(
            f"/api/events/{event_id}/layout/modify",
            json={"prompt": "unauthenticated modification"},
        )
        assert resp.status_code in (401, 403)

    def test_invalid_json_from_claude_returns_502(self, client, auth_headers, event_id):
        """If Claude returns invalid JSON, endpoint returns 502."""
        headers, _ = auth_headers
        with _mock_modify("This is not valid JSON"):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "do something that breaks"},
                headers=headers,
            )
        assert resp.status_code == 502
        assert "Failed to parse" in resp.json()["detail"]

    def test_markdown_wrapped_response_handled(self, client, auth_headers, event_id):
        """AI response wrapped in markdown code blocks is handled correctly."""
        headers, _ = auth_headers
        with _mock_modify(MOCK_MARKDOWN_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "simplify the layout"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tables"]) == 1
        assert data["tables"][0]["name"] == "Table 1"


# ---------------------------------------------------------------------------
# Tests: Layout ID preservation
# ---------------------------------------------------------------------------

class TestModifyLayoutPreservation:
    def test_layout_id_preserved_after_modify(self, client, auth_headers, event_id):
        """The layout ID stays the same after modification."""
        headers, _ = auth_headers
        layout_data = _setup_initial_layout(client, headers, event_id)
        layout_id_before = layout_data["id"]

        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a table"},
                headers=headers,
            )
        assert resp.status_code == 200
        layout_id_after = resp.json()["id"]
        assert layout_id_before == layout_id_after

    def test_new_tables_have_correct_seats(self, client, auth_headers, event_id):
        """New tables added via modify have properly generated seats."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a table"},
                headers=headers,
            )
        data = resp.json()
        for table in data["tables"]:
            assert len(table["seats"]) == table["seat_count"]
            indices = sorted(s["seat_index"] for s in table["seats"])
            assert indices == list(range(table["seat_count"]))
            for seat in table["seats"]:
                assert "x_offset" in seat
                assert "y_offset" in seat

    def test_modify_persists_in_database(self, client, auth_headers, event_id):
        """Modified layout is visible via GET /layout."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        with _mock_modify(MOCK_ADD_FEATURE_RESPONSE):
            client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a bar"},
                headers=headers,
            )

        # Fetch via GET
        resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tables"]) == 2
        assert len(data["features"]) == 2

    def test_multiple_sequential_modifications(self, client, auth_headers, event_id):
        """Multiple modifications can be applied sequentially."""
        headers, _ = auth_headers
        _setup_initial_layout(client, headers, event_id)

        # First modification: add a table
        with _mock_modify(MOCK_ADD_TABLE_RESPONSE):
            resp1 = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a third table"},
                headers=headers,
            )
        assert resp1.status_code == 200
        assert len(resp1.json()["tables"]) == 3

        # Second modification: add a bar
        with _mock_modify(MOCK_ADD_FEATURE_RESPONSE):
            resp2 = client.post(
                f"/api/events/{event_id}/layout/modify",
                json={"prompt": "add a bar"},
                headers=headers,
            )
        assert resp2.status_code == 200
        assert len(resp2.json()["features"]) == 2


# ---------------------------------------------------------------------------
# Tests: Unit tests for layout_modifier module
# ---------------------------------------------------------------------------

class TestLayoutModifierModule:
    def test_serialize_current_layout(self):
        """Serialization produces correct JSON structure."""
        from app.services.layout_modifier import _serialize_current_layout
        from app.models.layout import Layout
        from app.models.table import Table, TableShape
        from app.models.venue_feature import VenueFeature, VenueFeatureType, VenueFeatureShape

        # Create in-memory objects (no DB needed for serialization test)
        layout = Layout()
        layout.id = uuid.uuid4()

        session = SessionLocal()
        try:
            # Create a temporary layout
            event_id = None
            # We need an actual DB test here, so use the DB
            from app.models.event import Event

            # Create a temp user/event to test serialization
            temp_user = User(
                email=f"serialize_test_{uuid.uuid4().hex[:8]}@example.com",
                password_hash="fake",
                name="Serialize Test",
            )
            session.add(temp_user)
            session.flush()

            temp_event = Event(
                user_id=temp_user.id,
                name="Serialize Test Event",
                date="2026-09-15",
            )
            session.add(temp_event)
            session.flush()

            temp_layout = Layout(event_id=temp_event.id)
            session.add(temp_layout)
            session.flush()

            # Add a table
            table = Table(
                layout_id=temp_layout.id,
                name="Test Table",
                shape=TableShape.round,
                x=100, y=200, width=120, height=120,
                seat_count=8,
            )
            session.add(table)

            # Add a feature
            feature = VenueFeature(
                layout_id=temp_layout.id,
                name="Test Floor",
                type=VenueFeatureType.dance_floor,
                shape=VenueFeatureShape.rectangle,
                x=500, y=500, width=300, height=300,
            )
            session.add(feature)
            session.flush()

            result = _serialize_current_layout(temp_layout, session)

            assert len(result["tables"]) == 1
            assert result["tables"][0]["name"] == "Test Table"
            assert result["tables"][0]["shape"] == "round"
            assert result["tables"][0]["x"] == 100
            assert result["tables"][0]["seat_count"] == 8

            assert len(result["features"]) == 1
            assert result["features"][0]["name"] == "Test Floor"
            assert result["features"][0]["type"] == "dance_floor"
        finally:
            session.rollback()
            session.close()

    def test_build_modify_prompt(self):
        """Modify prompt includes current layout and user request."""
        from app.services.layout_modifier import _build_modify_prompt

        current = {
            "tables": [{"name": "Table 1", "shape": "round", "x": 100, "y": 100,
                        "width": 120, "height": 120, "seat_count": 8}],
            "features": [],
        }
        result = _build_modify_prompt(current, "add a dance floor")

        assert "Table 1" in result
        assert "add a dance floor" in result
        assert "COMPLETE updated layout" in result
        assert "ONLY the JSON" in result

    def test_serialize_empty_layout(self):
        """Serializing a layout with no tables/features returns empty lists."""
        from app.services.layout_modifier import _serialize_current_layout
        from app.models.layout import Layout

        session = SessionLocal()
        try:
            temp_user = User(
                email=f"empty_test_{uuid.uuid4().hex[:8]}@example.com",
                password_hash="fake",
                name="Empty Test",
            )
            session.add(temp_user)
            session.flush()

            from app.models.event import Event
            temp_event = Event(
                user_id=temp_user.id,
                name="Empty Test Event",
                date="2026-09-15",
            )
            session.add(temp_event)
            session.flush()

            temp_layout = Layout(event_id=temp_event.id)
            session.add(temp_layout)
            session.flush()

            result = _serialize_current_layout(temp_layout, session)
            assert result == {"tables": [], "features": []}
        finally:
            session.rollback()
            session.close()

    def test_modify_system_prompt_contains_preservation_rules(self):
        """System prompt instructs Claude to preserve unmentioned elements."""
        from app.services.layout_modifier import MODIFY_SYSTEM_PROMPT

        assert "PRESERVE" in MODIFY_SYSTEM_PROMPT
        assert "did NOT mention" in MODIFY_SYSTEM_PROMPT
        assert "COMPLETE" in MODIFY_SYSTEM_PROMPT
        assert "2000x1500" in MODIFY_SYSTEM_PROMPT
