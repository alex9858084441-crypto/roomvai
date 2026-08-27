"""Серверный клиент Supabase (service_role).

Используется бэкендом для:
- создания/обновления записей generations и generation_results
- загрузки сгенерированных изображений в Storage
- проверки квот и статуса подписки

Ключ service_role — только на бэкенде, обходит RLS.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _headers() -> dict[str, str]:
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }


def _base() -> str:
    return settings.supabase_url.rstrip("/")


async def create_generation(
    user_id: str | None,
    anonymous_id: str | None,
    source_image_path: str,
    room_type: str,
) -> dict[str, Any]:
    """Создаёт запись в таблице generations, возвращает её с id."""
    url = f"{_base()}/rest/v1/generations"
    payload = {
        "user_id": user_id,
        "anonymous_id": anonymous_id,
        "source_image_path": source_image_path,
        "room_type": room_type,
        "status": "processing",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            url, json=payload, headers={**_headers(), "Prefer": "return=representation"}
        )
        resp.raise_for_status()
        data = resp.json()
        return data[0] if isinstance(data, list) else data


async def create_result(
    generation_id: str,
    style: str,
    replicate_prediction_id: str,
) -> str:
    """Создаёт запись в generation_results, возвращает её id."""
    url = f"{_base()}/rest/v1/generation_results"
    payload = {
        "generation_id": generation_id,
        "style": style,
        "status": "processing",
        "replicate_prediction_id": replicate_prediction_id,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            url, json=payload, headers={**_headers(), "Prefer": "return=representation"}
        )
        resp.raise_for_status()
        data = resp.json()
        result = data[0] if isinstance(data, list) else data
        return result["id"]


async def update_result(
    result_id: str,
    *,
    status: str,
    result_image_path: str | None = None,
    cost_usd: float | None = None,
    error: str | None = None,
) -> None:
    """Обновляет статус и результат генерации."""
    url = f"{_base()}/rest/v1/generation_results?id=eq.{result_id}"
    payload: dict[str, Any] = {"status": status}
    if result_image_path:
        payload["result_image_path"] = result_image_path
    if cost_usd is not None:
        payload["cost_usd"] = cost_usd
    if error:
        payload["error"] = error

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.patch(url, json=payload, headers=_headers())
        resp.raise_for_status()


async def update_generation_status(generation_id: str, status: str) -> None:
    """Обновляет статус родительской генерации."""
    url = f"{_base()}/rest/v1/generations?id=eq.{generation_id}"
    payload: dict[str, Any] = {"status": status}
    if status in ("completed", "failed"):
        payload["completed_at"] = "now()"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.patch(url, json=payload, headers=_headers())
        resp.raise_for_status()


async def fetch_generation(generation_id: str) -> dict[str, Any] | None:
    """Возвращает генерацию с результатами."""
    url = f"{_base()}/rest/v1/generations?id=eq.{generation_id}"
    headers = {
        **_headers(),
        "Accept": "application/vnd.pgrst.object+json",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 406:
            return None
        resp.raise_for_status()
        return resp.json()


async def fetch_results(generation_id: str) -> list[dict[str, Any]]:
    """Возвращает результаты генерации по стилям."""
    url = f"{_base()}/rest/v1/generation_results?generation_id=eq.{generation_id}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers=_headers())
        resp.raise_for_status()
        return resp.json()


async def upload_result_image(
    image_bytes: bytes,
    user_id: str | None,
    filename: str,
) -> str:
    """Загружает сгенерированное изображение в Storage, возвращает путь."""
    bucket = settings.result_images_bucket
    folder = user_id or "anonymous"
    path = f"{folder}/{filename}"
    url = f"{_base()}/storage/v1/object/{bucket}/{path}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            content=image_bytes,
            headers={**_headers(), "Content-Type": "image/png", "x-upsert": "true"},
        )
        resp.raise_for_status()
    return path


async def create_signed_url(bucket: str, path: str) -> str:
    """Создаёт подписанный URL для приватного файла."""
    url = f"{_base()}/storage/v1/object/create-signed-url/{bucket}/{path}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json={"expiresIn": 3600}, headers=_headers())
        resp.raise_for_status()
        return resp.json()["signedURL"]


async def check_quota(user_id: str | None) -> bool:
    """Проверяет, есть ли у пользователя бесплатные генерации (раздел 6).

    Free: 1 без регистрации, +1 после регистрации, затем — paywall.
    Платные (premium) — безлимит.
    """
    # Премиум-проверка.
    if user_id:
        sub_url = f"{_base()}/rest/v1/subscriptions?user_id=eq.{user_id}&status=eq.active"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(sub_url, headers=_headers())
            resp.raise_for_status()
            if resp.json():
                return True  # активная подписка — безлимит

        # Подсчёт использованных бесплатных генераций.
        gens_url = f"{_base()}/rest/v1/generations?user_id=eq.{user_id}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(gens_url, headers=_headers())
            resp.raise_for_status()
            used = len(resp.json())
        return used < (
            settings.free_generations_no_auth + settings.free_generations_with_auth
        )

    # Аноним: только 1 бесплатная.
    return True  # учёт анонимных — по anonymous_id, упрощённо на этапе 7
