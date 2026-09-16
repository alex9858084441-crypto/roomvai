"""Клиент VseGPT.ru API. Ключ — ТОЛЬКО на бэкенде.

VseGPT.ru: https://vsegpt.ru
Прокси к моделям генерации изображений (FLUX, Google, Recraft и др.).
Принимает российские карты и СБП.

API совместим с OpenAI Images API:
- POST /v1/images/edit — img2img (редактирование изображения по промпту)
- Авторизация: Bearer <ключ>
- multipart/form-data: image (файл), prompt, model, n, response_format
- Возвращает {"data": [{"url": "..."}]} или {"data": [{"b64_json": "..."}]}

Поток:
1. POST /generate → vsegpt.generate_image() → скачивает исходное фото
   → отправляет в VseGPT → результат → загрузка в Supabase Storage
2. GET /generations/{id} → статус + подписанные URL
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VSEGPT_API_BASE = "https://api.vsegpt.ru/v1"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.vsegpt_api_key}",
    }


async def generate_image(
    image_url: str,
    prompt: str,
) -> dict[str, Any]:
    """Запускает img2img генерацию на VseGPT.ru.

    Скачивает исходное фото по URL, отправляет в VseGPT через
    /v1/images/edit (multipart form data, OpenAI-совместимый формат).

    Args:
        image_url: URL исходного фото (доступный для бэкенда).
        prompt: промпт стиля.

    Returns:
        Ответ VseGPT с URL или base64 результата.
        {"data": [{"url": "https://..."}]} или {"data": [{"b64_json": "..."}]}
    """
    if not settings.vsegpt_api_key:
        raise RuntimeError("VSEGPT_API_KEY не задан на бэкенде")

    # 1. Скачиваем исходное изображение.
    logger.info("Скачиваю исходное фото для VseGPT: %s", image_url[:100])
    async with httpx.AsyncClient(timeout=30) as client:
        img_resp = await client.get(image_url)
        img_resp.raise_for_status()
        image_bytes = img_resp.content

    content_type = img_resp.headers.get("content-type", "image/jpeg")
    ext = "png" if "png" in content_type else "jpg"
    filename = f"source.{ext}"

    logger.info(
        "Фото скачано (%d байт), отправляю в VseGPT model=%s",
        len(image_bytes),
        settings.vsegpt_model,
    )

    # 2. Отправляем в VseGPT через /v1/images/edit (multipart form data).
    url = f"{VSEGPT_API_BASE}/images/edit"

    files = {"image": (filename, image_bytes, content_type)}
    data = {
        "model": settings.vsegpt_model,
        "prompt": prompt,
        "n": "1",
        "response_format": "url",
    }

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(url, files=files, data=data, headers=_headers())
        if not resp.is_success:
            logger.error(
                "VseGPT API error %s: %s\nURL: %s\nModel: %s",
                resp.status_code,
                resp.text[:500],
                url,
                settings.vsegpt_model,
            )
            raise RuntimeError(
                f"VseGPT {resp.status_code}: {resp.text[:300]}"
            )
        result = resp.json()

    logger.info("VseGPT ответил успешно, обрабатываю результат")

    # Нормализуем ответ: если вернулся b64_json — декодируем в data URL.
    images = result.get("data", [])
    if images and "b64_json" in images[0] and "url" not in images[0]:
        b64 = images[0]["b64_json"]
        images[0]["url"] = f"data:image/png;base64,{b64}"
        images[0]["b64_json"] = b64

    return result


def get_image_bytes(data: dict[str, Any]) -> bytes | None:
    """Извлекает байты изображения из ответа VseGPT.

    Если ответ содержит b64_json — декодирует напрямую.
    Возвращает None, если нужно скачивать по URL.
    """
    images = data.get("data", [])
    if not images:
        return None
    if "b64_json" in images[0]:
        try:
            return base64.b64decode(images[0]["b64_json"])
        except Exception:
            logger.exception("Не удалось декодировать b64_json из VseGPT")
    return None


def estimate_cost(data: dict[str, Any]) -> float:
    """Оценка стоимости генерации в USD.

    VseGPT.ru: FLUX Kontext Pro img2img ~7.5₽/image ≈ $0.08.
    """
    return 0.08
