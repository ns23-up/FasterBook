"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/ui";

/** Имя для аватара: часть почты до «@» */
function displayName(email: string | undefined): string {
  return email ? email.split("@")[0] : "Пользователь";
}

/** Блок аккаунта внизу боковой панели (ПК) */
export function SidebarAccount() {
  const { user, ready, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  if (!ready) {
    // Пока проверяем сессию — пустое место той же высоты, чтобы ничего не прыгало
    return <div className="h-[3.25rem] border-t border-white/5" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href="/welcome"
        className="flex items-center gap-3 border-t border-white/5 px-2 pt-4 transition-colors hover:text-cream"
      >
        <Avatar name="Гость" />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-cream">Гость</span>
          <span className="block text-xs text-cream-muted">Войти или создать аккаунт</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 border-t border-white/5 px-2 pt-4">
      <Avatar name={displayName(user.email)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-cream" title={user.email}>
          {displayName(user.email)}
        </span>
        <button
          type="button"
          disabled={leaving}
          onClick={async () => {
            setLeaving(true);
            await signOut();
            setLeaving(false);
          }}
          className="text-xs text-cream-muted hover:text-accent disabled:opacity-60"
        >
          {leaving ? "Выходим…" : "Выйти"}
        </button>
      </span>
    </div>
  );
}

/** Аватар в верхней панели. На телефоне по нажатию открывается маленькое меню с «Выйти». */
export function TopBarAccount() {
  const { user, ready, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!ready || !user) {
    return (
      <Link href="/welcome" aria-label="Профиль: гость" className="rounded-full">
        <Avatar name="Гость" size="sm" />
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Меню аккаунта"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full"
      >
        <Avatar name={displayName(user.email)} size="sm" />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-white/10 bg-ink-deep p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]">
          <p className="truncate px-1 text-xs text-cream-muted" title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-cream hover:bg-white/5"
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}
