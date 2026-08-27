/**
 * Экран «Нет соединения» (раздел 7: корректная работа без интернета).
 * Показывается при отсутствии сети, не крашит приложение.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { COLORS, SPACING } from "../constants/theme";

interface NoConnectionProps {
  onRetry?: () => void;
}

export function NoConnection({ onRetry }: NoConnectionProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>📡</Text>
      <Text style={styles.title}>{t("common.noConnection")}</Text>
      <Pressable style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>{t("common.retry")}</Text>
      </Pressable>
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
  emoji: { fontSize: 56, marginBottom: SPACING.md },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
