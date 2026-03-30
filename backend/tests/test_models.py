"""Tests for database models, relationships, and project structure.

Tests run against the real Render PostgreSQL database.
Includes: model imports, schema validation, CRUD operations,
relationships, constraints, and app factory.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import (
    Event,
    Guest,
    Layout,
    Seat,
    Table,
    TableShape,
    User,
    VenueFeature,
    VenueFeatureShape,
    VenueFeatureType,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def db():
    """Yield a database session; rollback after all module tests."""
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()


@pytest.fixture()
def clean_db(db):
    """
    Yield a session that rolls back after each test — no persistent side effects.
    Uses a SAVEPOINT so each test is isolated.
    """
    db.begin_nested()
    yield db
    db.rollback()


# ---------------------------------------------------------------------------
# 1. Import & structure tests
# ---------------------------------------------------------------------------

class TestImports:
    """Verify all models can be imported."""

    def test_import_all_models(self):
        from app.models import (
            User, Event, Guest, Layout, Table, Seat, VenueFeature,
            TableShape, VenueFeatureType, VenueFeatureShape,
        )
        assert User is not None
        assert Event is not None
        assert Guest is not None
        assert Layout is not None
        assert Table is not None
        assert Seat is not None
        assert VenueFeature is not None

    def test_table_shape_enum(self):
        assert TableShape.round.value == "round"
        assert TableShape.rectangle.value == "rectangle"
        assert TableShape.sweetheart.value == "sweetheart"

    def test_venue_feature_type_enum(self):
        assert VenueFeatureType.dance_floor.value == "dance_floor"
        assert VenueFeatureType.bar.value == "bar"
        assert VenueFeatureType.cake_table.value == "cake_table"
        assert VenueFeatureType.stage.value == "stage"
        assert VenueFeatureType.custom.value == "custom"

    def test_venue_feature_shape_enum(self):
        assert VenueFeatureShape.rectangle.value == "rectangle"
        assert VenueFeatureShape.circle.value == "circle"


class TestAppFactory:
    """Verify FastAPI application factory."""

    def test_create_app(self):
        from app import create_app
        app = create_app()
        assert app is not None
        assert app.title == "Wedding Seating Planner API"

    def test_health_endpoint(self):
        from app import create_app
        from fastapi.testclient import TestClient
        app = create_app()
        client = TestClient(app)
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestConfig:
    """Verify settings load correctly."""

    def test_database_url_set(self):
        assert settings.DATABASE_URL.startswith("postgresql://")

    def test_secret_key_exists(self):
        assert settings.SECRET_KEY


# ---------------------------------------------------------------------------
# 2. Schema introspection — tables exist in the real DB
# ---------------------------------------------------------------------------

class TestSchemaExists:
    """Verify all expected tables were created by the migration."""

    EXPECTED_TABLES = [
        "users", "events", "guests", "layouts", "tables",
        "seats", "venue_features", "alembic_version",
    ]

    def test_all_tables_present(self, db):
        inspector = inspect(engine)
        actual_tables = inspector.get_table_names()
        for table_name in self.EXPECTED_TABLES:
            assert table_name in actual_tables, f"Missing table: {table_name}"

    def test_users_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("users")}
        assert cols >= {"id", "email", "password_hash", "name", "created_at", "updated_at"}

    def test_events_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("events")}
        assert cols >= {"id", "user_id", "name", "date", "venue_description", "created_at", "updated_at"}

    def test_guests_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("guests")}
        assert cols >= {
            "id", "event_id", "name", "email", "meal_preference",
            "is_plus_one", "plus_one_of", "group_tag", "notes",
            "table_id", "seat_index", "created_at", "updated_at",
        }

    def test_layouts_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("layouts")}
        assert cols >= {"id", "event_id", "canvas_width", "canvas_height", "zoom_level", "pan_x", "pan_y"}

    def test_tables_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("tables")}
        assert cols >= {"id", "layout_id", "name", "shape", "x", "y", "width", "height", "rotation", "seat_count"}

    def test_seats_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("seats")}
        assert cols >= {"id", "table_id", "seat_index", "guest_id", "x_offset", "y_offset"}

    def test_venue_features_columns(self, db):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("venue_features")}
        assert cols >= {"id", "layout_id", "name", "type", "shape", "x", "y", "width", "height", "rotation"}


# ---------------------------------------------------------------------------
# 3. CRUD & relationship tests (use savepoint for isolation)
# ---------------------------------------------------------------------------

class TestUserModel:
    def test_create_user(self, clean_db):
        user = User(
            email=f"test-{uuid.uuid4().hex[:8]}@example.com",
            password_hash="hashed_pw",
            name="Test User",
        )
        clean_db.add(user)
        clean_db.flush()
        assert user.id is not None
        assert isinstance(user.id, uuid.UUID)
        assert user.created_at is not None

    def test_user_email_unique(self, clean_db):
        email = f"unique-{uuid.uuid4().hex[:8]}@example.com"
        u1 = User(email=email, password_hash="pw1", name="User1")
        clean_db.add(u1)
        clean_db.flush()

        u2 = User(email=email, password_hash="pw2", name="User2")
        clean_db.add(u2)
        with pytest.raises(Exception):  # IntegrityError
            clean_db.flush()
        clean_db.rollback()

    def test_user_repr(self, clean_db):
        user = User(email="repr@example.com", password_hash="pw", name="Repr")
        assert "repr@example.com" in repr(user)


class TestEventModel:
    def test_create_event_with_user(self, clean_db):
        user = User(
            email=f"ev-{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw",
            name="Event User",
        )
        clean_db.add(user)
        clean_db.flush()

        event = Event(user_id=user.id, name="Wedding Reception")
        clean_db.add(event)
        clean_db.flush()

        assert event.id is not None
        assert event.user_id == user.id
        assert event.date is None
        assert event.venue_description is None

    def test_event_user_relationship(self, clean_db):
        user = User(
            email=f"rel-{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw",
            name="Rel User",
        )
        clean_db.add(user)
        clean_db.flush()

        event = Event(user_id=user.id, name="My Event")
        clean_db.add(event)
        clean_db.flush()

        clean_db.refresh(user)
        assert len(user.events) == 1
        assert user.events[0].name == "My Event"


class TestGuestModel:
    def _make_event(self, session):
        user = User(
            email=f"g-{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw",
            name="Guest User",
        )
        session.add(user)
        session.flush()
        event = Event(user_id=user.id, name="Guest Event")
        session.add(event)
        session.flush()
        return event

    def test_create_guest(self, clean_db):
        event = self._make_event(clean_db)
        guest = Guest(event_id=event.id, name="Jane Doe")
        clean_db.add(guest)
        clean_db.flush()

        assert guest.id is not None
        assert guest.is_plus_one is False
        assert guest.email is None
        assert guest.meal_preference is None

    def test_guest_with_all_fields(self, clean_db):
        event = self._make_event(clean_db)
        guest = Guest(
            event_id=event.id,
            name="John Smith",
            email="john@example.com",
            meal_preference="vegetarian",
            is_plus_one=False,
            group_tag="college-friends",
            notes="Allergic to nuts",
        )
        clean_db.add(guest)
        clean_db.flush()

        assert guest.email == "john@example.com"
        assert guest.meal_preference == "vegetarian"
        assert guest.group_tag == "college-friends"

    def test_guest_plus_one_self_reference(self, clean_db):
        event = self._make_event(clean_db)
        primary = Guest(event_id=event.id, name="Primary Guest")
        clean_db.add(primary)
        clean_db.flush()

        plus_one = Guest(
            event_id=event.id,
            name="Plus One",
            is_plus_one=True,
            plus_one_of=primary.id,
        )
        clean_db.add(plus_one)
        clean_db.flush()

        assert plus_one.plus_one_of == primary.id
        assert plus_one.is_plus_one is True


class TestLayoutModel:
    def _make_event(self, session):
        user = User(
            email=f"l-{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw",
            name="Layout User",
        )
        session.add(user)
        session.flush()
        event = Event(user_id=user.id, name="Layout Event")
        session.add(event)
        session.flush()
        return event

    def test_create_layout(self, clean_db):
        event = self._make_event(clean_db)
        layout = Layout(event_id=event.id)
        clean_db.add(layout)
        clean_db.flush()

        assert layout.canvas_width == 2000
        assert layout.canvas_height == 1500
        assert layout.zoom_level == 1.0
        assert layout.pan_x == 0.0
        assert layout.pan_y == 0.0

    def test_layout_event_unique(self, clean_db):
        event = self._make_event(clean_db)
        l1 = Layout(event_id=event.id)
        clean_db.add(l1)
        clean_db.flush()

        l2 = Layout(event_id=event.id)
        clean_db.add(l2)
        with pytest.raises(Exception):  # IntegrityError
            clean_db.flush()
        clean_db.rollback()

    def test_layout_event_relationship(self, clean_db):
        event = self._make_event(clean_db)
        layout = Layout(event_id=event.id)
        clean_db.add(layout)
        clean_db.flush()

        clean_db.refresh(event)
        assert event.layout is not None
        assert event.layout.id == layout.id


class TestTableModel:
    def _make_layout(self, session):
        user = User(
            email=f"t-{uuid.uuid4().hex[:8]}@example.com",
            password_hash="pw",
            name="Table User",
        )
        session.add(user)
        session.flush()
        event = Event(user_id=user.id, name="Table Event")
        session.add(event)
        session.flush()
        layout = Layout(event_id=event.id)
        session.add(layout)
        session.flush()
        return layout

    def test_create_table(self, clean_db):
        layout = self._make_layout(clean_db)
        table = Table(
            layout_id=layout.id,
            name="Table 1",
            shape=TableShape.round,
            x=100.0, y=200.0,
            width=150.0, height=150.0,
            seat_count=8,
        )
        clean_db.add(table)
        clean_db.flush()

        assert table.id is not None
        assert table.shape == TableShape.round
        assert table.rotation == 0.0

    def test_table_shapes(self, clean_db):
        layout = self._make_layout(clean_db)
        for shape in TableShape:
            t = Table(
                layout_id=layout.id,
                name=f"Table {shape.value}",
                shape=shape,
                x=0, y=0, width=100, height=100,
                seat_count=6,
            )
            clean_db.add(t)
        clean_db.flush()

    def test_table_layout_relationship(self, clean_db):
        layout = self._make_layout(clean_db)
        t1 = Table(layout_id=layout.id, name="T1", shape=TableShape.round, x=0, y=0, width=100, height=100, seat_count=8)
        t2 = Table(layout_id=layout.id, name="T2", shape=TableShape.rectangle, x=200, y=200, width=200, height=100, seat_count=10)
        clean_db.add_all([t1, t2])
        clean_db.flush()

        clean_db.refresh(layout)
        assert len(layout.tables) == 2


class TestSeatModel:
    def _make_table(self, session):
        user = User(email=f"s-{uuid.uuid4().hex[:8]}@example.com", password_hash="pw", name="Seat User")
        session.add(user)
        session.flush()
        event = Event(user_id=user.id, name="Seat Event")
        session.add(event)
        session.flush()
        layout = Layout(event_id=event.id)
        session.add(layout)
        session.flush()
        table = Table(layout_id=layout.id, name="Seat Table", shape=TableShape.round, x=0, y=0, width=100, height=100, seat_count=8)
        session.add(table)
        session.flush()
        return table, event

    def test_create_seat(self, clean_db):
        table, _ = self._make_table(clean_db)
        seat = Seat(table_id=table.id, seat_index=0, x_offset=50.0, y_offset=0.0)
        clean_db.add(seat)
        clean_db.flush()

        assert seat.id is not None
        assert seat.guest_id is None

    def test_seat_with_guest(self, clean_db):
        table, event = self._make_table(clean_db)
        guest = Guest(event_id=event.id, name="Seated Guest")
        clean_db.add(guest)
        clean_db.flush()

        seat = Seat(table_id=table.id, seat_index=0, guest_id=guest.id, x_offset=50.0, y_offset=0.0)
        clean_db.add(seat)
        clean_db.flush()

        assert seat.guest_id == guest.id

    def test_seat_table_relationship(self, clean_db):
        table, _ = self._make_table(clean_db)
        for i in range(4):
            clean_db.add(Seat(table_id=table.id, seat_index=i, x_offset=float(i * 25), y_offset=0.0))
        clean_db.flush()

        clean_db.refresh(table)
        assert len(table.seats) == 4


class TestVenueFeatureModel:
    def _make_layout(self, session):
        user = User(email=f"vf-{uuid.uuid4().hex[:8]}@example.com", password_hash="pw", name="VF User")
        session.add(user)
        session.flush()
        event = Event(user_id=user.id, name="VF Event")
        session.add(event)
        session.flush()
        layout = Layout(event_id=event.id)
        session.add(layout)
        session.flush()
        return layout

    def test_create_venue_feature(self, clean_db):
        layout = self._make_layout(clean_db)
        vf = VenueFeature(
            layout_id=layout.id,
            name="Main Dance Floor",
            type=VenueFeatureType.dance_floor,
            shape=VenueFeatureShape.rectangle,
            x=500, y=500, width=300, height=300,
        )
        clean_db.add(vf)
        clean_db.flush()

        assert vf.id is not None
        assert vf.type == VenueFeatureType.dance_floor
        assert vf.rotation == 0.0

    def test_all_venue_feature_types(self, clean_db):
        layout = self._make_layout(clean_db)
        for ft in VenueFeatureType:
            vf = VenueFeature(
                layout_id=layout.id,
                name=f"Feature {ft.value}",
                type=ft,
                shape=VenueFeatureShape.rectangle,
                x=0, y=0, width=100, height=100,
            )
            clean_db.add(vf)
        clean_db.flush()

    def test_venue_feature_layout_relationship(self, clean_db):
        layout = self._make_layout(clean_db)
        vf1 = VenueFeature(layout_id=layout.id, name="Bar", type=VenueFeatureType.bar, shape=VenueFeatureShape.rectangle, x=0, y=0, width=100, height=50)
        vf2 = VenueFeature(layout_id=layout.id, name="Stage", type=VenueFeatureType.stage, shape=VenueFeatureShape.circle, x=200, y=200, width=200, height=200)
        clean_db.add_all([vf1, vf2])
        clean_db.flush()

        clean_db.refresh(layout)
        assert len(layout.venue_features) == 2


# ---------------------------------------------------------------------------
# 4. Cascade delete tests
# ---------------------------------------------------------------------------

class TestCascadeDeletes:
    def test_delete_user_cascades_to_events(self, clean_db):
        user = User(email=f"cd-{uuid.uuid4().hex[:8]}@example.com", password_hash="pw", name="Cascade User")
        clean_db.add(user)
        clean_db.flush()

        event = Event(user_id=user.id, name="Cascade Event")
        clean_db.add(event)
        clean_db.flush()
        event_id = event.id

        clean_db.delete(user)
        clean_db.flush()

        assert clean_db.get(Event, event_id) is None

    def test_delete_event_cascades_to_guests(self, clean_db):
        user = User(email=f"cdg-{uuid.uuid4().hex[:8]}@example.com", password_hash="pw", name="CG User")
        clean_db.add(user)
        clean_db.flush()

        event = Event(user_id=user.id, name="CG Event")
        clean_db.add(event)
        clean_db.flush()

        guest = Guest(event_id=event.id, name="Will Be Deleted")
        clean_db.add(guest)
        clean_db.flush()
        guest_id = guest.id

        clean_db.delete(event)
        clean_db.flush()

        assert clean_db.get(Guest, guest_id) is None

    def test_delete_layout_cascades_to_tables_and_features(self, clean_db):
        user = User(email=f"cdl-{uuid.uuid4().hex[:8]}@example.com", password_hash="pw", name="CDL User")
        clean_db.add(user)
        clean_db.flush()

        event = Event(user_id=user.id, name="CDL Event")
        clean_db.add(event)
        clean_db.flush()

        layout = Layout(event_id=event.id)
        clean_db.add(layout)
        clean_db.flush()

        table = Table(layout_id=layout.id, name="CDL Table", shape=TableShape.round, x=0, y=0, width=100, height=100, seat_count=8)
        clean_db.add(table)
        clean_db.flush()

        vf = VenueFeature(layout_id=layout.id, name="CDL Feature", type=VenueFeatureType.bar, shape=VenueFeatureShape.rectangle, x=0, y=0, width=50, height=50)
        clean_db.add(vf)
        clean_db.flush()

        table_id = table.id
        vf_id = vf.id

        clean_db.delete(layout)
        clean_db.flush()

        assert clean_db.get(Table, table_id) is None
        assert clean_db.get(VenueFeature, vf_id) is None


# ---------------------------------------------------------------------------
# 5. UUID primary key tests
# ---------------------------------------------------------------------------

class TestUUIDPrimaryKeys:
    def test_all_models_use_uuid(self, clean_db):
        user = User(email=f"uuid-{uuid.uuid4().hex[:8]}@example.com", password_hash="pw", name="UUID User")
        clean_db.add(user)
        clean_db.flush()

        event = Event(user_id=user.id, name="UUID Event")
        clean_db.add(event)
        clean_db.flush()

        layout = Layout(event_id=event.id)
        clean_db.add(layout)
        clean_db.flush()

        table = Table(layout_id=layout.id, name="UUID Table", shape=TableShape.round, x=0, y=0, width=100, height=100, seat_count=8)
        clean_db.add(table)
        clean_db.flush()

        guest = Guest(event_id=event.id, name="UUID Guest")
        clean_db.add(guest)
        clean_db.flush()

        seat = Seat(table_id=table.id, seat_index=0, x_offset=0, y_offset=0)
        clean_db.add(seat)
        clean_db.flush()

        vf = VenueFeature(layout_id=layout.id, name="UUID VF", type=VenueFeatureType.custom, shape=VenueFeatureShape.circle, x=0, y=0, width=50, height=50)
        clean_db.add(vf)
        clean_db.flush()

        for obj in [user, event, layout, table, guest, seat, vf]:
            assert isinstance(obj.id, uuid.UUID), f"{type(obj).__name__}.id is not UUID"
