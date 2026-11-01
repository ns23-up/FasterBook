/**
 * Переводит ошибки Supabase Auth в понятные сообщения на русском.
 * Supabase присылает у ошибки машинный код (error.code) — по нему и выбираем текст.
 */

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Неверная почта или пароль.",
  email_not_confirmed: "Почта ещё не подтверждена. Откройте письмо от Fasterbook и нажмите на ссылку.",
  user_already_exists: "Аккаунт с этой почтой уже есть. Попробуйте войти.",
  email_exists: "Аккаунт с этой почтой уже есть. Попробуйте войти.",
  weak_password: "Пароль слишком простой. Используйте не меньше 8 символов, буквы и цифры.",
  same_password: "Новый пароль должен отличаться от старого.",
  email_address_invalid: "Похоже, в адресе почты ошибка.",
  over_email_send_rate_limit: "Слишком много писем за короткое время. Подождите пару минут и попробуйте снова.",
  over_request_rate_limit: "Слишком много попыток. Подождите немного и попробуйте снова.",
  signup_disabled: "Регистрация сейчас отключена.",
  otp_expired: "Ссылка из письма устарела. Запросите новую.",
  session_not_found: "Сессия истекла. Войдите заново.",
  user_not_found: "Аккаунт не найден.",
  validation_failed: "Проверьте правильность почты и пароля.",
};

/** Сообщения для ошибок, переданных в адресе страницы (?error=...) */
export const URL_ERRORS: Record<string, string> = {
  link_invalid:
    "Ссылка из письма недействительна или устарела. Если вы открыли её в другом браузере, откройте письмо там же, где регистрировались, или запросите новое письмо.",
  not_configured: "Вход временно недоступен.",
};

export function authErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    if (code && code in MESSAGES) {
      return MESSAGES[code];
    }
    const name = "name" in error ? String((error as { name?: unknown }).name ?? "") : "";
    const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    if (name === "AuthRetryableFetchError" || /fetch|network/i.test(message)) {
      return "Нет связи с сервером. Проверьте интернет и попробуйте снова.";
    }
    // Старые версии Supabase присылают только текст без кода
    if (/invalid login credentials/i.test(message)) {
      return MESSAGES.invalid_credentials;
    }
    if (/email not confirmed/i.test(message)) {
      return MESSAGES.email_not_confirmed;
    }
  }
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

/** Код ошибки (если есть) — нужен, чтобы, например, показать кнопку «Отправить письмо ещё раз» */
export function authErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}
