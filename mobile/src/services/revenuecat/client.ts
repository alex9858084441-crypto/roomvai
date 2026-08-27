/**
 * Обёртка над RevenueCat. Этап 7.
 *
 * Раздел 6: клиентская проверка entitlement — только для UX (быстрый показ paywall).
 * Авторизующее решение — на бэкенде через GET /subscription (server-validated).
 *
 * Нативный SDK подключается через expo-build-properties / prebuild.
 * Здесь — обёртка над purchases-react-native, вызываемая после инициализации.
 */

import type { PlanId, SubscriptionState } from "../../types";
import { fetchSubscription } from "../api/client";

export const isRevenueCatConfigured = (): boolean =>
  Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);

/** Инициализация SDK. Вызывается один раз при старте приложения. */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  // TODO: Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY, appUserID: userId })
}

/** Покупка тарифа. */
export async function purchasePlan(planId: PlanId): Promise<boolean> {
  if (!isRevenueCatConfigured()) return false;
  // TODO: Purchases.getOfferings() → find by planId → Purchases.purchasePackage()
  void planId;
  return false;
}

/** Восстановление покупок. */
export async function restorePurchases(): Promise<SubscriptionState | null> {
  if (!isRevenueCatConfigured()) return null;
  // TODO: Purchases.restorePurchases() → map to SubscriptionState
  return null;
}

/**
 * Клиентская проверка entitlement (UX-only, раздел 6).
 * Авторизующее решение — через fetchSubscription() с бэкенда.
 */
export async function getCustomerInfo(): Promise<SubscriptionState | null> {
  if (!isRevenueCatConfigured()) return null;
  // TODO: Purchases.getCustomerInfo() → check entitlement 'premium'
  return null;
}

/**
 * Серверная проверка подписки (раздел 6: не доверять только клиенту).
 * Это — авторизующий источник для решения о генерации.
 */
export async function getServerSubscriptionState(
  userId: string,
): Promise<SubscriptionState> {
  const sub = await fetchSubscription();
  return sub;
}
