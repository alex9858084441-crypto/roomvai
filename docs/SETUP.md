# RoomVAI — инструкция по запуску и работе

Пошаговое руководство: от подготовки аккаунтов до запуска приложения на телефоне.

---

## 0. Что понадобится

Зарегистрируйтесь (бесплатно) в четырёх сервисах:

| Сервис | Зачем | Где получить ключ |
| ------ | ----- | ----------------- |
| **Supabase** | База данных, авторизация, хранилище фото | dashboard.supabase.com → Project Settings → API |
| **Replicate** | Генеративная нейросеть (ControlNet + SD) | replicate.com → Account → API tokens |
| **RevenueCat** | Подписки Apple/Google | app.revenuecat.com → Project → API keys |
| **PostHog** | Аналитика воронки | app.posthog.com → Project Settings |


## 1. Подготовка БД (Supabase)

1. Создайте новый проект на https://supabase.com (бесплатный тариф подойдёт).
2. Дождитесь инициализации (1-2 минуты).
3. Скопируйте из **Project Settings → API**:
   - `Project URL` → это `SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` ключ → `EXPO_PUBLIC_SUPABASE_ANON_KEY` (для мобильного приложения)
   - `service_role` ключ → `SUPABASE_SERVICE_ROLE_KEY` (**только для бэкенда!**)

4. **Примените схему БД**: откройте **SQL Editor** → New query →
   вставьте содержимое файла `backend/db/schema.sql` → **Run**.
   Создадутся таблицы `profiles`, `generations`, `generation_results`,
   `subscriptions`, `consents`, RLS-политики и два приватных storage-бакета.

5. (Опционально) Включите провайдеры входа:
   **Authentication → Providers** → Email, Google, Apple.
   Apple Sign-In обязателен, если включён Google (требование App Store).


## 2. Настройка Replicate

1. Зарегистрируйтесь на https://replicate.com и привяжите карту
   (оплата за фактические генерации, ~$0.002/сек).
2. Создайте API-токен: **Account → API tokens** → `r8_...`.
3. По умолчанию в конфиге используется модель `jagilley/controlnet-hough`.
  Можно подобрать другую ControlNet-модель для интерьеров —
  поищите на replicate.com/explore по запросу `controlnet interior`.
  Текущая модель по умолчанию: `lllyasviel/sd-controlnet-depth`
  (depth map лучше сохраняет геометрию помещения).
4. Для работы webhooks бэкенд должен быть доступен из интернета по
  публичному URL (см. шаг 4 про ngrok).


## 3. Бэкенд (FastAPI)

### 3.1. Установка

```bash
cd RoomVAI/backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> Требуется Python ≥ 3.11.

### 3.2. Переменные окружения

```bash
cp .env.example .env
```

Откройте `backend/.env` и заполните:

```ini
# Supabase (из шага 1)
SUPABASE_URL=https://ВАШ-ПРОЕКТ.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...

# Replicate (из шага 2)
REPLICATE_API_TOKEN=r8_ВАШ_ТОКЕН
REPLICATE_MODEL=lllyasviel/sd-controlnet-depth

# Публичный URL бэкенда для callback'ов Replicate (из шага 4)
WEBHOOK_BASE_URL=https://xxxx.ngrok.io

# Server-side PostHog (опционально)
POSTHOG_KEY=phc_ВАШ_КЛЮЧ

# Лимиты free-тарифа
FREE_GENERATIONS_NO_AUTH=1
FREE_GENERATIONS_WITH_AUTH=1
```

### 3.3. Запуск

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверка: откройте http://localhost:8000/docs — интерактивная Swagger-документация.
Эндпоинт `GET /` покажет, настроены ли Replicate и Supabase.

### 3.4. Публичный URL для webhooks (важно!)

Replicate не сможет вернуть результат на `localhost`. Для локальной разработки
используйте туннель:

```bash
# в отдельном терминале
ngrok http 8000
```

Скопируйте адрес вида `https://xxxx.ngrok-free.app` и впишите его в
`WEBHOOK_BASE_URL` в `backend/.env`, затем перезапустите бэкенд.

> Для продакшена — деплой на Railway / Fly.io / Render, и `WEBHOOK_BASE_URL`
> указывает на ваш домен.


## 4. Мобильное приложение (Expo)

### 4.1. Установка

```bash
cd RoomVAI/mobile
npm install
```

> Требуется Node.js ≥ 20.

### 4.2. Переменные окружения

```bash
cp .env.example .env
```

Откройте `mobile/.env` и заполните:

```ini
# URL бэкенда. Варианты:
#   Симулятор iOS / веб: http://localhost:8000
#   Эмулятор Android:    http://10.0.2.2:8000
#   Реальное устройство: http://<IP-компьютера>:8000
#   Через ngrok:         https://xxxx.ngrok-free.app
EXPO_PUBLIC_API_URL=http://localhost:8000

# Supabase — публичные ключи (анон, безопасны для клиента)
EXPO_PUBLIC_SUPABASE_URL=https://ВАШ-ПРОЕКТ.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...

# RevenueCat и PostHog (можно оставить пустыми для старта)
EXPO_PUBLIC_REVENUECAT_API_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
```

### 4.3. Проверка типов (опционально)

```bash
npm run tsc
```

### 4.4. Запуск

```bash
npm start
```

Откроется QR-код. Дальше:

- **На телефоне**: установите приложение **Expo Go** (App Store / Google Play),
  отсканируйте QR-код.
- **Эмулятор**: нажмите `i` (iOS) или `a` (Android) в терминале Expo.

> Если приложение на реальном телефоне не может достучаться до бэкенда —
> телефон и компьютер должны быть в одной Wi-Fi сети, и в `EXPO_PUBLIC_API_URL`
> укажите IP компьютера (узнать: `ipconfig` на Windows, `ifconfig` на macOS/Linux).
> Проще всего использовать ngrok-URL — он работает отовсюду.


## 5. Поток работы в приложении

1. **Онбординг** — 3 слайда (минимум 2 сек на каждый, нельзя пропустить быстрее).
2. **Согласие** на обработку фото (GDPR / 152-ФЗ). Без согласия — выход.
3. **Главный экран** — счётчик оставшихся бесплатных генераций, кнопки
   «Снять» / «Галерея», вход в историю и настройки.
4. **Камера** — съёмка или выбор фото. Изображение сжимается до 1536px и
   загружается в Supabase Storage. При отказе в доступе — инструкция, как
   включить камеру в настройках.
5. **Выбор стиля** — мультивыбор до 3 стилей (на free-тарифе — 1).
   Доступно 8 стилей: скандинавский, лофт, минимализм, классика, японский
   минимализм, индастриал, бохо, ар-деко.
6. **Генерация** — параллельный запуск стилей на Replicate. Пока идёт
   генерация, показываются факты о дизайне интерьеров (снижение тревоги
   ожидания). Статус опрашивается с exponential backoff.
7. **Результат** — свайпер между оригиналом и вариантами стилей.
   Кнопки: «Сохранить» (в галерею), «Поделиться», «Сгенерировать ещё».
8. **Paywall** — показывается **после** первой бесплатной генерации
   (сначала ценность, потом монетизация). Тарифы: неделя 690 ₽ /
   месяц 2490 ₽ / год 9990 ₽ (год выделен бейджем «Экономия 60%»).
9. **История** — список прошлых генераций (для авторизованных/платных).
10. **Настройки** — управление подпиской, переключатель языка (RU/EN),
    поддержка, выход.

### Лимиты free-тарифа
- 1 генерация без регистрации;
- +1 генерация после регистрации (email/Google/Apple);
- далее — жёсткий paywall.


## 6. API-эндпоинты бэкенда

| Метод | Путь | Назначение |
| ----- | ---- | ---------- |
| GET | `/` | Healthcheck + статус конфигурации |
| GET | `/health` | Простой healthcheck |
| GET | `/docs` | Swagger-документация |
| GET | `/styles` | Список из 8 стилей с описаниями |
| POST | `/generate?image_urls=p1.jpg,p2.jpg&styles=loft,minimalism&room_type=living_room` | Запуск генерации: 2–4 фото с разных углов |
| | (rate-limited: 3 запроса / 30 сек) |
| GET | `/generations/{id}` | Статус генерации + результаты с подписанными URL |
| GET | `/subscription?user_id=...` | Серверная валидация статуса подписки |
| POST | `/webhooks/replicate` | Callback от Replicate (вызывается самим Replicate) |
| POST | `/webhooks/revenuecat` | Синхронизация подписок из RevenueCat |

> Ключ Replicate и service_role-ключ Supabase **никогда** не покидают бэкенд.
> Мобильное приложение обращается только к FastAPI и к Supabase через anon-ключ.


## 7. Локализация

- Язык интерфейса: **RU** и **EN** с первого дня.
- Строки хранятся в `mobile/src/locales/ru.json` и `en.json`.
- Переключатель: **Настройки → Язык**. Выбор сохраняется между запусками.
- По умолчанию определяется язык устройства.

Чтобы добавить новый язык: создайте `mobile/src/locales/<код>.json` по
образцу `ru.json` и добавьте его в `mobile/src/locales/index.ts`.


## 8. Частые проблемы

**Приложение не может загрузить фото / «Нет соединения»**
- Проверьте, что бэкенд запущен (`http://localhost:8000/health`).
- На реальном устройстве `EXPO_PUBLIC_API_URL` должен указывать на
  IP компьютера или ngrok-URL, не на `localhost`.

**Генерация зависает на «Генерация…»**
- Проверьте `REPLICATE_API_TOKEN` в `backend/.env`.
- Проверьте `WEBHOOK_BASE_URL` — он должен быть публично доступен (ngrok).
- В логах бэкенда смотрите ошибки от Replicate.
- Убедитесь, что `image_url` в запросе доступен для Replicate (публичный URL
  или подписанный URL Supabase).

**Rate limit (429)**
- По умолчанию 3 генерации на 30 секунд на пользователя.
- Меняйте в `backend/app/utils/rate_limit.py`.

**Ошибка доступа к камере**
- Настройки телефона → RoomVAI (Expo Go) → Камера → Разрешить.
- Приложение само предложит открыть настройки при отказе.

**Подписки не работают**
- RevenueCat требует нативного SDK и `expo prebuild` (dev-клиент вместо Expo Go).
- После `npm install` выполните `npx expo prebuild --clean` для генерации
  нативных проектов iOS/Android.
- Без ключа `EXPO_PUBLIC_REVENUECAT_API_KEY` paywall работает в demo-режиме
  (покупка не завершится). Это нормально для теста UI.


## 9. Сборка для сторов (post-MVP)

Expo Go не поддерживает нативные модули (RevenueCat, NetInfo, Apple Sign-In).
Для релизной сборки требуется EAS Build с нативным кодом.

### 9.1. Подготовка

```bash
npm install -g eas-cli
eas login
eas init --id com.roomvai.app
```

### 9.2. Иконки и splash

Поместите файлы в `mobile/assets/images/`:

| Файл | Размер | Назначение |
| ---- | ------ | ---------- |
| `icon.png` | 1024×1024 | Иконка (iOS + Android) |
| `adaptive-icon.png` | 1024×1024 | Адаптивная иконка Android |
| `splash.png` | 1242×2436 | Экран загрузки |

### 9.3. Сборка

```bash
# Dev-клиент (симулятор, нативные модули)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview (APK для Android)
eas build --profile preview --platform android

# Production для сторов
eas build --profile production --platform all
```

### 9.4. Отправка в сторы

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Метаданные — в `mobile/store/appstore-metadata.txt` и `googleplay-metadata.txt`.

### 9.5. Apple Sign-In

Подключён через `expo-apple-authentication`. Обязателен при наличии Google
(требование App Store). Включите Sign in with Apple в Apple Developer Portal.

### 9.6. Чеклист публикации

- [ ] Иконки в `assets/images/`
- [ ] Реальные ключи в `.env` (backend + mobile)
- [ ] `WEBHOOK_BASE_URL` — публичный домен
- [ ] Бэкенд задеплоен
- [ ] Продукты подписки в RevenueCat + App Store Connect
- [ ] Политики конфиденциальности
- [ ] Скриншоты для сторов (мин. 3)

Полный чеклист публикации — в `docs/ROADMAP.md` (раздел «Дальнейшие шаги»).
