"""Базовые тесты API: список стилей, генерация, опрос статуса.

Тестирует mock-режим (ML_MODE=mock): генерация без Supabase и Replicate.
В prod-режиме эти тесты требуют реальных ключей и БД — пропускаются.
"""

from __future__ import annotations

import asyncio
import time

import httpx
import pytest

from app.config import settings
from app.main import app
from app.utils.rate_limit import generate_limiter

# Все тесты в этом модуле работают только в mock-режиме.
pytestmark = pytest.mark.skipif(
    settings.ml_mode != "mock",
    reason="Тесты требуют ML_MODE=mock (без внешних зависимостей)",
)


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Сброс rate-limiter перед каждым тестом (3 запроса / 30 сек)."""
    generate_limiter.reset()
    yield
    generate_limiter.reset()


@pytest.fixture
async def client():
    """Async HTTP-клиент через ASGITransport.

    TestClient (на потоках) зависает на Python 3.14 — используем
    httpx.AsyncClient с ASGITransport для прямого вызова ASGI-приложения.
    """
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_health(client: httpx.AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_root_shows_ml_mode(client: httpx.AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["ml_mode"] == "mock"


@pytest.mark.asyncio
async def test_list_styles(client: httpx.AsyncClient):
    response = await client.get("/styles")
    assert response.status_code == 200
    styles = response.json()
    assert len(styles) >= 6
    assert all("id" in s and "name" in s for s in styles)


@pytest.mark.asyncio
async def test_generate_returns_generation_id(client: httpx.AsyncClient):
    response = await client.post(
        "/generate",
        params={
            "image_urls": "photo1.jpg,photo2.jpg",
            "styles": "loft,minimalism",
            "room_type": "living_room",
        },
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "processing"
    assert body["generation_id"]


@pytest.mark.asyncio
async def test_generate_rejects_unknown_style(client: httpx.AsyncClient):
    response = await client.post(
        "/generate",
        params={"image_urls": "photo1.jpg,photo2.jpg", "styles": "nonexistent_style"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_rejects_empty_styles(client: httpx.AsyncClient):
    response = await client.post(
        "/generate",
        params={"image_urls": "photo1.jpg,photo2.jpg", "styles": ""},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_rejects_single_photo(client: httpx.AsyncClient):
    """Минимум 2 фотографии комнаты."""
    response = await client.post(
        "/generate",
        params={"image_urls": "photo1.jpg", "styles": "loft"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_rejects_too_many_photos(client: httpx.AsyncClient):
    """Максимум 4 фотографии комнаты."""
    response = await client.post(
        "/generate",
        params={"image_urls": "p1.jpg,p2.jpg,p3.jpg,p4.jpg,p5.jpg", "styles": "loft"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_unknown_generation_returns_404(client: httpx.AsyncClient):
    response = await client.get("/generations/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_generation_completes_in_mock_mode(client: httpx.AsyncClient):
    """Полный флоу: запуск → опрос → completed с результатами и изображениями."""
    response = await client.post(
        "/generate",
        params={
            "image_urls": "photo1.jpg,photo2.jpg",
            "styles": "scandinavian",
            "room_type": "bedroom",
        },
    )
    assert response.status_code == 202
    gen_id = response.json()["generation_id"]

    # Опрашиваем статус до завершения (mock-режим ~1.5-3 сек).
    max_wait = 15
    deadline = time.time() + max_wait
    final_status = None

    while time.time() < deadline:
        status_resp = await client.get(f"/generations/{gen_id}")
        assert status_resp.status_code == 200
        data = status_resp.json()
        if data["status"] in ("completed", "failed"):
            final_status = data
            break
        await asyncio.sleep(0.5)

    assert final_status is not None, "Генерация не завершилась за отведённое время"
    assert final_status["status"] == "completed"
    assert len(final_status["results"]) == 1

    result = final_status["results"][0]
    assert result["style"] == "scandinavian"
    assert result["status"] == "completed"
    assert result["result_image_url"] is not None

    # Проверяем, что изображение доступно по URL.
    img_resp = await client.get(result["result_image_url"])
    assert img_resp.status_code == 200
    assert img_resp.headers["content-type"] == "image/png"
    assert len(img_resp.content) > 0


@pytest.mark.asyncio
async def test_multistyle_generation(client: httpx.AsyncClient):
    """Параллельная генерация нескольких стилей."""
    response = await client.post(
        "/generate",
        params={
            "image_urls": "photo1.jpg,photo2.jpg,photo3.jpg",
            "styles": "loft,minimalism,art_deco",
            "room_type": "living_room",
        },
    )
    assert response.status_code == 202
    gen_id = response.json()["generation_id"]

    max_wait = 20
    deadline = time.time() + max_wait
    final_status = None

    while time.time() < deadline:
        status_resp = await client.get(f"/generations/{gen_id}")
        data = status_resp.json()
        if data["status"] in ("completed", "failed"):
            final_status = data
            break
        await asyncio.sleep(0.5)

    assert final_status is not None
    assert final_status["status"] == "completed"
    assert len(final_status["results"]) == 3

    styles_returned = {r["style"] for r in final_status["results"]}
    assert styles_returned == {"loft", "minimalism", "art_deco"}

    # Все результаты должны быть завершены.
    assert all(r["status"] == "completed" for r in final_status["results"])
    assert all(r["result_image_url"] for r in final_status["results"])
