# Корневой Dockerfile для Render (делегирует в backend/Dockerfile)
FROM python:3.12-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/

RUN mkdir -p /app/uploads /app/output

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UPLOADS_DIR=/tmp/uploads \
    OUTPUT_DIR=/tmp/output \
    ML_MODE=mock

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
