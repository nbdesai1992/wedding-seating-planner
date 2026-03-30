"""Entry point for uvicorn. Imports the app factory."""

from app import create_app

app = create_app()
