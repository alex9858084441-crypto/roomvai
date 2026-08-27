/**
 * Этап 1: навигационная заглушка настроек.
 * Этап 7: управление подпиской, смена языка, выход.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.row} onPress={() => undefined}>
        <Text style={styles.rowText}>{t("settings.manage")}</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => undefined}>
        <Text style={styles.rowText}>{t("settings.support")}</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => undefined}>
        <Text style={styles.rowText}>{t("settings.language")}</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => navigation.navigate("Auth")}>
        <Text style={[styles.rowText, { color: COLORS.error }]}>
          {t("settings.logout")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  row: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowText: { color: COLORS.text, fontSize: 16 },
});
