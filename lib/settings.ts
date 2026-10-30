import { clampWpm } from "@/lib/reader";

export type ReadingFont = "sans" | "serif";

export interface ReaderSettings {
  /** Слов в минуту */
  wpm: number;
  /** Шрифт слова в читалке */
  font: ReadingFont;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  wpm: 300,
  font: "sans",
};

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
    const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
    return {
      wpm: clampWpm(Number(parsed.wpm)),
      font: parsed.font === "serif" ? "serif" : "sans",
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
