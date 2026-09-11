/**
 * Этап 6: экран результатов со свайпером.
 * Свайп между оригиналами и сгенерированными вариантами.
 * Кнопки: Сохранить (в галерею), Поделиться, Сгенерировать ещё.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import type { Generation } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Result">;

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
// Резервируем место под точки пагинации (~40px) и 3 кнопки + отступы (~200px).
const IMAGE_HEIGHT = SCREEN_HEIGHT - 250;

export function ResultScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { generationId: string; originalImageUris: string[] } };
}) {
  const { t } = useTranslation();
  const { generationId, originalImageUris } = route.params;
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetchGeneration(generationId)
      .then((gen) => {
        if (!cancelled) setGeneration(gen);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [generationId]);

  // Оригиналы + результаты в едином списке для свайпера.
  const slides: { uri: string; label: string }[] = [
    ...originalImageUris.map((uri, i) => ({
      uri,
      label: `${t("result.original")} ${i + 1}`,
    })),
    ...(generation?.results
      .filter((r) => r.result_image_url)
      .map((r) => ({
        uri: assetUrl(r.result_image_url) ?? "",
        label: t(`style.${r.style}`),
      })) ?? []),
  ];

  const onScroll = (e: any) => {
    const index = Math.round(
      e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width,
    );
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

  // Состояние загрузки: ждём ответа от бэкенда.
  if (generation === null && !loadError && slides.length === 0) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t("generating.title")}</Text>
      </View>
    );
  }

  // Состояние ошибки: не удалось получить результаты.
  if (loadError && slides.length === 0) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.errorText}>{t("errors.generationFailed")}</Text>
        <Text style={styles.errorDetail}>{loadError}</Text>
        <Pressable style={styles.btn} onPress={handleAgain}>
          <Text style={styles.btnText}>🔄 {t("result.again")}</Text>
        </Pressable>
      </View>
    );
  }

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
            {imgErrors[i] ? (
              <View style={styles.imgError}>
                <Text style={styles.imgErrorText}>
                  ⚠️ {t("result.noResults")}
                </Text>
                <Text style={styles.imgErrorUri}>{slide.uri}</Text>
              </View>
            ) : (
              <Image
                source={{ uri: slide.uri }}
                style={styles.image}
                resizeMode="contain"
                onError={() => setImgErrors((prev) => ({ ...prev, [i]: true }))}
              />
            )}
            <View style={styles.labelBadge}>
              <Text style={styles.labelText}>{slide.label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Точки пагинации */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
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
  centerWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  errorDetail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
  swiper: { flex: 1 },
  // Явные пиксельные размеры — width:"100%"/height:"100%" в горизонтальном
  // ScrollView дают 0 для удалённых (HTTP) изображений: RN не знает размеры
  // до загрузки → циклическая зависимость → высота 0 → чёрный экран.
  slide: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  image: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imgError: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  imgErrorText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "600",
  },
  imgErrorUri: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
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
