/**
 * Обёртка над RevenueCat. Этап 7.
 *
 * Раздел 6: клиентская проверка entitlement — только для UX (быстрый показ paywall).
 * Авторизующее решение — на бэкенде через GET /subscription (server-validated).
 *
 * Нативный SDK: react-native-purchases, подключается через expo prebuild.
 * Ленивый импорт позволяет mock-режиму работать без установленного пакета.
 */

import type { PlanId, SubscriptionState } from "../../types";
import { fetchSubscription } from "../api/client";

export const isRevenueCatConfigured = (): boolean =>
  Boolean(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY);

/**
 * Маппинг PlanId → идентификатор пакета в RevenueCat.
 * Совпадает с настройками продуктов в RC-дашборде.
 */
const PACKAGE_IDENTIFIERS: Record<PlanId, string> = {
  weekly: "$rc_weekly",
  monthly: "$rc_monthly",
  yearly: "$rc_annual",
};

/** Инициализация SDK. Вызывается один раз при старте приложения. */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isRevenueCatConfigured()) return;
  const { Purchases } = await import("react-native-purchases");
  Purchases.configure({
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!,
    appUserID: userId,
  });
  // Отключаем сбор аналитики — свой PostHog.
  Purchases.setLogLevel("warning");
}

/** Покупка тарифа. */
export async function purchasePlan(planId: PlanId): Promise<boolean> {
  if (!isRevenueCatConfigured()) return false;
  const { Purchases } = await import("react-native-purchases");
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages.find(
    (p) => p.identifier === PACKAGE_IDENTIFIERS[planId],
  );
  if (!pkg) return false;
  await Purchases.purchasePackage(pkg);
  return true;
}

/** Восстановление покупок. */
export async function restorePurchases(): Promise<SubscriptionState | null> {
  if (!isRevenueCatConfigured()) return null;
  const { Purchases } = await import("react-native-purchases");
  const info = await Purchases.restorePurchases();
  return mapCustomerInfo(info);
}

/**
 * Клиентская проверка entitlement (UX-only, раздел 6).
 * Авторизующее решение — через fetchSubscription() с бэкенда.
 */
export async function getCustomerInfo(): Promise<SubscriptionState | null> {
  if (!isRevenueCatConfigured()) return null;
  const { Purchases } = await import("react-native-purchases");
  const info = await Purchases.getCustomerInfo();
  return mapCustomerInfo(info);
}

/**
 * Серверная проверка подписки (раздел 6: не доверять только клиенту).
 * Это — авторизующий источник для решения о генерации.
 */
export async function getServerSubscriptionState(
  userId: string,
): Promise<SubscriptionState> {
  void userId;
  const sub = await fetchSubscription();
  return sub;
}

/**
 * Преобразование CustomerInfo RevenueCat в доменный тип SubscriptionState.
 */
function mapCustomerInfo(info: {
  entitlements: {
    active: Record<string, {
      productIdentifier: string;
      expirationDate: string | null;
      isActive: boolean;
    }>;
  };
}): SubscriptionState | null {
  const entitlement = info.entitlements.active["premium"];
  if (!entitlement || !entitlement.isActive) {
    return { status: "none", entitlement: null };
  }

  const productId = entitlement.productIdentifier;
  const plan: PlanId | undefined = productId.includes("weekly")
    ? "weekly"
    : productId.includes("monthly")
      ? "monthly"
      : productId.includes("annual") || productId.includes("yearly")
        ? "yearly"
        : undefined;

  const isExpired = entitlement.expirationDate
    ? new Date(entitlement.expirationDate).getTime() < Date.now()
    : false;

  return {
    status: isExpired ? "expired" : "active",
    entitlement: "premium",
    plan,
    expiresAt: entitlement.expirationDate ?? undefined,
  };
}
