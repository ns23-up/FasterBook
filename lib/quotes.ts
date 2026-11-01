import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Цитаты в аккаунте Supabase. Без React. Только для вошедших пользователей.
 * Таблица quotes, каждый видит только свои цитаты (RLS).
 * Настраивается миграцией supabase/migrations/20261102120000_favorites.sql.
 */

export interface Quote {
  id: string;
  /** Книга, из которой цитата. null — книгу удалили (название сохранено в bookTitle) */
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string;
  text: string;
  /** Номер первого слова цитаты в книге */
  position: number;
  createdAt: number;
}

export interface NewQuote {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  text: string;
  position: number;
}

/** Таблицы цитат нет: миграция избранного не выполнена */
export class QuotesNotReadyError extends Error {}

const NOT_READY_CODES = new Set(["PGRST205", "42P01"]);
const MAX_QUOTE_CHARS = 2000;

interface QuoteRow {
  id: string;
  book_id: string | null;
  book_title: string;
  book_author: string;
  text: string;
  position: number;
  created_at: string;
}

function fromRow(row: QuoteRow): Quote {
  return {
    id: row.id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    bookAuthor: row.book_author,
    text: row.text,
    position: row.position,
    createdAt: Date.parse(row.created_at),
  };
}

function wrapError(error: unknown): unknown {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
  return NOT_READY_CODES.has(code)
    ? new QuotesNotReadyError("Цитаты ещё не настроены в базе данных: нужно выполнить SQL-миграцию 20261102120000_favorites.sql.")
    : error;
}

/** Все цитаты, сначала новые */
export async function listQuotes(supabase: SupabaseClient): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, book_id, book_title, book_author, text, position, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw wrapError(error);
  }
  return (data as QuoteRow[]).map(fromRow);
}

export async function addQuote(supabase: SupabaseClient, input: NewQuote): Promise<void> {
  const text = input.text.trim().slice(0, MAX_QUOTE_CHARS);
  if (text === "") {
    return;
  }
  const { error } = await supabase.from("quotes").insert({
    book_id: input.bookId,
    book_title: input.bookTitle.slice(0, 300),
    book_author: input.bookAuthor.slice(0, 300),
    text,
    position: Math.max(0, Math.round(input.position)),
  });
  if (error) {
    throw wrapError(error);
  }
}

export async function deleteQuote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) {
    throw wrapError(error);
  }
}
