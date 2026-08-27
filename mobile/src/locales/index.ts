/**
 * Инициализация i18next. Локаль определяется по языку устройства.
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import ru from "./ru.json";
import en from "./en.json";

const deviceLanguage = getLocales()[0]?.languageCode ?? "ru";

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: deviceLanguage === "en" ? "en" : "ru",
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

export default i18n;
