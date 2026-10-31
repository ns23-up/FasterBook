import { PageHeader } from "@/components/PageHeader";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Настройки"
        description="Скорость, шрифт и цвета применяются в читалке. Справа видно, как это будет выглядеть."
      />
      <SettingsClient />
    </>
  );
}
