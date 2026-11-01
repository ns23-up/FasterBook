"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { ActivityCalendar } from "@/components/stats/ActivityCalendar";
import { useStatsData } from "@/components/stats/useStatsData";
import { IconTile, SectionTitle, cardClass } from "@/components/ui";
import { formatDuration, formatNumber, plural, type ReadingStats } from "@/lib/stats";

/** Страница статистики: серия дней, итоги и календарь активности. Данные — только вошедшего пользователя. */
export function StatsClient() {
  const state = useStatsData();

  switch (state.status) {
    case "loading":
      return <Notice>Загружаем вашу статистику…</Notice>;
    case "disabled":
      return <Notice>Статистика появится после подключения аккаунтов. Сейчас Fasterbook работает без входа.</Notice>;
    case "guest":
      return (
        <Notice>
          Статистика ведётся для вашего аккаунта и будет одинаковой на всех устройствах. Войдите, чтобы начать.
          <span className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-hover"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-cream hover:bg-white/5"
            >
              Создать аккаунт
            </Link>
          </span>
        </Notice>
      );
    case "not_ready":
      return (
        <Notice>
          База данных для статистики ещё не настроена. Нужно один раз выполнить SQL-миграцию в Supabase, инструкция
          лежит в файле <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">supabase/README.md</code>.
        </Notice>
      );
    case "error":
      return <Notice>Не удалось загрузить статистику. Проверьте подключение к интернету и обновите страницу.</Notice>;
    case "ready":
      return <StatsView stats={state.stats} />;
  }
}

function StatsView({ stats }: { stats: ReadingStats }) {
  const todayCounted = stats.todaySeconds >= stats.minSecondsPerDay;
  const streakHint = todayCounted
    ? "Сегодня уже засчитано"
    : stats.currentStreak > 0
      ? "Прочитайте сегодня, чтобы не прервать серию"
      : "Прочитайте сегодня, чтобы начать серию";

  const tiles: { icon: IconName; label: string; value: string }[] = [
    { icon: "clock", label: "Всего времени", value: formatDuration(stats.totalSeconds) },
    { icon: "speed", label: "Сегодня", value: formatDuration(stats.todaySeconds) },
    { icon: "quote", label: "Прочитано слов", value: formatNumber(stats.totalWords) },
    { icon: "books", label: "Завершено книг", value: formatNumber(stats.booksFinished) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Серия дней */}
      <section aria-label="Серия дней" className={`flex flex-wrap items-center gap-x-8 gap-y-4 p-5 sm:p-6 ${cardClass}`}>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent"
          >
            <Icon name="flame" className="h-9 w-9" />
          </span>
          <div>
            <p className="text-4xl font-bold leading-none tabular-nums text-cream">
              {stats.currentStreak}
              <span className="ml-2 text-base font-medium text-cream-muted">
                {plural(stats.currentStreak, ["день", "дня", "дней"])} подряд
              </span>
            </p>
            <p className="mt-2 text-xs text-cream-muted">{streakHint}</p>
          </div>
        </div>
        <div className="sm:ml-auto">
          <p className="text-xs text-cream-muted">Рекорд серии</p>
          <p className="text-2xl font-semibold tabular-nums text-cream">
            {stats.longestStreak} <span className="text-sm font-normal text-cream-muted">{plural(stats.longestStreak, ["день", "дня", "дней"])}</span>
          </p>
        </div>
      </section>

      {/* Итоги */}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label} className={`flex items-center gap-3 p-4 ${cardClass}`}>
            <IconTile name={tile.icon} />
            <div className="min-w-0">
              <p className="truncate text-xs text-cream-muted">{tile.label}</p>
              <p className="truncate text-lg font-semibold tabular-nums text-cream">{tile.value}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Календарь */}
      <section aria-labelledby="calendar-title" className={`p-5 sm:p-6 ${cardClass}`}>
        <SectionTitle id="calendar-title" title="Календарь чтения" />
        <div className="mt-4">
          <ActivityCalendar days={stats.days} minSeconds={stats.minSecondsPerDay} />
        </div>
      </section>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className={`mx-auto max-w-lg p-8 text-center text-sm leading-relaxed text-cream-muted ${cardClass}`}>
      {children}
    </div>
  );
}
