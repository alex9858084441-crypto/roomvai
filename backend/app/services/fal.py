"""Клиент fal.ai API. Ключ — ТОЛЬКО на бэкенде.

fal.ai: https://www.fal.ai
Преимущества над Replicate:
- $1 бесплатных кредитов при регистрации
- Быстрее (cold start ~3 сек vs ~30 сек у Replicate)
- Синхронный режим: результат в одном запросе, без webhook'ов

Поток:
1. POST /generate → fal.run() → результат сразу → загрузка в Supabase Storage
2. GET /generations/{id} → статус + подписанные URL
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

FAL_API_BASE = "https://fal.run"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Key {settings.fal_api_key}",
        "Content-Type": "application/json",
    }


async def generate_image(
    image_url: str,
    prompt: str,
) -> dict[str, Any]:
    """Запускает img2img генерацию на fal.ai.

    Использует flux/dev/image-to-image — сохраняет структуру фото,
    применяет стиль из промпта.

    Args:
        image_url: URL исходного фото (доступный для fal.ai).
        prompt: промпт стиля.

    Returns:
        Ответ fal.ai с URL результата.
        {"images": [{"url": "https://..."}], "timings": {...}}
    """
    if not settings.fal_api_key:
        raise RuntimeError("FAL_API_KEY не задан на бэкенде")

    payload: dict[str, Any] = {
        "image_url": image_url,
        "prompt": prompt,
        "negative_prompt": (
            "low quality, blurry, distorted geometry, deformed walls, "
            "extra doors, watermark, text"
        ),
        "num_inference_steps": settings.ml_num_inference_steps,
        "guidance_scale": 7.5,
        "strength": settings.ml_strength,
    }

    endpoint = settings.fal_model_endpoint
    url = f"{FAL_API_BASE}/{endpoint}"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload, headers=_headers())
        if not resp.is_success:
            logger.error(
                "fal.ai API error %s: %s\nURL: %s",
                resp.status_code,
                resp.text[:500],
                url,
            )
            raise RuntimeError(
                f"fal.ai {resp.status_code}: {resp.text[:300]}"
            )
        return resp.json()


def estimate_cost(data: dict[str, Any]) -> float:
    """Оценка стоимости генерации в USD.

    fal.ai возвращает timings.total.
    Тариф для flux/dev: ~$0.025/сек compute.
    """
    timings = data.get("timings", {}) or {}
    compute_time = timings.get("total", 0) or 0
    rate_per_second = 0.025
    return round(compute_time * rate_per_second, 4)
