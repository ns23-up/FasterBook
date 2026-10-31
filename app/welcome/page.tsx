import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { SunsetBackdrop } from "@/components/SunsetBackdrop";

export const metadata = { title: "Добро пожаловать" };

/**
 * Экран приветствия и входа.
 * Аккаунтов пока нет, поэтому «Создать аккаунт» и «Войти» выключены,
 * а «Продолжить без аккаунта» ведёт на главную.
 */
export default function WelcomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-deep">
      <SunsetBackdrop shade="bg-ink-deep/60" />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 py-12 md:grid-cols-2">
        {/* Логотип */}
        <div className="flex flex-col items-center text-center">
          <BrandIcon className="h-28 w-28 drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)] sm:h-36 sm:w-36" />
          <p className="mt-6 text-5xl font-bold tracking-tight text-cream sm:text-6xl">
            Faster<span className="text-accent">book</span>
          </p>
          <p className="mt-3 text-sm tracking-[0.3em] text-cream-muted">Книги. Быстрее.</p>
        </div>

        {/* Форма входа */}
        <div className="rounded-3xl border border-white/10 bg-black/35 p-6 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-8">
          <h1 className="text-2xl font-semibold leading-snug text-cream sm:text-3xl">Добро пожаловать</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream/75">
            Создайте аккаунт, чтобы ваша библиотека, закладки и настройки были на любом устройстве.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              disabled
              aria-describedby="auth-note"
              className="rounded-xl bg-accent/40 py-3.5 text-sm font-semibold text-ink"
            >
              Создать аккаунт
            </button>
            <button
              type="button"
              disabled
              aria-describedby="auth-note"
              className="rounded-xl border border-white/15 py-3.5 text-sm font-medium text-cream/70"
            >
              Войти
            </button>
            <p id="auth-note" className="text-center text-xs text-cream/55">
              Регистрация откроется позже. Пока Fasterbook работает без аккаунта.
            </p>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-cream/40" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            или
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <Link
            href="/"
            className="block rounded-xl bg-cream py-3.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-snow"
          >
            Продолжить без аккаунта
          </Link>
        </div>
      </div>
    </div>
  );
}
