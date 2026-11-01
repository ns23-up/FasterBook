"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AuthField,
  AuthNotice,
  AuthTitle,
  MIN_PASSWORD_LENGTH,
  NotConfigured,
  SubmitButton,
} from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";
import { NICKNAME_MAX, NICKNAME_MIN, nicknameError } from "@/lib/profiles";
import { authErrorMessage } from "@/lib/supabase/errors";

export function RegisterForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** Адрес, на который ушло письмо подтверждения */
  const [sentTo, setSentTo] = useState("");

  if (!supabase) {
    return (
      <>
        <AuthTitle title="Создать аккаунт" />
        <NotConfigured />
      </>
    );
  }

  if (sentTo) {
    return (
      <>
        <AuthTitle title="Проверьте почту" />
        <AuthNotice kind="success">
          Мы отправили письмо на <strong>{sentTo}</strong>. Откройте его и нажмите на ссылку, чтобы подтвердить почту.
        </AuthNotice>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          Письма нет? Проверьте папку «Спам». Ссылку лучше открыть в этом же браузере.
        </p>
        <Link
          href="/login"
          className="mt-6 block rounded-xl border border-white/15 py-3 text-center text-sm font-medium text-cream hover:bg-white/5"
        >
          Перейти ко входу
        </Link>
      </>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    // Проверки до отправки: так человек сразу видит ошибку, без ожидания сервера
    const badNickname = nicknameError(nickname);
    if (badNickname) {
      setError(badNickname);
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
    const cleanEmail = email.trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      // Никнейм сохраняется в данных аккаунта. Профиль с ним создастся при первом входе
      // (до подтверждения почты записывать в базу от имени пользователя нельзя).
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { nickname: nickname.trim() } },
    });

    if (signUpError) {
      setError(authErrorMessage(signUpError));
      setLoading(false);
      return;
    }
    // Если почта уже зарегистрирована, Supabase (ради безопасности) не сообщает об этом ошибкой,
    // а возвращает пользователя без «способов входа». По этому признаку и узнаём.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Аккаунт с этой почтой уже есть. Попробуйте войти или восстановить пароль.");
      setLoading(false);
      return;
    }
    // Если в Supabase выключено подтверждение почты, сессия появляется сразу
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setSentTo(cleanEmail);
    setLoading(false);
  }

  return (
    <>
      <AuthTitle title="Создать аккаунт" subtitle="Библиотека, закладки и настройки — на любом устройстве." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
        <AuthField
          label="Никнейм"
          type="text"
          name="nickname"
          value={nickname}
          onChange={setNickname}
          autoComplete="nickname"
          autoFocus
          hint={`От ${NICKNAME_MIN} до ${NICKNAME_MAX} символов. Его увидят друзья, почту — никто.`}
        />
        <AuthField label="Электронная почта" type="email" name="email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthField
          label="Пароль"
          type="password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          hint={`Не меньше ${MIN_PASSWORD_LENGTH} символов`}
        />
        <AuthField label="Повторите пароль" type="password" name="repeat" value={repeat} onChange={setRepeat} autoComplete="new-password" />
        <SubmitButton loading={loading}>{loading ? "Создаём аккаунт…" : "Создать аккаунт"}</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-cream/70">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-accent hover:text-accent-hover">
          Войти
        </Link>
      </p>
    </>
  );
}
