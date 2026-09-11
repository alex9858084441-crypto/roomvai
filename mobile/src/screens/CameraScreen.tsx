/**
 * Этап 3: камера/галерея + загрузка в Storage.
 * Мульти-съёмка: 2–4 фото комнаты с разных углов.
 * Компрессия до 1536px → загрузка в Supabase Storage → переход к выбору стиля.
 * Обработка отказа в доступе (раздел 7).
 */

import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { compressImage } from "../utils/image";
import { getCurrentUserId, uploadSourceImage } from "../services/supabase/client";
import { track } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Camera">;

export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 4;

export function CameraScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const canProceed = photos.length >= MIN_PHOTOS;
  const canAddMore = photos.length < MAX_PHOTOS;

  const addPhoto = async (rawUri: string) => {
    setLoading(true);
    try {
      const compressedUri = await compressImage(rawUri);

      // Загрузка в Supabase Storage (приватный bucket).
      const userId = await getCurrentUserId();
      if (userId) {
        await uploadSourceImage(compressedUri, userId);
      }

      setPhotos((prev) => [...prev, compressedUri]);
      track("photo_taken", { count: photos.length + 1 });
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : String(e),
      );
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("common.cameraDenied"), undefined, [
        { text: t("common.cancel") },
        { text: t("settings.title"), onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      await addPhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("common.cameraDenied"), undefined, [
        { text: t("common.cancel") },
        { text: t("settings.title"), onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });

    if (!result.canceled) {
      for (const asset of result.assets) {
        await addPhoto(asset.uri);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProceed = () => {
    if (!canProceed) return;
    navigation.navigate("StyleSelect", { imageUris: photos });
  };

  const renderPhoto = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.thumbWrap}>
      <Image source={{ uri: item }} style={styles.thumb} />
      <Pressable
        style={styles.removeBtn}
        onPress={() => removePhoto(index)}
      >
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
      <View style={styles.thumbBadge}>
        <Text style={styles.thumbBadgeText}>{index + 1}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("camera.title")}</Text>
        <Text style={styles.counter}>
          {photos.length}/{MAX_PHOTOS}
        </Text>
      </View>

      <Text style={styles.hint}>{t("camera.hint")}</Text>

      {/* Превью сделанных фото */}
      {photos.length > 0 ? (
        <FlatList
          data={photos}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderPhoto}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnails}
        />
      ) : (
        <View style={styles.viewfinder}>
          <Text style={styles.viewfinderHint}>📷</Text>
          <Text style={styles.viewfinderText}>{t("camera.emptyHint")}</Text>
        </View>
      )}

      {/* Кнопки добавления фото */}
      {canAddMore && (
        <View style={styles.addRow}>
          <Pressable
            style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={takePhoto}
            disabled={loading}
          >
            <Text style={styles.btnText}>📷 {t("camera.snap")}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary, loading && styles.btnDisabled]}
            onPress={pickFromGallery}
            disabled={loading}
          >
            <Text style={styles.btnTextDark}>🖼 {t("camera.gallery")}</Text>
          </Pressable>
        </View>
      )}

      {/* Подсказка о минимальном количестве */}
      {!canProceed && photos.length > 0 && (
        <Text style={styles.minHint}>
          {t("camera.minPhotos", { remaining: MIN_PHOTOS - photos.length })}
        </Text>
      )}

      {/* Кнопка перехода к выбору стиля */}
      <Pressable
        style={[styles.proceedBtn, !canProceed && styles.btnDisabled]}
        disabled={!canProceed || loading}
        onPress={handleProceed}
      >
        <Text style={styles.proceedBtnText}>
          {canProceed
            ? t("camera.proceed")
            : t("camera.needMore", { min: MIN_PHOTOS })}
        </Text>
      </Pressable>

      {loading && <Text style={styles.loading}>{t("common.loading")}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },
  counter: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderHint: { fontSize: 64, marginBottom: SPACING.sm },
  viewfinderText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
  },
  thumbnails: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 100,
    height: 130,
    borderRadius: RADIUS.md,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  thumbBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  addRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  btn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.surface },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextDark: { color: COLORS.text, fontWeight: "600", fontSize: 16 },
  minHint: {
    color: COLORS.accent,
    fontSize: 13,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  proceedBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  proceedBtnText: {
    color: "#1a1300",
    fontWeight: "700",
    fontSize: 16,
  },
  loading: {
    color: COLORS.textMuted,
    textAlign: "center",
    fontSize: 13,
    marginTop: SPACING.sm,
  },
});
