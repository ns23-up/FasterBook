import { FriendsClient } from "@/components/FriendsClient";
import { DemoBadge } from "@/components/DemoBadge";
import { PageHeader } from "@/components/PageHeader";
import { DEMO_FRIENDS } from "@/lib/demo-data";

export const metadata = { title: "Друзья" };

export default function FriendsPage() {
  return (
    <>
      <PageHeader
        title="Друзья"
        description="Профили и активность друзей. Сейчас это демо-профили: настоящие друзья появятся вместе с аккаунтами."
        action={<DemoBadge />}
      />
      <FriendsClient friends={DEMO_FRIENDS} />
    </>
  );
}
