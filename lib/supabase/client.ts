import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Клиент Supabase для кода, который работает в браузере (формы входа, кнопка «Выйти»).
 * Сессия хранится в cookie, поэтому сервер (middleware) видит того же пользователя.
 * Возвращает null, если ключи не заданы.
 */
export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
