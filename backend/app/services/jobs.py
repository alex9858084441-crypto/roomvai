"""In-memory хранилище задач генерации для mock-режима.

Когда ML_MODE=mock, бэкенд не обращается к Supabase и Replicate:
- задачи хранятся в памяти процесса (dict)
- изображения генерируются локально через Pillow (см. mock_image.py)
- эндпоинты /generate и /generations/{id} работают без внешних зависимостей

Это позволяет тестировать полный флоу локально без ключей и БД.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class MockResult:
    """Результат генерации одного стиля."""

    id: str
    style: str
    status: str = "processing"  # processing | completed | failed
    result_image_path: str | None = None
    result_image_url: str | None = None
    cost_usd: float | None = None
    error: str | None = None


@dataclass
class MockGeneration:
    """Задача генерации с результатами по стилям."""

    id: str
    status: str = "processing"  # processing | completed | failed
    source_image_path: str = ""
    source_image_paths: list[str] = field(default_factory=list)
    room_type: str = "other"
    results: list[MockResult] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    task: asyncio.Task[Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Сериализация для ответа API (формат совпадает с Supabase-версией)."""
        return {
            "id": self.id,
            "status": self.status,
            "results": [self._result_dict(r) for r in self.results],
        }

    @staticmethod
    def _result_dict(r: MockResult) -> dict[str, Any]:
        return {
            "id": r.id,
            "style": r.style,
            "status": r.status,
            "result_image_path": r.result_image_path,
            "result_image_url": r.result_image_url,
            "cost_usd": r.cost_usd,
            "error": r.error,
        }


class _MockStore:
    """Потокобезопасное (asyncio) in-memory хранилище генераций."""

    def __init__(self) -> None:
        self._generations: dict[str, MockGeneration] = {}

    def create(
        self,
        source_image_path: str,
        room_type: str,
        styles: list[str],
        source_image_paths: list[str] | None = None,
    ) -> MockGeneration:
        gen_id = uuid.uuid4().hex
        results = [
            MockResult(id=uuid.uuid4().hex, style=s)
            for s in styles
        ]
        gen = MockGeneration(
            id=gen_id,
            source_image_path=source_image_path,
            source_image_paths=source_image_paths or [source_image_path],
            room_type=room_type,
            results=results,
        )
        self._generations[gen_id] = gen
        return gen

    def get(self, gen_id: str) -> MockGeneration | None:
        return self._generations.get(gen_id)

    def all(self) -> list[MockGeneration]:
        return list(self._generations.values())


# Единственный экземпляр на процесс.
job_store = _MockStore()
