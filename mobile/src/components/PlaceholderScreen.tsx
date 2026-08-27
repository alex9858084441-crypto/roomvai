/**
 * Базовый экран-заглушка для этапа 1 (навигация без функционала).
 * Отображает название экрана и его t-ключ. Заменяется реальным UI на последующих этапах.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING } from "../constants/theme";

interface PlaceholderScreenProps {
  title: string;
  hint?: string;
}

export function PlaceholderScreen({ title, hint }: PlaceholderScreenProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: SPACING.xs,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
