# RoomVAI

> Сфотографируй помещение — получи его визуализацию в разных дизайнерских стилях до начала ремонта.

RoomVAI — мобильное приложение, которое позволяет пользователю сфотографировать помещение (комнату, кухню, ванную) и мгновенно получить несколько вариантов визуализации этого же помещения в разных дизайнерских стилях (скандинавский, лофт, минимализм, классика, японский минимализм и т.д.) с помощью генеративной нейросети.

## Ключевая ценность

Пользователь видит потенциал своего помещения **до начала ремонта**, не тратя деньги на дизайнера.

## Архитектура

Монорепозиторий из трёх частей:

```
RoomVAI/
├── backend/   # FastAPI — прокси к Replicate + Supabase (ключи только на сервере)
├── mobile/    # React Native + Expo (iOS / Android)
└── docs/      # архитектура и дорожная карта
```

| Слой        | Технология                         | Назначение                                  |
| ----------- | ---------------------------------- | ------------------------------------------- |
| Mobile      | React Native + Expo + TypeScript   | Камера, UI, выбор стилей, просмотр, paywall |
| Backend API | FastAPI (Python)                   | Оркестрация генерации, rate-limit, webhooks |
| AI          | Replicate API (ControlNet + SD)    | Рестайлинг с сохранением геометрии комнаты  |
| DB/Auth     | Supabase (PostgreSQL)              | Auth + DB + Storage в одном сервисе         |
| Платежи     | RevenueCat                         | Подписки Apple/Google + серверная валидация |
| Аналитика   | PostHog                            | Полная воронка событий                      |

Принцип генерации: исходное фото → ControlNet (границы/глубина) →
Stable Diffusion img2img с промптом стиля → результат, повторяющий геометрию комнаты.
Подробности — в `docs/ARCHITECTURE.md`.

## Быстрый старт

Подробная пошаговая инструкция (с настройкой сервисов, туннелем ngrok
и решением частых проблем) — в [`docs/SETUP.md`](docs/SETUP.md).

### Требования

- Python ≥ 3.11
- Node.js ≥ 20 + Expo CLI
- Аккаунты: Supabase, Replicate, RevenueCat, PostHog

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # задайте ключи Supabase, Replicate, PostHog
uvicorn app.main:app --reload
```

Документация API: `http://localhost:8000/docs`

Переменные окружения (см. `backend/.env.example`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — доступ к БД и Storage
- `REPLICATE_API_TOKEN` — ключ Replicate (только на бэкенде!)
- `WEBHOOK_BASE_URL` — публичный URL для callback'ов Replicate
- `POSTHOG_KEY` — server-side аналитика из webhook'ов
- `FREE_GENERATIONS_NO_AUTH=1`, `FREE_GENERATIONS_WITH_AUTH=1` — лимиты free-тарифа

Схему БД примените в Supabase Dashboard → SQL Editor: `backend/db/schema.sql`.

### Mobile

```bash
cd mobile
npm install
cp .env.example .env             # укажите URL backend и публичные ключи
npx expo start
```

Переменные окружения (см. `mobile/.env.example`):

- `EXPO_PUBLIC_API_URL` — URL backend (эмулятор Android: `http://10.0.2.2:8000`)
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — публичные ключи
- `EXPO_PUBLIC_REVENUECAT_API_KEY` — публичный ключ RevenueCat
- `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` — клиентская аналитика

Отсканируйте QR-код приложением Expo Go (iOS / Android).

## Структура директорий

```
backend/
├── app/
│   ├── main.py              # точка входа FastAPI
│   ├── config.py            # настройки из env
│   ├── schemas.py           # Pydantic-модели
│   ├── styles.py            # 8 стилей с SD-промптами
│   ├── routers/             # generation, revenuecat, subscription, styles
│   ├── services/
│   │   ├── replicate.py         # клиент Replicate API + оценка стоимости
│   │   ├── supabase_admin.py    # service_role: CRUD, Storage, квоты
│   │   └── analytics.py         # server-side PostHog
│   └── utils/
│       ├── images.py            # обработка изображений
│       └── rate_limit.py        # token bucket rate-limiter
├── db/schema.sql           # полная схема БД + RLS + триггеры + buckets
└── tests/

mobile/
├── src/
│   ├── screens/            # 11 экранов (onboarding → result → history)
│   ├── components/         # переиспользуемые UI-компоненты
│   ├── services/
│   │   ├── api/               # клиент к backend + аналитика
│   │   ├── supabase/          # Auth + DB + Storage
│   │   └── revenuecat/        # обёртка над платежами
│   ├── hooks/              # useSubscription, useNetworkStatus
│   ├── constants/          # тема, тарифы, планы
│   ├── locales/            # i18n: ru.json, en.json
│   ├── types/              # TypeScript-типы
│   └── utils/              # компрессия изображений
└── App.tsx
```

## Статус

✅ MVP готов: все 10 этапов разработки завершены (см. `docs/ROADMAP.md`).

Далее — подключение нативных SDK (RevenueCat, PostHog, NetInfo) через
`expo prebuild`, указание реальных ключей и сборка через EAS Build.
