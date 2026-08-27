/** Доменные типы, синхронизированные с backend-схемами и БД. */

export type StyleId =
  | "scandinavian"
  | "loft"
  | "minimalism"
  | "classic"
  | "japandi"
  | "industrial"
  | "boho"
  | "art_deco";

export interface StyleInfo {
  id: StyleId;
  name: string;
  description: string;
  preview_url?: string;
}

export type RoomType =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "office"
  | "other";

export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface GenerationResult {
  id?: string;
  style: StyleId;
  status: GenerationStatus | string;
  result_image_url?: string;
  cost_usd?: number;
  error?: string;
}

export interface Generation {
  id: string;
  user_id?: string | null;
  source_image_url?: string;
  room_type?: RoomType;
  status: GenerationStatus;
  results: GenerationResult[];
  created_at?: string;
  completed_at?: string;
}

/** Тарифы подписки. */
export type PlanId = "weekly" | "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  /** Локализованная цена, напр. "690 ₽" / "$6.99" */
  priceLabel: string;
  titleKey: string;
  badgeKey?: string;
}

export type SubscriptionStatus = "active" | "expired" | "cancelled" | "none";

export interface SubscriptionState {
  status: SubscriptionStatus;
  entitlement: "premium" | null;
  plan?: PlanId;
  expiresAt?: string;
}

/** Согласие на обработку данных (GDPR / 152-ФЗ). */
export interface ConsentState {
  photoProcessingConsent: boolean;
  policyVersion: string;
}
