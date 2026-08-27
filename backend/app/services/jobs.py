"""Управление задачами генерации — хранение статуса и результатов в памяти.

В продакшене заменяется на Redis/Celery. Текущая реализация достаточна для MVP
и не требует внешних зависимостей.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.schemas import GenerationResult, JobResponse, JobStatus
from app.services.generator import generate_style_variants


@dataclass
class Job:
    """Внутреннее представление задачи генерации."""

    job_id: str
    status: JobStatus = JobStatus.pending
    progress: float = 0.0
    original_image_path: str = ""
    results: list[GenerationResult] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    task: Optional[asyncio.Task] = None

    def to_response(self) -> JobResponse:
        return JobResponse(
            job_id=self.job_id,
            status=self.status,
            progress=self.progress,
            results=list(self.results),
        )


class JobStore:
    """Простое in-memory хранилище задач."""

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}

    def create(self, image_path: str) -> Job:
        job = Job(job_id=uuid.uuid4().hex, original_image_path=image_path)
        self._jobs[job.job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def start(self, job: Job, styles: list, room_type: str) -> None:
        """Запускает фоновую генерацию для задачи."""
        job.status = JobStatus.processing
        job.task = asyncio.create_task(self._run(job, styles, room_type))

    async def _run(self, job: Job, styles: list, room_type: str) -> None:
        try:
            results = await generate_style_variants(
                image_path=job.original_image_path,
                styles=styles,
                room_type=room_type,
                on_progress=lambda p: setattr(job, "progress", p),
            )
            job.results = results
            job.progress = 1.0
            job.status = JobStatus.completed
        except Exception as exc:  # noqa: BLE001
            job.status = JobStatus.failed
            job.results = [
                GenerationResult(style=s, status="failed", error=str(exc))
                for s in styles
            ]


# Глобальный экземпляр хранилища.
job_store = JobStore()
