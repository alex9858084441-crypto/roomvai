# Дорожная карта RoomVAI

## Этап 1 — Структура + навигация ✅
- [x] Монорепозиторий (FastAPI backend + Expo mobile)
- [x] Навигация между 11 экранами-заглушками
- [x] i18n-каркас (i18next), стаб-сервисы

## Этап 2 — Supabase Auth + DB + Storage ✅
- [x] Схема БД: profiles, generations, generation_results, subscriptions, consents
- [x] RLS-политики, триггер автосоздания профиля, storage buckets
- [x] Supabase-клиент: email + Google + Apple Sign-In, SecureStore

## Этап 3 — Камера/галерея + компрессия ✅
- [x] Съёмка фото / выбор из галереи (expo-image-picker)
- [x] Компрессия до 1536px по длинной стороне (раздел 4)
- [x] Загрузка в приватный bucket, обработка отказа в доступе

## Этап 4 — Replicate API POC ✅
- [x] Бэкенд-прокси к Replicate (ключ только на сервере)
- [x] ControlNet + Stable Diffusion, webhook вместо polling
- [x] Запуск одного prediction, запись результата

## Этап 5 — Мультистили + параллельность ✅
- [x] Параллельная генерация через `asyncio.gather` (аналог Promise.all)
- [x] 8 стилей с промптами (скандинавский, лофт, минимализм, классика и др.)
- [x] return_exceptions: падение одного стиля не роняет остальные

## Этап 6 — Экран результатов + история ✅
- [x] Свайпер между оригиналом и вариантами стилей
- [x] Сохранение в галерею, шаринг, «сгенерировать ещё»
- [x] Экран истории генераций

## Этап 7 — RevenueCat + paywall ✅
- [x] Paywall показывается ПОСЛЕ первой бесплатной генерации
- [x] Тарифы: неделя / месяц / год (badge «Экономия 60%»)
- [x] Серверная валидация статуса (RevenueCat webhook → БД → GET /subscription)

## Этап 8 — Онбординг + полировка UX ✅
- [x] 3 слайда с wow-примерами до/после
- [x] Минимум 2 сек на слайд (нельзя пропустить быстрее)
- [x] Экран согласия на обработку фото (GDPR / 152-ФЗ)

## Этап 9 — Аналитика + edge-cases ✅
- [x] Инициализация PostHog при старте приложения
- [x] Полная воронка событий, identifyUser при логине
- [x] Server-side события: subscription_cancelled/expired из RevenueCat webhook
- [x] Rate-limiting на /generate (token bucket, 3 запроса / 30 сек)
- [x] Edge-cases: отказ камеры, нет интернета, ошибка API не списывает квоту

## Этап 10 — Локализация ✅
- [x] Переключатель языка в настройках (Русский / English)
- [x] Сохранение выбора в AsyncStorage, применение при старте
- [x] Все UI-строки вынесены в i18n-ключи (RU + EN с первого дня)

---

## Дальнейшие шаги (post-MVP)

### Запуск в продакшн
- [x] Подключить нативные SDK: RevenueCat (`react-native-purchases`),
      NetInfo (`@react-native-community/netinfo`), `expo-build-properties`
- [ ] Указать реальные ключи в `.env` (backend + mobile)
- [ ] Настроить публичный `WEBHOOK_BASE_URL` для callback'ов Replicate
- [x] Указать реальные ключи в `.env` (backend + mobile)
- [x] Настроить публичный `WEBHOOK_BASE_URL` для callback'ов Replicate
- [x] Деплой бэкенда на Render (https://roomvai.onrender.com)
- [x] `REPLICATE_API_TOKEN` установлен, `ML_MODE=replicate`
- [x] UptimeRobot/cron-job.org пингер — сервис не засыпает
- [x] `POSTHOG_KEY` установлен (backend + mobile)
- [x] `REVENUECAT_API_KEY` установлен (mobile, Google Play)
- [ ] Apple Developer аккаунт ($99/год) — для App Store и `appl_` ключа
- [x] Выбрать модель ControlNet на Replicate (`lllyasviel/sd-controlnet-depth`)

### Публикация
- [x] EAS Build: профили сборки (`eas.json`), `bundleIdentifier`, `package`,
      метаданные сторов (`store/`), `.easignore` — иконки/splash от пользователя
- [x] Apple Sign-In подключён (`expo-apple-authentication`)
- [ ] Политики конфиденциальности и пользовательское соглашение
- [x] Политики конфиденциальности и пользовательское соглашение (`docs/PRIVACY.md`, `docs/TERMS.md`)

### Рост
- [ ] Дополнительные стили и пресеты
- [ ] Редактирование отдельных зон маской (inpainting)
- [ ] A/B-тесты paywall и онбординга
- [ ] Referral-программа

### Деплой
- [x] Конфиги деплоя: `render.yaml`, `fly.toml`, `nixpacks.toml` (Railway)
- [x] Production-стейдж в Dockerfile (без тестовых зависимостей, workers=2)
- [x] Инструкция деплоя `docs/DEPLOY.md`
- [ ] Деплой на выбранную платформу
- [ ] Установка `WEBHOOK_BASE_URL` после деплоя
