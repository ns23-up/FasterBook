import { BooksClient } from "@/components/BooksClient";
import { DEMO_BOOKS } from "@/lib/demo-data";

export const metadata = { title: "Мои книги" };

interface BooksPageProps {
  /** ?q=... приходит из строки поиска в верхней панели */
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function BooksPage({ searchParams }: BooksPageProps) {
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q : "";

  // key сбрасывает поле поиска, когда запрос в адресе меняется
  return <BooksClient key={initialQuery} books={DEMO_BOOKS} initialQuery={initialQuery} />;
}
