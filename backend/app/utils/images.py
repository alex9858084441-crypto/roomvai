"""Утилиты для работы с изображениями: сохранение, плейсхолдеры, URL-построение."""

from __future__ import annotations

from pathlib import Path

from app.config import settings
from app.schemas import StyleId


def save_uploaded_image(data: bytes, suffix: str = ".jpg") -> Path:
    """Сохраняет байты загруженного изображения и возвращает путь."""
    import uuid

    filename = f"{uuid.uuid4().hex}{suffix}"
    path = settings.uploads_dir / filename
    path.write_bytes(data)
    return path


def save_placeholder_image(style: StyleId, out_path: Path) -> None:
    """Создаёт PNG-плейсхолдер с подписью стиля (mock-режим генерации)."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        # Если Pillow нет — пишем минимальный файл-маркер.
        out_path.write_bytes(b"placeholder")
        return

    img = Image.new("RGB", (512, 512), color=_style_color(style))
    draw = ImageDraw.Draw(img)
    label = f"{style.value}\n(mock preview)"
    try:
        font = ImageFont.load_default(size=28)
    except TypeError:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(
        ((512 - text_w) / 2, (512 - text_h) / 2),
        label,
        fill=(255, 255, 255),
        font=font,
        align="center",
    )
    img.save(out_path, format="PNG")


def build_image_url(filename: str) -> str:
    """Формирует относительный URL к файлу в output-директории."""
    return f"/output/{filename}"


def _style_color(style: StyleId) -> tuple[int, int, int]:
    """Базовый цвет плейсхолдера для каждого стиля."""
    colors = {
        StyleId.scandinavian: (240, 240, 235),
        StyleId.loft: (120, 90, 80),
        StyleId.minimalism: (225, 225, 225),
        StyleId.classic: (140, 110, 90),
        StyleId.japandi: (180, 170, 150),
        StyleId.industrial: (90, 90, 95),
        StyleId.boho: (180, 140, 110),
        StyleId.art_deco: (60, 50, 70),
    }
    return colors.get(style, (200, 200, 200))
