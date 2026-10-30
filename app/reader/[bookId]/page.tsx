import { notFound } from "next/navigation";
import { ReaderClient } from "@/components/ReaderClient";
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

/** Читалка открывается на весь экран, без боковой панели и нижней навигации. */
export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = await params;
  const book = findDemoBook(bookId);

  if (!book) {
    notFound();
  }

  const words = tokenize(book.text);
  // Стартовая позиция берётся из демо-прогресса, чтобы «продолжить чтение» работало
  const startIndex = Math.floor((words.length * book.progress) / 100);

  return (
    <ReaderClient
      title={book.title}
      words={words}
      startIndex={startIndex}
      isDemo
    />
  );
}
