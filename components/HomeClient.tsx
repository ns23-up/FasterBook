"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BookCover } from "@/components/BookCover";
import { toneFor } from "@/components/BooksClient";
import { Icon, type IconName } from "@/components/Icon";
import { SunsetBackdrop } from "@/components/SunsetBackdrop";
import { StreakTile } from "@/components/stats/StreakTile";
import { Avatar, IconTile, ProgressBar, SectionTitle, cardClass } from "@/components/ui";
import { useLibrary } from "@/components/useLibrary";
import { bookProgress, type StoredBook } from "@/lib/books-db";
import { getFriends, type Friend } from "@/lib/friends";
import { createClient } from "@/lib/supabase/client";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "speed", title: "Быстрое чтение", text: "Читай по одному слову" },
  { icon: "bookmark", title: "Сохранение прогресса", text: "Продолжай с любого места" },
  { icon: "device", title: "Всегда с тобой", text: "На компьютере и телефоне" },
];

/** Как часто обновлять «Друзья онлайн», пока главная открыта */
const FRIENDS_REFRESH_MS = 60_000;

type FriendsState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "unavailable" }
  | { status: "ready"; friends: Friend[] };

/** Главная: только настоящие данные — свои книги, серия дней и друзья. */
export function HomeClient() {
  const library = useLibrary();
  const { user, ready, enabled } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id;
  const [books, setBooks] = useState<StoredBook[] | null>(null);
  const [friends, setFriends] = useState<FriendsState>({ status: "loading" });

  useEffect(() => {
    if (!library) {
      return;
    }
    let cancelled = false;
    setBooks(null);
    library
      .list()
      .then((list) => !cancelled && setBooks(list))
      .catch(() => !cancelled && setBooks([]));
    return () => {
      cancelled = true;
    };
  }, [library]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!enabled || !supabase || !userId) {
      setFriends({ status: "guest" });
      return;
    }
    let cancelled = false;
    const load = () => {
      if (document.hidden) {
        return;
      }
      getFriends(supabase)
        .then((data) => !cancelled && setFriends({ status: "ready", friends: data.friends }))
        .catch(() => !cancelled && setFriends({ status: "unavailable" }));
    };
    load();
    const timer = window.setInterval(load, FRIENDS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [ready, enabled, supabase, userId]);

  // Недочитанные книги, сначала недавно открытые (список уже отсортирован)
  const unfinished = books ? books.filter((book) => bookProgress(book) < 100) : [];
  const continueBooks = unfinished.slice(0, 3);
  const continueTarget = unfinished.find((book) => book.position > 0) ?? unfinished[0];

  return (
    <div className="flex flex-col gap-8">
      {/* Главный баннер */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-deep shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)]">
        <SunsetBackdrop />
        <div className="relative z-10 flex flex-col gap-8 p-6 sm:p-10">
          <div className="flex flex-col gap-5 md:max-w-lg">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-cream drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-5xl">
              Читай быстрее.
              <br />
              <span className="text-accent">Живи ярче.</span>
            </h1>
            <p className="text-sm leading-relaxed text-cream/80">
              Fasterbook — это не просто чтение.
              <br />
              Это новый способ воспринимать мир.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/books"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/40 transition-colors hover:bg-accent-hover"
              >
                <Icon name="upload" className="h-4 w-4" />
                Загрузить книгу
              </Link>
              {continueTarget ? (
                <Link
                  href={`/reader/${continueTarget.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-medium text-cream backdrop-blur transition-colors hover:bg-black/30"
                >
                  <Icon name="play" className="h-4 w-4" />
                  Продолжить чтение
                </Link>
              ) : null}
            </div>
          </div>

          <p className="absolute right-10 top-10 hidden max-w-[16rem] text-right font-playfair text-xs italic leading-relaxed text-cream/75 md:block">
            «Книга — это не просто текст, это другой мир, в который ты можешь войти в любое время.»
          </p>

          {/* Плитки: всё настоящее */}
          <ul className="grid gap-3 sm:grid-cols-3">
            <StreakTile />
            <Tile
              href="/books"
              icon="books"
              label="Книг в библиотеке"
              value={books ? String(books.length) : "—"}
              hint={books && books.length === 0 ? "Загрузите первую" : undefined}
            />
            <Tile
              href="/friends"
              icon="friends"
              label="Друзей"
              value={friends.status === "ready" ? String(friends.friends.length) : "—"}
              hint={
                friends.status === "guest"
                  ? "Войдите, чтобы добавить"
                  : friends.status === "ready"
                    ? `В сети: ${friends.friends.filter((friend) => friend.online).length}`
                    : undefined
              }
            />
          </ul>
        </div>
      </section>

      <section aria-label="Возможности" className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className={`flex items-center gap-4 p-4 ${cardClass}`}>
            <IconTile name={feature.icon} />
            <div>
              <p className="text-sm font-medium text-cream">{feature.title}</p>
              <p className="text-xs text-cream-muted">{feature.text}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="continue-title">
          <SectionTitle
            id="continue-title"
            title="Продолжить чтение"
            action={
              <Link href="/books" className="flex items-center gap-1 text-xs text-cream-muted hover:text-cream">
                Все книги <Icon name="chevron" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {books === null ? (
            <Empty>Загружаем ваши книги…</Empty>
          ) : continueBooks.length === 0 ? (
            <Empty>
              {books.length === 0 ? "В библиотеке пока нет книг. " : "Все книги дочитаны. "}
              <Link href="/books" className="font-medium text-accent hover:text-accent-hover">
                Загрузите книгу
              </Link>{" "}
              в формате TXT, DOCX или RTF.
            </Empty>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {continueBooks.map((book) => {
                const progress = bookProgress(book);
                return (
                  <li key={book.id}>
                    <Link
                      href={`/reader/${book.id}`}
                      className={`group flex h-full gap-4 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 sm:flex-col ${cardClass}`}
                    >
                      <BookCover title={book.title} tone={toneFor(book.id)} size="lg" fancy />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="text-sm font-semibold leading-snug text-cream">{book.title}</p>
                        <p className="mt-0.5 truncate text-xs text-cream-muted">{book.author}</p>
                        <div className="mt-auto flex items-center gap-3 pt-4">
                          <div className="flex-1">
                            <p className="mb-1.5 text-xs tabular-nums text-cream-muted">{progress}%</p>
                            <ProgressBar value={progress} />
                          </div>
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink shadow-md shadow-black/40 transition-transform group-hover:scale-110"
                          >
                            <Icon name="play" className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <FriendsOnline state={friends} />
      </div>
    </div>
  );
}

function FriendsOnline({ state }: { state: FriendsState }) {
  const online = state.status === "ready" ? state.friends.filter((friend) => friend.online) : [];

  return (
    <section aria-labelledby="friends-title" className={`self-start p-4 ${cardClass}`}>
      <h2 id="friends-title" className="text-sm font-semibold text-cream">
        Друзья онлайн{state.status === "ready" && online.length > 0 ? ` (${online.length})` : ""}
      </h2>

      <div className="mt-4">
        {state.status === "loading" ? (
          <p className="text-xs text-cream-muted">Загружаем…</p>
        ) : state.status === "guest" ? (
          <p className="text-xs leading-relaxed text-cream-muted">
            <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
              Войдите
            </Link>
            , чтобы видеть, кто из друзей сейчас читает.
          </p>
        ) : state.status === "unavailable" ? (
          <p className="text-xs text-cream-muted">Не удалось загрузить друзей.</p>
        ) : state.friends.length === 0 ? (
          <p className="text-xs leading-relaxed text-cream-muted">Друзей пока нет. Добавьте их по ID.</p>
        ) : online.length === 0 ? (
          <p className="text-xs text-cream-muted">Сейчас никого из друзей нет в сети.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {online.slice(0, 5).map((friend) => (
              <li key={friend.publicId} className="flex items-center gap-3">
                <Avatar name={friend.nickname} online />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-cream">{friend.nickname}</p>
                  <p className="truncate text-xs text-cream-muted">
                    {friend.currentBook ? `Читает «${friend.currentBook}»` : "В сети"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/friends"
        className="mt-5 flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2 text-xs font-medium text-cream-muted transition-colors hover:bg-white/5 hover:text-cream"
      >
        Все друзья <Icon name="chevron" className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function Tile({ href, icon, label, value, hint }: { href: string; icon: IconName; label: string; value: string; hint?: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-colors hover:border-accent/40"
      >
        <IconTile name={icon} />
        <div className="min-w-0">
          <p className="truncate text-[11px] text-cream/70">{label}</p>
          <p className="text-xl font-semibold leading-tight tabular-nums text-cream">{value}</p>
          {hint ? <p className="truncate text-[10px] text-cream/50">{hint}</p> : null}
        </div>
      </Link>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm leading-relaxed text-cream-muted">
      {children}
    </p>
  );
}
