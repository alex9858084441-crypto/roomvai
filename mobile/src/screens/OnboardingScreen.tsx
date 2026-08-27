/**
 * Этап 8: онбординг с wow-примерами до/после.
 * Раздел 5: нельзя пропустить быстрее чем за 2 сек на слайд.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Onboarding">;

const SLIDES = [
  { titleKey: "onboarding.title1", descKey: "onboarding.desc1", emoji: "📸" },
  { titleKey: "onboarding.title2", descKey: "onboarding.desc2", emoji: "🎨" },
  { titleKey: "onboarding.title3", descKey: "onboarding.desc3", emoji: "🏠" },
] as const;

const MIN_TIME_PER_SLIDE_MS = 2000;

export function OnboardingScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const isLast = index === SLIDES.length - 1;

  useEffect(() => {
    setCanProceed(false);
    const timer = setTimeout(() => setCanProceed(true), MIN_TIME_PER_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index]);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    if (isLast) {
      track("onboarding_completed");
      navigation.replace("Consent");
    } else {
      setIndex((i) => i + 1);
    }
  }, [canProceed, isLast, navigation]);

  const handleSkip = useCallback(() => {
    if (!canProceed) return;
    track("onboarding_completed");
    navigation.replace("Consent");
  }, [canProceed, navigation]);

  const slide = SLIDES[index];

  return (
    <View style={styles.wrap}>
      <View style={styles.skipWrap}>
        <Pressable onPress={handleSkip} disabled={!canProceed}>
          <Text style={[styles.skip, !canProceed && styles.skipDisabled]}>
            {t("common.cancel")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Wow-пример до/после */}
        <View style={styles.wowExample}>
          <View style={styles.wowFrame}>
            <Text style={styles.wowEmoji}>{slide.emoji}</Text>
            <Text style={styles.wowLabel}>{t("onboarding.before")}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={[styles.wowFrame, styles.wowFrameAfter]}>
            <Text style={styles.wowEmoji}>{slide.emoji}</Text>
            <Text style={styles.wowLabel}>{t("onboarding.after")}</Text>
          </View>
        </View>

        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.desc}>{t(slide.descKey)}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable
        style={[styles.btn, !canProceed && styles.btnDisabled]}
        disabled={!canProceed}
        onPress={handleNext}
      >
        <Text style={styles.btnText}>
          {isLast ? t("onboarding.start") : t("onboarding.next")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "space-between",
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  skipWrap: { alignItems: "flex-end", minHeight: 30 },
  skip: { color: COLORS.textMuted, fontSize: 14 },
  skipDisabled: { opacity: 0.3 },
  content: { alignItems: "center", flex: 1, justifyContent: "center" },
  wowExample: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  wowFrame: {
    width: 110,
    height: 110,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  wowFrameAfter: { backgroundColor: COLORS.primaryDark },
  wowEmoji: { fontSize: 40 },
  wowLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.xs,
  },
  arrow: { color: COLORS.textMuted, fontSize: 24 },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  desc: { color: COLORS.textMuted, fontSize: 15, textAlign: "center" },
  dots: { flexDirection: "row", justifyContent: "center", gap: SPACING.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
