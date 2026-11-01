/**
 * Чистая логика читалки: без React и браузерных API.
 * Поэтому её легко проверять отдельно.
 *
 * Путь текста:
 *   текст → analyzeText (слова + где кончаются абзацы)
 *         → buildChunks (кадры по 1–3 слова, предлоги вместе со словом)
 *         → chunkDelayMs (сколько показывать кадр) → экран.
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
  /** Кадр заканчивает абзац: после него пауза подольше */
  paragraphEnd: boolean;
}

/** Слова текста и номера слов, которыми заканчиваются абзацы */
export interface TextAnalysis {
  words: string[];
  paragraphEnds: number[];
}

/** Внутренняя «смысловая единица»: weight — сколько в ней смысловых слов (без предлогов и союзов) */
interface Unit extends Chunk {
  weight: number;
}

/** Самый длинный кадр в символах: длиннее неудобно читать одним взглядом */
const MAX_CHUNK_CHARS = 28;

/** Строка короче этого считается заголовком или концом абзаца («Глава 1», «Конец») */
const SHORT_LINE = 60;

// Регулярки с \p{...} создаём через RegExp: так TypeScript не ругается на старую цель сборки (ES2017)
/** Любая буква любого алфавита или цифра */
const LETTER_OR_DIGIT = new RegExp("[\\p{L}\\p{N}]", "u");
/** Все буквы и цифры (для подсчёта длины слова) */
const LETTERS_AND_DIGITS = new RegExp("[\\p{L}\\p{N}]", "gu");
/** Слово заканчивается буквой (а не запятой, точкой и т. п.) */
const ENDS_WITH_LETTER = new RegExp("\\p{L}$", "u");
/** Слово начинается с буквы */
const STARTS_WITH_LETTER = new RegExp("^\\p{L}", "u");
/** Всё, кроме букв, по краям слова: кавычки, скобки, знаки */
const EDGE_NON_LETTERS = new RegExp("^[^\\p{L}]+|[^\\p{L}]+$", "gu");
/** Хвост из «кусочков без букв», приклеенных к слову: « —», « ...» */
const TRAILING_SYMBOL_PIECES = new RegExp("(\\s+[^\\p{L}\\p{N}\\s]+)+$", "u");

/** Конец предложения: . ! ? … и закрывающие кавычки/скобки после них */
const SENTENCE_END = /[.!?…]["»”)]*$/;
/** Конец части предложения: , ; : и закрывающие кавычки/скобки после них */
const CLAUSE_END = /[,;:]["»”)]*$/;
/** Тире в конце: «Пришёл бы —» */
const DASH_END = /[—–]$/;

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
 * Паузы после знаков — в «долях слова» (1 = время одного обычного слова).
 * Пауза ПРИБАВЛЯЕТСЯ к кадру, а не умножает его: иначе длинные фразы «замирают».
 */
const PAUSE_SENTENCE = 1;
const PAUSE_CLAUSE = 0.5;
const PAUSE_PARAGRAPH = 1.5;

/**
 * Разбивает текст на слова и находит концы абзацев.
 *
 * Абзац кончается:
 * - на пустой строке;
 * - перед строкой с отступом («красная строка»);
 * - после строки, которая кончается точкой, «?», «!» или «…»;
 * - после короткой строки без запятой в конце (заголовок «Глава 1», последняя строка абзаца).
 *
 * Кусочки без букв и цифр (тире «—», «...», «*») не показываются отдельным кадром:
 * тире в начале абзаца приклеивается к следующему слову («— Ты здесь?»), остальное — к предыдущему.
 */
export function analyzeText(text: string): TextAnalysis {
  const words: string[] = [];
  const paragraphEnds: number[] = [];
  /** Значки в начале абзаца, которые ждут следующего слова (тире реплики) */
  let prefix = "";
  let paragraphHasWords = false;

  function endParagraph() {
    if (paragraphHasWords) {
      paragraphEnds.push(words.length - 1);
    }
    paragraphHasWords = false;
  }

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      endParagraph();
      continue;
    }
    if (/^(\t| {2,})/.test(rawLine)) {
      endParagraph();
    }

    for (const piece of line.split(/\s+/)) {
      if (piece === "") {
        continue;
      }
      if (LETTER_OR_DIGIT.test(piece)) {
        words.push(prefix ? `${prefix} ${piece}` : piece);
        prefix = "";
        paragraphHasWords = true;
      } else if (!paragraphHasWords && /^[—–-]$/.test(piece)) {
        // Тире в начале абзаца — это реплика: «— Ты здесь?»
        prefix = prefix ? `${prefix} ${piece}` : piece;
      } else if (words.length > 0) {
        words[words.length - 1] += ` ${piece}`;
      } else {
        prefix = prefix ? `${prefix} ${piece}` : piece;
      }
    }

    const isShort = line.length < SHORT_LINE && !/[,;—–-]$/.test(line);
    if (SENTENCE_END.test(line) || isShort) {
      endParagraph();
    }
  }
  endParagraph();

  // Значки в самом конце текста без слов после них приклеиваем к последнему слову
  if (prefix && words.length > 0) {
    words[words.length - 1] += ` ${prefix}`;
  }
  return { words, paragraphEnds };
}

/** Только слова (для подсчёта длины книги) */
export function tokenize(text: string): string[] {
  return analyzeText(text).words;
}

/**
 * Собирает кадры из слов.
 * Шаг 1: служебные слова склеиваются с соседним словом в «смысловые единицы» («и пришёл»).
 * Шаг 2: единицы объединяются в кадры до `size` смысловых слов (предлоги и союзы не считаются),
 * но не через знак препинания, не через конец абзаца и не длиннее MAX_CHUNK_CHARS символов.
 */
export function buildChunks(words: string[], size: ChunkSize, paragraphEnds: number[] = []): Chunk[] {
  const ends = new Set(paragraphEnds);
  const units = buildUnits(words, ends);
  const chunks: Unit[] = [];

  for (const unit of units) {
    const current = chunks[chunks.length - 1];
    const fits =
      size > 1 &&
      current !== undefined &&
      !current.paragraphEnd &&
      current.weight + unit.weight <= size &&
      current.text.length + 1 + unit.text.length <= MAX_CHUNK_CHARS &&
      !endsClause(current.text);

    if (fits) {
      current.text += ` ${unit.text}`;
      current.count += unit.count;
      current.weight += unit.weight;
      current.paragraphEnd = unit.paragraphEnd;
    } else {
      chunks.push({ ...unit });
    }
  }
  // Наружу отдаём кадры без служебного поля weight
  return chunks.map(({ text, start, count, paragraphEnd }) => ({ text, start, count, paragraphEnd }));
}

function buildUnits(words: string[], paragraphEnds: Set<number>): Unit[] {
  const units: Unit[] = [];
  /** Служебные слова, которые ждут следующего слова */
  let pending: Unit | null = null;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const core = word.replace(EDGE_NON_LETTERS, "").toLowerCase();
    const isParagraphEnd = paragraphEnds.has(index);

    // «же», «ли», «бы» — к предыдущему слову того же абзаца, если оно не закончилось знаком
    const previous = units[units.length - 1];
    if (
      pending === null &&
      previous !== undefined &&
      !previous.paragraphEnd &&
      GLUE_TO_PREVIOUS.has(core) &&
      STARTS_WITH_LETTER.test(word) &&
      ENDS_WITH_LETTER.test(previous.text)
    ) {
      previous.text += ` ${word}`;
      previous.count += 1;
      previous.paragraphEnd = isParagraphEnd;
      continue;
    }

    // «и», «в», «не» — ждём следующее слово. Не ждём, если после слова знак («а,») или кончился абзац.
    if (
      GLUE_TO_NEXT.has(core) &&
      ENDS_WITH_LETTER.test(word) &&
      !isParagraphEnd &&
      (pending?.count ?? 0) < MAX_GLUED
    ) {
      if (pending) {
        pending.text += ` ${word}`;
        pending.count += 1;
      } else {
        pending = { text: word, start: index, count: 1, weight: 0, paragraphEnd: false };
      }
      continue;
    }

    if (pending) {
      units.push({
        text: `${pending.text} ${word}`,
        start: pending.start,
        count: pending.count + 1,
        weight: 1,
        paragraphEnd: isParagraphEnd,
      });
      pending = null;
    } else {
      units.push({ text: word, start: index, count: 1, weight: 1, paragraphEnd: isParagraphEnd });
    }
  }

  // Служебные слова в самом конце текста показываем как есть
  if (pending) {
    units.push({ ...pending, weight: 1, paragraphEnd: true });
  }
  return units;
}

/** Кончается ли текст на границе фразы: точка, запятая, двоеточие, тире и т. п. */
function endsClause(text: string): boolean {
  const core = text.replace(TRAILING_SYMBOL_PIECES, "");
  return SENTENCE_END.test(core) || CLAUSE_END.test(core) || DASH_END.test(text);
}

/**
 * Предложение вокруг слова с номером index — для «Сохранить цитату».
 * Границы: конец предложения (. ! ? …) или конец абзаца. Не длиннее maxWords слов.
 * start и end — номера первого и последнего слова предложения.
 */
export function sentenceAt(
  words: string[],
  paragraphEnds: number[],
  index: number,
  maxWords = 60,
): { text: string; start: number; end: number } {
  if (words.length === 0) {
    return { text: "", start: 0, end: 0 };
  }
  const ends = new Set(paragraphEnds);
  const isEnd = (i: number) => ends.has(i) || SENTENCE_END.test(words[i].replace(TRAILING_SYMBOL_PIECES, ""));
  const at = Math.min(Math.max(index, 0), words.length - 1);

  let start = at;
  while (start > 0 && !isEnd(start - 1) && at - start < maxWords / 2) {
    start -= 1;
  }
  let end = at;
  while (end < words.length - 1 && !isEnd(end) && end - start + 1 < maxWords) {
    end += 1;
  }
  return { text: words.slice(start, end + 1).join(" "), start, end };
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
 * «Вес» слова — во сколько раз дольше обычного слова его читать.
 * Служебные слова («и», «в», «не») глаз схватывает почти мгновенно,
 * длинные слова требуют чуть больше времени. В среднем по тексту вес около 1,
 * поэтому скорость в «словах в минуту» остаётся честной.
 */
export function wordWeight(word: string): number {
  const core = word.replace(EDGE_NON_LETTERS, "").toLowerCase();
  if (GLUE_TO_NEXT.has(core) || GLUE_TO_PREVIOUS.has(core)) {
    return 0.5;
  }
  const length = (word.match(LETTERS_AND_DIGITS) ?? []).length;
  if (length <= 3) {
    return 0.8;
  }
  if (length <= 8) {
    return 1;
  }
  return Math.min(1 + (length - 8) * 0.07, 1.6);
}

/**
 * Сколько миллисекунд показывать кадр.
 * Время = (сумма весов слов + пауза за знак в конце) × время одного слова.
 * Время одного слова = 60 000 / слов в минуту.
 */
export function chunkDelayMs(chunk: Pick<Chunk, "text" | "paragraphEnd">, wpm: number): number {
  const base = 60000 / wpm;
  let weight = 0;
  for (const part of chunk.text.split(" ")) {
    if (LETTER_OR_DIGIT.test(part)) {
      weight += wordWeight(part);
    }
  }
  // Кадр не короче 0,8 слова: иначе он мелькает слишком быстро
  weight = Math.max(weight, 0.8);

  const core = chunk.text.replace(TRAILING_SYMBOL_PIECES, "");
  let pause = 0;
  if (chunk.paragraphEnd) {
    pause = PAUSE_PARAGRAPH;
  } else if (SENTENCE_END.test(core)) {
    pause = PAUSE_SENTENCE;
  } else if (CLAUSE_END.test(core) || DASH_END.test(chunk.text)) {
    pause = PAUSE_CLAUSE;
  }

  return Math.round(base * (weight + pause));
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
