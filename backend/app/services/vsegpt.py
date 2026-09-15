"""Клиент VseGPT.ru API. Ключ — ТОЛЬКО на бэкенде.

VseGPT.ru: https://vsegpt.ru
Прокси к моделям генерации изображений (SDXL и др.).
Принимает российские карты и СБП.

API совместим с OpenAI Images API:
- POST /v1/images/generations
- Авторизация: Bearer <ключ>
- Возвращает {"data": [{"url": "..."}]} или {"data": [{"b64_json": "..."}]}

Поток:
1. POST /generate → vsegpt.generate_image() → результат сразу → загрузка в Supabase Storage
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
        "Content-Type": "application/json",
    }


async def generate_image(
    image_url: str,
    prompt: str,
) -> dict[str, Any]:
    """Запускает img2img генерацию на VseGPT.ru.

    Args:
        image_url: URL исходного фото (доступный для VseGPT.ru).
        prompt: промпт стиля.

    Returns:
        Ответ VseGPT с URL или base64 результата.
        {"data": [{"url": "https://..."}]} или {"data": [{"b64_json": "..."}]}
    """
    if not settings.vsegpt_api_key:
        raise RuntimeError("VSEGPT_API_KEY не задан на бэкенде")

    payload: dict[str, Any] = {
        "model": settings.vsegpt_model,
        "prompt": prompt,
        "negative_prompt": (
            "low quality, blurry, distorted geometry, deformed walls, "
            "extra doors, watermark, text"
        ),
        "mode": "image-to-image",
        "image": image_url,
        "strength": settings.ml_strength,
        "steps": settings.ml_num_inference_steps,
        "cfg_scale": 7.5,
        "n": 1,
        "response_format": "url",
    }

    url = f"{VSEGPT_API_BASE}/images/generations"

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(url, json=payload, headers=_headers())
        if not resp.is_success:
            logger.error(
                "VseGPT API error %s: %s\nURL: %s",
                resp.status_code,
                resp.text[:500],
                url,
            )
            raise RuntimeError(
                f"VseGPT {resp.status_code}: {resp.text[:300]}"
            )
        data = resp.json()

    # Нормализуем ответ: если вернулся b64_json — декодируем в data URL.
    images = data.get("data", [])
    if images and "b64_json" in images[0] and "url" not in images[0]:
        b64 = images[0]["b64_json"]
        images[0]["url"] = f"data:image/png;base64,{b64}"
        images[0]["b64_json"] = b64

    return data


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

    VseGPT.ru: SDXL img2img ~2-5₽/image ≈ $0.03-0.05.
    """
    return 0.04
