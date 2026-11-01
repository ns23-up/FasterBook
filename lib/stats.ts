import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Статистика чтения: запросы к Supabase и форматирование чисел. Без React.
 *
 * Всё считает и хранит база (см. supabase/migrations). Браузер только
 * присылает «прочитано столько-то секунд и слов» и получает готовые цифры.
 * Данные принадлежат вошедшему пользователю, id владельца определяет Supabase.
 */

export interface StatsDay {
  /** Дата в формате ГГГГ-ММ-ДД (в часовом поясе пользователя) */
  day: string;
  seconds: number;
  words: number;
}

export interface ReadingStats {
  currentStreak: number;
  longestStreak: number;
  totalSeconds: number;
  totalWords: number;
  todaySeconds: number;
  booksFinished: number;
  /** Сколько секунд надо прочитать за день, чтобы он попал в серию */
  minSecondsPerDay: number;
  days: StatsDay[];
}

/** В базе ещё нет таблиц или функций статистики: миграция не выполнена */
export class StatsNotReadyError extends Error {}

/** Коды ошибок PostgREST/Postgres «функции или таблицы нет» */
const NOT_READY_CODES = new Set(["PGRST202", "PGRST205", "42883", "42P01"]);

/** Ошибки, при которых повторять отправку бессмысленно */
const FINAL_CODES = new Set(["28000", "22023"]);

function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
}

/** Заменяет «функции/таблицы нет» понятной ошибкой, остальные ошибки отдаёт как есть (с кодом) */
function wrapError(error: unknown): unknown {
  return NOT_READY_CODES.has(errorCode(error))
    ? new StatsNotReadyError("Статистика не настроена в базе данных.")
    : error;
}

/** true — эту порцию данных повторно отправлять не нужно (сессия кончилась или дата неверна) */
export function isFinalError(error: unknown): boolean {
  return FINAL_CODES.has(errorCode(error));
}

/** Сегодняшняя дата в часовом поясе пользователя: «2026-10-31». Так определяются границы суток. */
export function localDay(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function fetchReadingStats(supabase: SupabaseClient): Promise<ReadingStats> {
  const { data, error } = await supabase.rpc("get_reading_stats", { p_today: localDay() });
  if (error) {
    throw wrapError(error);
  }
  const raw = (data ?? {}) as Record<string, unknown>;
  const days = Array.isArray(raw.days) ? (raw.days as Record<string, unknown>[]) : [];
  return {
    currentStreak: Number(raw.current_streak ?? 0),
    longestStreak: Number(raw.longest_streak ?? 0),
    totalSeconds: Number(raw.total_seconds ?? 0),
    totalWords: Number(raw.total_words ?? 0),
    todaySeconds: Number(raw.today_seconds ?? 0),
    booksFinished: Number(raw.books_finished ?? 0),
    minSecondsPerDay: Number(raw.min_seconds_per_day ?? 60),
    days: days.map((item) => ({
      day: String(item.day),
      seconds: Number(item.seconds ?? 0),
      words: Number(item.words ?? 0),
    })),
  };
}

/** Отправить порцию чтения: сколько секунд и слов прочитано с прошлой отправки */
export async function sendReading(supabase: SupabaseClient, seconds: number, words: number): Promise<void> {
  const { error } = await supabase.rpc("record_reading", {
    p_day: localDay(),
    p_seconds: Math.round(seconds),
    p_words: Math.round(words),
  });
  if (error) {
    throw wrapError(error);
  }
}

export async function sendBookFinished(supabase: SupabaseClient, bookKey: string): Promise<void> {
  const { error } = await supabase.rpc("mark_book_finished", { p_book_key: bookKey });
  if (error) {
    throw wrapError(error);
  }
}

/** «40 сек», «12 мин», «2 ч 05 мин» */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) {
    return `${seconds} сек`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${String(minutes % 60).padStart(2, "0")} мин`;
}

/** Число с пробелами между разрядами: 12 345 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

/** Склонение: plural(1, ["день","дня","дней"]) → «день» */
export function plural(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) {
    return forms[2];
  }
  if (last > 1 && last < 5) {
    return forms[1];
  }
  return last === 1 ? forms[0] : forms[2];
}
