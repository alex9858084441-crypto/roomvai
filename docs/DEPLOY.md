# Деплой RoomVAI Backend

## Предварительные требования

Перед деплоем убедитесь, что у вас есть:

- [ ] Аккаунт **Supabase** (проект создан, ключи получены) ✅
- [ ] Аккаунт **Replicate** + API-токен ([replicate.com/account/api-tokens](https://replicate.com/account/api-tokens))
- [ ] Аккаунт **PostHog** + project key (опционально, для аналитики)
- [ ] Аккаунт на одной из платформ деплоя (Render / Fly.io / Railway)

## Переменные окружения (обязательно для прода)

| Переменная | Значение | Где получить |
|---|---|---|
| `SUPABASE_URL` | `https://oebnyfbtafjirvoplrcy.supabase.co` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Supabase Dashboard → Settings → API (service_role) |
| `REPLICATE_API_TOKEN` | `r8_...` | replicate.com/account/api-tokens |
| `WEBHOOK_BASE_URL` | `https://<ваш-домен>` | URL после деплоя (см. ниже) |
| `POSTHOG_KEY` | `phc_...` | PostHog Dashboard → Project Settings |
| `ML_MODE` | `replicate` | Фиксированное значение |
| `CORS_ORIGINS` | `*` или домен клиента | Для прода — домен API |

---

## Вариант 1 — Render.com (рекомендуется, самый простой)

### Через Dashboard

1. Зайдите на [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Подключите GitHub-репозиторий RoomVAI
3. Настройки:
   - **Name**: `roomvai-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Перейдите в **Environment** и добавьте все переменные из таблицы выше
5. Нажмите **Create Web Service**
6. После деплоя скопируйте URL (напр. `https://roomvai-backend.onrender.com`)
7. Установите `WEBHOOK_BASE_URL` = этот URL

### Через render.yaml (Infrastructure as Code)

```bash
# Установите Render CLI
npm i -g @render/cli

# Деплой из корня репозитория
render blueprint deploy
```

Файл `render.yaml` уже настроен в корне проекта.

**Бесплатный план Render**: сервис «засыпает» через 15 мин без запросов.
Первый запрос после сна — ~30 сек на пробуждение. Для прода — план Starter ($7/мес).

---

## Вариант 2 — Fly.io

```bash
# 1. Установите flyctl
curl -L https://fly.io/install.sh | sh

# 2. Логин
fly auth login

# 3. Создайте приложение (fly.toml уже в корне проекта)
fly launch --no-deploy

# 4. Установите секреты
fly secrets set SUPABASE_URL=https://oebnyfbtafjirvoplrcy.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
fly secrets set REPLICATE_API_TOKEN=r8_...
fly secrets set ML_MODE=replicate
fly secrets set CORS_ORIGINS="*"
fly secrets set POSTHOG_KEY=phc_...

# 5. Деплой
fly deploy

# 6. После деплоя установите WEBHOOK_BASE_URL
fly secrets set WEBHOOK_BASE_URL=https://roomvai-backend.fly.dev
```

**Плюс Fly.io**: не «засыпает», есть бесплатный тариф (3 shared-cpu VM).

---

## Вариант 3 — Railway.app

```bash
# 1. Установите Railway CLI
npm i -g @railway/cli

# 2. Логин
railway login

# 3. Инициализация проекта
railway init

# 4. Деплой (nixpacks.toml уже в корне проекта)
railway up

# 5. Установите переменные
railway variables set ML_MODE=replicate
railway variables set SUPABASE_URL=https://oebnyfbtafjirvoplrcy.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
railway variables set REPLICATE_API_TOKEN=r8_...
railway variables set POSTHOG_KEY=phc_...

# 6. После деплоя — получите URL и установите webhook
railway variables set WEBHOOK_BASE_URL=https://roomvai-backend.up.railway.app
```

**Плюс Railway**: мгновенный деплой из Dockerfile, простой интерфейс.

---

## После деплоя

### 1. Проверьте healthcheck

```bash
curl https://<ваш-домен>/health
# Ожидаемый ответ: {"status":"ok"}

curl https://<ваш-домен>/
# Ожидаемый ответ: {..., "replicate_configured": true, "ml_mode": "replicate", ...}
```

### 2. Установите WEBHOOK_BASE_URL

Это критично — без него Replicate не сможет вернуть результат генерации.
Бэкенд fallback на polling, но это медленнее и дороже.

```bash
# Render
# Dashboard → Environment → WEBHOOK_BASE_URL = https://roomvai-backend.onrender.com

# Fly.io
fly secrets set WEBHOOK_BASE_URL=https://roomvai-backend.fly.dev

# Railway
railway variables set WEBHOOK_BASE_URL=https://roomvai-backend.up.railway.app
```

### 3. Обновите мобильное приложение

В `mobile/.env` измените `EXPO_PUBLIC_API_URL` на продакшен-URL:

```env
EXPO_PUBLIC_API_URL=https://roomvai-backend.onrender.com
```

### 4. Получите остальные ключи

| Сервис | Ключ | Где получить |
|---|---|---|
| Replicate | `REPLICATE_API_TOKEN` | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) |
| PostHog | `POSTHOG_KEY` | PostHog Dashboard → Project Settings |
| RevenueCat | `EXPO_PUBLIC_REVENUECAT_API_KEY` | RevenueCat Dashboard → Project Settings |

---

## Локальный запуск через Docker

```bash
# Mock-режим (без Replicate/Supabase)
docker compose up

# Production-режим
ML_MODE=replicate docker compose up
```

---

## Troubleshooting

### Сервис не запускается
- Проверьте логи: Render → Logs, Fly → `fly logs`, Railway → Deploy Logs
- Убедитесь что `SUPABASE_URL` не содержит `/rest/v1/` в конце

### Replicate возвращает ошибку
- Проверьте что `REPLICATE_API_TOKEN` начинается с `r8_`
- Убедитесь что на аккаунте Replicate есть кредиты (Billing → Add credits)

### Webhook не доходит
- Проверьте что `WEBHOOK_BASE_URL` — публичный HTTPS URL
- Тест: `curl -X POST https://<домен>/webhooks/replicate -H "Content-Type: application/json" -d '{}'`
- Ожидаемый ответ: `{"status":"ignored"}` (нет prediction_id — нормально)
