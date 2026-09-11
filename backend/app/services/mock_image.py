"""Генерация placeholder-изображений для mock-режима (Pillow).

Вместо обращения к Replicate создаёт простое изображение с названием стиля
и базовым цветом — достаточно для тестирования UI/UX флоу.
"""

from __future__ import annotations

import io
import logging

from PIL import Image, ImageDraw, ImageFont

from app.config import settings

logger = logging.getLogger(__name__)

# Палитра по стилям (RGB).
_STYLE_COLORS: dict[str, tuple[int, int, int]] = {
    "scandinavian": (240, 236, 228),
    "loft": (130, 110, 95),
    "minimalism": (245, 245, 245),
    "classic": (180, 160, 130),
    "japandi": (200, 190, 175),
    "industrial": (110, 105, 100),
    "boho": (210, 175, 140),
    "art_deco": (90, 75, 110),
}

_STYLE_LABELS_RU: dict[str, str] = {
    "scandinavian": "Скандинавский",
    "loft": "Лофт",
    "minimalism": "Минимализм",
    "classic": "Классика",
    "japandi": "Японский минимализм",
    "industrial": "Индастриал",
    "boho": "Бохо",
    "art_deco": "Ар-деко",
}


def generate_placeholder(style: str, size: int | None = None) -> bytes:
    """Создаёт PNG-изображение с цветом и названием стиля.

    Args:
        style: идентификатор стиля (loft, minimalism, ...).
        size: сторона квадрата в пикселях (по умолчанию settings.ml_image_size).

    Returns:
        Байты PNG-изображения.
    """
    s = size or settings.ml_image_size
    bg = _STYLE_COLORS.get(style, (200, 200, 200))
    label = _STYLE_LABELS_RU.get(style, style)

    img = Image.new("RGB", (s, s), bg)
    draw = ImageDraw.Draw(img)

    # Полоса-акцент сверху.
    accent = tuple(min(c + 40, 255) for c in bg)
    draw.rectangle([(0, 0), (s, s // 6)], fill=accent)

    # Текст с названием стиля (по центру).
    font_size = max(16, s // 16)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size
        )
    except (OSError, IOError):
        font = ImageFont.load_default()

    # Вычисление позиции текста по центру.
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (s - text_w) // 2
    y = (s - text_h) // 2

    # Контрастный цвет текста.
    luminance = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]
    text_color = (40, 40, 40) if luminance > 140 else (245, 245, 245)
    draw.text((x, y), label, fill=text_color, font=font)

    # Подпись «MOCK» в углу.
    try:
        small_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size // 2
        )
    except (OSError, IOError):
        small_font = ImageFont.load_default()
    draw.text(
        (10, s - font_size // 2 - 10),
        "MOCK",
        fill=text_color,
        font=small_font,
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    logger.info("Сгенерировано mock-изображение для стиля %s", style)
    return buf.getvalue()
