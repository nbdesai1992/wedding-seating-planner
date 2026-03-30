"""Tests for Clerk auth middleware and /me endpoint.

Since we can't generate real Clerk JWTs in tests, the middleware's
external dependencies (JWKS verification, Clerk Backend API) are mocked.
Database operations run against the real Render PostgreSQL database.
"""

from __future__ import annotations

import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal, get_db
from app.models.user import User
from app.middleware.auth import get_current_user, _get_clerk_domain


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def app():
    """Create the FastAPI app."""
    return create_app()


@pytest.fixture(scope="module")
def client(app):
    """Create a TestClient for the FastAPI app."""
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
def test_user(db):
    """Create a test user with a clerk_id. Cleaned up after the test."""
    clerk_id = f"user_{uuid.uuid4().hex[:16]}"
    user = User(
        clerk_id=clerk_id,
        email=f"test_{uuid.uuid4().hex[:12]}@example.com",
        name="Test User",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    yield user

    # Cleanup
    cleanup_session = SessionLocal()
    try:
        u = cleanup_session.query(User).filter(User.id == user.id).first()
        if u:
            cleanup_session.delete(u)
            cleanup_session.commit()
    finally:
        cleanup_session.close()


def _mock_clerk_auth(clerk_id: str, email: str = "", first_name: str = "Test", last_name: str = "User"):
    """Return context managers that mock Clerk JWT verification and user API.

    When active, any Bearer token will be accepted and decoded to
    a payload with the given ``clerk_id`` as the ``sub`` claim.
    """
    mock_jwks_client = MagicMock()
    mock_signing_key = MagicMock()
    mock_signing_key.key = "fake-rsa-key"
    mock_jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key

    if not email:
        email = f"{clerk_id}@example.com"

    patches = [
        patch("app.middleware.auth._get_jwks_client", return_value=mock_jwks_client),
        patch("app.middleware.auth.pyjwt.decode", return_value={"sub": clerk_id}),
        patch("app.middleware.auth._fetch_clerk_user", return_value={
            "email_addresses": [{"email_address": email}],
            "first_name": first_name,
            "last_name": last_name,
        }),
    ]
    return patches


# ---------------------------------------------------------------------------
# Unit Tests: Clerk Domain Derivation
# ---------------------------------------------------------------------------

class TestClerkDomain:
    def test_get_clerk_domain_from_test_key(self):
        """Derive Clerk domain from a pk_test_ publishable key."""
        with patch.dict("os.environ", {
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":
                "pk_test_c3R1bm5pbmctd2FsbGFieS0yMS5jbGVyay5hY2NvdW50cy5kZXYk"
        }):
            domain = _get_clerk_domain()
            assert domain == "stunning-wallaby-21.clerk.accounts.dev"

    def test_get_clerk_domain_invalid_key_raises(self):
        """Invalid publishable key raises ValueError."""
        with patch.dict("os.environ", {
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "invalid_key"
        }):
            with pytest.raises(ValueError, match="Invalid Clerk publishable key"):
                _get_clerk_domain()

    def test_get_clerk_domain_missing_key_raises(self):
        """Missing publishable key raises ValueError."""
        with patch.dict("os.environ", {
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": ""
        }):
            with pytest.raises(ValueError):
                _get_clerk_domain()


# ---------------------------------------------------------------------------
# Integration Tests: GET /api/auth/me (with mocked Clerk JWT)
# ---------------------------------------------------------------------------

class TestMe:
    def test_me_returns_existing_user(self, client, test_user):
        """GET /me with valid Clerk token returns the existing user."""
        patches = _mock_clerk_auth(test_user.clerk_id, email=test_user.email)
        for p in patches:
            p.start()
        try:
            resp = client.get("/api/auth/me", headers={
                "Authorization": "Bearer fake.clerk.token",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["email"] == test_user.email
            assert data["name"] == test_user.name
            assert data["id"] == str(test_user.id)
            assert "password_hash" not in data
            assert "clerk_id" not in data
        finally:
            for p in patches:
                p.stop()

    def test_me_auto_creates_new_user(self, client):
        """GET /me for a first-time Clerk user auto-creates a local user."""
        clerk_id = f"user_{uuid.uuid4().hex[:16]}"
        email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"

        patches = _mock_clerk_auth(clerk_id, email=email, first_name="New", last_name="Person")
        for p in patches:
            p.start()
        try:
            resp = client.get("/api/auth/me", headers={
                "Authorization": "Bearer fake.clerk.token",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["email"] == email
            assert data["name"] == "New Person"
            assert "id" in data
        finally:
            for p in patches:
                p.stop()

        # Cleanup the auto-created user
        cleanup_session = SessionLocal()
        try:
            u = cleanup_session.query(User).filter(User.clerk_id == clerk_id).first()
            if u:
                cleanup_session.delete(u)
                cleanup_session.commit()
        finally:
            cleanup_session.close()

    def test_me_auto_create_with_clerk_api_failure_uses_fallback(self, client):
        """When Clerk API fails, auto-create still works with fallback data."""
        clerk_id = f"user_{uuid.uuid4().hex[:16]}"

        mock_jwks_client = MagicMock()
        mock_signing_key = MagicMock()
        mock_signing_key.key = "fake-rsa-key"
        mock_jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key

        with patch("app.middleware.auth._get_jwks_client", return_value=mock_jwks_client), \
             patch("app.middleware.auth.pyjwt.decode", return_value={
                 "sub": clerk_id,
                 "email": f"fallback_{clerk_id}@test.com",
                 "name": "Fallback User",
             }), \
             patch("app.middleware.auth._fetch_clerk_user", side_effect=Exception("API unavailable")):

            resp = client.get("/api/auth/me", headers={
                "Authorization": "Bearer fake.clerk.token",
            })
            assert resp.status_code == 200
            data = resp.json()
            # Should have used fallback email/name from token claims
            assert "id" in data
            assert data["name"] == "Fallback User"

        # Cleanup
        cleanup_session = SessionLocal()
        try:
            u = cleanup_session.query(User).filter(User.clerk_id == clerk_id).first()
            if u:
                cleanup_session.delete(u)
                cleanup_session.commit()
        finally:
            cleanup_session.close()

    def test_me_without_token_returns_401_or_403(self, client):
        """GET /me without Authorization header returns 401 or 403."""
        resp = client.get("/api/auth/me")
        assert resp.status_code in (401, 403)

    def test_me_with_invalid_token_returns_401(self, client):
        """GET /me with an invalid token returns 401."""
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid.token.here",
        })
        assert resp.status_code in (401, 403)

    def test_me_with_token_missing_sub_returns_401(self, client):
        """GET /me with a token that has no sub claim returns 401."""
        mock_jwks_client = MagicMock()
        mock_signing_key = MagicMock()
        mock_signing_key.key = "fake-rsa-key"
        mock_jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key

        with patch("app.middleware.auth._get_jwks_client", return_value=mock_jwks_client), \
             patch("app.middleware.auth.pyjwt.decode", return_value={"iss": "clerk", "exp": 9999999999}):

            resp = client.get("/api/auth/me", headers={
                "Authorization": "Bearer token.without.sub",
            })
            assert resp.status_code == 401
            assert "sub" in resp.json()["detail"].lower()

    def test_me_second_request_reuses_user(self, client):
        """Two requests with the same Clerk ID return the same local user."""
        clerk_id = f"user_{uuid.uuid4().hex[:16]}"
        email = f"reuse_{uuid.uuid4().hex[:8]}@example.com"

        patches = _mock_clerk_auth(clerk_id, email=email)
        for p in patches:
            p.start()
        try:
            resp1 = client.get("/api/auth/me", headers={
                "Authorization": "Bearer fake.clerk.token",
            })
            assert resp1.status_code == 200
            user_id_1 = resp1.json()["id"]

            resp2 = client.get("/api/auth/me", headers={
                "Authorization": "Bearer fake.clerk.token",
            })
            assert resp2.status_code == 200
            user_id_2 = resp2.json()["id"]

            assert user_id_1 == user_id_2
        finally:
            for p in patches:
                p.stop()

        # Cleanup
        cleanup_session = SessionLocal()
        try:
            u = cleanup_session.query(User).filter(User.clerk_id == clerk_id).first()
            if u:
                cleanup_session.delete(u)
                cleanup_session.commit()
        finally:
            cleanup_session.close()


# ---------------------------------------------------------------------------
# Tests: Removed Endpoints
# ---------------------------------------------------------------------------

class TestRemovedEndpoints:
    def test_register_endpoint_removed(self, client):
        """POST /api/auth/register should return 404 or 405 (endpoint removed)."""
        resp = client.post("/api/auth/register", json={
            "email": "test@test.com",
            "password": "password123",
            "name": "Test",
        })
        assert resp.status_code in (404, 405)

    def test_login_endpoint_removed(self, client):
        """POST /api/auth/login should return 404 or 405 (endpoint removed)."""
        resp = client.post("/api/auth/login", json={
            "email": "test@test.com",
            "password": "password123",
        })
        assert resp.status_code in (404, 405)

    def test_logout_endpoint_removed(self, client):
        """POST /api/auth/logout should return 404 or 405 (endpoint removed)."""
        resp = client.post("/api/auth/logout")
        assert resp.status_code in (404, 405)


# ---------------------------------------------------------------------------
# Tests: User model changes
# ---------------------------------------------------------------------------

class TestUserModel:
    def test_user_with_clerk_id_and_no_password(self, db):
        """User can be created with clerk_id and no password_hash."""
        clerk_id = f"user_{uuid.uuid4().hex[:16]}"
        user = User(
            clerk_id=clerk_id,
            email=f"model_{uuid.uuid4().hex[:8]}@example.com",
            name="Clerk User",
            # password_hash intentionally omitted
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.clerk_id == clerk_id
        assert user.password_hash is None
        assert user.id is not None

        # Cleanup
        db.delete(user)
        db.commit()

    def test_clerk_id_is_unique(self, db):
        """Two users cannot have the same clerk_id."""
        from sqlalchemy.exc import IntegrityError

        clerk_id = f"user_{uuid.uuid4().hex[:16]}"
        user1 = User(
            clerk_id=clerk_id,
            email=f"unique1_{uuid.uuid4().hex[:8]}@example.com",
            name="User 1",
        )
        db.add(user1)
        db.commit()

        user2 = User(
            clerk_id=clerk_id,
            email=f"unique2_{uuid.uuid4().hex[:8]}@example.com",
            name="User 2",
        )
        db.add(user2)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        # Cleanup
        db.delete(user1)
        db.commit()


# ---------------------------------------------------------------------------
# Health check still works
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_still_works(self, client):
        """The /health endpoint should still work after auth migration."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
