import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import type { StyleInfo } from "../types";

interface StyleSelectorProps {
  styles: StyleInfo[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function StyleSelector({ styles, selected, onToggle }: StyleSelectorProps) {
  const renderItem = ({ item }: { item: StyleInfo }) => {
    const isActive = selected.has(item.id);
    return (
      <Pressable
        onPress={() => onToggle(item.id)}
        style={[styles__card, isActive && { borderColor: COLORS.primary, borderWidth: 2 }]}
      >
        {item.preview_url ? (
          <Image source={{ uri: item.preview_url }} style={styles__thumb} />
        ) : (
          <View style={[styles__thumb, { backgroundColor: COLORS.surfaceAlt }]} />
        )}
        <Text style={styles__name}>{item.name}</Text>
        <Text style={styles__desc} numberOfLines={2}>
          {item.description}
        </Text>
        {isActive && (
          <View style={styles__badge}>
            <Text style={styles__badgeText}>✓</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <FlatList
      data={styles}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      numColumns={2}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
      columnWrapperStyle={{ justifyContent: "space-between" }}
    />
  );
}

const styles__card = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    width: "48%",
    position: "relative",
  },
}).card;

const styles__thumb = StyleSheet.create({
  thumb: {
    width: "100%",
    height: 90,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
}).thumb;

const styles__name = {
  color: COLORS.text,
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 2,
} as const;

const styles__desc = {
  color: COLORS.textMuted,
  fontSize: 11,
} as const;

const styles__badge = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
}).badge;

const styles__badgeText = {
  color: "#fff",
  fontWeight: "700",
  fontSize: 12,
} as const;
