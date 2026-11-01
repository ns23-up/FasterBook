import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Сюда ведут ссылки из писем Supabase: подтверждение почты и восстановление пароля.
 *
 * Ссылка бывает двух видов:
 * - ?code=...                — стандартные шаблоны писем (PKCE): меняем код на сессию;
 * - ?token_hash=...&type=... — если в шаблонах писем настроен такой формат.
 *
 * После успеха отправляем на страницу из параметра next (например, /reset-password),
 * при ошибке — на страницу входа с понятным сообщением.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  let failed = true;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  }

  if (failed) {
    return NextResponse.redirect(`${origin}/login?error=link_invalid`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

/**
 * Разрешаем переход только внутри сайта: путь должен начинаться с одного «/».
 * Иначе злоумышленник мог бы подсунуть ссылку, уводящую на чужой сайт после входа.
 */
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) {
    return value;
  }
  return "/";
}
