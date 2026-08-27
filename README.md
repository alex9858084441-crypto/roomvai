# RoomVAI

> Сфотографируй помещение — получи его визуализацию в разных дизайнерских стилях до начала ремонта.

RoomVAI — мобильное приложение, которое позволяет пользователю сфотографировать помещение (комнату, кухню, ванную) и мгновенно получить несколько вариантов визуализации этого же помещения в разных дизайнерских стилях (скандинавский, лофт, минимализм, классика, японский минимализм и т.д.) с помощью генеративной нейросети.

## Ключевая ценность

Пользователь видит потенциал своего помещения **до начала ремонта**, не тратя деньги на дизайнера.

## Архитектура

Монорепозиторий из двух частей:

```
RoomVAI/
├── backend/   # FastAPI + генеративная нейросеть (Python)
├── mobile/    # React Native + Expo (кроссплатформенно: iOS / Android)
└── docs/      # документация и архитектурные решения
```

| Слой        | Технология                         | Назначение                                  |
| ----------- | ---------------------------------- | ------------------------------------------- |
| Mobile      | React Native + Expo                | Камера, UI, загрузка фото, просмотр стилей  |
| Backend API | FastAPI (Python)                   | Загрузка изображений, оркестрация генерации |
| ML / AI     | Stable Diffusion + ControlNet (i2i)| Рестайлинг помещения с сохранением геометрии|

Принцип генерации: исходное фото → сегментация/карта глубины (ControlNet) → image-to-image с промптом стиля → результат, повторяющий геометрию комнаты.

## Быстрый старт

### Требования

- Python ≥ 3.11
- Node.js ≥ 20 (для мобильного приложения)
- Expo CLI (`npm i -g expo-cli`)
- (опционально) Docker — для запуска backend в контейнере

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # задайте ключи API модели при необходимости
uvicorn app.main:app --reload
```

Документация API: `http://localhost:8000/docs`

### Mobile

```bash
cd mobile
npm install
cp .env.example .env             # укажите URL backend (EXPO_PUBLIC_API_URL)
npx expo start
```

Отсканируйте QR-код приложением Expo Go (iOS / Android).

## Структура директорий

```
backend/
├── app/
│   ├── main.py              # точка входа FastAPI
│   ├── config.py            # настройки (env)
│   ├── schemas.py           # Pydantic-модели
│   ├── routers/             # HTTP-эндпоинты
│   ├── services/            # бизнес-логика + ML-интеграция
│   └── utils/               # утилиты (обработка изображений)
├── assets/styles_preview/   # превью-картинки стилей
└── tests/

mobile/
├── src/
│   ├── screens/             # экраны приложения
│   ├── components/          # переиспользуемые компоненты
│   ├── services/            # API-клиент
│   ├── hooks/               # кастомные хуки
│   ├── constants/           # стили, цвета, список стилей
│   └── types/               # TypeScript-типы
└── App.tsx
```

## Статус

🚧 Проект в стадии инициализации. Следующие шаги — см. `docs/ROADMAP.md`.

## Лицензия

Proprietary / All rights reserved.
