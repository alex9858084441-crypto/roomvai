/**
 * Обёртка над RevenueCat. Реализация наполняется на этапе 7 (paywall).
 * Сейчас — стаб.
 */

import type { PlanId, SubscriptionState } from "../../types";

export const isRevenueCatConfigured = (): boolean =>
  Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);

/** Этап 7: инициализация SDK с публичным ключом */
export async function initRevenueCat(_userId?: string): Promise<void> {
  // TODO этап 7: Purchases.configure({ apiKey, appUserID })
}

/** Этап 7: покупка тарифа */
export async function purchasePlan(_planId: PlanId): Promise<boolean> {
  // TODO этап 7: Purchases.purchasePackage()
  return false;
}

/** Этап 7: восстановление покупок */
export async function restorePurchases(): Promise<SubscriptionState | null> {
  // TODO этап 7: Purchases.restorePurchases()
  return null;
}

/** Этап 7: клиентская проверка entitlement (только для UX, не для авторизации) */
export async function getCustomerInfo(): Promise<SubscriptionState | null> {
  // TODO этап 7: Purchases.getCustomerInfo()
  return null;
}
