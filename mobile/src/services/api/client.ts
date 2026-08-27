/**
 * API-клиент к backend (FastAPI). Backend проксирует запросы к Replicate
 * и Supabase — ключ Replicate НИКОГДА не покидает сервер (раздел 10).
 *
 * Реализация наполняется на этапах 3-5. Сейчас — стаб + утилиты URL.
 */

import type { Generation, StyleId, RoomType } from "../../types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, "")}${path}`;
}

/** Абсолютный URL для ресурсов backend. */
export function assetUrl(relative: string | undefined): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("http")) return relative;
  return `${API_URL.replace(/\/$/, "")}${relative}`;
}

export async function fetchStyles(): Promise<import("../../types").StyleInfo[]> {
  const res = await fetch(apiUrl("/styles"));
  if (!res.ok) throw new Error(`Styles fetch failed (${res.status})`);
  return res.json();
}

/** Этап 3-4: запуск генерации (фото + стили → generationId). */
export async function startGeneration(
  _imageUri: string,
  _styles: StyleId[],
  _roomType: RoomType,
): Promise<Generation> {
  // TODO этап 4: POST /generate с FormData (сжатое фото)
  // TODO этап 5: параллельная генерация через Promise.all на бэкенде
  throw new Error("startGeneration: реализуется на этапе 4");
}

/** Этап 4: статус генерации (вместо polling — webhook, fallback backoff). */
export async function fetchGeneration(
  _generationId: string,
): Promise<Generation> {
  // TODO этап 4: GET /generations/:id
  throw new Error("fetchGeneration: реализуется на этапе 4");
}

/** Этап 6: история генераций. */
export async function fetchGenerations(): Promise<Generation[]> {
  // TODO этап 6: GET /generations
  return [];
}

/** Этап 7: серверная валидация подписки. */
export async function fetchSubscription(): Promise<import("../../types").SubscriptionState> {
  // TODO этап 7: GET /subscription
  return { status: "none", entitlement: null };
}
