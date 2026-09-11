/**
 * Этап 4: запуск генерации через backend → опрос статуса.
 * Этап 5: мультистили. Анимация прогресса + факты (раздел 5).
 *
 * Статус приходит через webhook Replicate; клиент опрашивает /generations/:id
 * с exponential backoff (раздел 10: не каждую секунду).
 */

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, SPACING } from "../constants/theme";
import { startGeneration, fetchGeneration } from "../services/api/client";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";
import type { StyleId } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Generating">;

const FACT_KEYS = [
  "generating.fact1",
  "generating.fact2",
  "generating.fact3",
  "generating.fact4",
  "generating.fact5",
] as const;

const BACKOFF_STEPS = [2000, 3000, 5000, 8000, 13000, 15000, 15000]; // exponential backoff

export function GeneratingScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { imageUris: string[]; styles: StyleId[] } };
}) {
  const { t } = useTranslation();
  const { imageUris, styles } = route.params;
  const [factIndex, setFactIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    track("generation_started");
    let cancelled = false;

    // Цикл фактов о дизайне (снижение тревоги ожидания, раздел 5).
    const factTimer = setInterval(
      () => !cancelled && setFactIndex((i) => (i + 1) % FACT_KEYS.length),
      3000,
    );

    const run = async () => {
      try {
        const { generationId } = await startGeneration(
          imageUris,
          styles,
          "living_room",
        );

        // Опрос статуса с exponential backoff.
        const poll = async () => {
          if (cancelled) return;
          const gen = await fetchGeneration(generationId);

          if (gen.status === "completed" || gen.status === "failed") {
            if (gen.status === "completed" && gen.results.length) {
              track("generation_completed");
              navigation.replace("Result", {
                generationId,
                originalImageUris: imageUris,
              });
            } else {
              setError(t("errors.generationFailed"));
            }
            return;
          }

          // Следующая попытка с backoff.
          const delay = BACKOFF_STEPS[Math.min(attemptRef.current, BACKOFF_STEPS.length - 1)];
          attemptRef.current += 1;
          setTimeout(poll, delay);
        };

        poll();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      clearInterval(factTimer);
    };
  }, []);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.title}>{t("generating.title")}</Text>
      <Text style={styles.subtitle}>{t("generating.subtitle")}</Text>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.fact}>{t(FACT_KEYS[factIndex])}</Text>
      )}
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
  error: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: "center",
    marginTop: SPACING.xl,
  },
});
