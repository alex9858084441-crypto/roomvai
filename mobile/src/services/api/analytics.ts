/**
 * Аналитика (PostHog). Этап 9.
 * Реализует воронку событий из раздела 7 промпта:
 * install → onboarding_completed → first_photo_taken → generation_started →
 * generation_completed → paywall_shown → trial_started → subscription_purchased →
 * subscription_cancelled
 */

import { PostHog } from "posthog-react-native";

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

let client: PostHog | null = null;

export const isAnalyticsConfigured = (): boolean => POSTHOG_KEY.length > 0;

/** Воронка событий (раздел 7). */
export const AnalyticsEvent = {
  Install: "install",
  OnboardingCompleted: "onboarding_completed",
  FirstPhotoTaken: "first_photo_taken",
  GenerationStarted: "generation_started",
  GenerationCompleted: "generation_completed",
  PaywallShown: "paywall_shown",
  TrialStarted: "trial_started",
  SubscriptionPurchased: "subscription_purchased",
  SubscriptionCancelled: "subscription_cancelled",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** Инициализация PostHog. Вызывается один раз при старте приложения. */
export async function initAnalytics(): Promise<void> {
  if (!isAnalyticsConfigured()) return;
  try {
    client = await PostHog.setupAsync(POSTHOG_KEY, {
      apiHost: POSTHOG_HOST,
      autocapture: false,
    });
    client?.capture(AnalyticsEvent.Install);
  } catch {
    // Аналитика не должна крашить приложение.
  }
}

/** Отправка события. */
export function track(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  if (client) {
    client.capture(event, properties);
  } else if (__DEV__) {
    console.log(`[analytics] ${event}`, properties ?? "");
  }
}

/** Идентификация пользователя. */
export function identifyUser(userId: string): void {
  client?.identify(userId);
}

/** Сброс при логауте. */
export function resetUser(): void {
  client?.reset();
}
