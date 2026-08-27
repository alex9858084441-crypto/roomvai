"""Каталог дизайнерских стилей с промптами для генерации."""

from __future__ import annotations

from app.schemas import StyleId, StyleInfo

# Промпты подобраны для Stable Diffusion img2img.
# Каждый описывает отделку, мебель и атмосферу стиля.
STYLE_PROMPTS: dict[StyleId, str] = {
    StyleId.scandinavian: (
        "scandinavian interior design, white walls, light oak wood floor, "
        "minimalist furniture, cozy textiles, natural light, plants, "
        "hygge atmosphere, high quality, photorealistic"
    ),
    StyleId.loft: (
        "industrial loft interior, exposed brick walls, concrete floor, "
        "metal pipes, large windows, leather sofa, vintage furniture, "
        "warm Edison lighting, photorealistic"
    ),
    StyleId.minimalism: (
        "minimalist interior, clean lines, monochrome palette, hidden storage, "
        "simple furniture, lots of negative space, natural light, "
        "zen atmosphere, photorealistic"
    ),
    StyleId.classic: (
        "classic interior design, elegant moldings, parquet floor, "
        "antique furniture, rich fabrics, chandelier, warm tones, "
        "luxurious atmosphere, photorealistic"
    ),
    StyleId.japandi: (
        "japandi interior, fusion of japanese and scandinavian style, "
        "low wooden furniture, neutral earthy tones, paper lanterns, "
        "tatami elements, calm and serene, photorealistic"
    ),
    StyleId.industrial: (
        "industrial interior, raw concrete walls, steel beams, "
        "factory windows, reclaimed wood, metal furniture, "
        "moody lighting, photorealistic"
    ),
    StyleId.boho: (
        "bohemian interior, eclectic decor, rattan furniture, "
        "macrame, layered rugs, warm earthy colors, lots of plants, "
        "cozy and artistic, photorealistic"
    ),
    StyleId.art_deco: (
        "art deco interior, geometric patterns, velvet furniture, "
        "gold accents, marble floor, bold contrast, luxurious and glamorous, "
        "photorealistic"
    ),
}

# Описания для клиента.
STYLE_INFOS: list[StyleInfo] = [
    StyleInfo(
        id=StyleId.scandinavian,
        name="Скандинавский",
        description="Светлые тона, натуральное дерево, уют и воздух.",
    ),
    StyleInfo(
        id=StyleId.loft,
        name="Лофт",
        description="Кирпич, бетон, металл и большие окна.",
    ),
    StyleInfo(
        id=StyleId.minimalism,
        name="Минимализм",
        description="Чистые линии, ничего лишнего, много пространства.",
    ),
    StyleInfo(
        id=StyleId.classic,
        name="Классика",
        description="Лепнина, паркет, благородные ткани и люстры.",
    ),
    StyleInfo(
        id=StyleId.japandi,
        name="Японский минимализм",
        description="Сплав японской и скандинавской эстетики, спокойствие.",
    ),
    StyleInfo(
        id=StyleId.industrial,
        name="Индастриал",
        description="Сырой бетон, сталь, переработанное дерево.",
    ),
    StyleInfo(
        id=StyleId.boho,
        name="Бохо",
        description="Эклектика, ротанг, макраме и много растений.",
    ),
    StyleInfo(
        id=StyleId.art_deco,
        name="Ар-деко",
        description="Геометрия, бархат, золотые акценты и мрамор.",
    ),
]


def get_style_prompt(style_id: StyleId) -> str:
    """Возвращает промпт для генерации по идентификатору стиля."""
    return STYLE_PROMPTS[style_id]


def get_style_info(style_id: StyleId) -> StyleInfo:
    """Возвращает описание стиля по его идентификатору."""
    return next(info for info in STYLE_INFOS if info.id == style_id)
