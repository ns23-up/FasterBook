"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookCover, type CoverTone } from "@/components/BookCover";
import { Icon } from "@/components/Icon";
import { ProgressBar, cardClass } from "@/components/ui";
import { useLibrary } from "@/components/useLibrary";
import { bookProgress, type StoredBook } from "@/lib/books-db";
import { CloudBooksError } from "@/lib/cloud-books";
import { countLocalBooks, moveLocalBooksTo } from "@/lib/library";
import { tokenize } from "@/lib/reader";
import { ACCEPTED_FILES, TextFileError, readBookFile, titleFromFileName } from "@/lib/text-file";

type SortKey = "recent" | "title" | "progress";
type Tab = "all" | "reading" | "done";

/** Одна строка списка */
interface LibraryItem {
  id: string;
  title: string;
  author: string;
  progress: number;
  coverTone: CoverTone;
  favorite: boolean;
  /** Для сортировки «Недавние» */
  updatedAt: number;
}

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "reading", label: "Читаю" },
  { value: "done", label: "Прочитанные" },
];

const TONES: CoverTone[] = ["accent", "graphite", "cream"];

type Notice = { kind: "ok" | "error"; text: string } | null;

/** Сколько книг показывать сразу и сколько добавлять кнопкой «Показать ещё» */
const PAGE_SIZE = 20;

/** Книга, которая похожа на уже добавленную: ждёт решения пользователя */
interface PendingBook {
  title: string;
  text: string;
  wordCount: number;
}

/** Одинаковое название и одинаковое число слов — считаем, что это та же книга */
function bookSignature(title: string, wordCount: number): string {
  return `${title.trim().toLowerCase()}|${wordCount}`;
}

/**
 * «Мои книги». Вошедший пользователь видит книги своего аккаунта, гость — книги этого браузера.
 * Загрузка TXT, DOCX и RTF, поиск, вкладки, сортировка и удаление.
 */
export function BooksClient({ initialQuery = "" }: { initialQuery?: string }) {
  const library = useLibrary();
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("recent");
  const [tab, setTab] = useState<Tab>("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [userBooks, setUserBooks] = useState<StoredBook[]>([]);
  /** false, пока не пришёл список своих книг (в том числе пока выясняем, вошёл ли пользователь) */
  const [loaded, setLoaded] = useState(false);
  /** Книги, оставшиеся в браузере, когда пользователь вошёл: их можно перенести в аккаунт */
  const [localCount, setLocalCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<PendingBook[]>([]);
  /** Книги, которые удаляются прямо сейчас: в списке их уже не видно, не дожидаясь сервера */
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  // Чтобы ответ от старого хранилища (до входа или выхода) не перезаписал новый список
  const libraryRef = useRef(library);
  libraryRef.current = library;

  const refresh = useCallback(async () => {
    if (!library) {
      return;
    }
    try {
      const books = await library.list();
      const leftInBrowser = library.kind === "cloud" ? await countLocalBooks() : 0;
      if (libraryRef.current === library) {
        setUserBooks(books);
        setLocalCount(leftInBrowser);
        setLoaded(true);
      }
    } catch (error) {
      if (libraryRef.current === library) {
        setUserBooks([]);
        setLoaded(true);
        setNotice({ kind: "error", text: errorText(error, "Не удалось прочитать список книг.") });
      }
    }
  }, [library]);

  useEffect(() => {
    setLoaded(false);
    setUserBooks([]);
    setLocalCount(0);
    setNotice(null);
    setDuplicates([]);
    setDeletingIds(new Set());
    void refresh();
  }, [refresh]);

  async function handleMoveLocal() {
    if (!library) {
      return;
    }
    setBusy(true);
    setNotice(null);
    const { moved, failed, error } = await moveLocalBooksTo(library);
    if (failed === 0 && !error) {
      setNotice({ kind: "ok", text: `Перенесено в аккаунт книг: ${moved}.` });
    } else {
      const reason = errorText(error, "Не удалось перенести часть книг.");
      setNotice({
        kind: "error",
        text: `${reason} Перенесено: ${moved}, не удалось: ${failed}. Не перенесённые книги остались в браузере, нажмите «Перенести в аккаунт» ещё раз.`,
      });
    }
    await refresh();
    setBusy(false);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !library) {
      return;
    }
    setBusy(true);
    setNotice(null);
    setDuplicates([]);
    const added: string[] = [];
    const errors: string[] = [];
    const skipped: PendingBook[] = [];
    // Уже есть в библиотеке + добавленные в этой же пачке файлов
    const known = new Set(userBooks.map((book) => bookSignature(book.title, book.wordCount)));

    for (const file of Array.from(files)) {
      try {
        const text = await readBookFile(file);
        const wordCount = tokenize(text).length;
        if (wordCount === 0) {
          throw new TextFileError(`В файле «${file.name}» нет слов для чтения.`);
        }
        const title = titleFromFileName(file.name);
        const signature = bookSignature(title, wordCount);
        if (known.has(signature)) {
          skipped.push({ title, text, wordCount });
          continue;
        }
        await library.add({ title, author: "Автор не указан", text, wordCount });
        known.add(signature);
        added.push(title);
      } catch (error) {
        errors.push(errorText(error, `Не удалось загрузить «${file.name}».`));
      }
    }

    setDuplicates(skipped);
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

  /** Пользователь подтвердил: добавить похожие книги ещё раз */
  async function handleAddDuplicates() {
    if (!library || duplicates.length === 0) {
      return;
    }
    const pending = duplicates;
    setDuplicates([]);
    setBusy(true);
    setNotice(null);
    let addedCount = 0;
    const failed: string[] = [];
    for (const book of pending) {
      try {
        await library.add({ title: book.title, author: "Автор не указан", text: book.text, wordCount: book.wordCount });
        addedCount += 1;
      } catch (error) {
        failed.push(errorText(error, `Не удалось загрузить «${book.title}».`));
      }
    }
    await refresh();
    setBusy(false);
    if (failed.length > 0) {
      setNotice({ kind: "error", text: failed.join(" ") });
    } else {
      setNotice({ kind: "ok", text: addedCount === 1 ? `Книга «${pending[0].title}» добавлена.` : `Добавлено книг: ${addedCount}.` });
    }
  }

  /** Сердечко: меняем сразу, при ошибке возвращаем как было */
  async function handleToggleFavorite(id: string, favorite: boolean) {
    if (!library) {
      return;
    }
    const apply = (value: boolean) =>
      setUserBooks((prev) => prev.map((book) => (book.id === id ? { ...book, favorite: value } : book)));
    apply(favorite);
    try {
      await library.setFavorite(id, favorite);
    } catch (error) {
      apply(!favorite);
      setNotice({ kind: "error", text: errorText(error, "Не удалось изменить «Любимые книги».") });
    }
  }

  async function handleDelete(id: string) {
    setConfirmId(null);
    if (!library) {
      return;
    }
    const title = userBooks.find((book) => book.id === id)?.title ?? "книгу";
    // Убираем из списка сразу. Если сервер откажет, книга вернётся на место.
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await library.remove(id);
      await refresh();
    } catch (error) {
      setNotice({
        kind: "error",
        text: `${errorText(error, `Не удалось удалить «${title}».`)} Книга возвращена в список.`,
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const items = useMemo<LibraryItem[]>(
    () =>
      userBooks
        .filter((book) => !deletingIds.has(book.id))
        .map((book) => ({
          id: book.id,
          title: book.title,
          author: book.author,
          progress: bookProgress(book),
          coverTone: toneFor(book.id),
          favorite: book.favorite === true,
          updatedAt: book.updatedAt,
        })),
    [userBooks, deletingIds],
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

  // Новый поиск, вкладка или сортировка — снова с первой страницы
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [query, sort, tab]);

  const page = visible.slice(0, shown);
  const hiddenCount = visible.length - page.length;

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
            accept={ACCEPTED_FILES}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || !library || !loaded}
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

      {duplicates.length > 0 ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-cream sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            {duplicates.length === 1
              ? `Книга «${duplicates[0].title}» уже есть в библиотеке.`
              : `Эти книги уже есть в библиотеке: ${duplicates.map((book) => `«${book.title}»`).join(", ")}.`}{" "}
            Добавить ещё раз?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void handleAddDuplicates()}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
            >
              Добавить ещё раз
            </button>
            <button
              type="button"
              onClick={() => setDuplicates([])}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-xs text-cream-muted hover:bg-white/5 hover:text-cream disabled:opacity-60"
            >
              Не добавлять
            </button>
          </div>
        </div>
      ) : null}

      {localCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-deep/70 px-4 py-3 text-sm text-cream sm:flex-row sm:items-center sm:justify-between">
          <p>
            В этом браузере есть книги, сохранённые без аккаунта: {localCount}. Их видно только здесь.
          </p>
          <button
            type="button"
            onClick={() => void handleMoveLocal()}
            disabled={busy}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
          >
            Перенести в аккаунт
          </button>
        </div>
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

      {!loaded && visible.length > 0 ? (
        <p role="status" className="flex items-center gap-2 text-sm text-cream-muted">
          <Icon name="clock" className="h-4 w-4" />
          Загружаем ваши книги…
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div
          role={loaded ? undefined : "status"}
          className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-cream-muted"
        >
          {!loaded
            ? "Загружаем ваши книги…"
            : query.trim() !== ""
              ? `По запросу «${query}» ничего не найдено.`
              : tab !== "all"
                ? "В этой вкладке пока пусто."
                : "Здесь пока пусто. Нажмите «Добавить», чтобы загрузить первую книгу."}
        </div>
      ) : (
        <ul className={`divide-y divide-white/5 ${cardClass}`}>
          {page.map((book) => (
            <li key={book.id} className="flex items-center gap-2 pr-3 first:rounded-t-2xl last:rounded-b-2xl hover:bg-white/[0.04]">
              <Link href={`/reader/${book.id}`} className="group flex min-w-0 flex-1 items-center gap-4 p-4">
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

              <button
                type="button"
                onClick={() => void handleToggleFavorite(book.id, !book.favorite)}
                aria-pressed={book.favorite}
                aria-label={book.favorite ? `Убрать «${book.title}» из любимых` : `Добавить «${book.title}» в любимые`}
                title={book.favorite ? "Убрать из любимых" : "В любимые"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/5 ${
                  book.favorite ? "text-accent" : "text-cream-muted/70 hover:text-cream"
                }`}
              >
                <Icon name={book.favorite ? "heartFilled" : "heart"} className="h-4 w-4" />
              </button>

              {/* Перед удалением спрашиваем подтверждение */}
              {confirmId === book.id ? (
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

      {hiddenCount > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE_SIZE)}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-white/5"
          >
            Показать ещё {Math.min(PAGE_SIZE, hiddenCount)}
          </button>
          <p className="text-xs tabular-nums text-cream-muted">
            Показано {page.length} из {visible.length}
          </p>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-cream-muted">
        {library?.kind === "cloud"
          ? "Ваши книги хранятся в аккаунте и доступны на любом устройстве после входа."
          : "Без входа книги хранятся только в этом браузере. Войдите, чтобы они были в аккаунте."}{" "}
        Добавьте файл TXT, DOCX или RTF до 10 МБ кнопкой «Добавить».
      </p>
    </div>
  );
}

/** Цвет обложки-заглушки выбирается по id, чтобы у книги он всегда был одинаковым */
export function toneFor(id: string): CoverTone {
  let sum = 0;
  for (const char of id) {
    sum += char.charCodeAt(0);
  }
  return TONES[sum % TONES.length];
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof TextFileError || error instanceof CloudBooksError) {
    return error.message;
  }
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "В браузере закончилось место для книг. Удалите ненужные книги и попробуйте снова.";
  }
  return fallback;
}
