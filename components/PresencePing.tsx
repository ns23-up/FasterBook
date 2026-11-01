"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { markActive } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

/** Как часто сообщаем «я на сайте». Друг считается онлайн, если отметка была за 5 минут. */
const PING_MS = 2 * 60 * 1000;

/**
 * Невидимый компонент: пока вошедший пользователь на сайте и вкладка видна,
 * раз в 2 минуты отмечает его активность для «Друзья онлайн».
 */
export function PresencePing() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id;

  useEffect(() => {
    if (!supabase || !userId) {
      return;
    }
    let stopped = false;
    const ping = () => {
      if (!document.hidden) {
        markActive(supabase).catch(() => {
          // Миграция «онлайн» не выполнена или нет сети — просто не отмечаемся
        });
      }
    };
    ping();
    const timer = window.setInterval(ping, PING_MS);
    const onVisible = () => {
      if (!document.hidden && !stopped) {
        ping();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, userId]);

  return null;
}
