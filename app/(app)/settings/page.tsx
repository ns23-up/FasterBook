import { PageHeader } from "@/components/PageHeader";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata = { title: "Настройки" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Настройки"
        description="Скорость и шрифт сохраняются в этом браузере и применяются в читалке."
      />
      <SettingsClient />
    </>
  );
}
