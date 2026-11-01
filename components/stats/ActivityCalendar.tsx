"use client";

import { useEffect, useMemo, useRef } from "react";
import { formatDuration, localDay, type StatsDay } from "@/lib/stats";

/** Сколько недель показываем (около 5 месяцев) */
const WEEKS = 20;
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WEEKDAY_LABELS = ["Пн", "", "Ср", "", "Пт", "", ""];

/** Уровни яркости ячейки. 0 — не читал, 1 — читал меньше порога серии, 2–4 — всё больше. */
const LEVEL_CLASS = ["bg-white/[0.06]", "bg-accent/20", "bg-accent/45", "bg-accent/70", "bg-accent"];

function levelFor(seconds: number, minSeconds: number): number {
  if (seconds <= 0) {
    return 0;
  }
  if (seconds < minSeconds) {
    return 1;
  }
  if (seconds < 10 * 60) {
    return 2;
  }
  if (seconds < 30 * 60) {
    return 3;
  }
  return 4;
}

interface Cell {
  key: string;
  date: Date;
  future: boolean;
}

/**
 * Календарь активности: столбец = неделя (с понедельника), строка = день недели.
 * Чем ярче ячейка, тем дольше человек читал в этот день.
 */
export function ActivityCalendar({ days, minSeconds }: { days: StatsDay[]; minSeconds: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bySeconds = useMemo(() => new Map(days.map((item) => [item.day, item.seconds])), [days]);

  const { weeks, todayKey } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // полдень: переводы часов не сдвинут дату
    const mondayOffset = (today.getDay() + 6) % 7; // 0 — понедельник
    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset - (WEEKS - 1) * 7);

    const result: Cell[][] = [];
    for (let week = 0; week < WEEKS; week += 1) {
      const column: Cell[] = [];
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + week * 7 + weekday);
        column.push({ key: localDay(date), date, future: date.getTime() > today.getTime() + 36e5 });
      }
      result.push(column);
    }
    return { weeks: result, todayKey: localDay(today) };
  }, []);

  // Показываем самые свежие недели: прокручиваем вправо
  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, []);

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="flex w-max gap-1">
          {/* Подписи дней недели */}
          <div className="flex flex-col gap-1 pr-1 pt-5" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index} className="h-3.5 text-[10px] leading-[14px] text-cream-muted">
                {label}
              </span>
            ))}
          </div>

          {weeks.map((column, weekIndex) => {
            const previous = weeks[weekIndex - 1]?.[0].date;
            const first = column[0].date;
            const showMonth = !previous || previous.getMonth() !== first.getMonth();
            return (
              <div key={column[0].key} className="flex flex-col gap-1">
                <span className="h-4 whitespace-nowrap text-[10px] leading-4 text-cream-muted" aria-hidden="true">
                  {showMonth ? MONTHS[first.getMonth()] : ""}
                </span>
                {column.map((cell) => {
                  if (cell.future) {
                    return <span key={cell.key} className="h-3.5 w-3.5" aria-hidden="true" />;
                  }
                  const seconds = bySeconds.get(cell.key) ?? 0;
                  const label = `${cell.date.getDate()} ${MONTHS[cell.date.getMonth()]}: ${
                    seconds > 0 ? formatDuration(seconds) : "не читал"
                  }`;
                  return (
                    <span
                      key={cell.key}
                      title={label}
                      aria-label={label}
                      role="img"
                      className={`h-3.5 w-3.5 rounded-[4px] ${LEVEL_CLASS[levelFor(seconds, minSeconds)]} ${
                        cell.key === todayKey ? "ring-1 ring-cream/60" : ""
                      }`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-cream-muted">
        <p>В серию идут дни, когда прочитано не меньше {formatDuration(minSeconds)}.</p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          меньше
          {LEVEL_CLASS.map((className) => (
            <span key={className} className={`h-3 w-3 rounded-[3px] ${className}`} />
          ))}
          больше
        </div>
      </div>
    </div>
  );
}
