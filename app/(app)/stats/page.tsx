import { PageHeader } from "@/components/PageHeader";
import { StatsClient } from "@/components/stats/StatsClient";

export const metadata = { title: "Статистика" };

export default function StatsPage() {
  return (
    <>
      <PageHeader
        title="Статистика"
        description="Серия дней, время и слова. Считается, только когда вы действительно читаете."
      />
      <StatsClient />
    </>
  );
}
