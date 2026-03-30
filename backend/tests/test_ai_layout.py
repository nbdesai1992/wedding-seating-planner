"""Tests for AI Layout Generation endpoint.

POST /api/events/{event_id}/layout/generate

Tests mock the Claude API call for deterministic testing. They validate:
- Happy path: layout generated with correct tables, seats, features
- Validation: bad requests rejected properly
- Error handling: Claude failures handled gracefully
- Edge cases: empty layout, overlapping items clamped, existing layout replaced
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal
from app.models.user import User


# ---------------------------------------------------------------------------
# Mock Claude responses
# ---------------------------------------------------------------------------

MOCK_SIMPLE_LAYOUT = json.dumps({
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

MOCK_COMPLEX_LAYOUT = json.dumps({
    "tables": [
        {
            "name": "Head Table",
            "shape": "rectangle",
            "x": 300,
            "y": 100,
            "width": 200,
            "height": 100,
            "seat_count": 6,
        },
        {
            "name": "Sweetheart Table",
            "shape": "sweetheart",
            "x": 900,
            "y": 100,
            "width": 100,
            "height": 80,
            "seat_count": 2,
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
            "y": 1300,
            "width": 250,
            "height": 80,
        },
    ],
})

MOCK_EMPTY_LAYOUT = json.dumps({
    "tables": [],
    "features": [],
})

MOCK_WITH_MARKDOWN = """```json
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

MOCK_WITH_INVALID_ENUMS = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "hexagon",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
    ],
    "features": [
        {
            "name": "Pool",
            "type": "swimming_pool",
            "shape": "triangle",
            "x": 500,
            "y": 500,
            "width": 200,
            "height": 200,
        },
    ],
})

MOCK_OUT_OF_BOUNDS = json.dumps({
    "tables": [
        {
            "name": "Table 1",
            "shape": "round",
            "x": 2100,
            "y": 1600,
            "width": 120,
            "height": 120,
            "seat_count": 8,
        },
    ],
    "features": [],
})

MOCK_EXCESSIVE_SEATS = json.dumps({
    "tables": [
        {
            "name": "Big Table",
            "shape": "round",
            "x": 200,
            "y": 200,
            "width": 120,
            "height": 120,
            "seat_count": 100,
        },
    ],
    "features": [],
})


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
    email = f"aitest_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "AI Test User",
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
    email = f"aitest2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second AI User",
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
        "name": "AI Layout Test Wedding",
        "date": "2026-09-15",
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


def _mock_claude_response(mock_response: str):
    """Return a patch context manager that mocks call_claude to return the given string."""
    return patch(
        "app.services.layout_generator.call_claude",
        return_value=mock_response,
    )


# ---------------------------------------------------------------------------
# Tests: Happy Path
# ---------------------------------------------------------------------------

class TestGenerateLayoutHappyPath:
    def test_generate_simple_layout(self, client, auth_headers, event_id):
        """Generate a simple layout with 2 tables and 1 feature."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "A beautiful ballroom with 2 round tables and a dance floor"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        # Layout properties
        assert data["event_id"] == event_id
        assert data["canvas_width"] == 2000
        assert data["canvas_height"] == 1500

        # Tables
        assert len(data["tables"]) == 2
        table_names = {t["name"] for t in data["tables"]}
        assert table_names == {"Table 1", "Table 2"}

        for table in data["tables"]:
            assert table["shape"] == "round"
            assert table["seat_count"] == 8
            assert len(table["seats"]) == 8
            # Verify seat indices
            indices = sorted(s["seat_index"] for s in table["seats"])
            assert indices == list(range(8))

        # Features
        assert len(data["features"]) == 1
        assert data["features"][0]["name"] == "Dance Floor"
        assert data["features"][0]["type"] == "dance_floor"

    def test_generate_complex_layout(self, client, auth_headers, event_id):
        """Generate a layout with mixed table types and multiple features."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_COMPLEX_LAYOUT):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Ballroom with head table, sweetheart, dance floor, and bar"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["tables"]) == 2
        assert len(data["features"]) == 2

        # Check rectangle table
        head_table = next(t for t in data["tables"] if t["name"] == "Head Table")
        assert head_table["shape"] == "rectangle"
        assert head_table["seat_count"] == 6
        assert len(head_table["seats"]) == 6

        # Check sweetheart table
        sweetheart = next(t for t in data["tables"] if t["name"] == "Sweetheart Table")
        assert sweetheart["shape"] == "sweetheart"
        assert sweetheart["seat_count"] == 2
        assert len(sweetheart["seats"]) == 2

        # Check features
        feature_types = {f["type"] for f in data["features"]}
        assert feature_types == {"dance_floor", "bar"}

    def test_generate_saves_venue_description(self, client, auth_headers, event_id):
        """Venue description is saved on the event."""
        headers, _ = auth_headers
        description = "A grand ballroom with chandeliers and 15 round tables"
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": description},
                headers=headers,
            )

        # Verify event has venue_description
        resp = client.get(f"/api/events/{event_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["venue_description"] == description

    def test_generate_replaces_existing_layout(self, client, auth_headers, event_id):
        """Generating a new layout clears previous tables and features."""
        headers, _ = auth_headers

        # First generation
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            resp1 = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "First layout"},
                headers=headers,
            )
        assert resp1.status_code == 200
        assert len(resp1.json()["tables"]) == 2

        # Second generation (replaces first)
        with _mock_claude_response(MOCK_COMPLEX_LAYOUT):
            resp2 = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Second layout"},
                headers=headers,
            )
        assert resp2.status_code == 200
        data = resp2.json()
        # Should have the new layout, not the old
        assert len(data["tables"]) == 2
        table_names = {t["name"] for t in data["tables"]}
        assert "Head Table" in table_names
        assert "Sweetheart Table" in table_names
        assert "Table 1" not in table_names

    def test_generate_empty_layout(self, client, auth_headers, event_id):
        """AI returns no tables/features — produces empty layout."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_EMPTY_LAYOUT):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "An empty room"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tables"]) == 0
        assert len(data["features"]) == 0

    def test_generate_with_markdown_wrapped_response(self, client, auth_headers, event_id):
        """AI response wrapped in markdown code blocks is handled correctly."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_WITH_MARKDOWN):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Simple room with 1 table"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tables"]) == 1
        assert data["tables"][0]["name"] == "Table 1"
        assert data["tables"][0]["seat_count"] == 4
        assert len(data["tables"][0]["seats"]) == 4


# ---------------------------------------------------------------------------
# Tests: Validation & Error Handling
# ---------------------------------------------------------------------------

class TestGenerateLayoutValidation:
    def test_missing_description_returns_422(self, client, auth_headers, event_id):
        """Missing description field returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/layout/generate",
            json={},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_empty_description_returns_422(self, client, auth_headers, event_id):
        """Empty description returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/layout/generate",
            json={"description": ""},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_short_description_returns_422(self, client, auth_headers, event_id):
        """Description too short (< 5 chars) returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/layout/generate",
            json={"description": "hi"},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_nonexistent_event_returns_404(self, client, auth_headers):
        """Generating for nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            resp = client.post(
                f"/api/events/{fake_id}/layout/generate",
                json={"description": "A room with tables"},
                headers=headers,
            )
        assert resp.status_code == 404

    def test_other_user_event_returns_403(self, client, auth_headers, second_auth_headers, event_id):
        """Generating layout for another user's event returns 403."""
        headers_b, _ = second_auth_headers
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Someone else's room"},
                headers=headers_b,
            )
        assert resp.status_code == 403

    def test_no_auth_returns_401_or_403(self, client, event_id):
        """Request without auth returns 401 or 403."""
        resp = client.post(
            f"/api/events/{event_id}/layout/generate",
            json={"description": "Unauthenticated request"},
        )
        assert resp.status_code in (401, 403)

    def test_invalid_json_from_claude_returns_502(self, client, auth_headers, event_id):
        """If Claude returns invalid JSON, endpoint returns 502."""
        headers, _ = auth_headers
        with _mock_claude_response("This is not valid JSON at all"):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "A room that causes AI errors"},
                headers=headers,
            )
        assert resp.status_code == 502
        assert "Failed to parse" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Tests: Edge Cases & Data Normalization
# ---------------------------------------------------------------------------

class TestGenerateLayoutEdgeCases:
    def test_invalid_enums_normalized(self, client, auth_headers, event_id):
        """Invalid shape/type values are normalized to defaults."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_WITH_INVALID_ENUMS):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Room with weird shapes"},
                headers=headers,
            )
        assert resp.status_code == 200
        data = resp.json()

        # "hexagon" should be normalized to "round"
        assert data["tables"][0]["shape"] == "round"

        # "swimming_pool" -> "custom", "triangle" -> "rectangle"
        assert data["features"][0]["type"] == "custom"
        assert data["features"][0]["shape"] == "rectangle"

    def test_out_of_bounds_clamped(self, client, auth_headers, event_id):
        """Coordinates beyond canvas are clamped to valid range."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_OUT_OF_BOUNDS):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Table off screen"},
                headers=headers,
            )
        assert resp.status_code == 200
        table = resp.json()["tables"][0]
        # x should be clamped to 2000 - width(120) = 1880
        assert table["x"] <= 2000 - table["width"]
        # y should be clamped to 1500 - height(120) = 1380
        assert table["y"] <= 1500 - table["height"]

    def test_excessive_seats_clamped(self, client, auth_headers, event_id):
        """Seat count > 50 is clamped to 50."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_EXCESSIVE_SEATS):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Table with way too many seats"},
                headers=headers,
            )
        assert resp.status_code == 200
        table = resp.json()["tables"][0]
        assert table["seat_count"] == 50
        assert len(table["seats"]) == 50

    def test_layout_persists_in_database(self, client, auth_headers, event_id):
        """Generated layout is saved and visible via GET /layout."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Persisted layout test"},
                headers=headers,
            )

        # Fetch layout via GET endpoint
        resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["tables"]) == 2
        assert len(data["features"]) == 1

    def test_seats_have_correct_offsets(self, client, auth_headers, event_id):
        """Generated seats have x_offset and y_offset values."""
        headers, _ = auth_headers
        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            resp = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Layout with seat positions"},
                headers=headers,
            )
        assert resp.status_code == 200
        table = resp.json()["tables"][0]
        for seat in table["seats"]:
            assert "x_offset" in seat
            assert "y_offset" in seat
            assert isinstance(seat["x_offset"], (int, float))
            assert isinstance(seat["y_offset"], (int, float))

    def test_layout_id_preserved_across_generations(self, client, auth_headers, event_id):
        """The layout ID stays the same when regenerating."""
        headers, _ = auth_headers

        with _mock_claude_response(MOCK_SIMPLE_LAYOUT):
            resp1 = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "First gen"},
                headers=headers,
            )
        layout_id_1 = resp1.json()["id"]

        with _mock_claude_response(MOCK_COMPLEX_LAYOUT):
            resp2 = client.post(
                f"/api/events/{event_id}/layout/generate",
                json={"description": "Second gen"},
                headers=headers,
            )
        layout_id_2 = resp2.json()["id"]

        assert layout_id_1 == layout_id_2


# ---------------------------------------------------------------------------
# Tests: Unit tests for layout_generator module
# ---------------------------------------------------------------------------

class TestLayoutGeneratorModule:
    def test_extract_json_plain(self):
        """Extract JSON from plain text."""
        from app.services.layout_generator import _extract_json
        data = _extract_json('{"tables": [], "features": []}')
        assert data == {"tables": [], "features": []}

    def test_extract_json_markdown(self):
        """Extract JSON from markdown code block."""
        from app.services.layout_generator import _extract_json
        text = '```json\n{"tables": [], "features": []}\n```'
        data = _extract_json(text)
        assert data == {"tables": [], "features": []}

    def test_extract_json_invalid_raises(self):
        """Invalid JSON raises JSONDecodeError."""
        from app.services.layout_generator import _extract_json
        with pytest.raises(json.JSONDecodeError):
            _extract_json("not json")

    def test_validate_table_defaults(self):
        """Missing fields get sensible defaults."""
        from app.services.layout_generator import _validate_table
        result = _validate_table({"name": "T1"})
        assert result["shape"] == "round"
        assert result["seat_count"] == 8
        assert result["width"] == 120
        assert result["height"] == 120

    def test_validate_table_clamp_seats(self):
        """Seat count outside 1-50 range is clamped."""
        from app.services.layout_generator import _validate_table
        assert _validate_table({"seat_count": 0})["seat_count"] == 1
        assert _validate_table({"seat_count": -5})["seat_count"] == 1
        assert _validate_table({"seat_count": 100})["seat_count"] == 50

    def test_validate_feature_unknown_type(self):
        """Unknown feature type defaults to custom."""
        from app.services.layout_generator import _validate_feature
        result = _validate_feature({"name": "Pool", "type": "pool", "shape": "circle"})
        assert result["type"] == "custom"

    def test_validate_feature_unknown_shape(self):
        """Unknown feature shape defaults to rectangle."""
        from app.services.layout_generator import _validate_feature
        result = _validate_feature({"name": "Thing", "type": "bar", "shape": "star"})
        assert result["shape"] == "rectangle"
