import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { StyleSelector } from "../components/StyleSelector";
import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { fetchStyles } from "../services/api";
import { uploadAndGenerate } from "../services/api";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import type { StyleInfo } from "../types";

type HomeNav = NativeStackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeNav;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStyles()
      .then(setStyles)
      .catch((e) => setError(e.message));
  }, []);

  const toggleStyle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Нужен доступ к камере");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleGenerate = async () => {
    if (!imageUri || selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const job = await uploadAndGenerate(
        imageUri,
        [...selected],
        "living_room",
      );
      navigation.navigate("Result", {
        jobId: job.job_id,
        originalImageUri: imageUri,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={screen.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={screen.muted}>Отправка фото…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={screen.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={screen.title}>RoomVAI</Text>
      <Text style={screen.subtitle}>
        Сфотографируйте помещение и увидьте его в новых стилях
      </Text>

      {/* Превью выбранного фото */}
      <View style={screen.previewWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={screen.preview} />
        ) : (
          <View style={[screen.preview, screen.previewEmpty]}>
            <Text style={screen.muted}>Нет фото</Text>
          </View>
        )}
      </View>

      <View style={screen.row}>
        <Pressable style={[screen.btn, screen.btnPrimary]} onPress={pickImage}>
          <Text style={screen.btnText}>📷 Снять</Text>
        </Pressable>
        <Pressable style={[screen.btn, screen.btnSecondary]} onPress={pickFromGallery}>
          <Text style={screen.btnTextDark}>🖼 Галерея</Text>
        </Pressable>
      </View>

      <Text style={screen.sectionTitle}>Выберите стили ({selected.size}/6)</Text>
      <StyleSelector styles={styles} selected={selected} onToggle={toggleStyle} />

      {error && <Text style={screen.error}>{error}</Text>}

      <Pressable
        style={[screen.generateBtn, (!imageUri || selected.size === 0) && { opacity: 0.4 }]}
        disabled={!imageUri || selected.size === 0}
        onPress={handleGenerate}
      >
        <Text style={screen.generateBtnText}>Сгенерировать ({selected.size})</Text>
      </Pressable>
    </ScrollView>
  );
}

const screen = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 26, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.md },
  previewWrap: { marginBottom: SPACING.md },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: "center" },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.surface },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  btnTextDark: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "700", marginBottom: SPACING.sm },
  error: { color: COLORS.error, marginTop: SPACING.sm, fontSize: 13 },
  generateBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  generateBtnText: { color: "#1a1300", fontWeight: "700", fontSize: 16 },
  muted: { color: COLORS.textMuted, marginTop: SPACING.sm },
});
