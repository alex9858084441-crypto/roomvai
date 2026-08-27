/**
 * Этап 1: навигационная заглушка результата.
 * Этап 6: свайпер между оригиналом и вариантами + действия.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Result">;

export function ResultScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { generationId: string; originalImageUri: string } };
}) {
  const { t } = useTranslation();
  const { originalImageUri } = route.params;

  // Этап 6: свайпер (ScrollView pagingEnabled / react-native-reanimated)
  void originalImageUri;

  return (
    <View style={styles.wrap}>
      <View style={styles.swiperPlaceholder} />
      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => undefined}>
          <Text style={styles.btnText}>💾 {t("result.save")}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => undefined}>
          <Text style={styles.btnText}>📤 {t("result.share")}</Text>
        </Pressable>
        <Pressable
          style={styles.btnSecondary}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.btnTextDark}>🔄 {t("result.again")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  swiperPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  actions: { gap: SPACING.sm },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnSecondary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  btnTextDark: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
});
