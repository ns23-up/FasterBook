"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReaderClient } from "@/components/ReaderClient";
import { getBook, savePosition, type StoredBook } from "@/lib/books-db";
import { tokenize } from "@/lib/reader";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; book: StoredBook; text: string };

/**
 * Читалка для книги, загруженной пользователем.
 * Книга лежит в IndexedDB браузера, поэтому загружаем её здесь, на стороне браузера.
 */
export function StoredReader({ bookId }: { bookId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getBook(bookId)
      .then((result) => {
        if (!cancelled) {
          setState(result ? { status: "ready", ...result } : { status: "missing" });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Не удалось открыть книгу." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Разбиваем текст на слова один раз, а не при каждой перерисовке
  const words = useMemo(() => (state.status === "ready" ? tokenize(state.text) : []), [state]);

  const handleProgress = useCallback(
    (index: number) => {
      // Ошибку записи не показываем: чтение продолжается, просто позиция не сохранится
      savePosition(bookId, index).catch(() => undefined);
    },
    [bookId],
  );

  if (state.status === "loading") {
    return <Message text="Открываем книгу…" />;
  }
  if (state.status === "missing") {
    return <Message text="Книга не найдена. Возможно, её удалили или она загружена в другом браузере." link />;
  }
  if (state.status === "error") {
    return <Message text={state.message} link />;
  }

  return (
    <ReaderClient
      title={state.book.title}
      author={state.book.author}
      words={words}
      startIndex={state.book.position}
      isDemo={false}
      onProgress={handleProgress}
    />
  );
}

function Message({ text, link }: { text: string; link?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="status" className="max-w-sm text-sm text-cream-muted">
        {text}
      </p>
      {link ? (
        <Link href="/books" className="text-sm font-medium text-accent hover:text-accent-hover">
          Вернуться к книгам
        </Link>
      ) : null}
    </div>
  );
}
