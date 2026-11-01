import { FriendsClient } from "@/components/FriendsClient";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Друзья" };

export default function FriendsPage() {
  return (
    <>
      <PageHeader
        title="Друзья"
        description="Добавляйте друзей по ID и следите за их серией чтения. Почту друзья не видят."
      />
      <FriendsClient />
    </>
  );
}
