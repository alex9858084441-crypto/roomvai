"""Клиент Replicate API. Ключ — ТОЛЬКО на бэкенде (раздел 10 промпта).

Поток (раздел 4):
1. POST /generate → запуск prediction с webhook → возврат generation_id
2. Replicate вызывает /webhooks/replicate по завершении
3. Backend: загрузка результата в Supabase Storage, запись cost_usd
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

REPLICATE_API_BASE = "https://api.replicate.com/v1"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.replicate_api_token}",
        "Content-Type": "application/json",
    }


def _webhook_url() -> str | None:
    """Публичный URL для callback'а Replicate."""
    if not settings.webhook_base_url:
        logger.warning("WEBHOOK_BASE_URL не задан — fallback на polling")
        return None
    return f"{settings.webhook_base_url.rstrip('/')}/webhooks/replicate"


async def create_prediction(
    image_url: str,
    prompt: str,
) -> dict[str, Any]:
    """Запускает prediction на Replicate с ControlNet.

    Args:
        image_url: URL исходного фото (доступный для Replicate).
        prompt: промпт стиля.

    Returns:
        Ответ Replicate с prediction_id и статусом.
    """
    if not settings.replicate_api_token:
        raise RuntimeError("REPLICATE_API_TOKEN не задан на бэкенде")

    payload: dict[str, Any] = {
        "input": {
            "prompt": prompt,
            "negative_prompt": (
                "low quality, blurry, distorted geometry, deformed walls, "
                "extra doors, watermark, text"
            ),
            "image": image_url,
            "prompt_strength": settings.ml_strength,
            "num_inference_steps": settings.ml_num_inference_steps,
            "guidance_scale": 7.5,
        },
    }

    webhook = _webhook_url()
    if webhook:
        payload["webhook"] = webhook
        payload["webhook_events_filter"] = ["completed"]

    # Если указана конкретная версия модели — используем её, иначе — модель.
    url = f"{REPLICATE_API_BASE}/predictions"
    if settings.replicate_model_version:
       payload["version"] = settings.replicate_model_version
    else:
        # Model-based вызов: POST /v1/models/{owner}/{model}/predictions
        url = f"{REPLICATE_API_BASE}/models/{settings.replicate_model}/predictions"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def get_prediction(prediction_id: str) -> dict[str, Any]:
    """Polling-fallback: статус prediction (раздел 10: exponential backoff)."""
    if not settings.replicate_api_token:
        raise RuntimeError("REPLICATE_API_TOKEN не задан")

    url = f"{REPLICATE_API_BASE}/predictions/{prediction_id}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()


def estimate_cost(prediction: dict[str, Any]) -> float:
    """Оценка стоимости одного prediction в USD (unit-экономика, раздел 4).

    Replicate возвращает метрики в prediction.metrics.
    Формула: время вычисления × тариф модели (упрощённо).
    """
    metrics = prediction.get("metrics", {}) or {}
    compute_time = metrics.get("predict_time", 0) or 0
    # Усреднённый тариф для SD-моделей на Replicate ~$0.0023/сек.
    rate_per_second = 0.0023
    return round(compute_time * rate_per_second, 4)
