"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { NAV_ITEMS, isActivePath, type NavItem } from "@/lib/navigation";

const MAIN_ITEMS = NAV_ITEMS.filter((item) => item.href !== "/settings");
const SETTINGS_ITEM = NAV_ITEMS.find((item) => item.href === "/settings");

/** Боковая навигация для ПК (от 768 px). На телефоне скрыта. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-ink-deep px-4 py-6 shadow-[8px_0_24px_-12px_rgba(0,0,0,0.6)] md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-8">
        <BrandIcon className="h-9 w-9" />
        <span className="text-lg font-semibold tracking-tight text-cream">
          Faster<span className="text-accent">book</span>
        </span>
      </Link>

      <nav aria-label="Основная навигация" className="flex flex-col gap-1">
        {MAIN_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {SETTINGS_ITEM ? (
          <SidebarLink item={SETTINGS_ITEM} active={isActivePath(pathname, SETTINGS_ITEM.href)} />
        ) : null}

        {/* Аккаунтов пока нет, поэтому показываем гостя и ведём на экран входа */}
        <Link
          href="/welcome"
          className="flex items-center gap-3 border-t border-white/5 px-2 pt-4 transition-colors hover:text-cream"
        >
          <Avatar name="Гость" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-cream">Гость</span>
            <span className="block text-xs text-cream-muted">Без аккаунта</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-ink-soft text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "text-cream-muted hover:bg-white/5 hover:text-cream"
      }`}
    >
      {active ? (
        <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />
      ) : null}
      <Icon name={item.icon} className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
      {item.label}
    </Link>
  );
}
