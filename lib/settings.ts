import { clampWpm } from "@/lib/reader";

/** Шрифты для слова в читалке. Сами шрифты подключаются в app/layout.tsx. */
export type ReadingFont = "inter" | "manrope" | "roboto" | "montserrat" | "sfpro" | "playfair";
/** Цвет слова в читалке */
export type TextColor = "cream" | "accent" | "mist" | "snow";
/** Фон читалки */
export type ReaderBackground = "ink" | "graphite" | "ink-deep" | "coal" | "night";

export interface ReaderSettings {
  /** Слов в минуту */
  wpm: number;
  font: ReadingFont;
  textColor: TextColor;
  background: ReaderBackground;
  /** Показывать счётчик слов и полосу прогресса */
  showProgress: boolean;
  /** Режим фокуса: во время чтения панели прячутся */
  focusMode: boolean;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 300,
  font: "inter",
  textColor: "cream",
  background: "ink",
  showProgress: true,
  focusMode: true,
};

/**
 * Варианты для экранов настроек. Классы написаны полностью (а не склеены из кусочков),
 * чтобы Tailwind их увидел и добавил в CSS. Сами цвета — токены в app/globals.css.
 */
export const FONT_OPTIONS: { value: ReadingFont; label: string; className: string }[] = [
  { value: "inter", label: "Inter", className: "font-inter" },
  { value: "manrope", label: "Manrope", className: "font-manrope" },
  { value: "roboto", label: "Roboto", className: "font-roboto" },
  { value: "montserrat", label: "Montserrat", className: "font-montserrat" },
  { value: "sfpro", label: "SF Pro", className: "font-sfpro" },
  { value: "playfair", label: "Playfair", className: "font-playfair" },
];

export const TEXT_COLOR_OPTIONS: { value: TextColor; label: string; textClass: string; swatchClass: string }[] = [
  { value: "cream", label: "Кремовый", textClass: "text-cream", swatchClass: "bg-cream" },
  { value: "accent", label: "Коралловый", textClass: "text-accent", swatchClass: "bg-accent" },
  { value: "mist", label: "Серый", textClass: "text-mist", swatchClass: "bg-mist" },
  { value: "snow", label: "Белый", textClass: "text-snow", swatchClass: "bg-snow" },
];

export const BACKGROUND_OPTIONS: { value: ReaderBackground; label: string; className: string }[] = [
  { value: "ink", label: "Коричневый", className: "bg-ink" },
  { value: "ink-deep", label: "Тёмно-коричневый", className: "bg-ink-deep" },
  { value: "graphite", label: "Графитовый", className: "bg-graphite" },
  { value: "coal", label: "Угольный", className: "bg-coal" },
  { value: "night", label: "Почти чёрный", className: "bg-night" },
];

export function fontClass(font: ReadingFont): string {
  return FONT_OPTIONS.find((option) => option.value === font)?.className ?? "font-inter";
}

export function textColorClass(color: TextColor): string {
  return TEXT_COLOR_OPTIONS.find((option) => option.value === color)?.textClass ?? "text-cream";
}

export function backgroundClass(background: ReaderBackground): string {
  return BACKGROUND_OPTIONS.find((option) => option.value === background)?.className ?? "bg-ink";
}

const STORAGE_KEY = "fasterbook:reader-settings";

/**
 * Настройки хранятся только в браузере этого устройства.
 * Это временное решение до этапа с аккаунтами.
 * Вызывать только в браузере (внутри useEffect или обработчиков событий).
 */
export function loadSettings(): ReaderSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      wpm: clampWpm(Number(parsed.wpm)),
      font: parseFont(parsed.font),
      textColor: pick(parsed.textColor, TEXT_COLOR_OPTIONS, DEFAULT_SETTINGS.textColor),
      background: pick(parsed.background, BACKGROUND_OPTIONS, DEFAULT_SETTINGS.background),
      showProgress: typeof parsed.showProgress === "boolean" ? parsed.showProgress : DEFAULT_SETTINGS.showProgress,
      focusMode: typeof parsed.focusMode === "boolean" ? parsed.focusMode : DEFAULT_SETTINGS.focusMode,
    };
  } catch {
    // Хранилище может быть недоступно (приватный режим, заблокированные данные сайта)
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ReaderSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Если сохранить не удалось, приложение продолжает работать без сохранения
  }
}

/** Старые версии хранили "sans" / "serif" — переводим их в новые шрифты. */
function parseFont(value: unknown): ReadingFont {
  if (value === "serif") {
    return "playfair";
  }
  return pick(value, FONT_OPTIONS, DEFAULT_SETTINGS.font);
}

function pick<T extends string>(value: unknown, options: { value: T }[], fallback: T): T {
  const found = options.find((option) => option.value === value);
  return found ? found.value : fallback;
}
