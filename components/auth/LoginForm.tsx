"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthField, AuthNotice, AuthTitle, NotConfigured, SubmitButton } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";
import { authErrorCode, authErrorMessage } from "@/lib/supabase/errors";

export function LoginForm({ initialError, next }: { initialError?: string; next: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [errorCode, setErrorCode] = useState("");
  const [resent, setResent] = useState(false);

  if (!supabase) {
    return (
      <>
        <AuthTitle title="Вход" />
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
    setErrorCode("");
    setResent(false);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError(authErrorMessage(signInError));
      setErrorCode(authErrorCode(signInError));
      setLoading(false);
      return;
    }
    // Кнопка остаётся в состоянии загрузки, пока открывается следующая страница
    router.push(next);
    router.refresh();
  }

  /** Повторно отправить письмо с подтверждением почты */
  async function resendConfirmation() {
    if (!supabase) {
      return;
    }
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (resendError) {
      setError(authErrorMessage(resendError));
      setErrorCode(authErrorCode(resendError));
    } else {
      setError("");
      setErrorCode("");
      setResent(true);
    }
  }

  return (
    <>
      <AuthTitle title="Вход" subtitle="Войдите, чтобы ваша библиотека и настройки были с вами." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
        {error ? (
          <AuthNotice kind="error">
            {error}
            {errorCode === "email_not_confirmed" ? (
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={loading || email.trim() === ""}
                className="mt-2 block font-semibold text-accent underline-offset-2 hover:underline disabled:opacity-60"
              >
                Отправить письмо ещё раз
              </button>
            ) : null}
          </AuthNotice>
        ) : null}
        {resent ? <AuthNotice kind="success">Письмо отправлено ещё раз. Проверьте почту, в том числе папку «Спам».</AuthNotice> : null}

        <AuthField label="Электронная почта" type="email" name="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        <AuthField label="Пароль" type="password" name="password" value={password} onChange={setPassword} autoComplete="current-password" />
        <Link href="/forgot-password" className="-mt-1 self-end text-xs text-cream/70 hover:text-cream">
          Забыли пароль?
        </Link>
        <SubmitButton loading={loading}>{loading ? "Входим…" : "Войти"}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-cream/70">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-accent hover:text-accent-hover">
          Создать
        </Link>
      </p>
    </>
  );
}
