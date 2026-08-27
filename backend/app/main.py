"""Точка входа приложения FastAPI."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ensure_dirs, settings
from app.routers import generation, revenuecat, styles, subscription

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

ensure_dirs()

app = FastAPI(
    title=settings.app_name,
    description=(
        "API мобильного приложения RoomVAI: рестайлинг помещений "
        "в разные дизайнерские стили с помощью генеративной нейросети (Replicate + ControlNet)."
    ),
    version="0.7.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роутеры.
app.include_router(styles.router)
app.include_router(generation.router)
app.include_router(revenuecat.router)
app.include_router(subscription.router)


@app.get("/", tags=["health"])
async def root() -> dict:
    """Healthcheck / информация о сервисе."""
    return {
        "name": settings.app_name,
        "version": "0.7.0",
        "replicate_configured": bool(settings.replicate_api_token),
        "supabase_configured": bool(settings.supabase_url),
        "status": "ok",
    }


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
