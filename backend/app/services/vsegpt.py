"""Клиент VseGPT.ru API. Ключ — ТОЛЬКО на бэкенде.

VseGPT.ru: https://vsegpt.ru
Прокси к моделям генерации изображений (FLUX, Google, Recraft и др.).

API (OpenAI-совместимый, но с расширениями для img2img):
- POST /v1/images/generations — единственный доступный endpoint для картинок
- Авторизация: Bearer <ключ>
- JSON body: model, prompt, image (URL), mode, n, response_format
- img2img модели имеют префикс "img2img-"
- Возвращает {"data": [{"url": "..."}]} или {"data": [{"b64_json": "..."}]}
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

VSEGPT_API_BASE = "https://api.vsegpt.ru/v1"

# Модель по умолчанию — img2img FLUX Kontext Pro (7.5₽/image).
# НЕ зависит от VSEGPT_MODEL env var, т.к. на Render может быть
# устаревшее значение из Dashboard.
DEFAULT_VSEGPT_MODEL = "img2img-flux/kontext-pro-edit"


def _get_model() -> str:
    """Возвращает модель для генерации.

    Приоритет: VSEGPT_MODEL env var (если валидная img2img модель),
    затем DEFAULT_VSEGPT_MODEL.
    """
    env_model = settings.vsegpt_model
    if env_model and env_model.startswith("img2img-"):
        return env_model
    if env_model and env_model != "stabilityai/stable-diffusion-xl-base-1.0":
        logger.warning(
            "VSEGPT_MODEL=%s не является img2img моделью, использую %s",
            env_model,
            DEFAULT_VSEGPT_MODEL,
        )
    return DEFAULT_VSEGPT_MODEL


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

    Использует /v1/images/generations с image URL в JSON body
    (VseGPT-расширение OpenAI API для img2img моделей).

    Args:
        image_url: URL исходного фото (доступный для VseGPT).
        prompt: промпт стиля.

    Returns:
        Ответ VseGPT с URL или base64 результата.
    """
    if not settings.vsegpt_api_key:
        raise RuntimeError("VSEGPT_API_KEY не задан на бэкенде")

    model = _get_model()
    logger.info(
        "VseGPT: model=%s, image_url=%s..., prompt=%s...",
        model,
        image_url[:80],
        prompt[:50],
    )

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "image": image_url,
        "mode": "image-to-image",
        "n": 1,
        "response_format": "url",
    }

    url = f"{VSEGPT_API_BASE}/images/generations"

    async with httpx.AsyncClient(timeout=180) as client:
        resp = await client.post(url, json=payload, headers=_headers())
        if not resp.is_success:
            logger.error(
                "VseGPT API error %s: %s\nURL: %s\nModel: %s",
                resp.status_code,
                resp.text[:500],
                url,
                model,
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
