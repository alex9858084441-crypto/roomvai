/** TypeScript-типы для навигации. */

import type { StyleId } from "./index";

export type RootStackParamList = {
  // Порядок онбординга
  Onboarding: undefined;
  Consent: undefined;
  // Основной флоу
  Home: undefined;
  Camera: undefined;
  StyleSelect: { imageUri: string };
  Generating: {
    imageUri: string;
    styles: StyleId[];
    generationId?: string;
  };
  Result: {
    generationId: string;
    originalImageUri: string;
  };
  // Монетизация и аккаунт
  Paywall: { showAfterFree?: boolean } | undefined;
  History: undefined;
  Settings: undefined;
  Auth: undefined;
};
