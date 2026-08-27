"""Webhook RevenueCat: синхронизация статуса подписки в БД.

Раздел 6: серверная валидация статуса (не доверять только клиентской проверке).
RevenueCat шлёт событие при изменении подписки — мы обновляем таблицу subscriptions.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services import supabase_admin
from app.services.analytics import capture_server_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/revenuecat", tags=["revenuecat"])


class RCEvent(BaseModel):
    type: str
    app_user_id: str
    expiration_at: str | None = None
    entitlement_id: str | None = None
    product_id: str | None = None
    store: str | None = None


class RCWebhookPayload(BaseModel):
    api_key: str | None = None
    event: RCEvent


@router.post("")
async def revenuecat_webhook(
    payload: RCWebhookPayload,
    request: Request,
) -> JSONResponse:
    """Синхронизирует статус подписки из RevenueCat в БД.

    События:
    - INITIAL_PURCHASE / RENEWAL → status=active
    - EXPIRATION / CANCELLATION → status=expired/cancelled
    """
    event = payload.event
    user_id = event.app_user_id

    if not user_id:
        raise HTTPException(status_code=400, detail="app_user_id обязателен")

    # Определение нового статуса.
    etype = event.type.upper()
    if etype in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"):
        new_status = "active"
    elif etype in ("EXPIRATION", "BILLING_RETRY"):
        new_status = "expired"
    elif "CANCEL" in etype:
        new_status = "cancelled"
    else:
        return JSONResponse(status_code=200, content={"status": "ignored"})

    # Определение плана по product_id.
    plan = None
    if event.product_id:
        pid = event.product_id.lower()
        if "year" in pid or "annual" in pid:
            plan = "yearly"
        elif "month" in pid:
            plan = "monthly"
        elif "week" in pid:
            plan = "weekly"

    # Upsert в таблицу subscriptions.
    await _upsert_subscription(
        user_id=user_id,
        status=new_status,
        plan=plan,
        expires_at=event.expiration_at,
    )

    # Server-side аналитика (раздел 7: полная воронка).
    if new_status == "cancelled":
        await capture_server_event(
            user_id, "subscription_cancelled", {"plan": plan}
        )
    elif new_status == "expired":
        await capture_server_event(user_id, "subscription_expired", {"plan": plan})

    logger.info("RevenueCat: user=%s status=%s plan=%s", user_id, new_status, plan)
    return JSONResponse(status_code=200, content={"status": "ok"})


async def _upsert_subscription(
    user_id: str,
    status: str,
    plan: str | None,
    expires_at: str | None,
) -> None:
    """Создаёт или обновляет запись подписки (upsert)."""
    import httpx
    from app.config import settings

    url = f"{settings.supabase_url}/rest/v1/subscriptions"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    payload = {
        "user_id": user_id,
        "revenuecat_user_id": user_id,
        "entitlement": "premium",
        "status": status,
        "plan": plan,
        "expires_at": expires_at,
        "updated_at": "now()",
    }
    # upsert по user_id (unique constraint).
    headers["Prefer"] = "return=representation,resolution=merge-duplicates"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
