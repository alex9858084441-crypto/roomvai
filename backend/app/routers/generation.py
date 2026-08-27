"""Эндпоинты генерации: приём фото и опрос статуса задачи."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas import JobResponse, RoomType, StyleId
from app.services.jobs import job_store
from app.utils.images import save_uploaded_image

router = APIRouter(tags=["generation"])


@router.post("/generate", response_model=JobResponse, status_code=202)
async def generate(
    file: UploadFile = File(..., description="Фото помещения"),
    room_type: RoomType = Form(RoomType.other),
    styles: str = Form(..., description="Список стилей через запятую, напр. 'loft,minimalism'"),
) -> JobResponse:
    """Принимает фото и запускает асинхронную генерацию вариантов.

    Возвращает job_id для последующего опроса статуса.
    """
    # Валидация типа файла.
    if file.content_type not in settings.allowed_content_types:
        raise HTTPException(
            status_code=415,
            detail=f"Неподдерживаемый тип файла: {file.content_type}. "
            f"Допустимо: {', '.join(settings.allowed_content_types)}",
        )

    data = await file.read()
    if len(data) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой. Максимум {settings.max_upload_size_mb} МБ.",
        )

    # Парсинг списка стилей.
    try:
        style_ids = [StyleId(s.strip()) for s in styles.split(",") if s.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Неизвестный стиль: {exc}") from exc

    if not style_ids:
        raise HTTPException(status_code=422, detail="Не указаны стили для генерации.")

    suffix = ".jpg" if "jpeg" in (file.content_type or "") else "." + (file.filename or "").rsplit(".", 1)[-1]
    image_path = save_uploaded_image(data, suffix)

    job = job_store.create(str(image_path))
    job_store.start(job, style_ids, room_type.value)
    return job.to_response()


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    """Возвращает статус задачи генерации и готовые результаты."""
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Задача {job_id} не найдена.")
    return job.to_response()
