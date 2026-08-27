/**
 * Этап 1: навигационная заглушка истории.
 * Этап 6: список генераций из Supabase (для авторизованных/платных).
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { COLORS, SPACING } from "../constants/theme";

export function HistoryScreen() {
  const { t } = useTranslation();
  // TODO этап 6: fetchHistory() → FlatList

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>📂</Text>
      <Text style={styles.text}>{t("history.empty")}</Text>
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
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  text: { color: COLORS.textMuted, fontSize: 15, textAlign: "center" },
});
