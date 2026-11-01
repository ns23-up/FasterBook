"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReaderClient } from "@/components/ReaderClient";
import { useLibrary } from "@/components/useLibrary";
import type { StoredBook } from "@/lib/books-db";
import { useAuth } from "@/components/AuthProvider";
import { setCurrentBook } from "@/lib/profiles";
import { QuotesNotReadyError, addQuote } from "@/lib/quotes";
import { createClient } from "@/lib/supabase/client";

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; book: StoredBook; text: string };

/**
 * Читалка для книги, загруженной пользователем.
 * Книга лежит в аккаунте (если вошли) или в браузере (гость), поэтому загружаем её здесь.
 */
export function StoredReader({ bookId }: { bookId: string }) {
  const library = useLibrary();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!library) {
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    library
      .get(bookId)
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
  }, [bookId, library]);

  const handleProgress = useCallback(
    // Ошибку отдаём читалке: она повторит попытку и покажет уведомление
    (index: number) =>
      library ? library.savePosition(bookId, index) : Promise.reject(new Error("Хранилище книг не готово.")),
    [bookId, library],
  );

  // Цитаты хранятся только в аккаунте: гостю кнопки цитаты нет
  const supabase = useMemo(() => createClient(), []);
  const readyBook = state.status === "ready" ? state.book : null;
  const { user } = useAuth();
  const userId = user?.id;
  const isCloud = library?.kind === "cloud";
  const readyTitle = readyBook?.title;

  // «Что читаю» для друзей. Ошибки не мешают чтению (например, миграция друзей ещё не выполнена).
  useEffect(() => {
    if (supabase && userId && isCloud && readyTitle) {
      setCurrentBook(supabase, userId, readyTitle).catch(() => undefined);
    }
  }, [supabase, userId, isCloud, readyTitle]);
  const handleSaveQuote = useCallback(
    async (quote: { text: string; position: number }) => {
      if (!supabase || !readyBook) {
        throw new Error("Не удалось сохранить цитату.");
      }
      try {
        await addQuote(supabase, {
          bookId: readyBook.id,
          bookTitle: readyBook.title,
          bookAuthor: readyBook.author,
          text: quote.text,
          position: quote.position,
        });
      } catch (error) {
        throw error instanceof QuotesNotReadyError
          ? error
          : new Error("Не удалось сохранить цитату. Проверьте интернет и попробуйте ещё раз.");
      }
    },
    [readyBook, supabase],
  );

  if (state.status === "loading") {
    return <Message text="Открываем книгу…" />;
  }
  if (state.status === "missing") {
    return <Message text="Книга не найдена. Возможно, её удалили или она сохранена в другом аккаунте или браузере." link />;
  }
  if (state.status === "error") {
    return <Message text={state.message} link />;
  }

  return (
    <ReaderClient
      title={state.book.title}
      author={state.book.author}
      text={state.text}
      startIndex={state.book.position}
      bookKey={bookId}
      onProgress={handleProgress}
      onSaveQuote={library?.kind === "cloud" ? handleSaveQuote : undefined}
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
