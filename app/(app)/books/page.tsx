import { BooksClient } from "@/components/BooksClient";
import { PageHeader } from "@/components/PageHeader";
import { DEMO_BOOKS } from "@/lib/demo-data";

export const metadata = { title: "Мои книги" };

export default function BooksPage() {
  return (
    <>
      <PageHeader
        title="Мои книги"
        description="Поиск и сортировка работают на демо-списке. Загрузка своих файлов появится на этапе 2."
      />
      <BooksClient books={DEMO_BOOKS} />
    </>
  );
}
