import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewBook, StoredBook } from "@/lib/books-db";

/**
 * Книги в аккаунте Supabase. Без React. Те же действия, что в lib/books-db.ts, но на сервере.
 *
 * - таблица books — сведения о книге и позиция; каждый видит только свои строки (RLS);
 * - закрытое хранилище book-texts — сам текст файлом «id пользователя/id книги.txt».
 *
 * Настраивается миграцией supabase/migrations/20261101120000_books.sql.
 */

const BUCKET = "book-texts";
// Все колонки, а не список: колонка is_favorite появляется отдельной миграцией (избранное).
// Пока её нет, библиотека должна работать как раньше, просто без отметок «любимая».
const COLUMNS = "*";
/** Коды «такой колонки нет»: миграция избранного не выполнена */
const NO_COLUMN_CODES = new Set(["PGRST204", "42703"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Коды «таблицы нет»: миграция не выполнена */
const NOT_READY_CODES = new Set(["PGRST205", "42P01"]);

/** Ошибка с понятным текстом, который можно показать пользователю */
export class CloudBooksError extends Error {}

interface BookRow {
  id: string;
  title: string;
  author: string;
  word_count: number;
  position: number;
  added_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

function fromRow(row: BookRow): StoredBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    wordCount: row.word_count,
    position: row.position,
    addedAt: Date.parse(row.added_at),
    updatedAt: Date.parse(row.updated_at),
    favorite: row.is_favorite === true,
  };
}

function field(error: unknown, name: string): string {
  return error && typeof error === "object" && name in error
    ? String((error as Record<string, unknown>)[name] ?? "")
    : "";
}

function wrapError(error: unknown): Error {
  if (NOT_READY_CODES.has(field(error, "code")) || /bucket not found/i.test(field(error, "message"))) {
    return new CloudBooksError(
      "Хранение книг в аккаунте ещё не настроено в базе данных: нужно выполнить SQL-миграцию из папки supabase.",
    );
  }
  return error instanceof Error ? error : new Error(field(error, "message") || "Ошибка хранилища книг.");
}

function textPath(userId: string, bookId: string): string {
  return `${userId}/${bookId}.txt`;
}

export async function listCloudBooks(supabase: SupabaseClient): Promise<StoredBook[]> {
  const { data, error } = await supabase.from("books").select(COLUMNS).order("updated_at", { ascending: false });
  if (error) {
    throw wrapError(error);
  }
  return (data as BookRow[]).map(fromRow);
}

export async function getCloudBook(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<{ book: StoredBook; text: string } | null> {
  // id не похож на id из базы (например, книга из браузера) — такой книги в аккаунте точно нет
  if (!UUID_RE.test(id)) {
    return null;
  }
  const { data, error } = await supabase.from("books").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) {
    throw wrapError(error);
  }
  if (!data) {
    return null;
  }
  const file = await supabase.storage.from(BUCKET).download(textPath(userId, id));
  if (file.error) {
    const wrapped = wrapError(file.error);
    if (!(wrapped instanceof CloudBooksError) && /not.?found/i.test(field(file.error, "message"))) {
      return null;
    }
    throw wrapped;
  }
  return { book: fromRow(data as BookRow), text: await file.data.text() };
}

/**
 * Добавляет книгу. Повтор с тем же input.id не создаёт дубль, а возвращает уже сохранённую книгу.
 *
 * id придумываем сами, ДО отправки: если ответ сервера потеряется, повтор придёт с тем же id,
 * и база отклонит вторую запись (id уникален). Проверка «есть ли уже такая» перед вставкой
 * не помогла бы: два одновременных запроса оба увидели бы «нет».
 *
 * Порядок: сначала текст, потом запись. Так в списке не бывает книги без текста.
 */
export async function addCloudBook(supabase: SupabaseClient, userId: string, input: NewBook): Promise<StoredBook> {
  const id = input.id && UUID_RE.test(input.id) ? input.id.toLowerCase() : newUuid();
  const path = textPath(userId, id);

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([input.text], { type: "text/plain;charset=utf-8" }), {
      contentType: "text/plain;charset=utf-8",
      upsert: false,
    });
  // Файл с этим id уже есть — это прошлая попытка с той же книгой, текст тот же
  const uploadedNow = !upload.error;
  if (upload.error && !isAlreadyExists(upload.error)) {
    throw wrapError(upload.error);
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      id,
      title: input.title.slice(0, 300) || "Без названия",
      author: input.author.slice(0, 300),
      word_count: input.wordCount,
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single();

  if (!error) {
    return fromRow(data as BookRow);
  }
  if (field(error, "code") === UNIQUE_VIOLATION) {
    // Книга с этим id уже сохранена (повтор). Отдаём её, вторую не создаём.
    const existing = await supabase.from("books").select(COLUMNS).eq("id", id).maybeSingle();
    if (existing.data) {
      return fromRow(existing.data as BookRow);
    }
  }
  // Запись не создалась: убираем только что загруженный текст, чтобы не занимал место
  if (uploadedNow) {
    await supabase.storage.from(BUCKET).remove([path]);
  }
  throw wrapError(error);
}

/** Postgres: «такое значение уже есть» (повтор уникального id) */
const UNIQUE_VIOLATION = "23505";

function isAlreadyExists(error: unknown): boolean {
  return (
    field(error, "code") === "ResourceAlreadyExists" ||
    field(error, "statusCode") === "409" ||
    /already exists|duplicate/i.test(field(error, "message"))
  );
}

/** Случайный UUID. crypto.randomUUID есть не везде (например, сайт открыт по http с другого устройства) */
function newUuid(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Сначала запись, потом текст. Если запись удалить не получилось, книга остаётся целой.
 * Если не удалился только текст, книги в списке уже нет, а файл лишь занимает место.
 */
export async function deleteCloudBook(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) {
    throw wrapError(error);
  }
  await supabase.storage.from(BUCKET).remove([textPath(userId, id)]);
}

export async function setCloudFavorite(supabase: SupabaseClient, id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from("books").update({ is_favorite: favorite }).eq("id", id);
  if (error) {
    if (NO_COLUMN_CODES.has(field(error, "code"))) {
      throw new CloudBooksError(
        "Избранное ещё не настроено в базе данных: нужно выполнить SQL-миграцию 20261102120000_favorites.sql.",
      );
    }
    throw wrapError(error);
  }
}

export async function saveCloudPosition(supabase: SupabaseClient, id: string, position: number): Promise<void> {
  const { error } = await supabase
    .from("books")
    .update({ position, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw wrapError(error);
  }
}
