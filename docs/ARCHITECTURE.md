# RoomVAI — архитектура

## Обзор системы

```
┌────────────────────────────────────────────────────────────┐
│                     Мобильное приложение                    │
│   (React Native + Expo — iOS / Android)                    │
│                                                            │
│   Камера/галерея → выбор стилей → генерация → результат    │
│   Свайпер до/после, история, paywall, онбординг, i18n       │
└───────────────────────────┬────────────────────────────────┘
                            │ HTTP (JSON) — ключи НЕ на клиенте
┌───────────────────────────▼────────────────────────────────┐
│                       Backend API                           │
│                    (FastAPI, Python)                        │
│                                                            │
│   /styles                — список стилей                   │
│   /generate              — запуск генерации (rate-limited) │
│   /generations/{id}      — статус + результаты             │
│   /subscription          — серверная валидация подписки    │
│   /webhooks/replicate    — callback от Replicate           │
│   /webhooks/revenuecat   — синхронизация подписок          │
└─────────┬─────────────────────────────────┬────────────────┘
          │                                 │
┌─────────▼──────────────┐  ┌──────────────▼──────────────────┐
│   Replicate API         │  │   Supabase                       │
│   (ControlNet + SD)     │  │   Auth + PostgreSQL + Storage    │
│   webhook → backend     │  │   (source-images, result-images) │
└────────────────────────┘  └─────────────────────────────────┘
```

## Поток генерации (раздел 4 промпта)

1. Пользователь фотографирует помещение (камера/галерея).
2. Фото сжимается до 1536px по длинной стороне и загружается в Supabase Storage.
3. Приложение вызывает `POST /generate` со списком стилей (до 3).
4. Backend:
   - проверяет rate-limit (token bucket, 3 запроса / 30 сек);
   - создаёт запись `generations` в БД;
   - запускает параллельно predictions на Replicate через `asyncio.gather`
     (аналог `Promise.all`), каждый со своим webhook;
   - возвращает `generation_id` (статус 202 Accepted).
5. Replicate по завершении вызывает `POST /webhooks/replicate`:
   - результат загружается в Supabase Storage;
   - записывается `cost_usd` (unit-экономика);
   - при ошибке генерация **не списывается** с квоты.
6. Приложение опрашивает `GET /generations/{id}` с exponential backoff
   (не каждую секунду) и показывает прогресс + факты о дизайне.

## Зачем ControlNet

Чистый img2img «плавит» геометрию комнаты — стены и проёмы искажаются.
ControlNet передаёт структурный сигнал (границы Canny/MLSD, карта глубины),
поэтому результат повторяет **реальную планировку** помещения, меняя лишь
отделку и мебель.

## Монетизация (раздел 6)

- **Free**: 1 генерация без регистрации, +1 после регистрации, затем paywall.
- **Подписки**: неделя 690 ₽ / месяц 2490 ₽ / год 9990 ₽ (badge «Экономия 60%»).
- Клиентская проверка entitlement — только для UX (быстрый показ paywall).
- **Авторизующее решение — на бэкенде**: `GET /subscription` читает статус
  из БД, синхронизированной RevenueCat webhook'ом (не доверяем только клиенту).

## Аналитика (раздел 7)

Полная воронка фиксируется в PostHog:
`install → onboarding_completed → first_photo_taken → generation_started →
generation_completed → paywall_shown → trial_started → subscription_purchased →
subscription_cancelled`.

Server-side события (`subscription_cancelled`, `subscription_expired`) отправляются
из RevenueCat webhook — клиент их не видит, если закрыл приложение.

## Локализация (раздел 7)

i18next с первого дня: RU + EN. Все UI-строки вынесены в `locales/ru.json`
и `locales/en.json`. Выбор языка сохраняется в AsyncStorage и применяется
при старте приложения.

## Технологический выбор

| Компонент        | Выбор                          | Почему                                        |
| ---------------- | ------------------------------ | --------------------------------------------- |
| Mobile           | React Native + Expo            | Один кодбейс для iOS/Android, быстрый старт   |
| Backend API      | FastAPI                         | Async, авто-документация, экосистема Python   |
| AI               | Replicate API (ControlNet + SD) | Без управления GPU-инфраструктурой, webhook   |
| DB / Auth        | Supabase (PostgreSQL)           | Auth + DB + Storage в одном сервисе           |
| Платежи          | RevenueCat                      | Подписки Apple/Google без ручной валидации    |
| Аналитика        | PostHog                         | Полная воронка, server-side события           |

## Безопасность и приватность

- Ключ Replicate (`REPLICATE_API_TOKEN`) и `SUPABASE_SERVICE_ROLE_KEY` —
  **только на бэкенде**, никогда не попадают в клиентский код (раздел 10).
- Загружаемые фото — приватный bucket `source-images`, доступ по signed URL.
- Согласие на обработку фото (GDPR / 152-ФЗ) — отдельный экран при первом запуске,
  запись в таблицу `consents`.
- Rate-limiting на `/generate` защищает бюджет Replicate от злоупотреблений.
