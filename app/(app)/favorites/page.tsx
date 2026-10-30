import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { PageHeader } from "@/components/PageHeader";
import { DEMO_BOOKS, DEMO_QUOTES, findDemoBook } from "@/lib/demo-data";

export const metadata = { title: "Избранное" };

export default function FavoritesPage() {
  // Демо: в избранном две книги и две цитаты. Реальное избранное появится на этапе 6.
  const favoriteBooks = DEMO_BOOKS.slice(1);

  return (
    <>
      <PageHeader
        title="Избранное"
        description="Книги, цитаты и заметки. Сейчас показаны демо-примеры, сохранения ещё нет."
        action={<DemoBadge />}
      />

      <section aria-labelledby="fav-books" className="mb-10">
        <h2 id="fav-books" className="mb-4 text-lg font-semibold text-cream">
          Книги
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {favoriteBooks.map((book) => (
            <li key={book.id}>
              <Link
                href={`/reader/${book.id}`}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-soft/50 p-4 transition-colors hover:border-accent/30"
              >
                <BookCover title={book.title} tone={book.coverTone} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cream">{book.title}</p>
                  <p className="text-xs text-cream-muted">{book.author}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fav-quotes">
        <h2 id="fav-quotes" className="mb-4 text-lg font-semibold text-cream">
          Цитаты
        </h2>
        <ul className="flex flex-col gap-3">
          {DEMO_QUOTES.map((quote) => {
            const book = findDemoBook(quote.bookId);
            return (
              <li
                key={quote.id}
                className="rounded-2xl border-l-2 border-accent bg-ink-soft/40 p-5"
              >
                <p className="font-serif text-base italic leading-relaxed text-cream">
                  «{quote.text}»
                </p>
                <p className="mt-3 text-xs text-cream-muted">{book?.title ?? "Книга не найдена"}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
