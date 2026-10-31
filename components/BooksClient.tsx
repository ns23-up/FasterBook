"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon } from "@/components/Icon";
import { ProgressBar, cardClass } from "@/components/ui";
import type { DemoBook } from "@/lib/demo-data";

type SortKey = "title" | "progress";
type Tab = "all" | "reading" | "done";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "reading", label: "Читаю" },
  { value: "done", label: "Прочитанные" },
];

/** Поиск, вкладки и сортировка по демо-книгам. Загрузка файлов сюда добавится на этапе 2. */
export function BooksClient({ books, initialQuery = "" }: { books: DemoBook[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("title");
  const [tab, setTab] = useState<Tab>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = books.filter((book) => {
      const matchesQuery =
        q === "" || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
      const matchesTab =
        tab === "all" ||
        (tab === "reading" && book.progress > 0 && book.progress < 100) ||
        (tab === "done" && book.progress >= 100);
      return matchesQuery && matchesTab;
    });
    return [...filtered].sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title, "ru") : b.progress - a.progress,
    );
  }, [books, query, sort, tab]);

  return (
    <div className="flex flex-col gap-5">
      {/* Заголовок с действиями */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-cream sm:text-3xl">Мои книги</h1>
          <DemoBadge />
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Сортировка</span>
            <Icon
              name="sort"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="appearance-none rounded-xl border border-white/10 bg-ink-deep/70 py-2.5 pl-9 pr-4 text-sm text-cream focus:border-accent/50 focus:outline-none"
            >
              <option value="title">По названию</option>
              <option value="progress">По прогрессу</option>
            </select>
          </label>
          <button
            type="button"
            disabled
            title="Загрузка TXT появится на этапе 2"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent/30 px-4 py-2.5 text-sm font-semibold text-cream/60"
          >
            <Icon name="plus" className="h-4 w-4" />
            Добавить
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Какие книги показать" className="flex gap-1 rounded-xl bg-ink-deep/70 p-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={tab === item.value}
              onClick={() => setTab(item.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === item.value ? "bg-accent text-ink" : "text-cream-muted hover:text-cream"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="relative sm:w-72">
          <span className="sr-only">Поиск по названию или автору</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск…"
            className="w-full rounded-xl border border-white/10 bg-ink-deep/70 py-2.5 pl-10 pr-4 text-sm text-cream placeholder:text-cream-muted/70 focus:border-accent/50 focus:outline-none"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-cream-muted">
          {query.trim() !== "" ? `По запросу «${query}» ничего не найдено.` : "Здесь пока пусто."}
        </div>
      ) : (
        <ul className={`divide-y divide-white/5 ${cardClass}`}>
          {visible.map((book) => (
            <li key={book.id}>
              <Link
                href={`/reader/${book.id}`}
                className="group flex items-center gap-4 p-4 transition-colors first:rounded-t-2xl hover:bg-white/[0.04]"
              >
                <BookCover title={book.title} tone={book.coverTone} fancy />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cream">{book.title}</p>
                  <p className="truncate text-xs text-cream-muted">{book.author}</p>
                  <div className="mt-3 flex max-w-sm items-center gap-3">
                    <ProgressBar value={book.progress} className="flex-1" />
                    <span className="w-9 text-right text-xs tabular-nums text-cream-muted">{book.progress}%</span>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition-transform group-hover:scale-105"
                >
                  <Icon name="play" className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-cream-muted">
        Все книги в этом списке выдуманы для прототипа. Загрузка своих TXT-файлов появится на этапе 2.
      </p>
    </div>
  );
}
