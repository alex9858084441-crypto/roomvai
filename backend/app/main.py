"""Точка входа приложения FastAPI."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import ensure_dirs, settings
from app.routers import generation, styles

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

ensure_dirs()

app = FastAPI(
    title=settings.app_name,
    description=(
        "API мобильного приложения RoomVAI: рестайлинг помещений "
        "в разные дизайнерские стили с помощью генеративной нейросети."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Раздача сгенерированных изображений.
app.mount("/output", StaticFiles(directory=settings.output_dir), name="output")

# Роутеры.
app.include_router(styles.router)
app.include_router(generation.router)


@app.get("/", tags=["health"])
async def root() -> dict:
    """ Healthcheck / информация о сервисе. """
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "ml_mode": settings.ml_mode,
        "status": "ok",
    }


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
