/**
 * API-клиент для общения с backend RoomVAI.
 */

import type { JobResponse, StyleInfo } from "../types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, "")}${path}`;
}

/** Абсолютный URL для ресурсов backend (сгенерированные изображения). */
export function assetUrl(relative: string | undefined): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith("http")) return relative;
  return `${API_URL.replace(/\/$/, "")}${relative}`;
}

export async function fetchStyles(): Promise<StyleInfo[]> {
  const res = await fetch(apiUrl("/styles"));
  if (!res.ok) throw new Error(`Не удалось загрузить стили (${res.status})`);
  return res.json();
}

export async function uploadAndGenerate(
  imageUri: string,
  styles: string[],
  roomType: string,
): Promise<JobResponse> {
  const form = new FormData();
  form.append("file", {
    uri: imageUri,
    name: "room.jpg",
    type: "image/jpeg",
  } as any);
  form.append("styles", styles.join(","));
  form.append("room_type", roomType);

  const res = await fetch(apiUrl("/generate"), {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Ошибка генерации (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function fetchJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(apiUrl(`/jobs/${jobId}`));
  if (!res.ok) throw new Error(`Задача не найдена (${res.status})`);
  return res.json();
}
