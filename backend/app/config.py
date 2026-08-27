"""Конфигурация приложения. Все настройки читаются из переменных окружения."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    """Настройки приложения, получаемые из окружения."""

    # Основные
    app_name: str = "RoomVAI API"
    debug: bool = False

    # Пути
    base_dir: Path = field(default_factory=lambda: Path(__file__).resolve().parent.parent)
    uploads_dir: Path = field(default_factory=lambda: Path("uploads"))
    output_dir: Path = field(default_factory=lambda: Path("output"))

    # CORS
    cors_origins: tuple[str, ...] = ("*",)

    # ML / генерация
    # Режим "mock" возвращает заглушки без реальной модели — удобен для разработки UI.
    ml_mode: str = "mock"
    ml_model_id: str = "lllyasviel/sd-controlnet-depth"
    ml_device: str = "cpu"
    ml_num_inference_steps: int = 30
    ml_strength: float = 0.75

    # Хранилище результатов
    max_upload_size_mb: int = 20
    allowed_content_types: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


def _get_settings() -> Settings:
    """Собирает Settings из переменных окружения с значениями по умолчанию."""

    uploads = Path(os.getenv("UPLOADS_DIR", "uploads"))
    output = Path(os.getenv("OUTPUT_DIR", "output"))
    cors = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ) or ("*",)

    return Settings(
        debug=os.getenv("DEBUG", "false").lower() == "true",
        uploads_dir=uploads,
        output_dir=output,
        cors_origins=cors,
        ml_mode=os.getenv("ML_MODE", "mock"),
        ml_model_id=os.getenv("ML_MODEL_ID", "lllyasviel/sd-controlnet-depth"),
        ml_device=os.getenv("ML_DEVICE", "cpu"),
        ml_num_inference_steps=int(os.getenv("ML_NUM_INFERENCE_STEPS", "30")),
        ml_strength=float(os.getenv("ML_STRENGTH", "0.75")),
        max_upload_size_mb=int(os.getenv("MAX_UPLOAD_SIZE_MB", "20")),
    )


settings = _get_settings()


def ensure_dirs() -> None:
    """Создаёт рабочие директории, если их ещё нет."""
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
