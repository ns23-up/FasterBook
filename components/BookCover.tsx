import type { CoverTone } from "@/lib/demo-data";

const TONE_CLASSES: Record<CoverTone, string> = {
  accent: "from-[#7a3b2e] to-[#311e16] text-accent",
  graphite: "from-[#3c3b3f] to-[#1f1e20] text-cream",
  cream: "from-[#8a7660] to-[#4a3a2c] text-cream",
};

/**
 * Обложка-заглушка. Настоящие обложки появятся вместе с загрузкой книг.
 * Здесь нет чужих изображений, только простой цветной блок с первой буквой.
 */
export function BookCover({
  title,
  tone,
  size = "md",
}: {
  title: string;
  tone: CoverTone;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-14 w-10 text-base" : "h-20 w-14 text-xl";
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-md bg-linear-to-b font-serif font-semibold shadow-sm ring-1 ring-white/10 ${sizeClass} ${TONE_CLASSES[tone]}`}
    >
      {title.charAt(0)}
    </div>
  );
}
