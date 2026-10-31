import { pivotIndex } from "@/lib/reader";
import { fontClass, textColorClass, type ReaderSettings } from "@/lib/settings";

/**
 * Слово с выделенной буквой в центре. Левая и правая части выровнены,
 * чтобы буква не «прыгала». Используется в читалке и в предпросмотре настроек.
 */
export function WordView({
  word,
  settings,
  size = "lg",
}: {
  word: string;
  settings: Pick<ReaderSettings, "font" | "textColor">;
  size?: "md" | "lg";
}) {
  const pivot = pivotIndex(word);
  const before = word.slice(0, pivot);
  const focus = word.charAt(pivot);
  const after = word.slice(pivot + 1);
  // Если слово уже коралловое, выделяем букву кремовым, иначе её не будет видно
  const focusClass = settings.textColor === "accent" ? "text-cream" : "text-accent";
  const sizeClass =
    size === "md" ? "min-h-[4rem] text-4xl sm:text-5xl" : "min-h-[7rem] text-5xl sm:text-7xl md:text-8xl";

  return (
    <div
      className={`grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center font-semibold leading-none ${sizeClass} ${fontClass(settings.font)} ${textColorClass(settings.textColor)}`}
      aria-label={word}
    >
      <span className="truncate text-right" aria-hidden="true">
        {before}
      </span>
      <span className={focusClass} aria-hidden="true">
        {focus}
      </span>
      <span className="truncate text-left" aria-hidden="true">
        {after}
      </span>
    </div>
  );
}
