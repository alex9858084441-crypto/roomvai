/**
 * Этап 6: экран результатов со свайпером.
 * Свайп между оригиналом и сгенерированными вариантами.
 * Кнопки: Сохранить (в галерею), Поделиться, Сгенерировать ещё.
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { fetchGeneration } from "../services/api/client";
import { assetUrl } from "../services/api/client";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";
import type { Generation, GenerationResult } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Result">;

export function ResultScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { generationId: string; originalImageUri: string } };
}) {
  const { t } = useTranslation();
  const { generationId, originalImageUri } = route.params;
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Запрос статуса — данные уже готовы (пришли с экрана генерации).
    fetchGeneration(generationId)
      .then(setGeneration)
      .catch(() => undefined);
  }, [generationId]);

  // Оригинал + результаты в едином списке для свайпера.
  const slides: { uri: string; label: string }[] = [
    { uri: originalImageUri, label: t("result.original") },
    ...(generation?.results
      .filter((r) => r.result_image_url)
      .map((r) => ({
        uri: assetUrl(r.result_image_url) ?? "",
        label: t(`style.${r.style}`),
      })) ?? []),
  ];

  const onScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
    setActiveIndex(index);
  };

  const handleSave = async () => {
    const slide = slides[activeIndex];
    if (!slide) return;
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("common.cameraDenied"));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(slide.uri);
      Alert.alert("✓", t("result.saved"));
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    }
  };

  const handleShare = async () => {
    const slide = slides[activeIndex];
    if (!slide) return;
    try {
      await Share.share({ url: slide.uri, message: "RoomVAI" });
    } catch {
      // Игнорируем отмену шеринга.
    }
  };

  const handleAgain = () => navigation.navigate("Home");

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.swiper}
      >
        {slides.map((slide, i) => (
          <View key={i} style={styles.slide}>
            <Image source={{ uri: slide.uri }} style={styles.image} resizeMode="cover" />
            <View style={styles.labelBadge}>
              <Text style={styles.labelText}>{slide.label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Точки пагинации */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={handleSave}>
          <Text style={styles.btnText}>💾 {t("result.save")}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={handleShare}>
          <Text style={styles.btnText}>📤 {t("result.share")}</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={handleAgain}>
          <Text style={styles.btnTextDark}>🔄 {t("result.again")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  swiper: { flex: 1 },
  slide: { width: "100%", flex: 1, justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  labelBadge: {
    position: "absolute",
    bottom: SPACING.md,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  labelText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  actions: { padding: SPACING.md, gap: SPACING.sm },
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
