import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

/**
 * Общая оболочка для разделов приложения.
 * ПК: боковая панель слева и верхняя панель с поиском. Телефон: верхняя панель и нижняя навигация.
 * Читалка и экран приветствия находятся вне этой группы и открываются на весь экран.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh md:pl-60">
      <Sidebar />
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
