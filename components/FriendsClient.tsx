"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { Avatar, Toggle, cardClass, panelClass } from "@/components/ui";
import {
  findProfile,
  friendsErrorMessage,
  getFriends,
  parsePublicId,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  type FoundProfile,
  type FriendsData,
} from "@/lib/friends";
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  createProfile,
  getMyProfile,
  nicknameError,
  updateProfile,
  type Profile,
} from "@/lib/profiles";
import { plural } from "@/lib/stats";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileState =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "guest" }
  | { status: "error"; text: string }
  | { status: "need_nickname" }
  | { status: "ready"; profile: Profile };

type Notice = { kind: "ok" | "error"; text: string } | null;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-ink-deep/70 px-4 py-2.5 text-sm text-cream placeholder:text-cream-muted/70 focus:border-accent/50 focus:outline-none";

/**
 * «Друзья»: свой профиль (никнейм и ID), поиск по ID, заявки и список друзей.
 * Только для вошедших. Профиль создаётся из никнейма, указанного при регистрации.
 */
export function FriendsClient() {
  const { user, ready, enabled } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const userId = user?.id;
  const metaNickname = typeof user?.user_metadata?.nickname === "string" ? user.user_metadata.nickname : "";
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    if (!enabled || !supabase) {
      setState({ status: "disabled" });
      return;
    }
    if (!ready) {
      return;
    }
    if (!userId) {
      setState({ status: "guest" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        let profile = await getMyProfile(supabase, userId);
        // Первый вход после регистрации: профиль создаём из никнейма, указанного в форме
        if (!profile && metaNickname && !nicknameError(metaNickname)) {
          profile = await createProfile(supabase, userId, metaNickname);
        }
        if (!cancelled) {
          setState(profile ? { status: "ready", profile } : { status: "need_nickname" });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: "error", text: friendsErrorMessage(error, "Не удалось загрузить профиль. Обновите страницу.") });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, ready, supabase, userId, metaNickname]);

  switch (state.status) {
    case "loading":
      return <Message>Загружаем…</Message>;
    case "disabled":
      return <Message>Друзья появятся после подключения аккаунтов. Сейчас Fasterbook работает без входа.</Message>;
    case "guest":
      return (
        <Message>
          Чтобы добавлять друзей и видеть их серию чтения, войдите в аккаунт.
          <span className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-hover">
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-cream hover:bg-white/5"
            >
              Создать аккаунт
            </Link>
          </span>
        </Message>
      );
    case "error":
      return <Message>{state.text}</Message>;
    case "need_nickname":
      return supabase && userId ? (
        <NicknameSetup
          supabase={supabase}
          userId={userId}
          onDone={(profile) => setState({ status: "ready", profile })}
        />
      ) : null;
    case "ready":
      return supabase && userId ? (
        <FriendsView
          supabase={supabase}
          userId={userId}
          profile={state.profile}
          onProfileChange={(profile) => setState({ status: "ready", profile })}
        />
      ) : null;
  }
}

/** Для тех, кто зарегистрировался до появления никнеймов */
function NicknameSetup({
  supabase,
  userId,
  onDone,
}: {
  supabase: SupabaseClient;
  userId: string;
  onDone: (profile: Profile) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const bad = nicknameError(nickname);
    if (bad) {
      setError(bad);
      return;
    }
    setSaving(true);
    setError("");
    try {
      onDone(await createProfile(supabase, userId, nickname));
    } catch (saveError) {
      setError(friendsErrorMessage(saveError, "Не удалось сохранить никнейм. Попробуйте ещё раз."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`mx-auto flex max-w-md flex-col gap-4 p-6 ${cardClass}`}>
      <div>
        <h2 className="text-lg font-semibold text-cream">Придумайте никнейм</h2>
        <p className="mt-1 text-sm text-cream-muted">Его увидят друзья. Почту не видит никто.</p>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Никнейм</span>
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={NICKNAME_MAX + 10}
          autoComplete="nickname"
          placeholder={`От ${NICKNAME_MIN} до ${NICKNAME_MAX} символов`}
          className={inputClass}
        />
      </label>
      {error ? (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-accent py-3 text-sm font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
      >
        {saving ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}

function FriendsView({
  supabase,
  userId,
  profile,
  onProfileChange,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
}) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  /** Какое действие сейчас выполняется: на это время кнопки выключены */
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getFriends(supabase));
      setLoadError("");
    } catch (error) {
      setLoadError(friendsErrorMessage(error, "Не удалось загрузить друзей. Проверьте интернет и обновите страницу."));
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Выполнить действие, показать результат и обновить список */
  async function run(key: string, action: () => Promise<string | void>, fallback: string) {
    setBusy(key);
    setNotice(null);
    try {
      const okText = await action();
      if (okText) {
        setNotice({ kind: "ok", text: okText });
      }
    } catch (error) {
      setNotice({ kind: "error", text: friendsErrorMessage(error, fallback) });
    }
    await load();
    setBusy(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-6 self-start">
        <ProfileCard supabase={supabase} userId={userId} profile={profile} onChange={onProfileChange} />
        <AddFriend
          supabase={supabase}
          busy={busy !== null}
          onSend={(found) =>
            run(
              `send-${found.publicId}`,
              async () => {
                if (found.relation === "incoming") {
                  await respondFriendRequest(supabase, found.publicId, true);
                  return `Вы с ${found.nickname} теперь друзья.`;
                }
                const result = await sendFriendRequest(supabase, found.publicId);
                return result === "accepted"
                  ? `У вас уже была заявка от ${found.nickname} — теперь вы друзья.`
                  : result === "already_friends"
                    ? `${found.nickname} уже у вас в друзьях.`
                    : `Заявка для ${found.nickname} отправлена.`;
              },
              "Не удалось отправить заявку. Попробуйте ещё раз.",
            )
          }
        />
      </div>

      <div className="flex flex-col gap-6">
        {notice ? (
          <p
            role={notice.kind === "error" ? "alert" : "status"}
            className={`rounded-xl border px-4 py-3 text-sm text-cream ${
              notice.kind === "error" ? "border-accent/40 bg-accent/10" : "border-online/30 bg-online/10"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        {loadError ? (
          <Message>{loadError}</Message>
        ) : !data ? (
          <Message>Загружаем друзей…</Message>
        ) : (
          <>
            {data.incoming.length > 0 ? (
              <Section title={`Заявки в друзья (${data.incoming.length})`}>
                {data.incoming.map((request) => (
                  <li key={request.publicId} className="flex flex-wrap items-center gap-3 p-4">
                    <Avatar name={request.nickname} />
                    <PersonName nickname={request.nickname} publicId={request.publicId} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `accept-${request.publicId}`,
                            async () => {
                              await respondFriendRequest(supabase, request.publicId, true);
                              return `Вы с ${request.nickname} теперь друзья.`;
                            },
                            "Не удалось принять заявку.",
                          )
                        }
                        className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
                      >
                        Принять
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `decline-${request.publicId}`,
                            () => respondFriendRequest(supabase, request.publicId, false),
                            "Не удалось отклонить заявку.",
                          )
                        }
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs text-cream-muted hover:bg-white/5 hover:text-cream disabled:opacity-60"
                      >
                        Отклонить
                      </button>
                    </div>
                  </li>
                ))}
              </Section>
            ) : null}

            <Section title={`Мои друзья (${data.friends.length})`}>
              {data.friends.length === 0 ? (
                <li className="p-6 text-center text-sm text-cream-muted">
                  Друзей пока нет. Отправьте другу свой ID или найдите его по ID слева.
                </li>
              ) : (
                data.friends.map((friend) => (
                  <li key={friend.publicId} className="flex flex-wrap items-center gap-3 p-4">
                    <Avatar name={friend.nickname} size="lg" online={friend.online} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-cream">
                        {friend.nickname}
                        {friend.online ? <span className="ml-2 text-xs font-normal text-online">в сети</span> : null}
                      </p>
                      {friend.shares ? (
                        <>
                          <p className="flex items-center gap-1.5 text-xs text-cream-muted">
                            <Icon name="flame" className="h-3.5 w-3.5 text-accent" />
                            {friend.streak ?? 0} {plural(friend.streak ?? 0, ["день", "дня", "дней"])} подряд
                          </p>
                          <p className="truncate text-xs text-cream-muted">
                            {friend.currentBook ? `Читает «${friend.currentBook}»` : "Последние 2 недели без книг"}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-cream-muted">Активность скрыта</p>
                      )}
                    </div>
                    {confirmRemove === friend.publicId ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => {
                            setConfirmRemove(null);
                            void run(
                              `remove-${friend.publicId}`,
                              async () => {
                                await removeFriend(supabase, friend.publicId);
                                return `Больше не в друзьях: ${friend.nickname}.`;
                              },
                              "Не удалось удалить из друзей.",
                            );
                          }}
                          className="rounded-lg bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25"
                        >
                          Удалить
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(null)}
                          className="rounded-lg px-2.5 py-1.5 text-xs text-cream-muted hover:bg-white/5 hover:text-cream"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(friend.publicId)}
                        aria-label={`Удалить ${friend.nickname} из друзей`}
                        title="Удалить из друзей"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-cream-muted/70 hover:bg-white/5 hover:text-cream"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))
              )}
            </Section>

            {data.outgoing.length > 0 ? (
              <Section title={`Отправленные заявки (${data.outgoing.length})`}>
                {data.outgoing.map((request) => (
                  <li key={request.publicId} className="flex flex-wrap items-center gap-3 p-4">
                    <Avatar name={request.nickname} />
                    <PersonName nickname={request.nickname} publicId={request.publicId} hint="Ждём ответа" />
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void run(
                          `cancel-${request.publicId}`,
                          () => removeFriend(supabase, request.publicId),
                          "Не удалось отменить заявку.",
                        )
                      }
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs text-cream-muted hover:bg-white/5 hover:text-cream disabled:opacity-60"
                    >
                      Отменить
                    </button>
                  </li>
                ))}
              </Section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  supabase,
  userId,
  profile,
  onChange,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  onChange: (profile: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.nickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(String(profile.publicId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать. Выделите ID и скопируйте вручную.");
    }
  }

  async function saveNickname(event: React.FormEvent) {
    event.preventDefault();
    const bad = nicknameError(draft);
    if (bad) {
      setError(bad);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile(supabase, userId, { nickname: draft });
      onChange({ ...profile, nickname: draft.trim() });
      setEditing(false);
    } catch (saveError) {
      setError(friendsErrorMessage(saveError, "Не удалось сохранить никнейм."));
    }
    setSaving(false);
  }

  async function toggleShare(value: boolean) {
    setError("");
    // Меняем сразу, при ошибке возвращаем
    onChange({ ...profile, shareActivity: value });
    try {
      await updateProfile(supabase, userId, { shareActivity: value });
    } catch (saveError) {
      onChange({ ...profile, shareActivity: !value });
      setError(friendsErrorMessage(saveError, "Не удалось сохранить настройку."));
    }
  }

  return (
    <section aria-label="Мой профиль" className={`flex flex-col gap-4 p-5 ${cardClass}`}>
      <div className="flex items-center gap-3">
        <Avatar name={profile.nickname} size="lg" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={saveNickname} className="flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                aria-label="Новый никнейм"
                autoFocus
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="shrink-0 rounded-xl bg-accent px-3 text-xs font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? "…" : "OK"}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold text-cream">{profile.nickname}</p>
              <button
                type="button"
                onClick={() => {
                  setDraft(profile.nickname);
                  setEditing(true);
                  setError("");
                }}
                className="text-xs text-cream-muted hover:text-cream"
              >
                Изменить
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between gap-3 px-4 py-3 ${panelClass}`}>
        <div>
          <p className="text-xs text-cream-muted">Ваш ID для друзей</p>
          <p className="select-all text-xl font-semibold tabular-nums tracking-wide text-cream">{profile.publicId}</p>
        </div>
        <button
          type="button"
          onClick={() => void copyId()}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-cream hover:bg-white/5"
        >
          {copied ? "Скопировано" : "Скопировать"}
        </button>
      </div>

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-cream">
          Показывать друзьям серию дней и что я читаю
          <span className="mt-0.5 block text-xs text-cream-muted">Если выключить, друзья увидят только никнейм.</span>
        </p>
        <Toggle
          label="Показывать друзьям серию дней и что я читаю"
          checked={profile.shareActivity}
          onChange={(value) => void toggleShare(value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function AddFriend({
  supabase,
  busy,
  onSend,
}: {
  supabase: SupabaseClient;
  busy: boolean;
  onSend: (found: FoundProfile) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundProfile | null>(null);
  const [error, setError] = useState("");

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const publicId = parsePublicId(query);
    setFound(null);
    if (publicId === null) {
      setError("ID — это число, например 100042.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const result = await findProfile(supabase, publicId);
      if (result) {
        setFound(result);
      } else {
        setError("Пользователь с таким ID не найден.");
      }
    } catch (searchError) {
      setError(friendsErrorMessage(searchError, "Не удалось выполнить поиск. Проверьте интернет."));
    }
    setSearching(false);
  }

  const action: { label: string; enabled: boolean } | null = found
    ? {
        self: { label: "Это вы", enabled: false },
        friend: { label: "Уже в друзьях", enabled: false },
        outgoing: { label: "Заявка отправлена", enabled: false },
        incoming: { label: "Принять заявку", enabled: true },
        none: { label: "Добавить в друзья", enabled: true },
      }[found.relation]
    : null;

  return (
    <section aria-labelledby="add-friend-title" className={`flex flex-col gap-3 p-5 ${cardClass}`}>
      <h2 id="add-friend-title" className="text-sm font-semibold text-cream">
        Найти друга по ID
      </h2>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          inputMode="numeric"
          aria-label="ID друга"
          placeholder="Например, 100042"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-ink hover:bg-accent-hover disabled:opacity-60"
        >
          {searching ? "…" : "Найти"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      ) : null}

      {found && action ? (
        <div className={`flex items-center gap-3 p-3 ${panelClass}`}>
          <Avatar name={found.nickname} />
          <PersonName nickname={found.nickname} publicId={found.publicId} />
          <button
            type="button"
            disabled={!action.enabled || busy}
            onClick={async () => {
              await onSend(found);
              setFound(null);
              setQuery("");
            }}
            className="shrink-0 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-ink hover:bg-accent-hover disabled:bg-white/10 disabled:text-cream-muted"
          >
            {action.label}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PersonName({ nickname, publicId, hint }: { nickname: string; publicId: number; hint?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-cream">{nickname}</p>
      <p className="text-xs tabular-nums text-cream-muted">
        ID {publicId}
        {hint ? ` · ${hint}` : ""}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-cream-muted">{title}</h2>
      <ul className={`divide-y divide-white/5 ${cardClass}`}>{children}</ul>
    </section>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm leading-relaxed text-cream-muted">
      {children}
    </div>
  );
}
