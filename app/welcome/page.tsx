import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { Icon, type IconName } from "@/components/Icon";
import { MountainArt } from "@/components/MountainArt";

export const metadata = { title: "Добро пожаловать" };

const FEATURES: { icon: IconName; title: string }[] = [
  { icon: "speed", title: "Быстрое чтение" },
  { icon: "palette", title: "Удобный интерфейс" },
  { icon: "device", title: "Всегда с тобой" },
];

/**
 * Экран приветствия и входа.
 * Аккаунтов пока нет, поэтому кнопка «Войти» выключена, а «Начать» ведёт на главную.
 */
export default function WelcomePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-deep">
      <MountainArt className="pointer-events-none absolute inset-x-0 bottom-0 h-[30vh] w-full opacity-50" />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 py-12 md:grid-cols-2">
        {/* Логотип */}
        <div className="flex flex-col items-center text-center">
          <BrandIcon className="h-28 w-28 sm:h-36 sm:w-36" />
          <p className="mt-6 text-5xl font-bold tracking-tight text-cream sm:text-6xl">
            Faster<span className="text-accent">book</span>
          </p>
          <p className="mt-3 text-sm tracking-[0.3em] text-cream-muted">Книги. Быстрее.</p>
        </div>

        {/* Слоган, преимущества и кнопки */}
        <div className="flex flex-col gap-8">
          <h1 className="text-center text-3xl font-medium leading-snug text-cream sm:text-4xl md:text-left">
            Читай целые книги
            <br />
            по одному слову.
          </h1>
          <span aria-hidden="true" className="mx-auto h-px w-16 bg-cream-muted/40 md:mx-0" />
          <ul className="grid grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
                <Icon name={feature.icon} className="h-7 w-7 text-cream-muted" />
                <span className="text-xs leading-snug text-cream-muted sm:text-sm">{feature.title}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:max-w-sm">
            <Link
              href="/"
              className="rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-ink transition-colors hover:bg-accent-hover"
            >
              Начать
            </Link>
            <button
              type="button"
              disabled
              aria-describedby="login-note"
              className="rounded-xl border border-white/10 bg-ink/60 py-3.5 text-sm font-medium text-cream-muted"
            >
              Войти
            </button>
            <p id="login-note" className="text-center text-xs text-cream-muted/80">
              Вход и аккаунты появятся позже. Сейчас всё работает без регистрации.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
