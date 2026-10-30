import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { DEMO_BOOKS, DEMO_FRIENDS, DEMO_QUOTES } from "@/lib/demo-data";

export const metadata = { title: "Главная" };

export default function HomePage() {
  const current = DEMO_BOOKS[0];
  const favoriteBooks = DEMO_BOOKS.slice(1);
  const favoriteQuotes = DEMO_QUOTES.slice(0, 2);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* Приветствие */}
      <section className="rounded-3xl border border-white/5 bg-ink-soft/60 p-6 sm:p-8">
        <p className="text-sm text-cream-muted">С возвращением</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-cream sm:text-4xl">
          Читайте быстрее, <span className="text-accent">не теряя смысла</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-muted">
          Слово за словом в центре экрана. Выберите книгу и задайте свой темп.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/reader/${current.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover"
          >
            Продолжить чтение
          </Link>
          <Link
            href="/books"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-white/5"
          >
            Мои книги
          </Link>
        </div>
      </section>

      {/* Продолжить чтение */}
      <section aria-labelledby="continue-title">
        <SectionTitle id="continue-title" title="Продолжить чтение" badge />
        <Link
          href={`/reader/${current.id}`}
          className="group mt-4 flex items-center gap-5 rounded-2xl border border-white/5 bg-ink-soft/50 p-5 transition-colors hover:border-accent/30"
        >
          <BookCover title={current.title} tone={current.coverTone} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-cream">{current.title}</p>
            <p className="text-sm text-cream-muted">{current.author}</p>
            <ProgressBar value={current.progress} className="mt-4" />
            <p className="mt-2 text-xs text-cream-muted">Прочитано {current.progress}%</p>
          </div>
          <span className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink transition-transform group-hover:scale-[1.03] sm:inline-block">
            Открыть
          </span>
        </Link>
      </section>

      {/* Статистика */}
      <section aria-labelledby="stats-title">
        <SectionTitle id="stats-title" title="Статистика" badge />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Серия дней" value="—" hint="Появится с этапа 5" />
          <StatCard label="Слов за неделю" value="—" hint="По реальным сессиям" />
          <StatCard label="Книг в библиотеке" value={String(DEMO_BOOKS.length)} hint="Демо-список" />
          <StatCard label="Время в читалке" value="—" hint="Пока не считается" />
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Избранное */}
        <section aria-labelledby="fav-title">
          <SectionTitle id="fav-title" title="Избранное" badge />
          <ul className="mt-4 flex flex-col gap-3">
            {favoriteBooks.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/reader/${book.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/5 bg-ink-soft/50 p-4 transition-colors hover:border-accent/30"
                >
                  <BookCover title={book.title} tone={book.coverTone} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-cream">{book.title}</p>
                    <p className="text-xs text-cream-muted">{book.author}</p>
                  </div>
                </Link>
              </li>
            ))}
            {favoriteQuotes.map((quote) => (
              <li
                key={quote.id}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm italic leading-relaxed text-cream-muted"
              >
                «{quote.text}»
              </li>
            ))}
          </ul>
        </section>

        {/* Друзья */}
        <section aria-labelledby="friends-title">
          <SectionTitle id="friends-title" title="Друзья сейчас читают" badge />
          <ul className="mt-4 flex flex-col divide-y divide-white/5 rounded-2xl border border-white/5 bg-ink-soft/50">
            {DEMO_FRIENDS.map((friend) => (
              <li key={friend.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-graphite text-sm font-semibold text-cream"
                >
                  {friend.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-cream">{friend.name}</p>
                  <p className="truncate text-xs text-cream-muted">Читает «{friend.nowReading}»</p>
                </div>
                <span
                  aria-label={friend.online ? "В сети" : "Не в сети"}
                  className={`h-2 w-2 rounded-full ${friend.online ? "bg-accent" : "bg-cream-muted/40"}`}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Рекомендации: честная заглушка до появления реальной логики */}
      <section aria-labelledby="rec-title" className="rounded-2xl border border-dashed border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 id="rec-title" className="text-base font-semibold text-cream">Рекомендации</h2>
          <DemoBadge />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-cream-muted">
          Рекомендации будут строиться по вашим книгам и избранному. Пока этот блок пустой, чтобы не показывать выдуманные советы как настоящие.
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ id, title, badge }: { id: string; title: string; badge?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <h2 id={id} className="text-lg font-semibold tracking-tight text-cream">
        {title}
      </h2>
      {badge ? <DemoBadge /> : null}
    </div>
  );
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-ink-soft/50 p-4">
      <p className="text-xs text-cream-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-cream">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-cream-muted/80">{hint}</p>
    </div>
  );
}
