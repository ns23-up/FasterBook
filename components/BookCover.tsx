import type { CoverTone } from "@/lib/demo-data";

const TONE_CLASSES: Record<CoverTone, string> = {
  accent: "bg-cover-ember text-accent",
  graphite: "bg-cover-slate text-cream",
  cream: "bg-cover-sand text-cream",
};

const SIZE_CLASSES = {
  sm: "h-14 w-10 text-lg",
  md: "h-20 w-14 text-2xl",
  lg: "h-28 w-20 text-4xl",
} as const;

/**
 * Обложка-заглушка. Настоящие обложки появятся вместе с загрузкой книг.
 * Здесь нет чужих изображений: однотонный блок, корешок и первая буква названия.
 */
export function BookCover({
  title,
  tone,
  size = "md",
  fancy = false,
}: {
  title: string;
  tone: CoverTone;
  size?: keyof typeof SIZE_CLASSES;
  /** Объёмный вариант: блик, обрез страниц и глубокая тень */
  fancy?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-md py-2 pl-3 pr-2 ${fancy ? "shadow-xl shadow-black/50 ring-1 ring-white/15" : "shadow-md shadow-black/30 ring-1 ring-white/10"} ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    >
      {/* Корешок */}
      <span className="absolute inset-y-0 left-0 w-1.5 bg-black/25" />
      <span className="h-px w-2/3 bg-current opacity-40" />
      <span className="self-center font-playfair font-semibold leading-none">{title.charAt(0)}</span>
      <span className="h-px w-1/3 self-end bg-current opacity-40" />
      {fancy ? (
        <>
          {/* Блик по диагонали и светлая кромка страниц справа */}
          <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/20" />
          <span className="absolute inset-y-1 right-0 w-0.5 bg-white/25" />
        </>
      ) : null}
    </div>
  );
}
