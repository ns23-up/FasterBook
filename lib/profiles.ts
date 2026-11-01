import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Профиль пользователя: никнейм, короткий ID для поиска друзей, настройка приватности. Без React.
 * Таблица profiles (миграция supabase/migrations/20261103120000_friends.sql).
 * Свой профиль виден только владельцу; друзьям — только через функции базы.
 */

export interface Profile {
  /** Короткий ID, по которому друзья находят пользователя */
  publicId: number;
  nickname: string;
  /** Показывать друзьям серию дней и книгу */
  shareActivity: boolean;
}

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 24;

/** Таблицы или функций друзей нет: миграция не выполнена */
export class FriendsNotReadyError extends Error {
  constructor() {
    super("Друзья ещё не настроены в базе данных: нужно выполнить SQL-миграцию 20261103120000_friends.sql.");
  }
}

const NOT_READY_CODES = new Set(["PGRST202", "PGRST205", "42883", "42P01"]);
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f]");

export function errorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
}

/** Ошибку «нет таблицы/функции» превращает в понятную, остальные отдаёт как есть */
export function wrapFriendsError(error: unknown): unknown {
  return NOT_READY_CODES.has(errorCode(error)) ? new FriendsNotReadyError() : error;
}

/** null — никнейм подходит, иначе текст ошибки */
export function nicknameError(raw: string): string | null {
  const nickname = raw.trim();
  if (nickname.length < NICKNAME_MIN) {
    return `Никнейм должен быть не короче ${NICKNAME_MIN} символов.`;
  }
  if (nickname.length > NICKNAME_MAX) {
    return `Никнейм должен быть не длиннее ${NICKNAME_MAX} символов.`;
  }
  if (CONTROL_CHARS.test(nickname)) {
    return "В никнейме есть недопустимые символы.";
  }
  return null;
}

interface ProfileRow {
  public_id: number;
  nickname: string;
  share_activity: boolean;
}

const COLUMNS = "public_id, nickname, share_activity";

function fromRow(row: ProfileRow): Profile {
  return { publicId: Number(row.public_id), nickname: row.nickname, shareActivity: row.share_activity };
}

/** Свой профиль или null, если его ещё нет */
export async function getMyProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) {
    throw wrapFriendsError(error);
  }
  return data ? fromRow(data as ProfileRow) : null;
}

/** Создаёт свой профиль. Если он уже есть (повтор), возвращает существующий. */
export async function createProfile(supabase: SupabaseClient, userId: string, nickname: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").insert({ nickname: nickname.trim() }).select(COLUMNS).single();
  if (!error) {
    return fromRow(data as ProfileRow);
  }
  if (errorCode(error) === "23505") {
    const existing = await getMyProfile(supabase, userId);
    if (existing) {
      return existing;
    }
  }
  throw wrapFriendsError(error);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: { nickname?: string; shareActivity?: boolean },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.nickname !== undefined) {
    update.nickname = patch.nickname.trim();
  }
  if (patch.shareActivity !== undefined) {
    update.share_activity = patch.shareActivity;
  }
  const { error } = await supabase.from("profiles").update(update).eq("user_id", userId);
  if (error) {
    throw wrapFriendsError(error);
  }
}

/** «Что читаю» для друзей: вызывается при открытии книги. Профиля нет — ничего не произойдёт. */
export async function setCurrentBook(supabase: SupabaseClient, userId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ current_book_title: title.slice(0, 300), current_book_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    throw wrapFriendsError(error);
  }
}
