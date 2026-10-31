/**
 * Чистая логика читалки: без React и браузерных API.
 * Поэтому её легко проверять отдельно.
 *
 * Путь текста:  текст → tokenize (слова) → buildChunks (кадры по 1–3 слова) → показ на экране.
 */

export const MIN_WPM = 100;
export const MAX_WPM = 1000;
export const WPM_STEP = 25;

/** Сколько слов показывать за раз */
export type ChunkSize = 1 | 2 | 3;
export const CHUNK_SIZES: ChunkSize[] = [1, 2, 3];

/** Кадр читалки: одно или несколько слов, которые показываются вместе */
export interface Chunk {
  text: string;
  /** Номер первого слова кадра в книге — по нему сохраняется позиция */
  start: number;
  /** Сколько слов в кадре */
  count: number;
}

/** Внутренняя «смысловая единица»: weight — сколько в ней смысловых слов (без предлогов и союзов) */
interface Unit extends Chunk {
  weight: number;
}

/** Самый длинный кадр в символах: длиннее неудобно читать одним взглядом */
const MAX_CHUNK_CHARS = 28;

// Регулярки с \p{...} создаём через RegExp: так TypeScript не ругается на старую цель сборки (ES2017)
/** Любая буква любого алфавита или цифра */
const LETTER_OR_DIGIT = new RegExp("[\\p{L}\\p{N}]", "u");
/** Слово заканчивается буквой (а не запятой, точкой и т. п.) */
const ENDS_WITH_LETTER = new RegExp("\\p{L}$", "u");
/** Слово начинается с буквы */
const STARTS_WITH_LETTER = new RegExp("^\\p{L}", "u");
/** Всё, кроме букв, по краям слова: кавычки, скобки, знаки */
const EDGE_NON_LETTERS = new RegExp("^[^\\p{L}]+|[^\\p{L}]+$", "gu");
/** Хвост из «кусочков без букв», приклеенных к слову: « —», « ...» */
const TRAILING_SYMBOL_PIECES = new RegExp("(\\s+[^\\p{L}\\p{N}\\s]+)+$", "u");

/**
 * Короткие служебные слова, которые читаются вместе со следующим словом:
 * «и пришёл», «в доме», «не знал». Предлоги, союзы, отрицания.
 */
const GLUE_TO_NEXT = new Set([
  // союзы
  "и", "а", "но", "да", "или", "либо", "что", "чтобы", "как", "если", "когда", "где", "то",
  // предлоги
  "в", "во", "на", "к", "ко", "с", "со", "о", "об", "обо", "от", "ото", "до", "по", "за", "из", "изо",
  "у", "для", "при", "без", "под", "над", "про", "через", "перед", "между",
  // отрицания
  "не", "ни",
  // английские
  "a", "an", "the", "to", "of", "in", "on", "at", "by", "for", "and", "or", "but", "with", "from",
]);

/** Частицы, которые читаются вместе с предыдущим словом: «пришёл бы», «знал ли» */
const GLUE_TO_PREVIOUS = new Set(["же", "ж", "ли", "ль", "бы", "б"]);

/** Сколько служебных слов подряд можно приклеить к одному слову: «и не в доме» */
const MAX_GLUED = 3;

/**
 * Разбивает текст на слова по пробельным символам.
 * Кусочки без букв и цифр (отдельное тире «—», «...», «*») приклеиваются к предыдущему слову:
 * показывать их отдельным кадром бессмысленно, а пауза после знака всё равно сработает.
 */
export function tokenize(text: string): string[] {
  const words: string[] = [];
  for (const piece of text.split(/\s+/)) {
    if (piece.length === 0) {
      continue;
    }
    const hasLetters = LETTER_OR_DIGIT.test(piece);
    if (!hasLetters && words.length > 0) {
      words[words.length - 1] += ` ${piece}`;
    } else {
      words.push(piece);
    }
  }
  return words;
}

/**
 * Собирает кадры из слов.
 * Шаг 1: служебные слова склеиваются с соседним словом в «смысловые единицы» («и пришёл»).
 * Шаг 2: единицы объединяются в кадры до `size` смысловых слов (предлоги и союзы не считаются),
 * но не через конец предложения и не длиннее MAX_CHUNK_CHARS символов.
 */
export function buildChunks(words: string[], size: ChunkSize): Chunk[] {
  const units = buildUnits(words);
  const chunks: Unit[] = [];

  for (const unit of units) {
    const current = chunks[chunks.length - 1];
    const fits =
      size > 1 &&
      current !== undefined &&
      current.weight + unit.weight <= size &&
      current.text.length + 1 + unit.text.length <= MAX_CHUNK_CHARS &&
      !endsClause(current.text);

    if (fits) {
      current.text += ` ${unit.text}`;
      current.count += unit.count;
      current.weight += unit.weight;
    } else {
      chunks.push({ ...unit });
    }
  }
  // Наружу отдаём кадры без служебного поля weight
  return chunks.map(({ text, start, count }) => ({ text, start, count }));
}

function buildUnits(words: string[]): Unit[] {
  const units: Unit[] = [];
  /** Служебные слова, которые ждут следующего слова */
  let pending: Unit | null = null;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const core = word.replace(EDGE_NON_LETTERS, "").toLowerCase();

    // «же», «ли», «бы» — к предыдущему слову, если оно не закончилось знаком препинания
    const previous = units[units.length - 1];
    if (
      pending === null &&
      previous !== undefined &&
      GLUE_TO_PREVIOUS.has(core) &&
      STARTS_WITH_LETTER.test(word) &&
      ENDS_WITH_LETTER.test(previous.text)
    ) {
      previous.text += ` ${word}`;
      previous.count += 1;
      continue;
    }

    // «и», «в», «не» — ждём следующее слово. Если после него знак («а,»), это конец фразы: не ждём.
    if (GLUE_TO_NEXT.has(core) && ENDS_WITH_LETTER.test(word) && (pending?.count ?? 0) < MAX_GLUED) {
      if (pending) {
        pending.text += ` ${word}`;
        pending.count += 1;
      } else {
        pending = { text: word, start: index, count: 1, weight: 0 };
      }
      continue;
    }

    if (pending) {
      units.push({ text: `${pending.text} ${word}`, start: pending.start, count: pending.count + 1, weight: 1 });
      pending = null;
    } else {
      units.push({ text: word, start: index, count: 1, weight: 1 });
    }
  }

  // Служебные слова в самом конце текста показываем как есть
  if (pending) {
    units.push({ ...pending, weight: 1 });
  }
  return units;
}

/** Кончается ли текст на границе фразы: точка, запятая, двоеточие, тире и т. п. */
function endsClause(text: string): boolean {
  const core = text.replace(TRAILING_SYMBOL_PIECES, "");
  return /[.!?…;:,]["»”)]*$/.test(core) || /[—–]$/.test(text);
}

/** Номер кадра, в котором находится слово с номером wordIndex (двоичный поиск) */
export function chunkIndexAt(chunks: Chunk[], wordIndex: number): number {
  let low = 0;
  let high = chunks.length - 1;
  let found = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (chunks[middle].start <= wordIndex) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** Сколько настоящих слов (с буквами или цифрами) в кадре */
export function countWords(text: string): number {
  let count = 0;
  for (const part of text.split(" ")) {
    if (LETTER_OR_DIGIT.test(part)) {
      count += 1;
    }
  }
  return Math.max(count, 1);
}

/**
 * Сколько миллисекунд показывать кадр.
 * Базовая задержка = 60 000 / слов в минуту, умноженная на число слов в кадре:
 * так скорость в «словах в минуту» остаётся честной при любом размере кадра.
 * Длинные слова и знаки препинания задерживают чуть дольше,
 * чтобы текст читался естественнее.
 */
export function wordDelayMs(text: string, wpm: number): number {
  const base = 60000 / wpm;
  const words = text.split(" ");
  let factor = 1;

  if (words.some((word) => word.length > 9)) {
    factor += 0.2;
  }

  if (endsSentence(text)) {
    factor += 0.6;
  } else if (/[,;:—–]["»”)]*$/.test(text) || /[,;:]["»”)]*$/.test(text.replace(TRAILING_SYMBOL_PIECES, ""))) {
    factor += 0.3;
  }

  return Math.round(base * countWords(text) * factor);
}

function endsSentence(text: string): boolean {
  return /[.!?…]["»”)]*$/.test(text.replace(TRAILING_SYMBOL_PIECES, ""));
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
