/**
 * Инициализация i18next. Этап 10: переключатель языка с сохранением выбора.
 *
 * Локаль определяется так:
 * 1. Сохранённый пользователем выбор (AsyncStorage) — высший приоритет.
 * 2. Язык устройства.
 * 3. Fallback: ru.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ru from "./ru.json";
import en from "./en.json";

export type AppLanguage = "ru" | "en";

const STORAGE_KEY = "roomvai.language";
const SUPPORTED: AppLanguage[] = ["ru", "en"];

const deviceLanguage = getLocales()[0]?.languageCode ?? "ru";
const initialLang: AppLanguage = deviceLanguage === "en" ? "en" : "ru";

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

/** Сохранённый пользователем язык (если есть) — применяется при старте. */
export async function loadSavedLanguage(): Promise<AppLanguage | null> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved as AppLanguage)) {
      await i18n.changeLanguage(saved);
      return saved as AppLanguage;
    }
  } catch {
    // AsyncStorage недоступен — работаем с языком устройства.
  }
  return null;
}

/** Переключение языка с сохранением выбора (раздел 7: i18n с первого дня). */
export async function changeLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Сохранение не удалось — переключение в текущей сессии всё равно работает.
  }
}

/** Текущий активный язык. */
export function getCurrentLanguage(): AppLanguage {
  return (i18n.language as AppLanguage) ?? "ru";
}

export default i18n;
