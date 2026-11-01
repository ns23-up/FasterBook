import type { SupabaseClient } from "@supabase/supabase-js";
import { FriendsNotReadyError, wrapFriendsError } from "@/lib/profiles";
import { localDay } from "@/lib/stats";

/**
 * Друзья и заявки: вызовы функций базы. Без React.
 * Напрямую в таблицы друзей браузер не пишет: всё проверяют функции в базе
 * (миграция supabase/migrations/20261103120000_friends.sql).
 */

export interface Friend {
  publicId: number;
  nickname: string;
  /** false — друг скрыл свою активность */
  shares: boolean;
  /** Был на сайте за последние 5 минут */
  online: boolean;
  /** Текущая серия дней; null, если друг скрыл активность */
  streak: number | null;
  /** Книга, которую друг открывал за последние 14 дней; null — нет или скрыто */
  currentBook: string | null;
}

export interface FriendRequest {
  publicId: number;
  nickname: string;
}

export interface FriendsData {
  friends: Friend[];
  /** Заявки, которые прислали вам */
  incoming: FriendRequest[];
  /** Заявки, которые отправили вы */
  outgoing: FriendRequest[];
}

export type Relation = "self" | "friend" | "outgoing" | "incoming" | "none";

export interface FoundProfile {
  publicId: number;
  nickname: string;
  relation: Relation;
}

export type SendResult = "sent" | "accepted" | "already_sent" | "already_friends";

type Raw = Record<string, unknown>;

function toRequest(item: Raw): FriendRequest {
  return { publicId: Number(item.public_id), nickname: String(item.nickname ?? "") };
}

function list(value: unknown): Raw[] {
  return Array.isArray(value) ? (value as Raw[]) : [];
}

export async function getFriends(supabase: SupabaseClient): Promise<FriendsData> {
  const { data, error } = await supabase.rpc("get_friends", { p_today: localDay() });
  if (error) {
    throw wrapFriendsError(error);
  }
  const raw = (data ?? {}) as Raw;
  return {
    friends: list(raw.friends).map((item) => ({
      publicId: Number(item.public_id),
      nickname: String(item.nickname ?? ""),
      shares: item.shares === true,
      // Пока миграция «онлайн» не выполнена, поля нет — считаем, что не в сети
      online: item.online === true,
      streak: typeof item.streak === "number" ? item.streak : null,
      currentBook: typeof item.current_book === "string" && item.current_book !== "" ? item.current_book : null,
    })),
    incoming: list(raw.incoming).map(toRequest),
    outgoing: list(raw.outgoing).map(toRequest),
  };
}

/** Найти человека по ID. null — такого ID нет. */
export async function findProfile(supabase: SupabaseClient, publicId: number): Promise<FoundProfile | null> {
  const { data, error } = await supabase.rpc("find_profile", { p_public_id: publicId });
  if (error) {
    throw wrapFriendsError(error);
  }
  if (!data) {
    return null;
  }
  const raw = data as Raw;
  return { publicId: Number(raw.public_id), nickname: String(raw.nickname ?? ""), relation: raw.relation as Relation };
}

export async function sendFriendRequest(supabase: SupabaseClient, publicId: number): Promise<SendResult> {
  const { data, error } = await supabase.rpc("send_friend_request", { p_public_id: publicId });
  if (error) {
    throw wrapFriendsError(error);
  }
  return data as SendResult;
}

export async function respondFriendRequest(supabase: SupabaseClient, publicId: number, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_friend_request", { p_public_id: publicId, p_accept: accept });
  if (error) {
    throw wrapFriendsError(error);
  }
}

/** Удалить из друзей или отменить свою заявку */
export async function removeFriend(supabase: SupabaseClient, publicId: number): Promise<void> {
  const { error } = await supabase.rpc("remove_friend", { p_public_id: publicId });
  if (error) {
    throw wrapFriendsError(error);
  }
}

/** «Я сейчас на сайте». Время ставит база. Ошибки не важны: следующая отметка через 2 минуты. */
export async function markActive(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("mark_active");
  if (error) {
    throw wrapFriendsError(error);
  }
}

/** Понятный текст для ошибок друзей */
export function friendsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FriendsNotReadyError) {
    return error.message;
  }
  const message = error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : "";
  switch (message) {
    case "not_found":
      return "Пользователь с таким ID не найден.";
    case "self":
      return "Это ваш собственный ID.";
    case "no_profile":
      return "Сначала придумайте никнейм.";
    case "too_many_requests":
      return "Слишком много заявок без ответа. Подождите, пока на них ответят, или отмените часть.";
    default:
      return fallback;
  }
}

/** ID из поля ввода: «#100 042» → 100042. null — это не число. */
export function parsePublicId(raw: string): number | null {
  const digits = raw.replace(/[\s#]/g, "");
  if (!/^\d{1,15}$/.test(digits)) {
    return null;
  }
  return Number(digits);
}
