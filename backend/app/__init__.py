"""Wedding Seating Planner — FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.events import router as events_router
from app.routers.guests import router as guests_router
from app.routers.layout import router as layout_router
from app.routers.ai_layout import router as ai_layout_router
from app.routers.seating import router as seating_router
from app.routers.export import router as export_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Wedding Seating Planner API",
        description="AI-powered wedding seating planner and guest management",
        version="0.1.0",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth_router)
    app.include_router(events_router)
    app.include_router(guests_router)
    app.include_router(layout_router)
    app.include_router(ai_layout_router)
    app.include_router(seating_router)
    app.include_router(export_router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
