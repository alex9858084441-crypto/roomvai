/**
 * Этап 3: камера/галерея + загрузка в Storage.
 * Съёмка фото → компрессия до 1536px → загрузка в Supabase Storage → переход к выбору стиля.
 * Обработка отказа в доступе (раздел 7).
 */

import React, { useState } from "react";
import {
  Alert,
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

export function CameraScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const proceedWithImage = async (rawUri: string) => {
    setLoading(true);
    try {
      // Компрессия до 1536px (раздел 4).
      const compressedUri = await compressImage(rawUri);

      // Загрузка в Supabase Storage (приватный bucket).
      const userId = await getCurrentUserId();
      let storagePath: string | null = null;
      if (userId) {
        storagePath = await uploadSourceImage(compressedUri, userId);
      }

      track("first_photo_taken");
      navigation.navigate("StyleSelect", {
        imageUri: compressedUri,
      });
      void storagePath;
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      await proceedWithImage(result.assets[0].uri);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      await proceedWithImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.viewfinder}>
        <Text style={styles.viewfinderHint}>📷</Text>
      </View>

      <Pressable
        style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
        onPress={takePhoto}
        disabled={loading}
      >
        <Text style={styles.btnText}>📷 {t("home.camera")}</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.btnSecondary, loading && styles.btnDisabled]}
        onPress={pickFromGallery}
        disabled={loading}
      >
        <Text style={styles.btnTextDark}>🖼 {t("home.gallery")}</Text>
      </Pressable>

      {loading ? <Text style={styles.loading}>{t("common.loading")}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "flex-end",
    padding: SPACING.lg,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinderHint: { fontSize: 64 },
  btn: {
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.surface },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnTextDark: { color: COLORS.text, fontWeight: "600", fontSize: 16 },
  loading: {
    color: COLORS.textMuted,
    textAlign: "center",
    fontSize: 13,
  },
});
