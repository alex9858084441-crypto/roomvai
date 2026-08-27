/**
 * Этап 7: paywall с RevenueCat.
 * Раздел 5: показывается ПОСЛЕ первой бесплатной генерации (не до неё).
 * Раздел 6: клиентская покупка + серверная валидация статуса.
 */

import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { PLANS } from "../constants/plans";
import { track } from "../services/api/analytics";
import { purchasePlan, restorePurchases } from "../services/revenuecat/client";
import type { PlanId } from "../types";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Paywall">;

export function PaywallScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("yearly");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    track("paywall_shown");
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const success = await purchasePlan(selectedPlan);
      if (success) {
        track("subscription_purchased");
        navigation.replace("Home");
      } else {
        Alert.alert(t("common.error"), t("errors.generationFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result?.status === "active") {
        navigation.replace("Home");
      } else {
        Alert.alert(t("common.error"), "");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>✨</Text>
      <Text style={styles.title}>{t("paywall.title")}</Text>
      <Text style={styles.subtitle}>{t("paywall.subtitle")}</Text>

      {PLANS.map((plan) => {
        const isSelected = plan.id === selectedPlan;
        return (
          <Pressable
            key={plan.id}
            style={[styles.planCard, isSelected && styles.planCardActive]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>{t(plan.titleKey)}</Text>
              {plan.badgeKey ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t(plan.badgeKey)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.planPrice}>{plan.priceLabel}</Text>
          </Pressable>
        );
      })}

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubscribe}
        disabled={loading}
      >
        <Text style={styles.btnText}>{t("paywall.subscribe")}</Text>
      </Pressable>

      <Pressable onPress={handleRestore} disabled={loading}>
        <Text style={styles.restore}>{t("paywall.restore")}</Text>
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  planCardActive: { borderColor: COLORS.primary },
  planInfo: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
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
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  restore: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.md,
    fontSize: 14,
  },
});
