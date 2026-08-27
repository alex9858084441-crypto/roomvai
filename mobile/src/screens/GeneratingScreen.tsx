/**
 * Этап 1: навигационная заглушка генерации.
 * Этап 4-5: запуск + опрос статуса (webhook, fallback backoff).
 * Этап 5: анимация прогресса + факты о дизайне (раздел 5).
 */

import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, SPACING } from "../constants/theme";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Generating">;

const FACT_KEYS = [
  "generating.fact1",
  "generating.fact2",
  "generating.fact3",
  "generating.fact4",
  "generating.fact5",
] as const;

export function GeneratingScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { imageUri: string; styles: import("../types").StyleId[] } };
}) {
  const { t } = useTranslation();
  const { imageUri, styles } = route.params;
  const [factIndex, setFactIndex] = useState(0);

  // Циклически показываем факты о дизайне, снижая тревогу ожидания (раздел 5).
  useEffect(() => {
    track("generation_started");
    const timer = setInterval(
      () => setFactIndex((i) => (i + 1) % FACT_KEYS.length),
      3000,
    );
    return () => clearInterval(timer);
  }, []);

  // Этап 4: после получения generationId → навигация на Result.
  // Сейчас — заглушка, просто держим UI.
  void imageUri;
  void styles;

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.title}>{t("generating.title")}</Text>
      <Text style={styles.subtitle}>{t("generating.subtitle")}</Text>
      <Text style={styles.fact}>{t(FACT_KEYS[factIndex])}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: SPACING.lg,
  },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginTop: SPACING.xs },
  fact: {
    color: COLORS.primary,
    fontSize: 14,
    textAlign: "center",
    marginTop: SPACING.xl,
    lineHeight: 20,
  },
});
