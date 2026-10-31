import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon, type IconName } from "@/components/Icon";
import { MountainArt } from "@/components/MountainArt";
import { Avatar, IconTile, ProgressBar, SectionTitle, panelClass } from "@/components/ui";
import { DEMO_BOOKS, DEMO_FRIENDS } from "@/lib/demo-data";

export const metadata = { title: "Главная" };

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "speed", title: "Быстрое чтение", text: "Читай по одному слову" },
  { icon: "bookmark", title: "Сохранение прогресса", text: "Продолжай с любого места" },
  { icon: "device", title: "Всегда с тобой", text: "На компьютере и телефоне" },
];

const STEPS = [
  { title: "Загрузите книгу", text: "Файл в формате TXT. Загрузка появится на следующем этапе." },
  { title: "Выберите скорость", text: "Комфортный темп — от 100 до 1000 слов в минуту." },
  { title: "Наслаждайтесь", text: "Слова появляются по одному в центре экрана." },
];

export default function HomePage() {
  const onlineFriends = DEMO_FRIENDS.filter((friend) => friend.online);

  return (
    <div className="flex flex-col gap-8">
      {/* Главный баннер */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-ink-deep">
        {/* Маска плавно растворяет левый край гор, чтобы не было резкого обреза */}
        <MountainArt className="absolute inset-x-0 bottom-0 h-40 w-full opacity-60 md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-3/5 md:opacity-100 md:[mask-image:linear-gradient(to_right,transparent,black_40%)]" />
        <div className="relative z-10 flex flex-col gap-5 p-6 pb-40 sm:p-10 sm:pb-44 md:max-w-lg md:pb-10">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-cream sm:text-5xl">
            Читай быстрее.
            <br />
            <span className="text-accent">Живи ярче.</span>
          </h1>
          <p className="text-sm leading-relaxed text-cream-muted">
            Fasterbook — это не просто чтение.
            <br />
            Это новый способ воспринимать мир.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/books"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover"
            >
              <Icon name="upload" className="h-4 w-4" />
              Загрузить книгу
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-white/5"
            >
              <Icon name="play" className="h-4 w-4" />
              Как это работает
            </a>
          </div>
        </div>
      </section>

      {/* Возможности */}
      <section aria-label="Возможности" className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className={`flex items-center gap-4 p-4 ${panelClass}`}>
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
                  className={`group flex h-full gap-4 p-4 transition-colors hover:border-accent/30 sm:flex-col ${panelClass}`}
                >
                  <BookCover title={book.title} tone={book.coverTone} size="lg" />
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition-transform group-hover:scale-105"
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
        <section aria-labelledby="friends-title" className={`self-start p-4 ${panelClass}`}>
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

      {/* Как это работает */}
      <section id="how" aria-labelledby="how-title" className={`scroll-mt-24 p-6 sm:p-8 ${panelClass}`}>
        <h2 id="how-title" className="text-lg font-semibold tracking-tight text-cream">
          Как это работает?
        </h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-ink">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-cream">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-cream-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <blockquote className="mt-8 border-l-2 border-accent pl-4 font-playfair text-sm italic leading-relaxed text-cream-muted">
          «Книга — это не просто текст, это другой мир, в который ты можешь войти в любое время.»
        </blockquote>
      </section>
    </div>
  );
}
