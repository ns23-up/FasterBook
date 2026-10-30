/**
 * Чистая логика читалки: без React и браузерных API.
 * Поэтому её легко проверять отдельно.
 */

export const MIN_WPM = 100;
export const MAX_WPM = 1000;
export const WPM_STEP = 25;

/** Разбивает текст на слова по пробельным символам. */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

/**
 * Сколько миллисекунд показывать слово.
 * Базовая задержка = 60 000 / слов в минуту.
 * Длинные слова и знаки препинания задерживают чуть дольше,
 * чтобы текст читался естественнее.
 */
export function wordDelayMs(word: string, wpm: number): number {
  const base = 60000 / wpm;
  let factor = 1;

  if (word.length > 9) {
    factor += 0.2;
  }

  if (/[.!?…]["»)]?$/.test(word)) {
    factor += 0.6;
  } else if (/[,;:—]["»)]?$/.test(word)) {
    factor += 0.3;
  }

  return Math.round(base * factor);
}

/**
 * Индекс буквы, которая выделяется в центре слова.
 * Глаз фиксируется примерно на этой позиции, поэтому её подсвечивают.
 */
export function pivotIndex(word: string): number {
  if (word.length <= 1) {
    return 0;
  }
  return Math.floor((word.length - 1) / 2);
}

export function clampWpm(value: number): number {
  if (!Number.isFinite(value)) {
    return 300;
  }
  return Math.min(MAX_WPM, Math.max(MIN_WPM, Math.round(value)));
}
