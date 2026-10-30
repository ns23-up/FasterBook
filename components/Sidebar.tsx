"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { NAV_ITEMS, isActivePath } from "@/lib/navigation";

/** Боковая навигация для ПК (от 768 px). На телефоне скрыта. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-ink-deep px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-8">
        <BrandIcon className="h-9 w-9" />
        <span className="text-lg font-semibold tracking-tight text-cream">
          Faster<span className="text-accent">book</span>
        </span>
      </Link>

      <nav aria-label="Основная навигация" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-ink-soft text-cream"
                  : "text-cream-muted hover:bg-white/5 hover:text-cream"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs leading-relaxed text-cream-muted">
        Прототип. Аккаунтов и синхронизации пока нет.
      </div>
    </aside>
  );
}
