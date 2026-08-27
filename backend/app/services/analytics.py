"""Серверная аналитика (PostHog) для событий, происходящих на бэкенде.

Раздел 7: воронка должна фиксировать ВСЕ события, включая server-side:
- subscription_cancelled (из RevenueCat webhook)
- subscription_expired

Клиент не видит эти события (пользователь мог закрыть приложение),
поэтому их должен отправлять бэкенд.
"""

from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

POSTHOG_HOST = "https://app.posthog.com"
POSTHOG_CAPTURE_URL = f"{POSTHOG_HOST}/capture/"


async def capture_server_event(
    distinct_id: str,
    event: str,
    properties: dict | None = None,
) -> None:
    """Отправляет событие в PostHog от лица пользователя.

    Используется для server-side событий (раздел 7: полная воронка).
    Молча игнорирует ошибки — аналитика не должна влиять на бизнес-логику.
    """
    if not settings.posthog_key:
        return
    payload = {
        "api_key": settings.posthog_key,
        "event": event,
        "distinct_id": distinct_id,
        "properties": properties or {},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(POSTHOG_CAPTURE_URL, json=payload)
            resp.raise_for_status()
    except Exception:
        logger.debug("PostHog server event failed: %s", event, exc_info=True)
