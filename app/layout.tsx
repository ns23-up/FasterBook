import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fasterbook — Книги. Быстрее.",
    template: "%s · Fasterbook",
  },
  description: "Читайте целые книги по одному слову: слово за словом, в центре экрана.",
};

export const viewport: Viewport = {
  themeColor: "#311e16",
  width: "device-width",
  initialScale: 1,
};

/**
 * Шрифты грузятся с Google Fonts. Если интернета нет, браузер возьмёт
 * запасной системный шрифт из app/globals.css — сайт всё равно работает.
 */
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;700&family=Montserrat:wght@500;700&family=Playfair+Display:wght@500;700&family=Roboto:wght@400;500;700&display=swap&subset=cyrillic";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
