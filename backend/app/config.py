"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from typing import List
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


class Settings:
    """Application settings sourced from environment."""

    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    def __init__(self) -> None:
        if not self.DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is required")


settings = Settings()
