"""Эндпоинты, связанные со стилями."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import StyleInfo
from app.styles import STYLE_INFOS

router = APIRouter(prefix="/styles", tags=["styles"])


@router.get("", response_model=list[StyleInfo])
async def list_styles() -> list[StyleInfo]:
    """Возвращает список доступных дизайнерских стилей."""
    return STYLE_INFOS
