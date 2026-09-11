/**
 * Хук проверки сетевого соединения (раздел 7).
 * Использует @react-native-community/netinfo — нативный SDK,
 * который корректно отслеживает WiFi/Cellular/None без polling.
 */

import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(
        Boolean(state.isConnected) && Boolean(state.isInternetReachable),
      );
    });

    // Первичная проверка при монтировании.
    NetInfo.fetch().then((state) => {
      setIsOnline(
        Boolean(state.isConnected) && Boolean(state.isInternetReachable),
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline };
}
