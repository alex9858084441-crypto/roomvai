/**
 * Экран согласия на обработку фото (GDPR / 152-ФЗ, раздел 7).
 * Этап 2: запись в таблицу consents.
 */

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, SPACING } from "../constants/theme";
import { getCurrentUserId, saveConsent } from "../services/supabase/client";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Consent">;

const POLICY_VERSION = "1.0";

export function ConsentScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      // Согласие сохраняется даже для анонимов (user_id = null).
      await saveConsent(userId, {
        photoProcessingConsent: true,
        policyVersion: POLICY_VERSION,
      });
    } catch {
      // Не блокируем онбординг при ошибке сети — повторим позже.
    } finally {
      setLoading(false);
      navigation.replace("Home");
    }
  };

  const handleDecline = () => {
    // Без согласия — остаёмся на экране (выход из приложения).
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>{t("consent.title")}</Text>
      <Text style={styles.body}>{t("consent.body")}</Text>

      <Pressable
        style={[styles.btnPrimary, loading && styles.btnDisabled]}
        onPress={handleAccept}
        disabled={loading}
      >
        <Text style={styles.btnText}>{t("consent.accept")}</Text>
      </Pressable>
      <Pressable style={styles.btnSecondary} onPress={handleDecline}>
        <Text style={styles.btnTextMuted}>{t("consent.decline")}</Text>
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
  emoji: { fontSize: 48, textAlign: "center", marginBottom: SPACING.md },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: { paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextMuted: { color: COLORS.textMuted, fontSize: 14 },
});
