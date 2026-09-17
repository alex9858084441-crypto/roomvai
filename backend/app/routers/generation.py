"""Эндпоинты генерации: приём фото, запуск VseGPT.ru, опрос статуса.

Поток (раздел 4):
- POST /upload: приём фото от клиента → загрузка в Supabase Storage
  (service_role) → возврат подписанного URL
- POST /generate: квота → создание generation в БД → параллельный запуск
  генераций на VseGPT.ru (asyncio.gather) → возврат generation_id
- GET /generations/{id}: статус + результаты

VseGPT.ru возвращает результат синхронно — webhook не нужен.

Mock-режим (ML_MODE=mock): генерация без Supabase и VseGPT.ru,
результаты хранятся in-memory, изображения генерируются через Pillow.
"""

from __future__ import annotations

import asyncio
import logging
import time

import httpx
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from app.config import settings
from app.schemas import RoomType, StyleId
from app.services import vsegpt as vsegpt_client
from app.services import supabase_admin
from app.services.jobs import job_store
from app.services.mock_image import generate_placeholder
from app.styles import get_style_prompt
from app.utils.rate_limit import generate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["generation"])

STALE_PROCESSING_SECONDS = 300  # 5 минут — после этого считаем задачу умершей.

# Ссылки на запущенные задачи, чтобы event loop не потерял их
# (asyncio держит только weak references на tasks).
_background_tasks: set[asyncio.Task] = set()


class GenerateResponse(BaseModel):
    generation_id: str
    status: str


class UploadResponse(BaseModel):
    url: str
    path: str


def _is_mock() -> bool:
    return settings.ml_mode == "mock"


# ============================================================================
# Загрузка исходного фото (клиент → бэкенд → Supabase Storage)
# ============================================================================

@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    user_id: str | None = None,
) -> JSONResponse:
    """Принимает фото от клиента, загружает в Supabase Storage через service_role.

    Возвращает подписанный URL, который клиент передаёт в /generate.
    Загрузка через бэкенд (а не напрямую в Supabase) нужна потому что:
    1. Анонимные пользователи не могут писать в приватный bucket (RLS).
    2. VseGPT.ru нужен публично доступный URL, а не локальный file:// URI.
    """
    # Mock-режим: Supabase недоступен, возвращаем заглушку.
    if _is_mock():
        return JSONResponse(
            status_code=200,
            content={"url": "mock://image", "path": "mock/image.jpg"},
        )

    # Проверка размера и типа.
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой (макс. {settings.max_upload_size_mb} МБ)",
        )
    if file.content_type not in settings.allowed_content_types:
        raise HTTPException(
            status_code=415,
            detail=f"Неподдерживаемый тип файла: {file.content_type}",
        )

    ext = "png" if file.content_type == "image/png" else "jpg"
    filename = f"{int(time.time() * 1000)}.{ext}"

    try:
        path, signed_url = await supabase_admin.upload_source_image(
            content, user_id, filename
        )
    except Exception as exc:
        logger.exception("Ошибка загрузки фото в Supabase Storage")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return JSONResponse(
        status_code=200,
        content={"url": signed_url, "path": path},
    )


# ============================================================================
# Запуск генерации
# ============================================================================

@router.post("/generate", response_model=GenerateResponse, status_code=202)
async def generate(
    request: Request,
    image_urls: str = "",
    room_type: RoomType = RoomType.other,
    styles: str = "loft",
    user_id: str | None = None,
) -> JSONResponse:
    """Запускает генерацию вариантов помещения во всех выбранных стилях.

    Этап 5: параллельная генерация через asyncio.gather (аналог Promise.all).
    Free-тариф ограничивается 1 стилем (раздел 6) — проверка на этапе 7.
    Принимает 2–4 фотографии комнаты с разных углов.
    """
    # Парсинг стилей.
    try:
        style_ids = [StyleId(s.strip()) for s in styles.split(",") if s.strip()]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Неизвестный стиль: {exc}") from exc
    if not style_ids:
        raise HTTPException(status_code=422, detail="Не указаны стили")

    # Парсинг URL фотографий комнаты (2–4 фото с разных углов).
    url_list = [u.strip() for u in image_urls.split(",") if u.strip()]
    if len(url_list) < 2:
        raise HTTPException(status_code=422, detail="Нужно минимум 2 фотографии комнаты")
    if len(url_list) > 4:
        raise HTTPException(status_code=422, detail="Максимум 4 фотографии комнаты")

    # Rate-limiting (раздел 10): защита бюджета от злоупотреблений.
    client_ip = request.client.host if request.client else "unknown"
    rate_key = user_id or client_ip
    if not generate_limiter.check(rate_key):
        raise HTTPException(
            status_code=429,
            detail="Слишком много запросов. Подождите немного перед следующей генерацией.",
        )

    # ─────────────────────────────────────────────────────────────────────
    # MOCK-режим: in-memory хранилище, генерация через Pillow.
    # ─────────────────────────────────────────────────────────────────────
    if _is_mock():
        gen = job_store.create(
            source_image_path=url_list[0],
            source_image_paths=url_list,
            room_type=room_type.value,
            styles=[s.value for s in style_ids],
        )
        task = asyncio.create_task(_run_mock_styles(gen.id, style_ids))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
        return JSONResponse(
            status_code=202,
            content={"generation_id": gen.id, "status": "processing"},
        )

    # ─────────────────────────────────────────────────────────────────────
    # PROD-режим: Supabase DB + VseGPT.ru.
    # ─────────────────────────────────────────────────────────────────────
    if not settings.vsegpt_api_key:
        raise HTTPException(
            status_code=503,
            detail="VSEGPT_API_KEY не настроен на бэкенде",
        )

    # TODO этап 7: проверка квоты/подписки через supabase_admin.check_quota()

    # Создаём запись генерации в БД.
    try:
        generation = await supabase_admin.create_generation(
            user_id=user_id,
            anonymous_id=None,
            source_image_path=url_list[0],
            room_type=room_type.value,
        )
        generation_id = generation["id"]
    except Exception as exc:
        logger.exception("Ошибка создания generation в БД")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Параллельный запуск всех стилей (asyncio.gather — аналог Promise.all).
    task = asyncio.create_task(
        _run_all_styles(
            generation_id=generation_id,
            user_id=user_id,
            image_urls=url_list,
            styles=style_ids,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return JSONResponse(
        status_code=202,
        content={"generation_id": generation_id, "status": "processing"},
    )


# ============================================================================
# MOCK: фоновая генерация placeholder-изображений.
# ============================================================================

async def _run_mock_styles(
    generation_id: str,
    styles: list[StyleId],
) -> None:
    """Генерация mock-результатов с задержкой (имитация работы нейросети).

    Каждый стиль генерируется параллельно, задержка ~1.5-3 сек.
    """
    async def _one(style: StyleId) -> None:
        await asyncio.sleep(1.5 + 0.5 * styles.index(style))
        gen = job_store.get(generation_id)
        if gen is None:
            return
        result = next((r for r in gen.results if r.style == style.value), None)
        if result is None:
            return
        try:
            image_bytes = generate_placeholder(style.value)
            filename = f"{generation_id}_{style.value}.png"
            out_path = settings.output_dir / filename
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(image_bytes)
            result.result_image_path = f"/output/{filename}"
            result.result_image_url = f"/output/{filename}"
            result.cost_usd = 0.0
            result.status = "completed"
            logger.info("Mock-результат готов: %s → %s", style.value, out_path)
        except Exception:
            logger.exception("Ошибка mock-генерации для стиля %s", style.value)
            result.status = "failed"
            result.error = "mock_generation_failed"

    await asyncio.gather(*[_one(s) for s in styles], return_exceptions=True)

    # Проверка: все ли результаты готовы.
    gen = job_store.get(generation_id)
    if gen is not None:
        has_success = any(r.status == "completed" for r in gen.results)
        all_done = all(r.status in ("completed", "failed") for r in gen.results)
        if all_done:
            gen.status = "completed" if has_success else "failed"


# ============================================================================
# PROD: параллельный запуск генерации на VseGPT.ru (синхронный, без webhook).
# ============================================================================

async def _run_all_styles(
    generation_id: str,
    user_id: str | None,
    image_urls: list[str],
    styles: list[StyleId],
) -> None:
    """Параллельный запуск генераций для всех стилей (раздел 4: Promise.all).

    Каждый стиль — отдельный вызов VseGPT.ru (синхронный, без webhook).
    return_exceptions=True: падение одного стиля не роняет остальные.
    """
    tasks = [
        _run_single_prediction(generation_id, user_id, image_urls, s)
        for s in styles
    ]
    try:
        gather_results = await asyncio.gather(*tasks, return_exceptions=True)
        for style, result in zip(styles, gather_results):
            if isinstance(result, BaseException):
                logger.error(
                    "Task for style %s raised: %s: %s",
                    style.value,
                    type(result).__name__,
                    result,
                )
    except Exception:
        logger.exception("Unexpected error in _run_all_styles for %s", generation_id)
    finally:
        await _maybe_complete_generation(generation_id)


async def _run_single_prediction(
    generation_id: str,
    user_id: str | None,
    image_urls: list[str],
    style: StyleId,
) -> None:
    """Запуск одной генерации на VseGPT.ru: вызов → загрузка → запись в БД.

    VseGPT.ru возвращает результат синхронно — webhook не нужен.
    """
    prompt = get_style_prompt(style)

    # Создаём запись результата со статусом processing.
    try:
        result = await supabase_admin.create_result(
            generation_id, style.value, ""
        )
        result_id = result["id"]
    except Exception:
        logger.exception("Не удалось создать result в БД для стиля %s", style)
        return

    try:
        data = await vsegpt_client.generate_image(image_urls[0], prompt)
    except Exception as exc:
        logger.exception("Ошибка генерации на VseGPT для стиля %s", style)
        try:
            await supabase_admin.update_result(
                result_id, status="failed", error=str(exc)
            )
        except Exception:
            logger.exception("Не удалось обновить failed-результат для %s", style)
        await _maybe_complete_generation(generation_id)
        return

    # Извлекаем результат (формат VseGPT: {"data": [{"url": "..."}]}).
    images = data.get("data", [])
    if not images:
        await supabase_admin.update_result(
            result_id, status="failed", error="VseGPT вернул пустой результат"
        )
        await _maybe_complete_generation(generation_id)
        return

    output_url = images[0].get("url", "")
    if not output_url:
        await supabase_admin.update_result(
            result_id, status="failed", error="VseGPT не вернул URL изображения"
        )
        await _maybe_complete_generation(generation_id)
        return

    cost = vsegpt_client.estimate_cost(data)

    # Загрузка результата в Supabase Storage.
    # Если VseGPT вернул base64, берём байты напрямую; иначе скачиваем по URL.
    b64_bytes = vsegpt_client.get_image_bytes(data)
    if b64_bytes is not None:
        image_bytes = b64_bytes
    else:
        async with httpx.AsyncClient(timeout=30) as client:
            img_resp = await client.get(output_url)
            img_resp.raise_for_status()
            image_bytes = img_resp.content

    filename = f"{generation_id}_{style.value}.jpg"
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
# Опрос статуса (клиент дёргает после генерации)
# ============================================================================

@router.get("/generations/{generation_id}")
async def get_generation(generation_id: str) -> dict:
    """Возвращает статус генерации и результаты."""
    # Mock-режим: отдаём из in-memory хранилища.
    if _is_mock():
        gen = job_store.get(generation_id)
        if gen is None:
            raise HTTPException(status_code=404, detail="Генерация не найдена")
        return gen.to_dict()

    # Prod-режим: из Supabase.
    generation = await supabase_admin.fetch_generation(generation_id)
    if not generation:
        raise HTTPException(status_code=404, detail="Генерация не найдена")

    # Recovery: если генерация висит > 5 минут, помечаем как failed.
    # Render free tier может убить процесс — задача никогда не завершится.
    if generation.get("status") == "processing":
        created_at = generation.get("created_at")
        if created_at is not None:
            from datetime import datetime, timezone
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            age_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
            if age_seconds > STALE_PROCESSING_SECONDS:
                logger.warning(
                    "Stale generation %s (age %.0fs), marking as failed",
                    generation_id,
                    age_seconds,
                )
                await supabase_admin.update_generation_status(
                    generation_id, "failed"
                )
                results = await supabase_admin.fetch_results(generation_id)
                for r in results:
                    if r.get("status") in ("pending", "processing"):
                        try:
                            await supabase_admin.update_result(
                                r["id"],
                                status="failed",
                                error="Превышено время ожидания генерации",
                            )
                        except Exception:
                            logger.exception("Не удалось пометить result %s failed", r["id"])
                generation["status"] = "failed"

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


@router.get("/output/{filename:path}")
async def serve_output_image(filename: str) -> Response:
    """Раздача mock-изображений из output/ (для локального режима).

    Заменяет StaticFiles mount, который зависает с ASGITransport/TestClient
    на Python 3.14 + Starlette 1.6.
    """
    file_path = settings.output_dir / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Изображение не найдено")
    return Response(
        content=file_path.read_bytes(),
        media_type="image/png",
    )


# ============================================================================
# Диагностика: прямой вызов VseGPT (для отладки, без background task).
# ============================================================================

@router.post("/debug/vsegpt-test")
async def debug_vsegpt_test(image_url: str) -> dict:
    """Прямой вызов VseGPT с перебором форматов — находит рабочий."""
    if not settings.vsegpt_api_key:
        return {"error": "VSEGPT_API_KEY не задан"}
    if _is_mock():
        return {"error": "ML_MODE=mock, VseGPT не вызывается"}

    import httpx
    base = vsegpt_client.VSEGPT_API_BASE
    model = vsegpt_client._get_model()
    headers = {
        "Authorization": f"Bearer {settings.vsegpt_api_key}",
        "Content-Type": "application/json",
    }

    # Разные варианты payload для img2img.
    variants = [
        {"model": model, "prompt": "Modern loft interior", "image": image_url, "response_format": "b64_json"},
        {"model": model, "prompt": "Modern loft interior", "image": image_url},
        {"model": model, "prompt": "Modern loft interior", "image_url": image_url, "response_format": "b64_json"},
        {"model": model, "prompt": "Modern loft interior", "image_url": image_url},
        {"model": model, "prompt": "Modern loft interior", "images": [image_url], "response_format": "b64_json"},
        {"model": model, "prompt": "Modern loft interior", "input": image_url, "response_format": "b64_json"},
    ]

    results = []
    async with httpx.AsyncClient(timeout=60) as client:
        for i, payload in enumerate(variants):
            if i > 0:
                await asyncio.sleep(1.5)
            keys = list(payload.keys())
            try:
                resp = await client.post(
                    f"{base}/images/generations", json=payload, headers=headers
                )
                if resp.is_success:
                    data = resp.json()
                    results.append({
                        "variant": i,
                        "keys": keys,
                        "success": True,
                        "data_keys": list(data.keys()),
                        "preview": str(data)[:300],
                    })
                    break
                else:
                    results.append({
                        "variant": i,
                        "keys": keys,
                        "success": False,
                        "status": resp.status_code,
                        "error": resp.text[:200],
                    })
            except Exception as exc:
                results.append({
                    "variant": i,
                    "keys": keys,
                    "success": False,
                    "error": str(exc)[:200],
                })

    return {"model": model, "variants": results}


@router.post("/debug/full-generate-test")
async def debug_full_generate_test(image_url: str) -> dict:
    """Синхронный полный тест: создание generation → VseGPT → результат.

    Запускает _run_single_prediction без фоновой задачи, чтобы увидеть
    реальную ошибку в ответе.
    """
    if not settings.vsegpt_api_key:
        return {"error": "VSEGPT_API_KEY не задан"}
    if _is_mock():
        return {"error": "ML_MODE=mock"}

    try:
        generation = await supabase_admin.create_generation(
            user_id=None,
            anonymous_id=None,
            source_image_path="debug/test",
            room_type="other",
        )
        generation_id = generation["id"]
        logger.info("Debug: created generation %s", generation_id)

        # Шаг 1: прямой вызов VseGPT generate_image.
        prompt = get_style_prompt(StyleId("loft"))
        vsegpt_data = await vsegpt_client.generate_image(image_url, prompt)
        vsegpt_info = {
            "has_data": bool(vsegpt_data.get("data")),
            "images_count": len(vsegpt_data.get("data", [])),
            "first_keys": (
                list(vsegpt_data["data"][0].keys())
                if vsegpt_data.get("data")
                else []
            ),
            "b64_len": (
                len(vsegpt_data["data"][0].get("b64_json", ""))
                if vsegpt_data.get("data")
                else 0
            ),
        }
        return {"step": "vsegpt_ok", "vsegpt": vsegpt_info}

        style = StyleId("loft")
        await _run_single_prediction(
            generation_id, None, [image_url], style
        )

        results = await supabase_admin.fetch_results(generation_id)
        gen = await supabase_admin.fetch_generation(generation_id)
        return {
            "success": gen.get("status") == "completed",
            "generation_status": gen.get("status"),
            "results": [
                {
                    "status": r.get("status"),
                    "error": r.get("error"),
                    "path": r.get("result_image_path"),
                }
                for r in results
            ],
        }
    except Exception as exc:
        logger.exception("Debug full generate failed")
        return {
            "success": False,
            "error": str(exc)[:500],
            "error_type": type(exc).__name__,
        }

    try:
        data = await vsegpt_client.generate_image(
            image_url, "Modern loft interior design"
        )
        images = data.get("data", [])
        return {
            "success": True,
            "model": vsegpt_client._get_model(),
            "images_count": len(images),
            "first_keys": list(images[0].keys()) if images else [],
            "response_preview": str(data)[:500],
        }
    except Exception as exc:
        return {
            "success": False,
            "model": vsegpt_client._get_model(),
            "error": str(exc)[:500],
            "error_type": type(exc).__name__,
        }
