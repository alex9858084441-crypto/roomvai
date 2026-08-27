/**
 * Этап 8: экран настроек. Этап 7: управление подпиской.
 */

import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { signOut } from "../services/supabase/client";
import { resetUser } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut();
      resetUser();
      navigation.replace("Auth");
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("Paywall")}
      >
        <Text style={styles.rowText}>{t("settings.manage")}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => undefined}>
        <Text style={styles.rowText}>{t("settings.support")}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={() => undefined}>
        <Text style={styles.rowText}>{t("settings.language")}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={handleLogout}>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: { color: COLORS.text, fontSize: 16 },
  chevron: { color: COLORS.textMuted, fontSize: 20 },
});
