"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthField, AuthNotice, AuthTitle, NotConfigured, SubmitButton } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";

/** Шаг 1 восстановления пароля: отправить письмо со ссылкой */
export function ForgotPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (!supabase) {
    return (
      <>
        <AuthTitle title="Восстановление пароля" />
        <NotConfigured />
      </>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setLoading(true);
    setError("");
    // Ссылка из письма ведёт на /auth/callback, а оттуда — на страницу нового пароля
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    // Ради безопасности не говорим, есть ли такой аккаунт: сообщение одинаковое всегда
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <AuthTitle title="Проверьте почту" />
        <AuthNotice kind="success">
          Если аккаунт с адресом <strong>{email.trim()}</strong> существует, мы отправили на него ссылку для смены
          пароля.
        </AuthNotice>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          Письма нет? Проверьте папку «Спам». Ссылку лучше открыть в этом же браузере.
        </p>
        <Link
          href="/login"
          className="mt-6 block rounded-xl border border-white/15 py-3 text-center text-sm font-medium text-cream hover:bg-white/5"
        >
          Вернуться ко входу
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthTitle
        title="Восстановление пароля"
        subtitle="Укажите почту, с которой регистрировались. Мы пришлём ссылку для смены пароля."
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
        <AuthField label="Электронная почта" type="email" name="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        <SubmitButton loading={loading}>{loading ? "Отправляем…" : "Отправить ссылку"}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-cream/70">
        Вспомнили пароль?{" "}
        <Link href="/login" className="font-semibold text-accent hover:text-accent-hover">
          Войти
        </Link>
      </p>
    </>
  );
}
