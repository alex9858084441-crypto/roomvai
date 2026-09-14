"""Конфигурация приложения. Все настройки читаются из переменных окружения."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


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

    # --- Supabase (service_role — ТОЛЬКО на бэкенде, никогда на клиенте) ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # --- Replicate API (ключ — ТОЛЬКО на бэкенде, раздел 10) ---
    replicate_api_token: str = ""
    # Модель ControlNet + Stable Diffusion для интерьеров.
    # SDXL img2img — сохраняет структуру фото и применяет стиль.
    replicate_model: str = "black-forest-labs/flux-schnell"
    replicate_model_version: str = ""

    # --- Хранилище ---
    source_images_bucket: str = "source-images"
    result_images_bucket: str = "result-images"

    # --- ML / генерация (локальный режим sd, для совместимости) ---
    ml_mode: str = "mock"
    ml_model_id: str = "black-forest-labs/flux-schnell"
    ml_device: str = "cpu"
    ml_num_inference_steps: int = 30
    ml_strength: float = 0.75
    ml_control_type: str = "depth"
    ml_image_size: int = 512
    ml_max_concurrency: int = 1

    # --- Лимиты и монетизация ---
    max_upload_size_mb: int = 20
    allowed_content_types: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")
    free_generations_no_auth: int = 1
    free_generations_with_auth: int = 1
    max_image_dimension: int = 1536

    # --- Webhook ---
    # URL, на который Replicate вернёт результат (должен быть публично доступен).
    webhook_base_url: str = ""

    # --- Аналитика (server-side PostHog для событий из webhook'ов) ---
    posthog_key: str = ""

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
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        replicate_api_token=os.getenv("REPLICATE_API_TOKEN", ""),
       replicate_model=os.getenv("REPLICATE_MODEL", "black-forest-labs/flux-schnell"),
       replicate_model_version=os.getenv("REPLICATE_MODEL_VERSION", ""),
        source_images_bucket=os.getenv("SOURCE_IMAGES_BUCKET", "source-images"),
        result_images_bucket=os.getenv("RESULT_IMAGES_BUCKET", "result-images"),
        ml_mode=os.getenv("ML_MODE", "mock"),
        ml_model_id=os.getenv("ML_MODEL_ID", "black-forest-labs/flux-schnell"),
        ml_device=os.getenv("ML_DEVICE", "cpu"),
        ml_num_inference_steps=int(os.getenv("ML_NUM_INFERENCE_STEPS", "30")),
        ml_strength=float(os.getenv("ML_STRENGTH", "0.75")),
        ml_control_type=os.getenv("ML_CONTROL_TYPE", "depth"),
        ml_image_size=int(os.getenv("ML_IMAGE_SIZE", "512")),
        ml_max_concurrency=int(os.getenv("ML_MAX_CONCURRENCY", "1")),
        max_upload_size_mb=int(os.getenv("MAX_UPLOAD_SIZE_MB", "20")),
        free_generations_no_auth=int(os.getenv("FREE_GENERATIONS_NO_AUTH", "1")),
        free_generations_with_auth=int(os.getenv("FREE_GENERATIONS_WITH_AUTH", "1")),
        max_image_dimension=int(os.getenv("MAX_IMAGE_DIMENSION", "1536")),
        webhook_base_url=os.getenv("WEBHOOK_BASE_URL", ""),
        posthog_key=os.getenv("POSTHOG_KEY", ""),
    )


settings = _get_settings()


def ensure_dirs() -> None:
    """Создаёт рабочие директории, если их ещё нет."""
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
