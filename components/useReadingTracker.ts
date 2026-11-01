"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ReadingTracker } from "@/lib/reading-tracker";
import { createClient } from "@/lib/supabase/client";
import { sendBookFinished, sendReading } from "@/lib/stats";

/** Как часто отправляем накопленное время и слова, пока идёт чтение */
const FLUSH_INTERVAL_MS = 10_000;

/**
 * Считает время и слова, которые пользователь РЕАЛЬНО прочитал, и отправляет их в статистику.
 * Сам подсчёт лежит в lib/reading-tracker.ts, здесь только подключение к React и браузеру.
 *
 * Правила:
 * - время идёт, только пока включено чтение (playing) И вкладка видна на экране;
 * - пауза, выход из читалки, сворачивание вкладки останавливают счёт;
 * - накопленное отправляется раз в 10 секунд, при паузе, при выходе и при закрытии вкладки.
 *   Если вкладку закрыть внезапно, можно потерять последние до 10 секунд, но не больше;
 * - гостям (без аккаунта) ничего не считается и не отправляется.
 *
 * Сервер дополнительно не даёт засчитать больше времени, чем реально прошло.
 */
export function useReadingTracker(playing: boolean, bookKey?: string) {
  const { user, enabled } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const active = enabled && user !== null && supabase !== null;
  const finishedSent = useRef(new Set<string>());

  // Новый счётчик на каждого пользователя: чужое накопленное время не перейдёт к другому аккаунту
  const userId = user?.id;
  const tracker = useMemo(
    () => (supabase && userId ? new ReadingTracker((seconds, words) => sendReading(supabase, seconds, words)) : null),
    [supabase, userId],
  );

  useEffect(() => {
    if (!tracker || !playing) {
      return;
    }

    const startIfVisible = () => {
      if (!document.hidden) {
        tracker.start();
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        tracker.stop();
        void tracker.flush();
      } else {
        startIfVisible();
      }
    };
    const onPageHide = () => {
      tracker.stop();
      void tracker.flush();
    };

    startIfVisible();
    const tickTimer = window.setInterval(() => tracker.tick(), 1000);
    const flushTimer = window.setInterval(() => void tracker.flush(), FLUSH_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(tickTimer);
      window.clearInterval(flushTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Пауза или выход из читалки: останавливаем счёт и отправляем остаток
      tracker.stop();
      void tracker.flush();
    };
  }, [tracker, playing]);

  /** Засчитать слова, которые только что показаны на экране (вызывается при автопереходе кадра) */
  const addWords = useCallback((count: number) => tracker?.addWords(count), [tracker]);

  /** Книга дочитана до конца. Отмечается один раз на книгу. */
  const markFinished = useCallback(() => {
    if (!supabase || !active || !bookKey || finishedSent.current.has(bookKey)) {
      return;
    }
    finishedSent.current.add(bookKey);
    sendBookFinished(supabase, bookKey).catch(() => {
      // Не получилось: разрешим повторную попытку при следующем дочитывании
      finishedSent.current.delete(bookKey);
    });
  }, [active, bookKey, supabase]);

  return { addWords, markFinished };
}
