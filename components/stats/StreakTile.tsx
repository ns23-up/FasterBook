"use client";

import Link from "next/link";
import { useStatsData } from "@/components/stats/useStatsData";
import { IconTile } from "@/components/ui";
import { plural } from "@/lib/stats";

/**
 * Плитка «Дней подряд» на главной. Показывает настоящую серию вошедшего пользователя,
 * а гостю и при отсутствии данных честно стоит «—». Нажатие открывает страницу статистики.
 */
export function StreakTile() {
  const state = useStatsData();

  let value = "—";
  let hint = "";
  if (state.status === "ready") {
    const { stats } = state;
    value = String(stats.currentStreak);
    hint =
      stats.todaySeconds >= stats.minSecondsPerDay
        ? `Сегодня засчитано · рекорд ${stats.longestStreak}`
        : stats.currentStreak > 0
          ? "Прочитайте сегодня"
          : "Начните серию сегодня";
  } else if (state.status === "guest") {
    hint = "Войдите, чтобы вести серию";
  } else if (state.status === "not_ready") {
    hint = "Статистика не настроена";
  } else if (state.status === "disabled") {
    hint = "Нужен аккаунт";
  } else if (state.status === "error") {
    hint = "Не удалось загрузить";
  }

  return (
    <li>
      <Link
        href="/stats"
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-colors hover:border-accent/40"
      >
        <IconTile name="flame" />
        <div className="min-w-0">
          <p className="truncate text-[11px] text-cream/70">
            {state.status === "ready" ? plural(state.stats.currentStreak, ["День", "Дня", "Дней"]) : "Дней"} подряд
          </p>
          <p className="text-xl font-semibold leading-tight tabular-nums text-cream">{value}</p>
          {hint ? <p className="truncate text-[10px] text-cream/50">{hint}</p> : null}
        </div>
      </Link>
    </li>
  );
}
