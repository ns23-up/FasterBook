import { ReaderClient } from "@/components/ReaderClient";
import { StoredReader } from "@/components/StoredReader";
import { findDemoBook } from "@/lib/demo-data";
import { tokenize } from "@/lib/reader";

interface ReaderPageProps {
  params: Promise<{ bookId: string }>;
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const { bookId } = await params;
  const book = findDemoBook(bookId);
  return { title: book ? `Читалка · ${book.title}` : "Читалка" };
}

/**
 * Читалка открывается на весь экран, без боковой панели и нижней навигации.
 * Демо-книги известны серверу заранее. Книги пользователя лежат в браузере (IndexedDB),
 * поэтому их открывает StoredReader уже на стороне браузера.
 */
export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = await params;
  const book = findDemoBook(bookId);

  if (!book) {
    return <StoredReader bookId={bookId} />;
  }

  const words = tokenize(book.text);
  // Стартовая позиция берётся из демо-прогресса, чтобы «продолжить чтение» работало
  const startIndex = Math.floor((words.length * book.progress) / 100);

  return (
    <ReaderClient
      title={book.title}
      author={book.author}
      words={words}
      startIndex={startIndex}
      isDemo
    />
  );
}
