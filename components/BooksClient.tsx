"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import type { DemoBook } from "@/lib/demo-data";

type SortKey = "title" | "progress";

/** Поиск и сортировка по демо-книгам. Загрузка файлов сюда добавится на этапе 2. */
export function BooksClient({ books }: { books: DemoBook[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("title");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = books.filter(
      (book) =>
        q === "" ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "ru")
        : b.progress - a.progress,
    );
  }, [books, query, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Поиск по названию или автору</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию или автору"
            className="w-full rounded-xl border border-white/10 bg-ink-soft/60 px-4 py-3 text-sm text-cream placeholder:text-cream-muted/70 focus:border-accent/50 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-xs text-cream-muted">
            Сортировка
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="rounded-xl border border-white/10 bg-ink-soft/60 px-3 py-3 text-sm text-cream focus:border-accent/50 focus:outline-none"
          >
            <option value="title">По названию</option>
            <option value="progress">По прогрессу</option>
          </select>
        </div>
        <button
          type="button"
          disabled
          aria-describedby="upload-note"
          className="rounded-xl bg-accent/30 px-4 py-3 text-sm font-semibold text-cream/60"
        >
          Загрузить книгу
        </button>
      </div>
      <p id="upload-note" className="-mt-2 text-xs text-cream-muted">
        Загрузка TXT и EPUB будет доступна на этапе 2.
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-cream-muted">
          По запросу «{query}» ничего не найдено.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((book) => (
            <li key={book.id}>
              <Link
                href={`/reader/${book.id}`}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-soft/50 p-4 transition-colors hover:border-accent/30"
              >
                <BookCover title={book.title} tone={book.coverTone} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-cream">{book.title}</p>
                  </div>
                  <p className="text-xs text-cream-muted">{book.author}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      role="progressbar"
                      aria-valuenow={book.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Прогресс: ${book.progress}%`}
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                    >
                      <div className="h-full rounded-full bg-accent" style={{ width: `${book.progress}%` }} />
                    </div>
                    <span className="text-xs text-cream-muted">{book.progress}%</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 text-xs text-cream-muted">
        <DemoBadge /> Все книги в этом списке выдуманы для прототипа.
      </div>
    </div>
  );
}
