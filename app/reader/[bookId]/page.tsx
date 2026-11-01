import { StoredReader } from "@/components/StoredReader";

export const metadata = { title: "Читалка" };

interface ReaderPageProps {
  params: Promise<{ bookId: string }>;
}

/**
 * Читалка открывается на весь экран, без боковой панели и нижней навигации.
 * Книги лежат в аккаунте или в браузере, поэтому их открывает StoredReader на стороне браузера.
 */
export default async function ReaderPage({ params }: ReaderPageProps) {
  const { bookId } = await params;
  return <StoredReader bookId={bookId} />;
}
