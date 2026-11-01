"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { StatsNotReadyError, fetchReadingStats, type ReadingStats } from "@/lib/stats";

export type StatsState =
  | { status: "loading" }
  /** Ключи Supabase не заданы: аккаунтов на сайте нет */
  | { status: "disabled" }
  /** Пользователь не вошёл */
  | { status: "guest" }
  /** В базе ещё не выполнена SQL-миграция */
  | { status: "not_ready" }
  | { status: "error" }
  | { status: "ready"; stats: ReadingStats };

/** Загружает статистику текущего пользователя из Supabase */
export function useStatsData(): StatsState {
  const { user, ready, enabled } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<StatsState>({ status: "loading" });
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !supabase) {
      setState({ status: "disabled" });
      return;
    }
    if (!ready) {
      return;
    }
    if (!userId) {
      setState({ status: "guest" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    fetchReadingStats(supabase)
      .then((stats) => {
        if (!cancelled) {
          setState({ status: "ready", stats });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: error instanceof StatsNotReadyError ? "not_ready" : "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, ready, supabase, userId]);

  return state;
}
