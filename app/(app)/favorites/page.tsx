import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon, type IconName } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { IconTile, SectionTitle, panelClass } from "@/components/ui";
import { DEMO_BOOKS, DEMO_QUOTES, findDemoBook } from "@/lib/demo-data";

export const metadata = { title: "Избранное" };

export default function FavoritesPage() {
  // Демо: в избранном две книги и две цитаты. Реальное избранное появится позже.
  const favoriteBooks = DEMO_BOOKS.slice(1);

  const categories: { icon: IconName; title: string; hint: string; href?: string }[] = [
    { icon: "quote", title: "Цитаты", hint: `${DEMO_QUOTES.length} ${plural(DEMO_QUOTES.length, "цитата", "цитаты", "цитат")}`, href: "#quotes" },
    { icon: "heart", title: "Любимые книги", hint: `${favoriteBooks.length} ${plural(favoriteBooks.length, "книга", "книги", "книг")}`, href: "#books" },
    { icon: "note", title: "Мои заметки", hint: "Скоро" },
    { icon: "pin", title: "Интересные места", hint: "Скоро" },
    { icon: "clock", title: "Список на потом", hint: "Скоро" },
  ];

  return (
    <>
      <PageHeader
        title="Избранное"
        badge={<DemoBadge />}
        description="Цитаты, книги и заметки. Сейчас показаны демо-примеры, сохранения ещё нет."
      />

      <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Разделы избранного */}
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
          <section id="quotes" aria-labelledby="fav-quotes" className="scroll-mt-24">
            <SectionTitle id="fav-quotes" title="Цитаты" />
            <ul className="mt-4 flex flex-col gap-3">
              {DEMO_QUOTES.map((quote) => {
                const book = findDemoBook(quote.bookId);
                return (
                  <li key={quote.id} className={`relative p-5 pl-6 ${panelClass}`}>
                    <span aria-hidden="true" className="absolute inset-y-5 left-0 w-0.5 rounded-full bg-accent" />
                    <p className="font-playfair text-base italic leading-relaxed text-cream">«{quote.text}»</p>
                    <p className="mt-3 text-xs text-cream-muted">{book?.title ?? "Книга не найдена"}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="books" aria-labelledby="fav-books" className="scroll-mt-24">
            <SectionTitle id="fav-books" title="Любимые книги" />
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {favoriteBooks.map((book) => (
                <li key={book.id}>
                  <Link
                    href={`/reader/${book.id}`}
                    className={`flex items-center gap-4 p-4 transition-colors hover:border-accent/30 ${panelClass}`}
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
        </div>
      </div>
    </>
  );
}

/** Русское склонение: 1 цитата, 2 цитаты, 5 цитат. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}
