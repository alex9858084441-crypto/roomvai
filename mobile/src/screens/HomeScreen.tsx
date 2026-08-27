/**
 * Этап 1: главный экран (навигация). Этап 3: камера/галерея + загрузка.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("home.title")}</Text>
      <Text style={styles.subtitle}>{t("home.subtitle")}</Text>

      <Pressable
        style={styles.btnPrimary}
        onPress={() => navigation.navigate("Camera")}
      >
        <Text style={styles.btnText}>📷 {t("home.camera")}</Text>
      </Pressable>

      <Pressable
        style={styles.btnSecondary}
        onPress={() => navigation.navigate("Camera", undefined)}
      >
        <Text style={styles.btnTextDark}>🖼 {t("home.gallery")}</Text>
      </Pressable>

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
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginBottom: SPACING.xxl,
  },
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
  historyBtn: { alignSelf: "center", padding: SPACING.sm },
  historyText: { color: COLORS.textMuted, fontSize: 14 },
});
