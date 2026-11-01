"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { toneFor } from "@/components/BooksClient";
import { Icon, type IconName } from "@/components/Icon";
import { IconTile, SectionTitle, panelClass } from "@/components/ui";
import { useLibrary } from "@/components/useLibrary";
import type { StoredBook } from "@/lib/books-db";
import { CloudBooksError } from "@/lib/cloud-books";
import { QuotesNotReadyError, deleteQuote, listQuotes, type Quote } from "@/lib/quotes";
import { plural } from "@/lib/stats";
import { createClient } from "@/lib/supabase/client";

type Loadable<T> = { status: "loading" } | { status: "error"; text: string } | { status: "ready"; items: T[] };
type QuotesState = Loadable<Quote> | { status: "guest" };

/**
 * «Избранное»: любимые книги и цитаты.
 * Любимые книги — и у гостя (в браузере), и в аккаунте. Цитаты — только в аккаунте.
 */
export function FavoritesClient() {
  const library = useLibrary();
  const { user, ready, enabled } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id;
  const [books, setBooks] = useState<Loadable<StoredBook>>({ status: "loading" });
  const [quotes, setQuotes] = useState<QuotesState>({ status: "loading" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!library) {
      return;
    }
    let cancelled = false;
    setBooks({ status: "loading" });
    library
      .list()
      .then((all) => {
        if (!cancelled) {
          setBooks({ status: "ready", items: all.filter((book) => book.favorite) });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBooks({
            status: "error",
            text: error instanceof CloudBooksError ? error.message : "Не удалось загрузить книги. Обновите страницу.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [library]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!enabled || !supabase || !userId) {
      setQuotes({ status: "guest" });
      return;
    }
    let cancelled = false;
    setQuotes({ status: "loading" });
    listQuotes(supabase)
      .then((items) => {
        if (!cancelled) {
          setQuotes({ status: "ready", items });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setQuotes({
            status: "error",
            text:
              error instanceof QuotesNotReadyError
                ? error.message
                : "Не удалось загрузить цитаты. Проверьте интернет и обновите страницу.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, enabled, supabase, userId]);

  /** Убрать цитату: сразу из списка, при ошибке вернуть */
  async function handleDeleteQuote(quote: Quote) {
    if (!supabase) {
      return;
    }
    setNotice("");
    setQuotes((prev) => (prev.status === "ready" ? { ...prev, items: prev.items.filter((q) => q.id !== quote.id) } : prev));
    try {
      await deleteQuote(supabase, quote.id);
    } catch {
      setQuotes((prev) =>
        prev.status === "ready"
          ? { ...prev, items: [...prev.items, quote].sort((a, b) => b.createdAt - a.createdAt) }
          : prev,
      );
      setNotice("Не удалось удалить цитату. Попробуйте ещё раз.");
    }
  }

  /** Убрать книгу из любимых: сразу из списка, при ошибке вернуть */
  async function handleUnfavorite(book: StoredBook) {
    if (!library) {
      return;
    }
    setNotice("");
    setBooks((prev) => (prev.status === "ready" ? { ...prev, items: prev.items.filter((b) => b.id !== book.id) } : prev));
    try {
      await library.setFavorite(book.id, false);
    } catch (error) {
      setBooks((prev) =>
        prev.status === "ready"
          ? { ...prev, items: [...prev.items, book].sort((a, b) => b.updatedAt - a.updatedAt) }
          : prev,
      );
      setNotice(error instanceof CloudBooksError ? error.message : "Не удалось убрать книгу из любимых.");
    }
  }

  const quoteCount = quotes.status === "ready" ? quotes.items.length : null;
  const bookCount = books.status === "ready" ? books.items.length : null;

  const categories: { icon: IconName; title: string; hint: string; href?: string }[] = [
    {
      icon: "quote",
      title: "Цитаты",
      hint:
        quotes.status === "guest"
          ? "После входа"
          : quoteCount === null
            ? "…"
            : `${quoteCount} ${plural(quoteCount, ["цитата", "цитаты", "цитат"])}`,
      href: "#quotes",
    },
    {
      icon: "heart",
      title: "Любимые книги",
      hint: bookCount === null ? "…" : `${bookCount} ${plural(bookCount, ["книга", "книги", "книг"])}`,
      href: "#books",
    },
    { icon: "note", title: "Мои заметки", hint: "Скоро" },
    { icon: "pin", title: "Интересные места", hint: "Скоро" },
    { icon: "clock", title: "Список на потом", hint: "Скоро" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <nav aria-label="Разделы избранного" className="self-start">
        <ul className={`divide-y divide-white/5 ${panelClass}`}>
          {categories.map((category) => {
            const content = (
              <>
                <IconTile name={category.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-cream">{category.title}</span>
                  <span className="block text-xs text-cream-muted">{category.hint}</span>
                </span>
                {category.href ? <Icon name="chevron" className="h-4 w-4 text-cream-muted" /> : null}
              </>
            );
            return (
              <li key={category.title}>
                {category.href ? (
                  <a href={category.href} className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.03]">
                    {content}
                  </a>
                ) : (
                  <div className="flex items-center gap-4 p-4 opacity-60">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-10">
        {notice ? (
          <p role="alert" className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-cream">
            {notice}
          </p>
        ) : null}

        <section id="quotes" aria-labelledby="fav-quotes" className="scroll-mt-24">
          <SectionTitle id="fav-quotes" title="Цитаты" />
          <div className="mt-4">
            {quotes.status === "guest" ? (
              <Empty>
                Цитаты сохраняются в аккаунте.{" "}
                <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
                  Войдите
                </Link>
                , чтобы сохранять их из читалки.
              </Empty>
            ) : quotes.status === "loading" ? (
              <Empty>Загружаем цитаты…</Empty>
            ) : quotes.status === "error" ? (
              <Empty>{quotes.text}</Empty>
            ) : quotes.items.length === 0 ? (
              <Empty>
                Цитат пока нет. В читалке нажмите кнопку с кавычками вверху, затем выберите в прочитанном тексте первое и
                последнее слово цитаты.
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3">
                {quotes.items.map((quote) => (
                  <li key={quote.id} className={`relative p-5 pl-6 ${panelClass}`}>
                    <span aria-hidden="true" className="absolute inset-y-5 left-0 w-0.5 rounded-full bg-accent" />
                    <p className="font-playfair text-base italic leading-relaxed text-cream">«{quote.text}»</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 text-xs text-cream-muted">
                        {quote.bookTitle || "Книга без названия"}
                        {quote.bookAuthor ? ` · ${quote.bookAuthor}` : ""}
                        {quote.bookId ? null : " · книга удалена"}
                      </p>
                      <div className="flex items-center gap-1">
                        {quote.bookId ? (
                          <Link
                            href={`/reader/${quote.bookId}`}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-white/5"
                          >
                            Открыть книгу
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDeleteQuote(quote)}
                          aria-label="Удалить цитату"
                          title="Удалить цитату"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-cream-muted/70 hover:bg-white/5 hover:text-cream"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section id="books" aria-labelledby="fav-books" className="scroll-mt-24">
          <SectionTitle id="fav-books" title="Любимые книги" />
          <div className="mt-4">
            {books.status === "loading" ? (
              <Empty>Загружаем книги…</Empty>
            ) : books.status === "error" ? (
              <Empty>{books.text}</Empty>
            ) : books.items.length === 0 ? (
              <Empty>
                Любимых книг пока нет. Нажмите на сердечко у книги в{" "}
                <Link href="/books" className="font-medium text-accent hover:text-accent-hover">
                  «Моих книгах»
                </Link>
                .
              </Empty>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {books.items.map((book) => (
                  <li key={book.id} className={`flex items-center gap-2 pr-2 ${panelClass}`}>
                    <Link
                      href={`/reader/${book.id}`}
                      className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-white/[0.03]"
                    >
                      <BookCover title={book.title} tone={toneFor(book.id)} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-cream">{book.title}</p>
                        <p className="truncate text-xs text-cream-muted">{book.author}</p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleUnfavorite(book)}
                      aria-label={`Убрать «${book.title}» из любимых`}
                      title="Убрать из любимых"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-white/5"
                    >
                      <Icon name="heartFilled" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm leading-relaxed text-cream-muted">
      {children}
    </p>
  );
}
