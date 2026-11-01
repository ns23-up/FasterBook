import { LoginForm } from "@/components/auth/LoginForm";
import { URL_ERRORS } from "@/lib/supabase/errors";

export const metadata = { title: "Вход" };

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const initialError = error && error in URL_ERRORS ? URL_ERRORS[error] : undefined;
  // После входа можно вернуть пользователя туда, откуда он пришёл, но только внутри сайта
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";

  return <LoginForm initialError={initialError} next={safeNext} />;
}
