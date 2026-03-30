"""Shared pytest fixtures for the wedding-seating-planner backend tests.

Provides auth helpers that work with the Clerk-based auth middleware
by using FastAPI dependency overrides.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal, get_db
from app.middleware.auth import get_current_user
from app.models.user import User


def create_test_user_with_override(app, db_session=None):
    """Create a test user in the DB and override get_current_user to return it.

    Returns (headers_dict, user_id_str, cleanup_callable).
    The caller must invoke cleanup() when done.

    Usage in test fixtures::

        @pytest.fixture()
        def auth_headers(app, db):
            headers, user_id, cleanup = create_test_user_with_override(app)
            yield headers, user_id
            cleanup()
    """
    clerk_id = f"user_{uuid.uuid4().hex[:16]}"
    email = f"test_{uuid.uuid4().hex[:12]}@example.com"

    session = db_session or SessionLocal()
    user = User(
        clerk_id=clerk_id,
        email=email,
        name="Test User",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    user_id = str(user.id)

    if db_session is None:
        session.close()

    def _override(db: Session = Depends(get_db)):
        return db.query(User).filter(User.id == user.id).first()

    app.dependency_overrides[get_current_user] = _override
    headers = {"Authorization": "Bearer fake-clerk-token"}

    def cleanup():
        app.dependency_overrides.pop(get_current_user, None)
        cleanup_session = SessionLocal()
        try:
            u = cleanup_session.query(User).filter(User.id == user.id).first()
            if u:
                cleanup_session.delete(u)
                cleanup_session.commit()
        finally:
            cleanup_session.close()

    return headers, user_id, cleanup
