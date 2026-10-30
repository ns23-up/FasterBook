import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fasterbook — быстрое чтение по одному слову",
    template: "%s · Fasterbook",
  },
  description: "Читайте книги быстрее: слово за словом, в центре экрана.",
};

export const viewport: Viewport = {
  themeColor: "#311e16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
