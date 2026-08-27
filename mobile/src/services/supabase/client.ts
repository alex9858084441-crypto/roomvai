/**
 * Supabase-клиент: Auth + DB + Storage.
 * Реализация этапа 2 (Auth) + 3 (Storage, частично).
 *
 * Ключи — публичные (anon), безопасны для клиента.
 * Чувствительные операции (запись результатов, валидация подписки)
 * выполняются на бэкенде через service_role.
 */

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import type { ConsentState, Generation, SubscriptionState } from "../../types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Кастомное хранилище сессии в SecureStore (безопаснее, чем AsyncStorage).
const expoSecureStore = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: expoSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = (): boolean =>
  SUPABASE_URL.includes("supabase.co") && SUPABASE_ANON_KEY.length > 0;

// ============================================================================
// AUTH
// ============================================================================

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

/** Вход через Google (раздел 3: обязательно при наличии других соц.логинов). */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });
  if (error) throw new Error(error.message);
}

/** Вход через Apple (Apple требует при наличии других соц.логинов). */
export async function signInWithApple(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ============================================================================
// STORAGE (этап 3 — здесь базовая загрузка)
// ============================================================================

/** Загружает фото в приватный bucket 'source-images' в папку пользователя. */
export async function uploadSourceImage(uri: string, userId: string): Promise<string | null> {
  const filename = `${userId}/${Date.now()}.jpg`;
  const fileExt = uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = fileExt === "png" ? "image/png" : "image/jpeg";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: filename,
    type: contentType,
  } as any);

  const { error } = await supabase.storage
    .from("source-images")
    .upload(filename, formData, { contentType });

  if (error) throw new Error(error.message);
  return filename;
}

/** Подписанный URL для приватного файла (срок действия 1 час). */
export async function getSignedUrl(
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// ============================================================================
// DB — генерации (этап 3-6)
// ============================================================================

export async function saveGeneration(
  generation: Partial<Generation> & { user_id?: string | null },
): Promise<Generation | null> {
  const { data, error } = await supabase
    .from("generations")
    .insert(generation)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Generation;
}

export async function fetchHistory(): Promise<Generation[]> {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Generation[];
}

// ============================================================================
// SUBSCRIPTIONS (этап 7 — клиентское чтение, валидация на бэкенде)
// ============================================================================

export async function fetchSubscriptionState(): Promise<SubscriptionState | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { status: "none", entitlement: null };
  return {
    status: data.status,
    entitlement: data.entitlement === "premium" ? "premium" : null,
    plan: data.plan,
    expiresAt: data.expires_at,
  };
}

// ============================================================================
// CONSENTS (GDPR / 152-ФЗ)
// ============================================================================

export async function saveConsent(
  userId: string | null,
  consent: ConsentState,
): Promise<void> {
  const { error } = await supabase.from("consents").insert({
    user_id: userId,
    photo_processing_consent: consent.photoProcessingConsent,
    policy_version: consent.policyVersion,
  });
  if (error) throw new Error(error.message);
}
