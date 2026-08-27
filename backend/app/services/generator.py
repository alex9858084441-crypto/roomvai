"""Сервис генерации изображений.

Поддерживает два режима:
- "mock" — возвращает плейсхолдеры без нейросети (для разработки UI и тестов);
- "sd"   — реальная генерация через Stable Diffusion + ControlNet.

Реальный SD-путь подключается при наличии torch/diffusers и GPU/CPU.
"""

from __future__ import annotations

import asyncio
import io
import logging
from pathlib import Path
from typing import Callable, Optional

from app.config import settings
from app.schemas import GenerationResult, StyleId
from app.styles import get_style_prompt
from app.utils.images import build_image_url, save_placeholder_image

logger = logging.getLogger(__name__)

# Загружаем diffusers лениво — чтобы mock-режим работал без тяжёлых зависимостей.
_pipeline = None
_controlnet = None


def _load_pipeline():
    """Лениво загружает модель Stable Diffusion + ControlNet."""
    global _pipeline, _controlnet
    if _pipeline is not None:
        return _pipeline

    try:
        import torch  # noqa: WPS433
        from diffusers import (  # noqa: WPS433
            ControlNetModel,
            StableDiffusionControlNetPipeline,
        )
    except ImportError as exc:
        raise RuntimeError(
            "Для ML-режима 'sd' нужны пакеты torch и diffusers. "
            "Установите их или используйте ML_MODE=mock."
        ) from exc

    logger.info("Загрузка ControlNet и Stable Diffusion (может занять время)...")
    _controlnet = ControlNetModel.from_pretrained(
        "lllyasviel/sd-controlnet-depth", torch_dtype=torch.float16
    )
    _pipeline = StableDiffusionControlNetPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        controlnet=_controlnet,
        torch_dtype=torch.float16,
    ).to(settings.ml_device)
    return _pipeline


async def _generate_with_sd(
    image_path: str,
    style: StyleId,
    room_type: str,
) -> str:
    """Реальная генерация через Stable Diffusion + ControlNet."""
    import torch  # локальный импорт
    import numpy as np  # локальный импорт
    from PIL import Image  # локальный импорт

    from diffusers.utils import load_image  # локальный импорт

    pipeline = _load_pipeline()
    prompt = get_style_prompt(style)
    negative_prompt = (
        "low quality, blurry, distorted geometry, deformed walls, "
        "extra doors, watermark, text"
    )

    # Контроль по глубине — сохраняет геометрию помещения.
    control_image = load_image(image_path).resize((512, 512))
    output = pipeline(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=control_image,
        num_inference_steps=settings.ml_num_inference_steps,
        strength=settings.ml_strength,
        guidance_scale=7.5,
    ).images[0]

    out_path = settings.output_dir / f"{Path(image_path).stem}_{style.value}.png"
    output.save(out_path)
    return build_image_url(out_path.name)


async def _generate_mock(
    image_path: str,
    style: StyleId,
    room_type: str,
) -> str:
    """Генерация-заглушка: создаёт плейсхолдер с подписью стиля."""
    # Имитируем время генерации для реалистичного UX при разработке.
    await asyncio.sleep(1.5)
    out_path = settings.output_dir / f"{Path(image_path).stem}_{style.value}.png"
    save_placeholder_image(style, out_path)
    return build_image_url(out_path.name)


async def generate_style_variants(
    image_path: str,
    styles: list[StyleId],
    room_type: str,
    on_progress: Optional[Callable[[float], None]] = None,
) -> list[GenerationResult]:
    """Генерирует варианты помещения в заданных стилях.

    Args:
        image_path: путь к исходному фото помещения.
        styles: список стилей для генерации.
        room_type: тип помещения (влияет на промпт).
        on_progress: колбэк прогресса 0.0..1.0.

    Returns:
        Список результатов по каждому стилю.
    """
    results: list[GenerationResult] = []
    total = len(styles)

    for index, style in enumerate(styles):
        try:
            if settings.ml_mode == "sd":
                image_url = await _generate_with_sd(image_path, style, room_type)
            else:
                image_url = await _generate_mock(image_path, style, room_type)
            results.append(
                GenerationResult(style=style, status="completed", image_url=image_url)
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Ошибка генерации для стиля %s", style)
            results.append(GenerationResult(style=style, status="failed", error=str(exc)))

        if on_progress is not None:
            on_progress((index + 1) / total)

    return results
