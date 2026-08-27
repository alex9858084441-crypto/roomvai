"""Препроцессинг исходного фото в контрольный сигнал для ControlNet.

Поддерживаемые типы контроля:
- "depth"  — карта глубины (MiDaS). Хорошо сохраняет объём и геометрию помещения.
- "canny"  — границы Canny. Жёстко фиксирует контуры стен, проёмов, мебели.
- "seg"    — сегментация (однотипные блоки). Менее детально, но устойчиво.

Тяжёлые модели загружаются лениво, чтобы mock-режим работал без зависимостей.
"""

from __future__ import annotations

import logging
from typing import Literal

from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

ControlType = Literal["depth", "canny", "seg"]

# Кэш загруженных препроцессоров (грузить на каждый запрос слишком дорого).
_depth_processor = None
_canny_processor = None
_seg_processor = None


def _resolve_control_type() -> ControlType:
    """Возвращает тип контроля из настроек с проверкой."""
    value = settings.ml_control_type
    if value not in ("depth", "canny", "seg"):
        logger.warning("Неизвестный ML_CONTROL_TYPE=%s, fallback на 'depth'", value)
        return "depth"
    return value  # type: ignore[return-value]


def _load_depth_processor():
    """Загружает модель оценки глубины (MiDaS через transformers)."""
    global _depth_processor
    if _depth_processor is not None:
        return _depth_processor

    import torch  # локальный импорт
    from transformers import pipeline as hf_pipeline  # локальный импорт

    logger.info("Загрузка модели глубины (MiDaS)...")
    _depth_processor = hf_pipeline(
        task="depth-estimation",
        model="Intel/dpt-hybrid-midas",
        device=settings.ml_device,
    )
    return _depth_processor


def _compute_depth(image: Image.Image) -> Image.Image:
    """Карта глубины через MiDaS."""
    processor = _load_depth_processor()
    result = processor(image)
    depth = result["depth"] if isinstance(result, dict) else result.depth
    # Нормализуем в одноканальное RGB-изображение для ControlNet.
    if depth.mode != "RGB":
        depth = depth.convert("RGB")
    return depth


def _compute_canny(image: Image.Image) -> Image.Image:
    """Границы Canny через OpenCV."""
    import cv2  # локальный импорт
    import numpy as np  # локальный импорт

    arr = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    # Параметры подобраны для интерьеров: средняя чувствительность.
    edges = cv2.Canny(gray, threshold1=50, threshold2=150)
    return Image.fromarray(cv2.cvtColor(edges, cv2.COLOR_GRAY2RGB))


def _compute_seg(image: Image.Image) -> Image.Image:
    """Сегментация через OneFormer (ADE20K)."""
    global _seg_processor
    if _seg_processor is None:
        from transformers import AutoProcessor, AutoModelForUniversalSegmentation  # локальный

        logger.info("Загрузка модели сегментации (OneFormer)...")
        processor = AutoProcessor.from_pretrained("shi-labs/oneformer_ade20k_swin_tiny")
        model = AutoModelForUniversalSegmentation.from_pretrained(
            "shi-labs/oneformer_ade20k_swin_tiny"
        ).to(settings.ml_device)
        _seg_processor = (processor, model)

    import torch  # локальный импорт

    processor, model = _seg_processor
    inputs = processor(images=image, task_inputs=["semantic"], return_tensors="pt").to(
        settings.ml_device
    )
    with torch.no_grad():
        outputs = model(**inputs)
    seg = processor.post_process_semantic_segmentation(outputs, target_sizes=[image.size[::-1]])[0]
    color_seg = processor.image_processor.post_process_semantic_segmentation(
        [seg.cpu().numpy()], format="RGB"
    )[0]
    return Image.fromarray(color_seg)


def compute_control_image(image_path: str) -> Image.Image:
    """Вычисляет контрольное изображение для ControlNet из исходного фото.

    Args:
        image_path: путь к загруженному фото помещения.

    Returns:
        PIL.Image (RGB, 512×512) — контрольный сигнал.
    """
    image = Image.open(image_path).convert("RGB").resize((512, 512))
    control_type = _resolve_control_type()

    logger.info("Вычисление контрольного сигнала: %s", control_type)
    if control_type == "depth":
        return _compute_depth(image)
    if control_type == "canny":
        return _compute_canny(image)
    return _compute_seg(image)
