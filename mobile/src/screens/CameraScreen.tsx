/**
 * Этап 1: навигационная заглушка камеры. Этап 3: съёмка/выбор фото.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Camera">;

export function CameraScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();

  // Этап 3: expo-camera / expo-image-picker → imageUri → compressImage()
  const handleCapture = () => {
    // Заглушка: имитируем полученное фото.
    navigation.navigate("StyleSelect", {
      imageUri: "placeholder://room.jpg",
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.viewfinder} />
      <Pressable style={styles.btn} onPress={handleCapture}>
        <Text style={styles.btnText}>📷 {t("home.camera")}</Text>
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
  viewfinder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
