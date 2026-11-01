"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Детали форм входа и регистрации: заголовок, поле, кнопка, сообщение */

export function AuthTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-cream">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm leading-relaxed text-cream/70">{subtitle}</p> : null}
    </div>
  );
}

export function AuthField({
  label,
  type,
  name,
  value,
  onChange,
  autoComplete,
  hint,
  autoFocus,
}: {
  label: string;
  type: "email" | "password" | "text";
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const id = `field-${name}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-cream/90">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword && !visible ? "password" : isPassword ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          className={`w-full rounded-xl border border-white/10 bg-ink-deep/80 px-4 py-3 text-sm text-cream shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] placeholder:text-cream-muted/60 focus:border-accent/50 focus:outline-none ${
            isPassword ? "pr-20" : ""
          }`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-cream-muted hover:text-cream"
          >
            {visible ? "Скрыть" : "Показать"}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-cream/50">{hint}</p> : null}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-ink shadow-lg shadow-black/40 transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink"
        />
      ) : null}
      {children}
    </button>
  );
}

export function AuthNotice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-accent/40 bg-accent/10",
    success: "border-online/40 bg-online/10",
    info: "border-white/15 bg-white/5",
  } as const;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed text-cream ${styles[kind]}`}
    >
      {kind === "success" ? <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-online" /> : null}
      <div>{children}</div>
    </div>
  );
}

/** Показывается, если ключи Supabase не заданы */
export function NotConfigured() {
  return (
    <AuthNotice kind="info">
      Вход и регистрация пока не подключены на этом сайте. Пока что Fasterbook работает без аккаунта.
    </AuthNotice>
  );
}

export const MIN_PASSWORD_LENGTH = 8;
