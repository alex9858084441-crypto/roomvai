"""Клиент Together AI API. Ключ — ТОЛЬКО на бэкенде.

Together AI: https://www.together.ai
Преимущества:
- $5 бесплатных кредитов при регистрации
- Stable Diffusion XL img2img
- Простой REST API (формат похож на OpenAI)

Поток:
1. POST /generate → together.generate_image() → результат сразу → загрузка в Supabase Storage
2. GET /generations/{id} → статус + подписанные URL
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TOGETHER_API_BASE = "https://api.together.xyz/v1"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.together_api_key}",
        "Content-Type": "application/json",
    }


async def generate_image(
    image_url: str,
    prompt: str,
) -> dict[str, Any]:
    """Запускает img2img генерацию на Together AI.

    Args:
        image_url: URL исходного фото (доступный для Together AI).
        prompt: промпт стиля.

    Returns:
        Ответ Together AI с URL результата.
        {"data": [{"url": "https://..."}]}
    """
    if not settings.together_api_key:
        raise RuntimeError("TOGETHER_API_KEY не задан на бэкенде")

    payload: dict[str, Any] = {
        "model": settings.together_model,
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
    }

    url = f"{TOGETHER_API_BASE}/images/generations"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload, headers=_headers())
        if not resp.is_success:
            logger.error(
                "Together AI API error %s: %s\nURL: %s",
                resp.status_code,
                resp.text[:500],
                url,
            )
            raise RuntimeError(
                f"Together AI {resp.status_code}: {resp.text[:300]}"
            )
        return resp.json()


def estimate_cost(data: dict[str, Any]) -> float:
    """Оценка стоимости генерации в USD.

    Together AI: SDXL img2img ~$0.018 за изображение.
    """
    return 0.018
