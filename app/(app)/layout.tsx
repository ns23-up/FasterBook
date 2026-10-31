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
    <div className="relative min-h-dvh md:pl-60">
      {/* Едва заметное тёплое свечение сверху: добавляет глубину фону */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(60rem_22rem_at_75%_0%,rgba(233,117,113,0.08),transparent)]"
      />
      <Sidebar />
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
