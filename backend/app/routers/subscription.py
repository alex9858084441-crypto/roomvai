"""Эндпоинт серверной проверки статуса подписки.

Раздел 6: НЕ доверять только клиентской проверке RevenueCat.
Бэкенд читает актуальный статус из БД (синхронизированной webhook'ом).
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.services import supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(tags=["subscription"])


@router.get("/subscription")
async def get_subscription(user_id: str = Query(...)) -> dict:
    """Возвращает серверный статус подписки пользователя.

    Используется бэкендом для проверки квоты при генерации,
    и клиентом для отображения состояния paywall.
    """
    if not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Supabase не настроен")

    is_premium = await supabase_admin.check_quota(user_id)
    if not is_premium:
        return {
            "user_id": user_id,
            "status": "none",
            "entitlement": None,
            "has_free_generations": is_premium,
        }

    # Если премиум — читаем детали.
    import httpx
    url = (
        f"{settings.supabase_url}/rest/v1/subscriptions"
        f"?user_id=eq.{user_id}&status=eq.active"
    )
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if not data:
        return {
            "user_id": user_id,
            "status": "none",
            "entitlement": None,
            "has_free_generations": is_premium,
        }

    sub = data[0]
    return {
        "user_id": user_id,
        "status": sub["status"],
        "entitlement": sub["entitlement"],
        "plan": sub.get("plan"),
        "expires_at": sub.get("expires_at"),
        "has_free_generations": is_premium,
    }
