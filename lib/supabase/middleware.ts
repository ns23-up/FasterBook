import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/** Страницы входа: если вы уже вошли, на них делать нечего, отправляем на главную */
const GUEST_ONLY_PATHS = ["/login", "/register", "/forgot-password"];

/**
 * Запускается на каждый запрос страницы:
 * 1. Проверяет сессию на стороне Supabase (getUser) и обновляет cookie, когда срок вот-вот истечёт.
 *    Благодаря этому пользователь остаётся в аккаунте после перезагрузки и через несколько дней.
 * 2. Отправляет уже вошедших пользователей со страниц входа и регистрации на главную.
 *
 * Важно: тут используется именно getUser(), а не getSession(). getSession() верит cookie
 * на слово, а getUser() спрашивает у Supabase, настоящая ли сессия.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Без ключей аккаунтов нет, просто пропускаем запрос
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && GUEST_ONLY_PATHS.includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Переносим обновлённые cookie сессии в ответ-редирект
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
