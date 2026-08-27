/**
 * Этап 6: история генераций (для авторизованных/платных).
 * Список из Supabase с миниатюрами исходных фото.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { fetchHistory } from "../services/supabase/client";
import type { RootStackParamList } from "../types/navigation";
import type { Generation } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList, "History">;

export function HistoryScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setItems)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>📂</Text>
        <Text style={styles.text}>{t("history.empty")}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Generation }) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        navigation.navigate("Result", {
          generationId: item.id,
          originalImageUri: item.source_image_url ?? "",
        })
      }
    >
      {item.source_image_url ? (
        <Image source={{ uri: item.source_image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>
          {item.results?.length ?? 0} {t("history.title").toLowerCase()}
        </Text>
        <Text style={styles.cardDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: SPACING.md }}
      ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  text: { color: COLORS.textMuted, fontSize: 15, textAlign: "center" },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
  },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardInfo: { marginLeft: SPACING.md, flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
  cardDate: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
});
