import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

/**
 * Общая оболочка для разделов приложения.
 * ПК: боковая панель слева. Телефон: нижняя навигация.
 * Читалка находится вне этой группы и открывается на весь экран.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pl-[calc(15rem+2rem)] md:pr-8 md:pt-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
