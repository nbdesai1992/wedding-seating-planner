"""Tests for AI Seating Suggestions & Bulk-Apply endpoints.

POST /api/events/{event_id}/seating/suggest
POST /api/events/{event_id}/seating/apply

Tests mock the Claude API call for deterministic testing. They validate:
- Happy path: suggestions generated correctly, bulk apply works
- Validation: bad requests rejected properly
- Error handling: Claude failures handled gracefully
- Edge cases: no guests, no tables, all seated, constraints
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
    email = f"seating_test_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Seating Test User",
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
    email = f"seating_test2_{uuid.uuid4().hex[:12]}@example.com"
    resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "testpassword123",
        "name": "Second Seating User",
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
        "name": "Seating Test Wedding",
        "date": "2026-09-15",
    }, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture()
def event_with_tables(client, auth_headers, event_id):
    """Create an event with 2 tables (8 seats each) and return event_id."""
    headers, _ = auth_headers

    # Create 2 tables
    for name in ["Table 1", "Table 2"]:
        resp = client.post(
            f"/api/events/{event_id}/layout/tables",
            json={"name": name, "shape": "round", "seat_count": 8},
            headers=headers,
        )
        assert resp.status_code == 201

    return event_id


@pytest.fixture()
def guests_data(client, auth_headers, event_with_tables):
    """Create guests and return (event_id, list_of_guest_dicts)."""
    headers, _ = auth_headers
    event_id = event_with_tables

    guests = []
    guest_infos = [
        {"name": "Alice Smith", "group_tag": "bride_family"},
        {"name": "Bob Smith", "group_tag": "bride_family"},
        {"name": "Carol Jones", "group_tag": "groom_family"},
        {"name": "Dave Jones", "group_tag": "groom_family"},
        {"name": "Eve Wilson", "group_tag": "friends"},
    ]

    for info in guest_infos:
        resp = client.post(
            f"/api/events/{event_id}/guests",
            json=info,
            headers=headers,
        )
        assert resp.status_code == 201
        guests.append(resp.json())

    return event_id, guests


def _get_layout_seats(client, headers, event_id):
    """Fetch layout and return all seats from all tables."""
    resp = client.get(f"/api/events/{event_id}/layout", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    seats = []
    for table in data["tables"]:
        for seat in table["seats"]:
            seats.append({**seat, "_table_name": table["name"]})
    return seats, data["tables"]


def _mock_suggest_response(guest_ids, seat_ids, tables):
    """Build a mock Claude response that assigns guests to seats sequentially."""
    assignments = []
    for i, (guest_id, seat_id) in enumerate(zip(guest_ids, seat_ids)):
        assignments.append({
            "seat_id": str(seat_id),
            "guest_id": str(guest_id),
        })

    return json.dumps({
        "assignments": assignments,
        "unassigned": [],
    })


def _mock_claude_for_suggest(mock_response: str):
    """Return a patch context manager that mocks call_claude in seating_suggester."""
    return patch(
        "app.services.seating_suggester.call_claude",
        return_value=mock_response,
    )


# ---------------------------------------------------------------------------
# Tests: Suggest Endpoint — Happy Path
# ---------------------------------------------------------------------------


class TestSuggestHappyPath:
    def test_suggest_basic(self, client, auth_headers, guests_data):
        """Basic suggestion with no constraints returns valid suggestions."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, tables = _get_layout_seats(client, headers, event_id)

        # Build mock response assigning all guests
        guest_ids = [g["id"] for g in guests]
        seat_ids = [s["id"] for s in seats[:len(guests)]]
        mock_resp = _mock_suggest_response(guest_ids, seat_ids, tables)

        with _mock_claude_for_suggest(mock_resp):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={},
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == len(guests)
        assert len(data["unassigned"]) == 0

        # Verify each suggestion has required fields
        for s in data["suggestions"]:
            assert "seat_id" in s
            assert "guest_id" in s
            assert "guest_name" in s
            assert "table_name" in s

    def test_suggest_with_constraints(self, client, auth_headers, guests_data):
        """Suggestion with constraints passes them through."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, tables = _get_layout_seats(client, headers, event_id)

        guest_ids = [g["id"] for g in guests]
        seat_ids = [s["id"] for s in seats[:len(guests)]]
        mock_resp = _mock_suggest_response(guest_ids, seat_ids, tables)

        constraints = [
            {
                "type": "group_together",
                "guest_ids": [guests[0]["id"], guests[1]["id"]],
            },
            {
                "type": "keep_apart",
                "guest_ids": [guests[0]["id"], guests[2]["id"]],
            },
        ]

        with _mock_claude_for_suggest(mock_resp):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={"constraints": constraints},
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == len(guests)

    def test_suggest_empty_constraints(self, client, auth_headers, guests_data):
        """Empty constraints array is valid."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, tables = _get_layout_seats(client, headers, event_id)

        guest_ids = [g["id"] for g in guests]
        seat_ids = [s["id"] for s in seats[:len(guests)]]
        mock_resp = _mock_suggest_response(guest_ids, seat_ids, tables)

        with _mock_claude_for_suggest(mock_resp):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={"constraints": []},
                headers=headers,
            )

        assert resp.status_code == 200

    def test_suggest_does_not_auto_apply(self, client, auth_headers, guests_data):
        """Suggestions are returned but NOT applied to the database."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, tables = _get_layout_seats(client, headers, event_id)

        guest_ids = [g["id"] for g in guests]
        seat_ids = [s["id"] for s in seats[:len(guests)]]
        mock_resp = _mock_suggest_response(guest_ids, seat_ids, tables)

        with _mock_claude_for_suggest(mock_resp):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={},
                headers=headers,
            )
        assert resp.status_code == 200

        # Verify no seats were actually assigned
        seats_after, _ = _get_layout_seats(client, headers, event_id)
        for seat in seats_after:
            assert seat["guest_id"] is None

    def test_suggest_reports_unassigned(self, client, auth_headers, guests_data):
        """When Claude can't assign a guest, it appears in unassigned."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, tables = _get_layout_seats(client, headers, event_id)

        # Only assign first 3, leave last 2 unassigned
        assigned_guests = guests[:3]
        unassigned_guests = guests[3:]

        assignments = [
            {"seat_id": str(seats[i]["id"]), "guest_id": str(g["id"])}
            for i, g in enumerate(assigned_guests)
        ]
        unassigned = [
            {"guest_id": str(g["id"]), "reason": "Conflicting constraints"}
            for g in unassigned_guests
        ]

        mock_resp = json.dumps({
            "assignments": assignments,
            "unassigned": unassigned,
        })

        with _mock_claude_for_suggest(mock_resp):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={},
                headers=headers,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == 3
        assert len(data["unassigned"]) == 2
        for u in data["unassigned"]:
            assert "guest_id" in u
            assert "guest_name" in u
            assert "reason" in u


# ---------------------------------------------------------------------------
# Tests: Suggest Endpoint — Edge Cases
# ---------------------------------------------------------------------------


class TestSuggestEdgeCases:
    def test_suggest_no_layout(self, client, auth_headers):
        """Suggest with no layout returns all guests as unassigned."""
        headers, _ = auth_headers

        # Create a fresh event with no layout
        resp = client.post("/api/events", json={
            "name": "No Layout Wedding",
            "date": "2026-10-01",
        }, headers=headers)
        event_id = resp.json()["id"]

        # Create a guest
        client.post(f"/api/events/{event_id}/guests", json={
            "name": "Lonely Guest",
        }, headers=headers)

        # No need to mock Claude — should short-circuit
        resp = client.post(
            f"/api/events/{event_id}/seating/suggest",
            json={},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == 0
        assert len(data["unassigned"]) == 1
        assert "No layout" in data["unassigned"][0]["reason"]

    def test_suggest_no_guests(self, client, auth_headers, event_with_tables):
        """Suggest with no guests returns empty."""
        headers, _ = auth_headers
        event_id = event_with_tables

        resp = client.post(
            f"/api/events/{event_id}/seating/suggest",
            json={},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == 0
        assert len(data["unassigned"]) == 0

    def test_suggest_all_seated(self, client, auth_headers, guests_data):
        """All guests already seated returns empty response."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, _ = _get_layout_seats(client, headers, event_id)

        # Manually seat all guests via the assign endpoint
        for i, guest in enumerate(guests):
            client.put(
                f"/api/events/{event_id}/layout/seats/{seats[i]['id']}/assign",
                json={"guest_id": guest["id"]},
                headers=headers,
            )

        resp = client.post(
            f"/api/events/{event_id}/seating/suggest",
            json={},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["suggestions"]) == 0
        assert len(data["unassigned"]) == 0

    def test_suggest_invalid_json_from_claude(self, client, auth_headers, guests_data):
        """If Claude returns invalid JSON, endpoint returns 502."""
        headers, _ = auth_headers
        event_id, guests = guests_data

        with _mock_claude_for_suggest("This is not valid JSON at all"):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={},
                headers=headers,
            )
        assert resp.status_code == 502
        assert "Failed to parse" in resp.json()["detail"]

    def test_suggest_claude_returns_markdown(self, client, auth_headers, guests_data):
        """Claude response wrapped in markdown is handled."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, tables = _get_layout_seats(client, headers, event_id)

        guest_ids = [g["id"] for g in guests[:2]]
        seat_ids = [s["id"] for s in seats[:2]]

        inner_json = json.dumps({
            "assignments": [
                {"seat_id": str(seat_ids[i]), "guest_id": str(guest_ids[i])}
                for i in range(2)
            ],
            "unassigned": [],
        })
        markdown_resp = f"```json\n{inner_json}\n```"

        with _mock_claude_for_suggest(markdown_resp):
            resp = client.post(
                f"/api/events/{event_id}/seating/suggest",
                json={},
                headers=headers,
            )
        assert resp.status_code == 200
        assert len(resp.json()["suggestions"]) == 2


# ---------------------------------------------------------------------------
# Tests: Suggest Endpoint — Validation & Auth
# ---------------------------------------------------------------------------


class TestSuggestValidation:
    def test_nonexistent_event_returns_404(self, client, auth_headers):
        """Suggesting for nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.post(
            f"/api/events/{fake_id}/seating/suggest",
            json={},
            headers=headers,
        )
        assert resp.status_code == 404

    def test_other_user_event_returns_403(self, client, auth_headers, second_auth_headers, event_id):
        """Suggesting for another user's event returns 403."""
        headers_b, _ = second_auth_headers
        resp = client.post(
            f"/api/events/{event_id}/seating/suggest",
            json={},
            headers=headers_b,
        )
        assert resp.status_code == 403

    def test_no_auth_returns_401_or_403(self, client, event_id):
        """Request without auth returns 401 or 403."""
        resp = client.post(
            f"/api/events/{event_id}/seating/suggest",
            json={},
        )
        assert resp.status_code in (401, 403)

    def test_invalid_constraint_type(self, client, auth_headers, event_id):
        """Invalid constraint type returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/seating/suggest",
            json={
                "constraints": [
                    {"type": "invalid_type", "guest_ids": [str(uuid.uuid4())]}
                ]
            },
            headers=headers,
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Tests: Bulk Apply Endpoint — Happy Path
# ---------------------------------------------------------------------------


class TestBulkApplyHappyPath:
    def test_apply_basic(self, client, auth_headers, guests_data):
        """Bulk apply assigns guests to seats."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, _ = _get_layout_seats(client, headers, event_id)

        assignments = [
            {"seat_id": seats[i]["id"], "guest_id": guests[i]["id"]}
            for i in range(3)
        ]

        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": assignments},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["applied"] == 3
        assert len(data["errors"]) == 0

    def test_apply_updates_seat_and_guest(self, client, auth_headers, guests_data):
        """After apply, seat has guest_id and guest has table_id."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, _ = _get_layout_seats(client, headers, event_id)

        assignments = [
            {"seat_id": seats[0]["id"], "guest_id": guests[0]["id"]}
        ]

        client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": assignments},
            headers=headers,
        )

        # Check the seat now has the guest
        seats_after, _ = _get_layout_seats(client, headers, event_id)
        assigned_seat = next(s for s in seats_after if s["id"] == seats[0]["id"])
        assert assigned_seat["guest_id"] == guests[0]["id"]

        # Check the guest now has a table
        guest_resp = client.get(f"/api/events/{event_id}/guests", headers=headers)
        guest_data = next(g for g in guest_resp.json() if g["id"] == guests[0]["id"])
        assert guest_data["table_id"] is not None

    def test_apply_reassigns_guest_from_previous_seat(self, client, auth_headers, guests_data):
        """Applying moves a guest from their previous seat to a new one."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, _ = _get_layout_seats(client, headers, event_id)

        # First assign guest to seat 0
        client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [{"seat_id": seats[0]["id"], "guest_id": guests[0]["id"]}]},
            headers=headers,
        )

        # Now reassign to seat 1
        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [{"seat_id": seats[1]["id"], "guest_id": guests[0]["id"]}]},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["applied"] == 1

        # Verify old seat is free, new seat has the guest
        seats_after, _ = _get_layout_seats(client, headers, event_id)
        old_seat = next(s for s in seats_after if s["id"] == seats[0]["id"])
        new_seat = next(s for s in seats_after if s["id"] == seats[1]["id"])
        assert old_seat["guest_id"] is None
        assert new_seat["guest_id"] == guests[0]["id"]


# ---------------------------------------------------------------------------
# Tests: Bulk Apply Endpoint — Error Handling
# ---------------------------------------------------------------------------


class TestBulkApplyErrors:
    def test_apply_invalid_seat(self, client, auth_headers, guests_data):
        """Invalid seat ID produces an error entry."""
        headers, _ = auth_headers
        event_id, guests = guests_data

        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [
                {"seat_id": str(uuid.uuid4()), "guest_id": guests[0]["id"]},
            ]},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["applied"] == 0
        assert len(data["errors"]) == 1
        assert "not found" in data["errors"][0].lower()

    def test_apply_invalid_guest(self, client, auth_headers, guests_data):
        """Invalid guest ID produces an error entry."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, _ = _get_layout_seats(client, headers, event_id)

        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [
                {"seat_id": seats[0]["id"], "guest_id": str(uuid.uuid4())},
            ]},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["applied"] == 0
        assert len(data["errors"]) == 1
        assert "not found" in data["errors"][0].lower()

    def test_apply_mixed_valid_invalid(self, client, auth_headers, guests_data):
        """Mix of valid and invalid assignments — valid ones succeed."""
        headers, _ = auth_headers
        event_id, guests = guests_data
        seats, _ = _get_layout_seats(client, headers, event_id)

        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [
                {"seat_id": seats[0]["id"], "guest_id": guests[0]["id"]},  # valid
                {"seat_id": str(uuid.uuid4()), "guest_id": guests[1]["id"]},  # invalid seat
            ]},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["applied"] == 1
        assert len(data["errors"]) == 1

    def test_apply_empty_assignments_returns_422(self, client, auth_headers, event_id):
        """Empty assignments array returns 422."""
        headers, _ = auth_headers
        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": []},
            headers=headers,
        )
        assert resp.status_code == 422

    def test_apply_nonexistent_event_returns_404(self, client, auth_headers):
        """Apply to nonexistent event returns 404."""
        headers, _ = auth_headers
        fake_id = str(uuid.uuid4())
        resp = client.post(
            f"/api/events/{fake_id}/seating/apply",
            json={"assignments": [
                {"seat_id": str(uuid.uuid4()), "guest_id": str(uuid.uuid4())},
            ]},
            headers=headers,
        )
        assert resp.status_code == 404

    def test_apply_other_user_event_returns_403(self, client, auth_headers, second_auth_headers, event_id):
        """Apply to another user's event returns 403."""
        headers_b, _ = second_auth_headers
        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [
                {"seat_id": str(uuid.uuid4()), "guest_id": str(uuid.uuid4())},
            ]},
            headers=headers_b,
        )
        assert resp.status_code == 403

    def test_apply_no_auth_returns_401_or_403(self, client, event_id):
        """Request without auth returns 401 or 403."""
        resp = client.post(
            f"/api/events/{event_id}/seating/apply",
            json={"assignments": [
                {"seat_id": str(uuid.uuid4()), "guest_id": str(uuid.uuid4())},
            ]},
        )
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: Unit tests for seating_suggester module
# ---------------------------------------------------------------------------


class TestSeatingSuggesterModule:
    def test_extract_json_plain(self):
        """Extract JSON from plain text."""
        from app.services.seating_suggester import _extract_json
        data = _extract_json('{"assignments": [], "unassigned": []}')
        assert data == {"assignments": [], "unassigned": []}

    def test_extract_json_markdown(self):
        """Extract JSON from markdown code block."""
        from app.services.seating_suggester import _extract_json
        text = '```json\n{"assignments": [], "unassigned": []}\n```'
        data = _extract_json(text)
        assert data == {"assignments": [], "unassigned": []}

    def test_extract_json_invalid_raises(self):
        """Invalid JSON raises JSONDecodeError."""
        import json as json_module
        from app.services.seating_suggester import _extract_json
        with pytest.raises(json_module.JSONDecodeError):
            _extract_json("not json")

    def test_build_context_includes_guests(self):
        """Context builder includes guest information."""
        from unittest.mock import MagicMock
        from app.services.seating_suggester import _build_context

        guest = MagicMock()
        guest.id = uuid.uuid4()
        guest.name = "Test Guest"
        guest.group_tag = "family_a"
        guest.meal_preference = "vegetarian"
        guest.is_plus_one = False
        guest.plus_one_of = None
        guest.table_id = None

        table = MagicMock()
        table.id = uuid.uuid4()
        table.name = "Table 1"
        table.shape.value = "round"
        seat = MagicMock()
        seat.id = uuid.uuid4()
        seat.seat_index = 0
        seat.guest_id = None
        table.seats = [seat]

        context = _build_context([guest], [table], [])
        assert "Test Guest" in context
        assert "family_a" in context
        assert "Table 1" in context

    def test_build_context_includes_constraints(self):
        """Context builder includes constraint information."""
        from unittest.mock import MagicMock
        from app.services.seating_suggester import _build_context

        guest = MagicMock()
        guest.id = uuid.uuid4()
        guest.name = "Guest"
        guest.group_tag = None
        guest.meal_preference = None
        guest.is_plus_one = False
        guest.plus_one_of = None
        guest.table_id = None

        table = MagicMock()
        table.id = uuid.uuid4()
        table.name = "T1"
        table.shape.value = "round"
        table.seats = []

        constraints = [
            {"type": "group_together", "guest_ids": [str(guest.id)]},
        ]

        context = _build_context([guest], [table], constraints)
        assert "group_together" in context
        assert "CONSTRAINTS" in context
