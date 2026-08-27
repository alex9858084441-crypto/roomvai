"""Эндпоинты генерации: приём фото, запуск Replicate, опрос статуса.

Поток (раздел 4):
- POST /generate: квота → создание generation в БД → параллельный запуск
  prediction(s) на Replicate (asyncio.gather) с webhook → возврат generation_id
- GET /generations/{id}: статус + результаты
- POST /webhooks/replicate: callback от Replicate → загрузка результата → запись cost_usd
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.schemas import RoomType, StyleId
from app.services import replicate as replicate_client
from app.services import supabase_admin
from app.styles import get_style_prompt

logger = logging.getLogger(__name__)

router = APIRouter(tags=["generation"])


class GenerateResponse(BaseModel):
    generation_id: str
    status: str


@router.post("/generate", response_model=GenerateResponse, status_code=202)
async def generate(
    request: Request,
    background_tasks: BackgroundTasks,
    image_url: str = "",
    room_type: RoomType = RoomType.other,
    styles: str = "loft",
    user_id: str | None = None,
) -> JSONResponse:
    """Запускает генерацию вариантов помещения во всех выбранных стилях.

    Этап 5: параллельная генерация через asyncio.gather (аналог Promise.all).
    Free-тариф ограничивается 1 стилем (раздел 6) — проверка на этапе 7.
    """
    if not settings.replicate_api_token:
        raise HTTPException(
            status_code=503,
            detail="REPLICATE_API_TOKEN не настроен на бэкенде",
        )

    # Парсинг стилей.
    try:
        style_ids = [StyleId(s.strip()) for s in styles.split(",") if s.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Неизвестный стиль: {exc}") from exc
    if not style_ids:
        raise HTTPException(status_code=422, detail="Не указаны стили")

    # TODO этап 7: проверка квоты/подписки через supabase_admin.check_quota()

    # Создаём запись генерации в БД.
    try:
        generation = await supabase_admin.create_generation(
            user_id=user_id,
            anonymous_id=None,
            source_image_path=image_url,
            room_type=room_type.value,
        )
        generation_id = generation["id"]
    except Exception as exc:
        logger.exception("Ошибка создания generation в БД")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Параллельный запуск всех стилей (asyncio.gather — аналог Promise.all).
    background_tasks.add_task(
        _run_all_styles,
        generation_id=generation_id,
        user_id=user_id,
        image_url=image_url,
        styles=style_ids,
    )

    return JSONResponse(
        status_code=202,
        content={"generation_id": generation_id, "status": "processing"},
    )


async def _run_all_styles(
    generation_id: str,
    user_id: str | None,
    image_url: str,
    styles: list[StyleId],
) -> None:
    """Параллельный запуск prediction для всех стилей (раздел 4: Promise.all).

    Каждый стиль — отдельный prediction на Replicate со своим webhook.
    return_exceptions=True: падение одного стиля не роняет остальные.
    """
    tasks = [
        _run_single_prediction(generation_id, user_id, image_url, s)
        for s in styles
    ]
    await asyncio.gather(*tasks, return_exceptions=True)


async def _run_single_prediction(
    generation_id: str,
    user_id: str | None,
    image_url: str,
    style: StyleId,
) -> None:
    """Запуск одного prediction и создание записи результата."""
    prompt = get_style_prompt(style)
    try:
        prediction = await replicate_client.create_prediction(image_url, prompt)
        prediction_id = prediction.get("id", "")
        await supabase_admin.create_result(generation_id, style.value, prediction_id)
    except Exception:
        logger.exception("Ошибка запуска Replicate prediction для стиля %s", style)
        # Отдельный стиль упал — генерация продолжается, другие стили живы.
        try:
            await supabase_admin.create_result_failed(generation_id, style.value)
        except Exception:
            logger.exception("Не удалось записать failed-результат для %s", style)


# ============================================================================
# WEBHOOK от Replicate (раздел 4: вместо polling)
# ============================================================================

class ReplicateWebhookPayload(BaseModel):
    id: str  # prediction_id
    status: str
    output: list[str] | str | None = None
    error: str | None = None
    metrics: dict | None = None


@router.post("/webhooks/replicate")
async def replicate_webhook(payload: ReplicateWebhookPayload) -> dict:
    """Callback от Replicate: матчинг по prediction_id → загрузка результата.

    Раздел 4: не списывать генерацию при ошибке API.
    """
    prediction_id = payload.id

    # Поиск результата по prediction_id.
    url = (
        f"{settings.supabase_url}/rest/v1/generation_results"
        f"?replicate_prediction_id=eq.{prediction_id}"
    )
    import httpx
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        results = resp.json()

    if not results:
        logger.warning("Webhook: результат для prediction %s не найден", prediction_id)
        return {"status": "ignored"}

    result = results[0]
    result_id = result["id"]
    generation_id = result["generation_id"]
    user_id = result.get("user_id")

    if payload.status == "succeeded" and payload.output:
        output_url = (
            payload.output[0] if isinstance(payload.output, list) else payload.output
        )
        cost = replicate_client.estimate_cost({"metrics": payload.metrics or {}})

        # Загрузка результата в Supabase Storage.
        async with httpx.AsyncClient(timeout=30) as client:
            img_resp = await client.get(output_url)
            img_resp.raise_for_status()
            image_bytes = img_resp.content

        filename = f"{generation_id}_{result['style']}.png"
        storage_path = await supabase_admin.upload_result_image(
            image_bytes, user_id, filename
        )
        await supabase_admin.update_result(
            result_id,
            status="completed",
            result_image_path=storage_path,
            cost_usd=cost,
        )
        await _maybe_complete_generation(generation_id)
    else:
        # Ошибка — НЕ списываем генерацию (раздел 4).
        await supabase_admin.update_result(
            result_id, status="failed", error=payload.error or "unknown"
        )
        await _maybe_complete_generation(generation_id)

    return {"status": "ok"}


async def _maybe_complete_generation(generation_id: str) -> None:
    """Помечает генерацию завершённой, если все результаты готовы."""
    results = await supabase_admin.fetch_results(generation_id)
    pending = [r for r in results if r["status"] in ("pending", "processing")]
    if not pending:
        has_success = any(r["status"] == "completed" for r in results)
        await supabase_admin.update_generation_status(
            generation_id, "completed" if has_success else "failed"
        )


# ============================================================================
# Опрос статуса (клиент дёргает после webhook, либо fallback backoff)
# ============================================================================

@router.get("/generations/{generation_id}")
async def get_generation(generation_id: str) -> dict:
    """Возвращает статус генерации и результаты."""
    generation = await supabase_admin.fetch_generation(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail="Генерация не найдена")

    results = await supabase_admin.fetch_results(generation_id)

    # Подписанные URL для результатов.
    enriched = []
    for r in results:
        item = dict(r)
        if r.get("result_image_path"):
            signed = await supabase_admin.create_signed_url(
                settings.result_images_bucket, r["result_image_path"]
            )
            item["result_image_url"] = signed
        enriched.append(item)

    return {
        "id": generation_id,
        "status": generation["status"],
        "results": enriched,
    }
