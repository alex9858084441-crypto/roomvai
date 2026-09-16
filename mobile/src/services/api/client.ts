/**
 * API-клиент к backend (FastAPI). Backend проксирует запросы к VseGPT.ru
 * и Supabase — ключ VseGPT НИКОГДА не покидает сервер (раздел 10).
 *
 * Этап 4: POC — один результат. Этап 5 — мультистили + параллельность.
 */

import type { Generation, RoomType, StyleId, SubscriptionState } from "../../types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, "")}${path}`;
}

/** Абсолютный URL для ресурсов backend. */
export function assetUrl(relative: string | undefined): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("http")) return relative;
  if (relative.startsWith("mock://")) return undefined;
  return `${API_URL.replace(/\/$/, "")}${relative}`;
}

export async function fetchStyles(): Promise<import("../../types").StyleInfo[]> {
  const res = await fetch(apiUrl("/styles"));
  if (!res.ok) throw new Error(`Styles fetch failed (${res.status})`);
  return res.json();
}

/**
 * Загрузка исходного фото на бэкенд.
 * Бэкенд загружает в Supabase Storage (service_role) и возвращает
 * подписанный URL, который передаётся в /generate и доступен VseGPT.ru.
 */
export async function uploadImage(
  uri: string,
  userId?: string | null,
): Promise<{ url: string; path: string }> {
  const filename = uri.split("/").pop() ?? "photo.jpg";
  const fileExt = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = fileExt === "png" ? "image/png" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: filename,
    type: contentType,
  } as any);

  const uploadUrl = userId
    ? apiUrl(`/upload?user_id=${encodeURIComponent(userId)}`)
    : apiUrl("/upload");

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/**
 * Запуск генерации. Фото уже загружены через /upload — сюда передаём
 * подписанные URL из Supabase Storage. Backend запускает VseGPT.ru.
 *
 * Принимает 2–4 фотографии комнаты с разных углов.
 */
export async function startGeneration(
  imageUrls: string[],
  styles: StyleId[],
  roomType: RoomType,
  userId?: string | null,
): Promise<{ generationId: string; status: string }> {
  const params = new URLSearchParams({
    image_urls: imageUrls.join(","),
    styles: styles.join(","),
    room_type: roomType,
  });
  if (userId) params.set("user_id", userId);

  const res = await fetch(apiUrl(`/generate?${params.toString()}`), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Generation failed (${res.status}): ${detail}`);
  }
  return res.json().then((d) => ({
    generationId: d.generation_id,
    status: d.status,
  }));
}

/**
 * Опрос статуса генерации. Основной механизм — webhook от Replicate;
 * этот метод — для отображения статуса клиентом (fallback: exponential backoff).
 */
export async function fetchGeneration(generationId: string): Promise<Generation> {
  const res = await fetch(apiUrl(`/generations/${generationId}`));
  if (!res.ok) throw new Error(`Generation not found (${res.status})`);
  const data = await res.json();
  return {
    id: data.id,
    status: data.status,
    results: (data.results ?? []).map((r: any) => ({
      id: r.id,
      style: r.style,
      status: r.status,
      result_image_url: r.result_image_url,
      cost_usd: r.cost_usd,
      error: r.error,
    })),
  };
}

/** Этап 6: история генераций. */
export async function fetchGenerations(): Promise<Generation[]> {
  // TODO этап 6: через Supabase-клиент (fetchHistory)
  return [];
}

/** Этап 7: серверная валидация подписки. */
export async function fetchSubscription(): Promise<SubscriptionState> {
  // TODO этап 7: GET /subscription
  return { status: "none", entitlement: null };
}
