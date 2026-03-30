"""Tests for authentication endpoints and JWT middleware.

Tests run against the real Render PostgreSQL database via TestClient.
Each test creates unique users to avoid conflicts, and cleans up after itself.
"""

from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import create_app
from app.database import SessionLocal
from app.models.user import User
from app.utils.auth import hash_password, verify_password, create_access_token, decode_access_token


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
    """Yield a database session, rolling back on teardown."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def unique_email():
    """Generate a unique email for each test."""
    return f"test_{uuid.uuid4().hex[:12]}@example.com"


@pytest.fixture()
def registered_user(client, unique_email):
    """Register a user and return (email, password, response_data)."""
    password = "testpassword123"
    resp = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": password,
        "name": "Test User",
    })
    assert resp.status_code == 201
    data = resp.json()
    yield unique_email, password, data
    # Cleanup: delete the user from DB
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.email == unique_email).first()
        if user:
            session.delete(user)
            session.commit()
    finally:
        session.close()


# ---------------------------------------------------------------------------
# Unit Tests: Password Hashing
# ---------------------------------------------------------------------------

class TestPasswordHashing:
    def test_hash_password_returns_string(self):
        hashed = hash_password("secret")
        assert isinstance(hashed, str)
        assert hashed != "secret"

    def test_verify_password_correct(self):
        hashed = hash_password("secret")
        assert verify_password("secret", hashed) is True

    def test_verify_password_wrong(self):
        hashed = hash_password("secret")
        assert verify_password("wrong", hashed) is False


# ---------------------------------------------------------------------------
# Unit Tests: JWT
# ---------------------------------------------------------------------------

class TestJWT:
    def test_create_and_decode_token(self):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        decoded_id = decode_access_token(token)
        assert decoded_id == str(user_id)

    def test_decode_invalid_token_raises(self):
        from jose import JWTError
        with pytest.raises(JWTError):
            decode_access_token("not.a.valid.token")

    def test_decode_token_missing_sub_raises(self):
        from jose import jwt as jose_jwt, JWTError
        from app.config import settings
        token = jose_jwt.encode({"foo": "bar"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        with pytest.raises(JWTError, match="sub"):
            decode_access_token(token)


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_success(self, client, unique_email, db):
        """Register creates a user and returns JWT + user object."""
        resp = client.post("/api/auth/register", json={
            "email": unique_email,
            "password": "password123",
            "name": "Jane Doe",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "Jane Doe"
        assert "id" in data["user"]
        assert "created_at" in data["user"]
        # password_hash should NOT be exposed
        assert "password_hash" not in data["user"]
        assert "password" not in data["user"]

        # Cleanup
        user = db.query(User).filter(User.email == unique_email).first()
        if user:
            db.delete(user)
            db.commit()

    def test_register_duplicate_email_returns_409(self, registered_user, client):
        """Registering with an existing email returns 409."""
        email, password, _ = registered_user
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "anotherpassword",
            "name": "Duplicate User",
        })
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"].lower()

    def test_register_missing_fields_returns_422(self, client):
        """Missing required fields returns 422."""
        resp = client.post("/api/auth/register", json={
            "email": "test@example.com",
        })
        assert resp.status_code == 422

    def test_register_invalid_email_returns_422(self, client):
        """Invalid email format returns 422."""
        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "password": "password123",
            "name": "Test",
        })
        assert resp.status_code == 422

    def test_register_short_password_returns_422(self, client):
        """Password shorter than 6 chars returns 422."""
        resp = client.post("/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "abc",
            "name": "Test",
        })
        assert resp.status_code == 422

    def test_register_empty_name_returns_422(self, client):
        """Empty name returns 422."""
        resp = client.post("/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "name": "",
        })
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_success(self, registered_user, client):
        """Login with valid credentials returns JWT + user."""
        email, password, _ = registered_user
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email

    def test_login_wrong_password_returns_401(self, registered_user, client):
        """Login with wrong password returns 401."""
        email, _, _ = registered_user
        resp = client.post("/api/auth/login", json={
            "email": email,
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        assert "invalid" in resp.json()["detail"].lower()

    def test_login_nonexistent_user_returns_401(self, client):
        """Login with nonexistent email returns 401."""
        resp = client.post("/api/auth/login", json={
            "email": "doesnotexist@example.com",
            "password": "somepassword",
        })
        assert resp.status_code == 401

    def test_login_missing_fields_returns_422(self, client):
        """Missing required login fields returns 422."""
        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
        })
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Integration Tests: GET /api/auth/me
# ---------------------------------------------------------------------------

class TestMe:
    def test_me_with_valid_token(self, registered_user, client):
        """GET /me with valid JWT returns the user."""
        email, _, reg_data = registered_user
        token = reg_data["access_token"]
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == email
        assert data["name"] == "Test User"
        assert "id" in data
        assert "password_hash" not in data

    def test_me_without_token_returns_401_or_403(self, client):
        """GET /me without Authorization header returns 401 or 403."""
        resp = client.get("/api/auth/me")
        assert resp.status_code in (401, 403)

    def test_me_with_invalid_token_returns_401_or_403(self, client):
        """GET /me with invalid token returns 401 or 403."""
        resp = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid.token.here",
        })
        assert resp.status_code in (401, 403)

    def test_me_with_expired_token_returns_401_or_403(self, client):
        """GET /me with an expired token returns 401 or 403."""
        from jose import jwt as jose_jwt
        from app.config import settings
        from datetime import datetime, timedelta, timezone

        expired_token = jose_jwt.encode(
            {"sub": str(uuid.uuid4()), "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {expired_token}",
        })
        assert resp.status_code in (401, 403)

    def test_me_with_token_for_deleted_user(self, client, unique_email):
        """GET /me with a valid JWT but for a user that no longer exists returns 401."""
        # Register a user
        resp = client.post("/api/auth/register", json={
            "email": unique_email,
            "password": "password123",
            "name": "Ghost User",
        })
        assert resp.status_code == 201
        token = resp.json()["access_token"]

        # Delete the user directly from DB
        session = SessionLocal()
        try:
            user = session.query(User).filter(User.email == unique_email).first()
            if user:
                session.delete(user)
                session.commit()
        finally:
            session.close()

        # Now try /me — user no longer exists
        resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Integration Tests: POST /api/auth/logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_with_valid_token(self, registered_user, client):
        """POST /logout with valid JWT returns success."""
        _, _, reg_data = registered_user
        token = reg_data["access_token"]
        resp = client.post("/api/auth/logout", headers={
            "Authorization": f"Bearer {token}",
        })
        assert resp.status_code == 200
        assert "logged out" in resp.json()["detail"].lower()

    def test_logout_without_token_returns_401_or_403(self, client):
        """POST /logout without token returns 401 or 403."""
        resp = client.post("/api/auth/logout")
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Integration Tests: Token reuse across endpoints
# ---------------------------------------------------------------------------

class TestTokenFlow:
    def test_register_token_works_for_me(self, client, unique_email, db):
        """Token from register can be used for /me."""
        resp = client.post("/api/auth/register", json={
            "email": unique_email,
            "password": "password123",
            "name": "Flow Test",
        })
        assert resp.status_code == 201
        token = resp.json()["access_token"]

        me_resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == unique_email

        # Cleanup
        user = db.query(User).filter(User.email == unique_email).first()
        if user:
            db.delete(user)
            db.commit()

    def test_login_token_works_for_me(self, registered_user, client):
        """Token from login can be used for /me."""
        email, password, _ = registered_user
        login_resp = client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        me_resp = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
        })
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email


# ---------------------------------------------------------------------------
# Health check still works
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_still_works(self, client):
        """The /health endpoint should still work after adding auth router."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
