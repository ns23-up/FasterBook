import { FavoritesClient } from "@/components/FavoritesClient";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Избранное" };

export default function FavoritesPage() {
  return (
    <>
      <PageHeader
        title="Избранное"
        description="Любимые книги и цитаты, сохранённые в читалке. Заметки и закладки появятся позже."
      />
      <FavoritesClient />
    </>
  );
}
