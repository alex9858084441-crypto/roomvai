/**
 * Хук проверки статуса подписки и квоты.
 * Этап 7: серверная валидация (раздел 6 — не доверять только клиенту).
 */

import { useCallback, useEffect, useState } from "react";

import { fetchSubscription } from "../services/api/client";
import { getCurrentUserId } from "../services/supabase/client";
import type { SubscriptionState } from "../types";

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    status: "none",
    entitlement: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const sub = await fetchSubscription();
        setState(sub);
      } else {
        setState({ status: "none", entitlement: null });
      }
    } catch {
      setState({ status: "none", entitlement: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPremium = state.entitlement === "premium" || state.status === "active";

  return { state, isPremium, loading, refresh };
}
