import "react-native-gesture-handler";
import "./src/locales";

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { initAnalytics } from "./src/services/api/analytics";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ConsentScreen } from "./src/screens/ConsentScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CameraScreen } from "./src/screens/CameraScreen";
import { StyleSelectScreen } from "./src/screens/StyleSelectScreen";
import { GeneratingScreen } from "./src/screens/GeneratingScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { PaywallScreen } from "./src/screens/PaywallScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { COLORS } from "./src/constants/theme";
import type { RootStackParamList } from "./src/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // Этап 9: инициализация аналитики (PostHog) при старте приложения.
    void initAnalytics();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Onboarding"
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.bg },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: COLORS.bg },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Consent"
            component={ConsentScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "RoomVAI" }}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ title: "Камера" }}
          />
          <Stack.Screen
            name="StyleSelect"
            component={StyleSelectScreen}
            options={{ title: "Стили" }}
          />
          <Stack.Screen
            name="Generating"
            component={GeneratingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{ title: "Результат" }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ title: "RoomVAI Pro" }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: "История" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Настройки" }}
          />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ title: "Вход" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
