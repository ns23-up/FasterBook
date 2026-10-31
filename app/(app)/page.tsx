import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon, type IconName } from "@/components/Icon";
import { SunsetBackdrop } from "@/components/SunsetBackdrop";
import { Avatar, IconTile, ProgressBar, SectionTitle, cardClass } from "@/components/ui";
import { DEMO_BOOKS, DEMO_FRIENDS } from "@/lib/demo-data";

export const metadata = { title: "Главная" };

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "speed", title: "Быстрое чтение", text: "Читай по одному слову" },
  { icon: "bookmark", title: "Сохранение прогресса", text: "Продолжай с любого места" },
  { icon: "device", title: "Всегда с тобой", text: "На компьютере и телефоне" },
];

export default function HomePage() {
  const onlineFriends = DEMO_FRIENDS.filter((friend) => friend.online);

  // Настоящей статистики пока нет: считать слова и дни начнём вместе с загрузкой книг.
  // Поэтому там, где данных нет, честно стоит «—».
  const stats: { icon: IconName; label: string; value: string; hint?: string }[] = [
    { icon: "note", label: "Прочитано слов", value: "—", hint: "Пока не считается" },
    { icon: "clock", label: "Дней подряд", value: "—", hint: "Пока не считается" },
    { icon: "books", label: "Книг в библиотеке", value: String(DEMO_BOOKS.length), hint: "Демо-список" },
    { icon: "friends", label: "Друзей", value: String(DEMO_FRIENDS.length), hint: "Демо-профили" },
  ];

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
              <Link
                href={`/reader/${DEMO_BOOKS[0].id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-5 py-3 text-sm font-medium text-cream backdrop-blur transition-colors hover:bg-black/30"
              >
                <Icon name="play" className="h-4 w-4" />
                Продолжить чтение
              </Link>
            </div>
          </div>

          {/* Цитата в углу баннера */}
          <p className="absolute right-10 top-10 hidden max-w-[16rem] text-right font-playfair text-xs italic leading-relaxed text-cream/75 md:block">
            «Книга — это не просто текст, это другой мир, в который ты можешь войти в любое время.»
          </p>

          {/* Плитки статистики */}
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <li
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
              >
                <IconTile name={stat.icon} />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-cream/70">{stat.label}</p>
                  <p className="text-xl font-semibold leading-tight tabular-nums text-cream">{stat.value}</p>
                  {stat.hint ? <p className="truncate text-[10px] text-cream/50">{stat.hint}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Возможности */}
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
        {/* Продолжить чтение */}
        <section aria-labelledby="continue-title">
          <SectionTitle
            id="continue-title"
            title="Продолжить чтение"
            badge
            action={
              <Link href="/books" className="flex items-center gap-1 text-xs text-cream-muted hover:text-cream">
                Все книги <Icon name="chevron" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {DEMO_BOOKS.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/reader/${book.id}`}
                  className={`group flex h-full gap-4 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 sm:flex-col ${cardClass}`}
                >
                  <BookCover title={book.title} tone={book.coverTone} size="lg" fancy />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-sm font-semibold leading-snug text-cream">{book.title}</p>
                    <p className="mt-0.5 truncate text-xs text-cream-muted">{book.author}</p>
                    <div className="mt-auto flex items-center gap-3 pt-4">
                      <div className="flex-1">
                        <p className="mb-1.5 text-xs tabular-nums text-cream-muted">{book.progress}%</p>
                        <ProgressBar value={book.progress} />
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
            ))}
          </ul>
        </section>

        {/* Друзья онлайн */}
        <section aria-labelledby="friends-title" className={`self-start p-4 ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="friends-title" className="text-sm font-semibold text-cream">
              Друзья онлайн
            </h2>
            <DemoBadge />
          </div>
          <ul className="mt-4 flex flex-col gap-4">
            {onlineFriends.map((friend) => (
              <li key={friend.id} className="flex items-center gap-3">
                <Avatar name={friend.name} online />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cream">{friend.name}</p>
                  <p className="truncate text-xs text-cream-muted">Читает «{friend.nowReading}»</p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/friends"
            className="mt-5 flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2 text-xs font-medium text-cream-muted transition-colors hover:bg-white/5 hover:text-cream"
          >
            Все друзья <Icon name="chevron" className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
