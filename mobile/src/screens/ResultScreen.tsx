import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProgressOverlay } from "../components/ProgressOverlay";
import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { useJobPolling } from "../hooks/useJobPolling";
import { assetUrl } from "../services/api";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";

type ResultNav = NativeStackNavigationProp<RootStackParamList, "Result">;

interface ResultScreenProps {
  navigation: ResultNav;
  route: { params: { jobId: string; originalImageUri: string } };
}

export function ResultScreen({ route }: ResultScreenProps) {
  const { jobId, originalImageUri } = route.params;
  const { job, error, isDone } = useJobPolling(jobId);

  const completed = job?.results.filter((r) => r.image_url) ?? [];

  return (
    <ScrollView style={res.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={res.originalWrap}>
        <Text style={res.label}>Оригинал</Text>
        <Image source={{ uri: originalImageUri }} style={res.original} />
      </View>

      {error && <Text style={res.error}>{error}</Text>}

      {completed.length > 0 && (
        <>
          <Text style={res.sectionTitle}>Варианты ({completed.length})</Text>
          {completed.map((r) => (
            <View key={r.style} style={res.card}>
              <Image source={{ uri: assetUrl(r.image_url)! }} style={res.resultImg} />
              <Text style={res.styleName}>{r.style}</Text>
            </View>
          ))}
        </>
      )}

      {job?.status === "failed" && (
        <Text style={res.error}>Генерация не удалась. Попробуйте ещё раз.</Text>
      )}

      {!isDone && (
        <ProgressOverlay progress={job?.progress ?? 0} status={job?.status ?? "pending"} />
      )}
    </ScrollView>
  );
}

const res = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md },
  originalWrap: { marginBottom: SPACING.md },
  label: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  original: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.lg,
  },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: SPACING.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  resultImg: {
    width: "100%",
    height: 260,
    borderRadius: RADIUS.md,
  },
  styleName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    marginTop: SPACING.sm,
    textTransform: "capitalize",
  },
  error: { color: COLORS.error, fontSize: 13, marginBottom: SPACING.sm },
});
