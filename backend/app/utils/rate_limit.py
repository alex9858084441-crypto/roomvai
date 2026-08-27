"""Ограничение частоты запросов (rate-limiting). Раздел 10 промпта.

Защищает /generate от злоупотреблений: один пользователь не может
дизейблить бюджет на Replicate множественными параллельными запросами.

In-memory реализация (token bucket) — достаточно для single-instance
serverless/FastAPI. Для multi-instance нужен Redis-backed limiter.
"""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class _Bucket:
    """Token bucket: пополняется со временем, расходуется на запрос."""

    tokens: float = 0.0
    last_refill: float = field(default_factory=time.monotonic)


class RateLimiter:
    """Ограничение запросов по ключу (user_id или IP).

    Параметры:
        max_tokens: максимальное число «жетонов» в бакете.
        refill_rate: жетонов в секунду (пополнение).
        window_seconds: окно для подсчёта (для max_tokens за период).
    """

    def __init__(self, max_tokens: int = 3, refill_seconds: float = 30.0) -> None:
        self._max = max_tokens
        self._refill_per_sec = max_tokens / refill_seconds
        self._buckets: dict[str, _Bucket] = defaultdict(_Bucket)

    def check(self, key: str) -> bool:
        """Возвращает True, если запрос разрешён (есть жетон)."""
        bucket = self._buckets[key]
        now = time.monotonic()

        # Пополнение жетонов с момента последнего запроса.
        elapsed = now - bucket.last_refill
        bucket.tokens = min(self._max, bucket.tokens + elapsed * self._refill_per_sec)
        bucket.last_refill = now

        if bucket.tokens >= 1.0:
            bucket.tokens -= 1.0
            return True
        return False


# Глобальный лимитер: 3 генерации на 30 секунд на пользователя.
generate_limiter = RateLimiter(max_tokens=3, refill_seconds=30.0)
