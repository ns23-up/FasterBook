import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { SunsetBackdrop } from "@/components/SunsetBackdrop";

/**
 * Общая оболочка страниц входа, регистрации и восстановления пароля:
 * фон с закатом, логотип сверху и карточка с формой по центру.
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-deep">
      <SunsetBackdrop shade="bg-ink-deep/65" />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10">
        <Link href="/welcome" className="flex items-center justify-center gap-3">
          <BrandIcon className="h-12 w-12 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" />
          <span className="text-2xl font-bold tracking-tight text-cream">
            Faster<span className="text-accent">book</span>
          </span>
        </Link>
        <main className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-8">
          {children}
        </main>
        <Link href="/" className="text-center text-xs text-cream/60 transition-colors hover:text-cream">
          Продолжить без аккаунта
        </Link>
      </div>
    </div>
  );
}
