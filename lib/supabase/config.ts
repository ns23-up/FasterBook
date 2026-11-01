/**
 * Настройки подключения к Supabase. Ключи берутся из переменных окружения (файл .env.local).
 *
 * Публикуемый ключ (publishable key) специально безопасен для браузера: им нельзя
 * ничего сделать без правил доступа (RLS) и без входа пользователя.
 * Секретный ключ (service_role) здесь НИКОГДА не используется и в проект не добавляется.
 *
 * Если ключи не заданы, сайт работает как раньше, без аккаунтов.
 */

// Важно: process.env.NEXT_PUBLIC_... надо писать именно так, целиком.
// Next.js подставляет значения при сборке и не умеет делать это через динамические имена.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Заданы ли ключи Supabase. Без них вход и регистрация отключены. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "";
}
