import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS, SPACING } from "../constants/theme";

interface ProgressOverlayProps {
  progress: number; // 0..1
  status: string;
}

export function ProgressOverlay({ progress, status }: ProgressOverlayProps) {
  const pct = Math.round(progress * 100);
  return (
    <View style={overlayStyles.wrap}>
      <View style={overlayStyles.card}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={overlayStyles.text}>
          Генерация… {pct}%
        </Text>
        <Text style={overlayStyles.subtext}>{status}</Text>
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: "center",
    minWidth: 200,
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: SPACING.md,
  },
  subtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: SPACING.xs,
  },
});
