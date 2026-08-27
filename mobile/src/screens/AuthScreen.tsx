/**
 * Этап 1: навигационная заглушка авторизации.
 * Этап 2: Supabase Auth (email + Google + Apple).
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Auth">;

export function AuthScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();

  // Этап 2: supabase.auth.signInWithOtp / OAuth (Google, Apple)
  const handleSignIn = () => {
    // TODO этап 2
    navigation.replace("Home");
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🔑</Text>

      <Pressable style={styles.btnApple} onPress={handleSignIn}>
        <Text style={styles.btnText}> {t("auth.apple")}</Text>
      </Pressable>
      <Pressable style={styles.btnGoogle} onPress={handleSignIn}>
        <Text style={styles.btnTextDark}>G {t("auth.google")}</Text>
      </Pressable>

      <Text style={styles.or}>{t("auth.or")}</Text>

      <Pressable style={styles.btnPrimary} onPress={handleSignIn}>
        <Text style={styles.btnText}>{t("auth.signIn")}</Text>
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
  emoji: { fontSize: 48, textAlign: "center", marginBottom: SPACING.xl },
  btnApple: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  btnGoogle: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  or: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#000", fontWeight: "600", fontSize: 15 },
  btnTextDark: { color: "#000", fontWeight: "600", fontSize: 15 },
});
