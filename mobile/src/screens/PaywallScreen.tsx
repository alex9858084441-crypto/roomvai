/**
 * Этап 1: навигационная заглушка paywall.
 * Этап 7: RevenueCat + серверная валидация.
 * Раздел 5: показывается ПОСЛЕ первой бесплатной генерации.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { PLANS } from "../constants/plans";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Paywall">;

export function PaywallScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();

  // Этап 7: RevenueCat.purchasePlan(plan.id)
  const handleSubscribe = () => {
    track("paywall_shown");
    // TODO этап 7
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>✨</Text>
      <Text style={styles.title}>{t("paywall.title")}</Text>
      <Text style={styles.subtitle}>{t("paywall.subtitle")}</Text>

      {PLANS.map((plan) => (
        <View key={plan.id} style={styles.planCard}>
          <Text style={styles.planTitle}>{t(plan.titleKey)}</Text>
          <Text style={styles.planPrice}>{plan.priceLabel}</Text>
          {plan.badgeKey ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t(plan.badgeKey)}</Text>
            </View>
          ) : null}
        </View>
      ))}

      <Pressable style={styles.btn} onPress={handleSubscribe}>
        <Text style={styles.btnText}>{t("paywall.subscribe")}</Text>
      </Pressable>
      <Pressable style={styles.btnSecondary} onPress={() => undefined}>
        <Text style={styles.btnTextMuted}>{t("paywall.restore")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: SPACING.lg,
    justifyContent: "center",
  },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: SPACING.sm },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planTitle: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  planPrice: { color: COLORS.textMuted, fontSize: 16 },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#1a1300", fontSize: 11, fontWeight: "700" },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  btnSecondary: { paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextMuted: { color: COLORS.textMuted, fontSize: 14 },
});
