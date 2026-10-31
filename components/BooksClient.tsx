"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon } from "@/components/Icon";
import { ProgressBar, cardClass } from "@/components/ui";
import { addBook, bookProgress, deleteBook, listBooks, type StoredBook } from "@/lib/books-db";
import type { CoverTone, DemoBook } from "@/lib/demo-data";
import { tokenize } from "@/lib/reader";
import { TextFileError, readTextFile, titleFromFileName } from "@/lib/text-file";

type SortKey = "recent" | "title" | "progress";
type Tab = "all" | "reading" | "done";

/** Одна строка списка: и демо-книга, и книга пользователя приводятся к этому виду */
interface LibraryItem {
  id: string;
  title: string;
  author: string;
  progress: number;
  coverTone: CoverTone;
  isDemo: boolean;
  /** Для сортировки «Недавние»; у демо-книг 0, они в конце */
  updatedAt: number;
}

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "reading", label: "Читаю" },
  { value: "done", label: "Прочитанные" },
];

const TONES: CoverTone[] = ["accent", "graphite", "cream"];

type Notice = { kind: "ok" | "error"; text: string } | null;

/**
 * «Мои книги»: свои книги из IndexedDB и демо-книги.
 * Загрузка TXT, поиск, вкладки, сортировка и удаление.
 */
export function BooksClient({ books: demoBooks, initialQuery = "" }: { books: DemoBook[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("recent");
  const [tab, setTab] = useState<Tab>("all");
  const [userBooks, setUserBooks] = useState<StoredBook[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setUserBooks(await listBooks());
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error, "Не удалось прочитать список книг.") });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const added: string[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const text = await readTextFile(file);
        const wordCount = tokenize(text).length;
        if (wordCount === 0) {
          throw new TextFileError(`В файле «${file.name}» нет слов для чтения.`);
        }
        const title = titleFromFileName(file.name);
        await addBook({ title, author: "Автор не указан", text, wordCount });
        added.push(title);
      } catch (error) {
        errors.push(errorText(error, `Не удалось загрузить «${file.name}».`));
      }
    }

    await refresh();
    setBusy(false);
    if (fileInput.current) {
      // Сбрасываем выбор, чтобы тот же файл можно было выбрать снова
      fileInput.current.value = "";
    }
    if (errors.length > 0) {
      setNotice({ kind: "error", text: errors.join(" ") });
    } else if (added.length > 0) {
      setNotice({
        kind: "ok",
        text: added.length === 1 ? `Книга «${added[0]}» добавлена.` : `Добавлено книг: ${added.length}.`,
      });
    }
  }

  async function handleDelete(id: string) {
    setConfirmId(null);
    try {
      await deleteBook(id);
      await refresh();
    } catch (error) {
      setNotice({ kind: "error", text: errorText(error, "Не удалось удалить книгу.") });
    }
  }

  const items = useMemo<LibraryItem[]>(
    () => [
      ...userBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        progress: bookProgress(book),
        coverTone: toneFor(book.id),
        isDemo: false,
        updatedAt: book.updatedAt,
      })),
      ...demoBooks.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        progress: book.progress,
        coverTone: book.coverTone,
        isDemo: true,
        updatedAt: 0,
      })),
    ],
    [demoBooks, userBooks],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((book) => {
      const matchesQuery =
        q === "" || book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
      const matchesTab =
        tab === "all" ||
        (tab === "reading" && book.progress > 0 && book.progress < 100) ||
        (tab === "done" && book.progress >= 100);
      return matchesQuery && matchesTab;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title, "ru");
      }
      if (sort === "progress") {
        return b.progress - a.progress;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [items, query, sort, tab]);

  return (
    <div className="flex flex-col gap-5">
      {/* Заголовок с действиями */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-cream sm:text-3xl">Мои книги</h1>
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
              <option value="recent">Недавние</option>
              <option value="title">По названию</option>
              <option value="progress">По прогрессу</option>
            </select>
          </label>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,text/plain"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink shadow-md shadow-black/30 transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            <Icon name={busy ? "clock" : "plus"} className="h-4 w-4" />
            {busy ? "Загружаем…" : "Добавить"}
          </button>
        </div>
      </header>

      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.kind === "error" ? "border-accent/40 bg-accent/10 text-cream" : "border-online/30 bg-online/10 text-cream"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

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
            <li key={book.id} className="flex items-center gap-2 pr-3 first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/[0.04]">
              <Link href={`/reader/${book.id}`} className="group flex min-w-0 flex-1 items-center gap-4 p-4">
                <BookCover title={book.title} tone={book.coverTone} fancy />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-cream">{book.title}</p>
                    {book.isDemo ? <DemoBadge /> : null}
                  </div>
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

              {/* Удалять можно только свои книги. Сначала спрашиваем подтверждение. */}
              {book.isDemo ? null : confirmId === book.id ? (
                <div className="flex shrink-0 flex-col items-stretch gap-1 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleDelete(book.id)}
                    className="rounded-lg bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25"
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg px-2.5 py-1.5 text-xs text-cream-muted hover:bg-white/5 hover:text-cream"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(book.id)}
                  aria-label={`Удалить «${book.title}»`}
                  title="Удалить книгу"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-cream-muted/70 hover:bg-white/5 hover:text-cream"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-cream-muted">
        Свои книги хранятся только в этом браузере: добавьте TXT-файл до 10 МБ кнопкой «Добавить».
        Книги с меткой «Демо» выдуманы для прототипа.
      </p>
    </div>
  );
}

/** Цвет обложки-заглушки выбирается по id, чтобы у книги он всегда был одинаковым */
function toneFor(id: string): CoverTone {
  let sum = 0;
  for (const char of id) {
    sum += char.charCodeAt(0);
  }
  return TONES[sum % TONES.length];
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof TextFileError) {
    return error.message;
  }
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "В браузере закончилось место для книг. Удалите ненужные книги и попробуйте снова.";
  }
  return fallback;
}
