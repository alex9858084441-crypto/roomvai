/**
 * Хук проверки сетевого соединения (раздел 7).
 */

import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Для продакшена рекомендуется @react-native-community/netinfo.
    // Здесь — упрощённая проверка через fetch к health-эндпоинту.
    let mounted = true;

    const check = async () => {
      try {
        const url =
          (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000") +
          "/health";
        const res = await fetch(url, { method: "GET" });
        if (mounted) setIsOnline(res.ok);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 15000);
    const subscription = AppState.addEventListener(
      "change",
      (_state: AppStateStatus) => check(),
    );

    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return { isOnline };
}
