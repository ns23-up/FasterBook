import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";

/**
 * Верхняя панель.
 * ПК: строка поиска, колокольчик и аватар.
 * Телефон: логотип, кнопка поиска и аватар.
 * Поиск — обычная форма: она открывает «Мои книги» с запросом ?q=...
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 md:px-8">
        {/* Логотип только на телефоне: на ПК он в боковой панели */}
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <BrandIcon className="h-8 w-8" />
          <span className="text-base font-semibold tracking-tight text-cream">
            Faster<span className="text-accent">book</span>
          </span>
        </Link>

        <form action="/books" role="search" className="hidden flex-1 md:block">
          <label className="relative block max-w-md">
            <span className="sr-only">Поиск книг и авторов</span>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-muted"
            />
            <input
              type="search"
              name="q"
              placeholder="Поиск книг, авторов…"
              className="w-full rounded-xl border border-white/[0.07] bg-ink-deep/80 py-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] pl-10 pr-4 text-sm text-cream placeholder:text-cream-muted/70 focus:border-accent/40 focus:outline-none"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/books"
            aria-label="Поиск книг"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-cream-muted hover:bg-white/5 hover:text-cream md:hidden"
          >
            <Icon name="search" />
          </Link>
          <span
            title="Уведомления появятся вместе с аккаунтами"
            className="hidden h-10 w-10 items-center justify-center rounded-xl text-cream-muted/60 md:flex"
          >
            <Icon name="bell" />
            <span className="sr-only">Уведомлений пока нет</span>
          </span>
          <Link href="/welcome" aria-label="Профиль: гость" className="rounded-full">
            <Avatar name="Гость" size="sm" />
          </Link>
        </div>
      </div>
    </header>
  );
}
