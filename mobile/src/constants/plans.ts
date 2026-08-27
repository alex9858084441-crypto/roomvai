/** Каталог планов подписки (раздел 6 промпта). */

import type { Plan } from "../types";

export const PLANS: Plan[] = [
  {
    id: "weekly",
    priceLabel: "690 ₽",
    titleKey: "paywall.weekly",
  },
  {
    id: "monthly",
    priceLabel: "2490 ₽",
    titleKey: "paywall.monthly",
  },
  {
    id: "yearly",
    priceLabel: "9990 ₽",
    titleKey: "paywall.yearly",
    badgeKey: "paywall.yearlyBadge",
  },
];

/** Число бесплатных генераций по тарифу (раздел 6). */
export const FREE_GENERATIONS_NO_AUTH = 1;
export const FREE_GENERATIONS_WITH_AUTH = 1;
export const MAX_STYLES_PRO = 3;
export const MAX_STYLES_FREE = 1;
