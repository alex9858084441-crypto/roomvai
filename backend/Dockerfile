# --- Сборка backend RoomVAI ---
# Базовый образ: Python 3.12 (slim). Для GPU-инференса используйте
# образ nvidia/cuda и установите torch с поддержкой CUDA.

FROM python:3.12-slim AS base

# Установка системных зависимостей для обработки изображений (OpenCV, Pillow).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала копируем только зависимости — для кэширования слоя.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код приложения.
COPY app/ ./app/
COPY tests/ ./tests/

# Директории для загрузок и результатов (volume монтируется извне).
RUN mkdir -p /app/uploads /app/output

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UPLOADS_DIR=/app/uploads \
    OUTPUT_DIR=/app/output \
    ML_MODE=mock

EXPOSE 8000

# По умолчанию — mock-режим.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# --- ML-стейдж: добавляет тяжёлые зависимости для реальной генерации ---
# Сборка: docker build --target ml -t roomvai-backend:ml .
FROM base AS ml
COPY requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements-ml.txt
ENV ML_MODE=sd
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
