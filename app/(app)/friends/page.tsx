import { DemoBadge } from "@/components/DemoBadge";
import { FriendsClient } from "@/components/FriendsClient";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { DEMO_FRIENDS } from "@/lib/demo-data";

export const metadata = { title: "Друзья" };

export default function FriendsPage() {
  return (
    <>
      <PageHeader
        title="Друзья"
        badge={<DemoBadge />}
        description="Сейчас это демо-профили: настоящие друзья появятся вместе с аккаунтами."
        action={
          <button
            type="button"
            disabled
            title="Появится вместе с аккаунтами"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent/30 px-4 py-2.5 text-sm font-semibold text-cream/60"
          >
            <Icon name="plus" className="h-4 w-4" />
            Добавить друга
          </button>
        }
      />
      <FriendsClient friends={DEMO_FRIENDS} />
    </>
  );
}
