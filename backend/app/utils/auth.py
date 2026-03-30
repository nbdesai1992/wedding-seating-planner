"""Authentication utilities — DEPRECATED.

This module previously contained password hashing and custom JWT
creation/decoding helpers.  Those have been removed as part of the
migration to Clerk for authentication.

All JWT verification is now handled by ``app.middleware.auth`` which
verifies Clerk-issued tokens via JWKS.
"""
