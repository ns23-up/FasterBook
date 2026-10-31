import { countWords, pivotIndex } from "@/lib/reader";
import { fontClass, textColorClass, type ReaderSettings } from "@/lib/settings";

/**
 * Кадр читалки.
 * Одно слово: стоит ровно по центру экрана, средняя буква подсвечена акцентом.
 * Несколько слов («и пришёл», «Анна вышла из дома»): фраза целиком по центру, без выделения.
 * Используется в читалке и в предпросмотре настроек.
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
  // lining-nums: ровные цифры. У Playfair по умолчанию «старинные» цифры, которые скачут по высоте.
  const common = `w-full max-w-4xl font-semibold [font-variant-numeric:lining-nums] ${fontClass(settings.font)} ${textColorClass(settings.textColor)}`;

  if (countWords(word) > 1) {
    return (
      <p className={`flex items-center justify-center text-center leading-tight ${phraseSizeClass(word.length, size)} ${common}`}>
        {word}
      </p>
    );
  }

  const pivot = pivotIndex(word);
  const before = word.slice(0, pivot);
  const focus = word.charAt(pivot);
  const after = word.slice(pivot + 1);
  // Если слово уже коралловое, выделяем букву кремовым, иначе её не будет видно
  const focusClass = settings.textColor === "accent" ? "text-cream" : "text-accent";
  return (
    <p
      className={`flex items-center justify-center text-center leading-none [overflow-wrap:anywhere] ${wordSizeClass(word.length, size)} ${common}`}
      aria-label={word}
    >
      <span aria-hidden="true">
        {before}
        <span className={focusClass}>{focus}</span>
        {after}
      </span>
    </p>
  );
}

/** Длинное слово пишем мельче, чтобы оно целиком помещалось в ширину экрана */
function wordSizeClass(length: number, size: "md" | "lg"): string {
  if (size === "md") {
    return length > 10 ? "min-h-[4rem] text-3xl sm:text-4xl" : "min-h-[4rem] text-4xl sm:text-5xl";
  }
  if (length <= 9) {
    return "min-h-[7rem] text-5xl sm:text-7xl md:text-8xl";
  }
  if (length <= 14) {
    return "min-h-[7rem] text-4xl sm:text-6xl md:text-7xl";
  }
  return "min-h-[7rem] text-3xl sm:text-5xl md:text-6xl";
}

/** Чем длиннее фраза, тем мельче шрифт: чтобы она помещалась в одну-две строки даже на телефоне */
function phraseSizeClass(length: number, size: "md" | "lg"): string {
  if (size === "md") {
    return length > 14 ? "min-h-[4rem] text-2xl sm:text-3xl" : "min-h-[4rem] text-3xl sm:text-4xl";
  }
  if (length <= 12) {
    return "min-h-[7rem] text-5xl sm:text-6xl md:text-7xl";
  }
  if (length <= 20) {
    return "min-h-[7rem] text-4xl sm:text-5xl md:text-6xl";
  }
  return "min-h-[7rem] text-3xl sm:text-4xl md:text-5xl";
}
