"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AuthField,
  AuthNotice,
  AuthTitle,
  MIN_PASSWORD_LENGTH,
  NotConfigured,
  SubmitButton,
} from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";

/**
 * Шаг 2 восстановления пароля: ввести новый пароль.
 * Сюда попадают по ссылке из письма — к этому моменту /auth/callback уже создал временную сессию.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** null — ещё проверяем; false — сессии нет (ссылку открыли не из письма или она устарела) */
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    supabase.auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)));
  }, [supabase]);

  if (!supabase) {
    return (
      <>
        <AuthTitle title="Новый пароль" />
        <NotConfigured />
      </>
    );
  }

  if (hasSession === false) {
    return (
      <>
        <AuthTitle title="Новый пароль" />
        <AuthNotice kind="error">
          Ссылка недействительна или устарела. Запросите новое письмо для смены пароля.
        </AuthNotice>
        <Link
          href="/forgot-password"
          className="mt-6 block rounded-xl bg-accent py-3 text-center text-sm font-semibold text-ink hover:bg-accent-hover"
        >
          Запросить письмо
        </Link>
      </>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (password !== repeat) {
      setError("Пароли не совпадают.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(authErrorMessage(updateError));
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <AuthTitle title="Новый пароль" subtitle="Придумайте новый пароль для входа в Fasterbook." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
        <AuthField
          label="Новый пароль"
          type="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`Не меньше ${MIN_PASSWORD_LENGTH} символов`}
          autoFocus
        />
        <AuthField label="Повторите пароль" type="password" name="repeat" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        <SubmitButton loading={loading || hasSession === null}>
          {loading ? "Сохраняем…" : hasSession === null ? "Проверяем ссылку…" : "Сохранить пароль"}
        </SubmitButton>
      </form>
    </>
  );
}
