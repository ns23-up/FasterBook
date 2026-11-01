import { countWords, pivotIndex } from "@/lib/reader";
import { fontClass, textColorClass, type ReaderSettings } from "@/lib/settings";

/**
 * Кадр читалки.
 * Одно слово: стоит ровно по центру экрана, средняя буква подсвечена акцентом.
 * Несколько слов («и пришёл», «Анна вышла из дома»): фраза целиком по центру, без выделения.
 * Используется в читалке и в предпросмотре настроек.
 *
 * Размер шрифта постоянный: если он меняется от слова к слову, текст «дышит» и читать тяжелее.
 * Уменьшаем только то, что иначе не поместится в ширину экрана.
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
  // overflow-wrap:anywhere: очень длинное слово переносится, а не вылезает за экран.
  const className = `flex w-full max-w-4xl items-center justify-center text-center font-semibold leading-tight [font-variant-numeric:lining-nums] [overflow-wrap:anywhere] ${sizeClass(word.length, size)} ${fontClass(settings.font)} ${textColorClass(settings.textColor)}`;

  if (countWords(word) > 1) {
    return <p className={className}>{word}</p>;
  }

  const pivot = pivotIndex(word);
  const before = word.slice(0, pivot);
  const focus = word.charAt(pivot);
  const after = word.slice(pivot + 1);
  // Если слово уже коралловое, выделяем букву кремовым, иначе её не будет видно
  const focusClass = settings.textColor === "accent" ? "text-cream" : "text-accent";

  return (
    <p className={className} aria-label={word}>
      <span aria-hidden="true">
        {before}
        <span className={focusClass}>{focus}</span>
        {after}
      </span>
    </p>
  );
}

/**
 * Обычный размер — для всего, что короче 15 символов (почти все слова и короткие фразы).
 * Мельче — только для длинных слов и фраз, которые иначе не влезут в экран телефона.
 */
function sizeClass(length: number, size: "md" | "lg"): string {
  if (size === "md") {
    return length <= 14 ? "min-h-[4rem] text-3xl sm:text-4xl" : "min-h-[4rem] text-2xl sm:text-3xl";
  }
  if (length <= 14) {
    return "min-h-[7rem] text-4xl sm:text-6xl md:text-7xl";
  }
  if (length <= 22) {
    return "min-h-[7rem] text-3xl sm:text-5xl md:text-6xl";
  }
  return "min-h-[7rem] text-2xl sm:text-4xl md:text-5xl";
}
