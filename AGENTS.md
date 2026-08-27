# AGENTS.md — RoomVAI

Правила работы с кодовой базой проекта RoomVAI.

## Обзор

Монорепозиторий:
- `backend/` — FastAPI (Python). ML-генерация стилей помещений.
- `mobile/` — React Native + Expo (TypeScript). iOS/Android клиент.
- `docs/` — архитектура и roadmap.

## Backend (Python)

- Python ≥ 3.11. Асинхронный код (`async def`).
- Зависимости — в `backend/requirements.txt`. Не дублируйте версии в коде.
- ML-зависимости (`torch`, `diffusers`) — тяжёлые, импортируйте **лениво** внутри функций, не на уровне модуля. Это позволяет mock-режиму работать без них.
- Конфигурация только через переменные окружения (`app/config.py`). Никаких хардкод-секретов.
- Стиль: типизация аннотациями, `from __future__ import annotations` в каждом модуле.
- Тесты — в `backend/tests/`, запускаются через `pytest`.

## Mobile (TypeScript / React Native + Expo)

- TypeScript strict. Без `any` кроме интеграций с нативными API (FormData).
- Структура: `screens/`, `components/`, `services/`, `hooks/`, `constants/`, `types/`.
- API-клиент — единственное место для сетевых запросов (`src/services/api.ts`).
- Цвета и отступы — из `src/constants/theme.ts`, не хардкодьте значения.
- Backend URL читается из `EXPO_PUBLIC_API_URL` (env), не задавайте URL в компонентах.

## Общие правила

- Не коммитьте `.env`, загруженные фото (`uploads/`), сгенерированные изображения (`output/`), модели (`*.safetensors`, `*.ckpt`).
- Коммиты и ветки — только по явной просьбе пользователя.
- Сообщения и UI — на русском языке; код и идентификаторы — на английском.
