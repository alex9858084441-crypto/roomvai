/**
 * Экран авторизации. Этап 2: Supabase Auth (email + Google + Apple).
 */

import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS, RADIUS, SPACING } from "../constants/theme";
import { track } from "../services/api/analytics";
import { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail, getCurrentUserId } from "../services/supabase/client";
import { identifyUser } from "../services/api/analytics";
import type { RootStackParamList } from "../types/navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "Auth">;

export function AuthScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
      const userId = await getCurrentUserId();
      if (userId) identifyUser(userId);
      navigation.replace("Home");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    setError(null);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithApple();
      const userId = await getCurrentUserId();
      if (userId) identifyUser(userId);
      navigation.replace("Home");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🔑</Text>

      <Pressable
        style={styles.btnApple}
        onPress={() => handleOAuth("apple")}
        disabled={loading}
      >
        <Text style={styles.btnDark}> {t("auth.apple")}</Text>
      </Pressable>
      <Pressable
        style={styles.btnGoogle}
        onPress={() => handleOAuth("google")}
        disabled={loading}
      >
        <Text style={styles.btnDark}>G {t("auth.google")}</Text>
      </Pressable>

      <Text style={styles.or}>{t("auth.or")}</Text>

      <TextInput
        style={styles.input}
        placeholder={t("auth.email")}
        placeholderTextColor={COLORS.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={t("auth.password")}
        placeholderTextColor={COLORS.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.btnPrimary, loading && styles.btnDisabled]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {isSignUp ? t("auth.signUp") : t("auth.signIn")}
        </Text>
      </Pressable>

      <Pressable onPress={() => setIsSignUp((v) => !v)} disabled={loading}>
        <Text style={styles.toggle}>
          {isSignUp ? t("auth.signIn") : t("auth.signUp")}
        </Text>
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
  emoji: { fontSize: 48, textAlign: "center", marginBottom: SPACING.xl },
  btnApple: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  btnGoogle: {
    backgroundColor: "#fff",
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  btnDark: { color: "#000", fontWeight: "600", fontSize: 15 },
  or: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: SPACING.sm,
  },
  error: { color: COLORS.error, fontSize: 13, marginBottom: SPACING.sm },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  toggle: { color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.md },
});
