"""Схемы данных (Pydantic) для запросов и ответов API."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class RoomType(str, Enum):
    """Тип помещения — влияет на промпт генерации."""

    living_room = "living_room"
    bedroom = "bedroom"
    kitchen = "kitchen"
    bathroom = "bathroom"
    office = "office"
    other = "other"


class StyleId(str, Enum):
    """Идентификаторы доступных дизайнерских стилей."""

    scandinavian = "scandinavian"
    loft = "loft"
    minimalism = "minimalism"
    classic = "classic"
    japandi = "japandi"
    industrial = "industrial"
    boho = "boho"
    art_deco = "art_deco"


class StyleInfo(BaseModel):
    """Описание стиля для выдачи клиенту."""

    id: StyleId
    name: str
    description: str
    preview_url: Optional[HttpUrl] = None


class GenerateRequest(BaseModel):
    """Параметры запроса генерации (тело, фото передаётся отдельно как multipart)."""

    room_type: RoomType = RoomType.other
    styles: list[StyleId] = Field(..., min_length=1, max_length=6)


class GenerationResult(BaseModel):
    """Результат генерации для одного стиля."""

    style: StyleId
    status: str
    image_url: Optional[HttpUrl] = None
    error: Optional[str] = None


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class JobResponse(BaseModel):
    """Ответ о статусе задачи генерации."""

    job_id: str
    status: JobStatus
    progress: float = Field(0.0, ge=0.0, le=1.0)
    results: list[GenerationResult] = Field(default_factory=list)
    original_image_url: Optional[HttpUrl] = None


class ErrorResponse(BaseModel):
    detail: str
