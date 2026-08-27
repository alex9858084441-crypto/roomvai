/**
 * Этап 8: полированный главный экран.
 * Индикатор оставшихся бесплатных генераций + кнопка настроек.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import {
  FREE_GENERATIONS_NO_AUTH,
  FREE_GENERATIONS_WITH_AUTH,
} from "../constants/plans";
import { useSubscription } from "../hooks/useSubscription";
import { getCurrentUserId } from "../services/supabase/client";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    getCurrentUserId().then(setUserId);
  }, []);

  const remaining = isPremium
    ? Infinity
    : (userId ? FREE_GENERATIONS_WITH_AUTH : FREE_GENERATIONS_NO_AUTH);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("home.title")}</Text>
        <Pressable onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>{t("home.subtitle")}</Text>

      <View style={styles.spacer} />

      <Pressable
        style={styles.btnPrimary}
        onPress={() => navigation.navigate("Camera")}
      >
        <Text style={styles.btnText}>📷 {t("home.camera")}</Text>
      </Pressable>

      <Pressable
        style={styles.btnSecondary}
        onPress={() => navigation.navigate("Camera")}
      >
        <Text style={styles.btnTextDark}>🖼 {t("home.gallery")}</Text>
      </Pressable>

      <View style={styles.spacer} />

      {!isPremium && (
        <Text style={styles.freeHint}>
          {t("home.freeHint", {
            remaining: remaining === Infinity ? "∞" : String(remaining),
          })}
        </Text>
      )}

      <Pressable
        style={styles.historyBtn}
        onPress={() => navigation.navigate("History")}
      >
        <Text style={styles.historyText}>{t("home.history")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
  },
  settingsIcon: { fontSize: 24 },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginBottom: SPACING.xxl,
  },
  spacer: { flex: 1 },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  btnSecondary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextDark: { color: COLORS.text, fontWeight: "600", fontSize: 16 },
  freeHint: {
    color: COLORS.accent,
    fontSize: 14,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  historyBtn: { alignSelf: "center", padding: SPACING.sm },
  historyText: { color: COLORS.textMuted, fontSize: 14 },
});
