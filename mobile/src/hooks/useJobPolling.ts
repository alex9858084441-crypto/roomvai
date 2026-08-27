/**
 * Хук опроса статуса задачи генерации с интервалом.
 */

import { useEffect, useRef, useState } from "react";
import { fetchJob } from "../services/api";
import type { JobResponse } from "../types";

export function useJobPolling(jobId: string | null, intervalMs = 2000) {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    const poll = async () => {
      try {
        const data = await fetchJob(jobId);
        if (!active) return;
        setJob(data);
        setError(null);
        if (data.status === "completed" || data.status === "failed") {
          if (timer.current) clearInterval(timer.current);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    };

    poll();
    timer.current = setInterval(poll, intervalMs);

    return () => {
      active = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [jobId, intervalMs]);

  const isDone = job?.status === "completed" || job?.status === "failed";
  return { job, error, isDone };
}
