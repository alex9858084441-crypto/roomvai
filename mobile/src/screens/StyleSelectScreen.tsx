/**
 * Этап 1: навигационная заглушка выбора стилей (мультивыбор до 3).
 * Этап 5: реальные стили + ограничение free-тарифа (1 стиль).
 */

import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { MAX_STYLES_FREE, MAX_STYLES_PRO } from "../constants/plans";
import { uploadImage } from "../services/api/client";
import { getCurrentUserId } from "../services/supabase/client";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";
import type { StyleId } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList, "StyleSelect">;

const STYLE_IDS: StyleId[] = [
  "scandinavian",
  "loft",
  "minimalism",
  "classic",
  "japandi",
  "industrial",
  "boho",
  "art_deco",
];

export function StyleSelectScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { imageUris: string[] } };
}) {
  const { t } = useTranslation();
  const { imageUris } = route.params;
  const [selected, setSelected] = useState<Set<StyleId>>(new Set());
  const [uploading, setUploading] = useState(false);

  // TODO этап 7: проверка подписки → maxStyles = MAX_STYLES_PRO
  const maxStyles = MAX_STYLES_FREE;

  const toggle = (id: StyleId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxStyles) next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selected.size === 0) return;
    setUploading(true);
    try {
      // Загружаем все фото на бэкенд → получаем подписанные URL для VseGPT.
      const userId = await getCurrentUserId();
      const uploadedUrls = await Promise.all(
        imageUris.map((uri) => uploadImage(uri, userId)),
      );

      track("photos_uploaded", { count: uploadedUrls.length });

      navigation.navigate("Generating", {
        imageUris: uploadedUrls.map((r) => r.url),
        styles: [...selected],
      });
    } catch (e) {
      track("upload_failed", { error: String(e) });
      alert(
        `${t("common.error")}: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: StyleId }) => {
    const isActive = selected.has(item);
    return (
      <Pressable
        onPress={() => toggle(item)}
        style={[styles.card, isActive && styles.cardActive]}
      >
        <Text style={styles.cardTitle}>{t(`style.${item}`)}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {t("home.selectStyles", { count: `${selected.size}/${maxStyles}` })}
      </Text>
      <FlatList
        data={STYLE_IDS}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        numColumns={2}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        columnWrapperStyle={{ justifyContent: "space-between" }}
      />
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.uploadText}>{t("common.loading")}</Text>
        </View>
      )}
      <Pressable
        style={[styles.btn, (selected.size === 0 || uploading) && styles.btnDisabled]}
        disabled={selected.size === 0 || uploading}
        onPress={handleGenerate}
      >
        <Text style={styles.btnText}>{t("home.generate")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: "48%",
    alignItems: "center",
  },
  cardActive: { borderColor: COLORS.primary, borderWidth: 2 },
  cardTitle: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    color: "#fff",
    fontSize: 14,
    marginTop: SPACING.sm,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#1a1300", fontWeight: "700", fontSize: 16 },
});
