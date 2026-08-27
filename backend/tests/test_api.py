"""Базовые тесты API: список стилей, генерация, опрос статуса."""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.jobs import job_store

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_styles():
    response = client.get("/styles")
    assert response.status_code == 200
    styles = response.json()
    assert len(styles) >= 6
    assert all("id" in s and "name" in s for s in styles)


def _make_image_bytes() -> bytes:
    """Минимальный валидный JPEG-маркер (1x1)."""
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01"
        b"\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xff\xd9"
    )


def test_generate_accepts_image_and_returns_job():
    image_bytes = _make_image_bytes()
    response = client.post(
        "/generate",
        files={"file": ("room.jpg", image_bytes, "image/jpeg")},
        data={"room_type": "living_room", "styles": "loft,minimalism"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] in ("pending", "processing")
    assert body["job_id"]


def test_generate_rejects_bad_content_type():
    response = client.post(
        "/generate",
        files={"file": ("room.txt", b"not an image", "text/plain")},
        data={"styles": "loft"},
    )
    assert response.status_code == 415


def test_get_unknown_job_returns_404():
    response = client.get("/jobs/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_job_completes_in_mock_mode():
    image_bytes = _make_image_bytes()
    response = client.post(
        "/generate",
        files={"file": ("room.jpg", image_bytes, "image/jpeg")},
        data={"styles": "scandinavian"},
    )
    job_id = response.json()["job_id"]

    # Даём фоновой задаче завершиться (mock-режим ~1.5 c).
    job = job_store.get(job_id)
    assert job is not None
    if job.task is not None:
        await job.task

    status = client.get(f"/jobs/{job_id}").json()
    assert status["status"] == "completed"
    assert status["progress"] == 1.0
    assert len(status["results"]) == 1
    assert status["results"][0]["style"] == "scandinavian"
