/**
 * Аналитика (PostHog). Реализация наполняется на этапе 9.
 * Сейчас — стаб, логирующий события в консоль.
 */

export const isAnalyticsConfigured = (): boolean =>
  Boolean(process.env.EXPO_PUBLIC_POSTHOG_KEY);

/** Воронка событий (раздел 7 промпта). */
export const AnalyticsEvent = {
  Install: "install",
  OnboardingCompleted: "onboarding_completed",
  FirstPhotoTaken: "first_photo_taken",
  GenerationStarted: "generation_started",
  GenerationCompleted: "generation_completed",
  PaywallViewed: "paywall_shown",
  TrialStarted: "trial_started",
  SubscriptionPurchased: "subscription_purchased",
  SubscriptionCancelled: "subscription_cancelled",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** Этап 9: PostHog.capture(). */
export function track(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  // TODO этап 9: posthog.capture(event, properties)
  if (__DEV__) {
    console.log(`[analytics] ${event}`, properties ?? "");
  }
}

/** Этап 9: идентификация пользователя. */
export function identifyUser(_userId: string): void {
  // TODO этап 9: posthog.identify()
}

/** Этап 9: сброс при логауте. */
export function resetUser(): void {
  // TODO этап 9: posthog.reset()
}
