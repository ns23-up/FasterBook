import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addBook,
  deleteBook,
  getBook,
  listBooks,
  markMoved,
  purgeMovedBooks,
  savePosition,
  setFavorite,
  type NewBook,
  type StoredBook,
} from "@/lib/books-db";
import {
  CloudBooksError,
  addCloudBook,
  deleteCloudBook,
  getCloudBook,
  listCloudBooks,
  saveCloudPosition,
  setCloudFavorite,
} from "@/lib/cloud-books";

/**
 * «Библиотека» — одно лицо для двух хранилищ книг:
 * - гость (без входа) — книги в этом браузере (IndexedDB), как раньше;
 * - вошедший пользователь — книги в его аккаунте (Supabase), видны на любом устройстве.
 * Компоненты работают с Library и не знают, где на самом деле лежат книги.
 */
export interface Library {
  kind: "local" | "cloud";
  list(): Promise<StoredBook[]>;
  get(id: string): Promise<{ book: StoredBook; text: string } | null>;
  add(input: NewBook): Promise<StoredBook>;
  remove(id: string): Promise<void>;
  savePosition(id: string, position: number): Promise<void>;
  setFavorite(id: string, favorite: boolean): Promise<void>;
}

export const localLibrary: Library = {
  kind: "local",
  list: listBooks,
  get: getBook,
  add: addBook,
  remove: deleteBook,
  savePosition,
  setFavorite,
};

export function cloudLibrary(supabase: SupabaseClient, userId: string): Library {
  return {
    kind: "cloud",
    list: () => listCloudBooks(supabase),
    get: (id) => getCloudBook(supabase, userId, id),
    add: (input) => addCloudBook(supabase, userId, input),
    remove: (id) => deleteCloudBook(supabase, userId, id),
    savePosition: (id, position) => saveCloudPosition(supabase, id, position),
    setFavorite: (id, favorite) => setCloudFavorite(supabase, id, favorite),
  };
}

/** Сколько книг лежит в этом браузере (не в аккаунте). При ошибке — 0. */
export async function countLocalBooks(): Promise<number> {
  try {
    // Заодно убираем «хвосты» прерванного переноса: копия этих книг уже в аккаунте
    await purgeMovedBooks().catch(() => 0);
    return (await listBooks()).length;
  } catch {
    return 0;
  }
}

export interface MoveResult {
  moved: number;
  failed: number;
  /** Первая ошибка, если что-то не удалось перенести */
  error?: unknown;
}

/**
 * Переносит книги из браузера в аккаунт вместе с позицией. Безопасно запускать повторно.
 *
 * Порядок для каждой книги: 1) сохранить в аккаунте; 2) сразу пометить книгу в браузере
 * как перенесённую; 3) удалить её из браузера. Если процесс оборвётся после шага 1,
 * пометка не даст загрузить эту книгу в аккаунт второй раз, а недоудалённое уберёт следующий запуск.
 * Книга, которую не удалось сохранить в аккаунте, остаётся в браузере нетронутой.
 * Ошибка одной книги не останавливает остальные.
 */
export async function moveLocalBooksTo(target: Library): Promise<MoveResult> {
  const run = async (): Promise<MoveResult> => {
    await purgeMovedBooks().catch(() => 0);
    const result: MoveResult = { moved: 0, failed: 0 };

    for (const item of await listBooks()) {
      try {
        const full = await getBook(item.id);
        if (!full) {
          continue;
        }
        // Тот же id, что в браузере: повторный перенос этой книги не создаст в аккаунте вторую копию
        const copy = await target.add({
          id: full.book.id,
          title: full.book.title,
          author: full.book.author,
          text: full.text,
          wordCount: full.book.wordCount,
          position: full.book.position,
        });
        // Копия в аккаунте уже есть: дальше ошибки не считаем провалом переноса
        result.moved += 1;
        if (full.book.favorite) {
          await target.setFavorite(copy.id, true).catch(() => undefined);
        }
        await markMoved(item.id, copy.id).catch(() => undefined);
        await deleteBook(item.id).catch(() => undefined);
      } catch (error) {
        result.failed += 1;
        result.error ??= error;
      }
    }
    return result;
  };

  // Две открытые вкладки не должны переносить одновременно: обе загрузили бы одни и те же книги
  if (typeof navigator !== "undefined" && navigator.locks) {
    const locked = await navigator.locks.request("fasterbook-move-books", { ifAvailable: true }, async (lock) =>
      lock ? run() : null,
    );
    return locked ?? { moved: 0, failed: 0, error: new CloudBooksError("Перенос уже идёт в другой вкладке.") };
  }
  return run();
}
