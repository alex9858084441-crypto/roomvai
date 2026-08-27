/**
 * Supabase-клиент. Реализация наполняется на этапе 2 (Auth + DB + Storage).
 * Сейчас — стаб, возвращающий флаги готовности.
 */

import type { Generation, SubscriptionState } from "../../types";

export const isSupabaseConfigured = (): boolean =>
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL?.includes("supabase.co"));

/** Этап 2: auth.signIn / signUp / signInWithGoogle / signInWithApple */
export async function getCurrentUserId(): Promise<string | null> {
  // TODO этап 2: supabase.auth.getUser()
  return null;
}

export async function signOut(): Promise<void> {
  // TODO этап 2: supabase.auth.signOut()
}

/** Этап 2: загрузка фото в Storage */
export async function uploadImage(_uri: string): Promise<string | null> {
  // TODO этап 3: supabase.storage.from('images').upload(...)
  return null;
}

/** Этап 3: сохранение записи генерации */
export async function saveGeneration(
  _generation: Partial<Generation>,
): Promise<Generation | null> {
  // TODO этап 3: supabase.from('generations').insert(...)
  return null;
}

/** Этап 6: история */
export async function fetchHistory(): Promise<Generation[]> {
  // TODO этап 6: supabase.from('generations').select(...)
  return [];
}

/** Этап 7: серверный статус подписки (дубликат backend /subscription) */
export async function fetchSubscriptionState(): Promise<SubscriptionState | null> {
  // TODO этап 7
  return null;
}
