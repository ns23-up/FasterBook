/**
 * Достаёт текст из RTF (Rich Text Format). Без React и браузерных API.
 *
 * RTF — текстовый формат: это обычные символы, перемежающиеся «командами» вида \par, \'e5, {…}.
 * Пример:  {\rtf1\ansi {\fonttbl …} \f1 Анна вышла\par Ты здесь?\par}
 *   - \par  — конец абзаца;
 *   - \'e5  — байт в кодировке windows-1251 (буква «е»);
 *   - {…}   — группа: может быть текстом, а может быть служебным блоком (шрифты, стили),
 *             который надо пропустить.
 *
 * Многие файлы .doc из интернета на самом деле RTF, поэтому определяем формат по содержимому.
 */

/** Группы, внутри которых нет текста для чтения: шрифты, стили, метаданные, картинки */
const SKIP_GROUPS = new Set([
  "fonttbl", "colortbl", "stylesheet", "info", "pict", "object", "fldinst", "header", "footer",
  "headerl", "headerr", "footerl", "footerr", "themedata", "colorschememapping", "listtable",
  "listoverridetable", "rsidtbl", "generator", "xmlnstbl", "latentstyles", "datastore",
]);

/** Именованные символы RTF → обычный текст */
const NAMED_SYMBOLS: Record<string, string> = {
  emdash: "—",
  endash: "–",
  lquote: "‘",
  rquote: "’",
  ldblquote: "«",
  rdblquote: "»",
  bullet: "•",
  tab: "\t",
  enspace: " ",
  emspace: " ",
};

/** Признак RTF: файл начинается с «{\rtf» */
export function isRtf(bytes: Uint8Array): boolean {
  return bytes[0] === 0x7b && bytes[1] === 0x5c && bytes[2] === 0x72 && bytes[3] === 0x74 && bytes[4] === 0x66;
}

export function extractRtfText(bytes: Uint8Array): string {
  // RTF — однобайтовый текст: переводим байты в строку «один символ = один байт», чтобы разбирать посимвольно
  let source = "";
  for (let i = 0; i < bytes.length; i += 1) {
    source += String.fromCharCode(bytes[i]);
  }

  const out: string[] = [];
  /** Байты, закодированные через \'hh, ждут декодирования: им нужна вся последовательность целиком */
  let pendingBytes: number[] = [];
  /** Группы: true — группа пропускается (служебный блок) */
  const groupStack: boolean[] = [];
  let skip = false;
  /** Сколько символов после \uN пропустить (запасной вариант для старых читалок) */
  let fallbackToSkip = 0;
  let fallbackCount = 1;

  const flushBytes = () => {
    if (pendingBytes.length > 0) {
      out.push(new TextDecoder("windows-1251").decode(new Uint8Array(pendingBytes)));
      pendingBytes = [];
    }
  };
  const emit = (text: string) => {
    if (skip) {
      return;
    }
    flushBytes();
    out.push(text);
  };
  const emitByte = (byte: number) => {
    if (!skip) {
      pendingBytes.push(byte);
    }
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i];

    if (ch === "{") {
      groupStack.push(skip);
      // Новая группа пропускается, если это «игнорируемое» место (\*) или служебный блок
      const head = source.slice(i + 1, i + 40);
      const word = /^\\([a-zA-Z]+)/.exec(head);
      if (head.startsWith("\\*") || (word && SKIP_GROUPS.has(word[1]))) {
        skip = true;
      }
      i += 1;
      continue;
    }

    if (ch === "}") {
      flushBytes();
      skip = groupStack.pop() ?? false;
      i += 1;
      continue;
    }

    if (ch === "\\") {
      const next = source[i + 1];

      // Экранированные символы: \\ \{ \}
      if (next === "\\" || next === "{" || next === "}") {
        if (fallbackToSkip > 0) {
          fallbackToSkip -= 1;
        } else {
          emit(next);
        }
        i += 2;
        continue;
      }

      // \'hh — байт в кодировке windows-1251
      if (next === "'") {
        const hex = source.slice(i + 2, i + 4);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          if (fallbackToSkip > 0) {
            fallbackToSkip -= 1;
          } else {
            emitByte(parseInt(hex, 16));
          }
        }
        i += 4;
        continue;
      }

      // Неразрывный пробел \~ — обычный пробел; дефисы и прочие знаки из одного символа пропускаем
      if (next === "~") {
        emit(" ");
        i += 2;
        continue;
      }

      const word = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(source.slice(i, i + 40));
      if (!word) {
        i += 2;
        continue;
      }
      const name = word[1];
      const param = word[2] !== undefined ? Number(word[2]) : undefined;
      i += word[0].length;

      switch (name) {
        case "par":
          emit("\n\n");
          break;
        case "line":
          emit("\n");
          break;
        case "page":
        case "sect":
          emit("\n\n");
          break;
        case "uc":
          fallbackCount = param ?? 1;
          break;
        case "u": {
          // \uN — символ с кодом N. Следующие fallbackCount символов — запасной вариант, их пропускаем.
          if (param !== undefined && !skip) {
            const code = param < 0 ? param + 65536 : param;
            emit(String.fromCharCode(code));
          }
          fallbackToSkip = fallbackCount;
          break;
        }
        default:
          if (name in NAMED_SYMBOLS) {
            emit(NAMED_SYMBOLS[name]);
          }
      }
      continue;
    }

    // Обычный символ. Переводы строк в самом файле RTF ничего не значат — пропускаем.
    if (ch === "\r" || ch === "\n") {
      i += 1;
      continue;
    }
    if (fallbackToSkip > 0) {
      fallbackToSkip -= 1;
    } else if (ch.charCodeAt(0) >= 0x80) {
      // Байт кириллицы прямо в файле (не через 'hh) — тоже в windows-1251
      emitByte(ch.charCodeAt(0));
    } else {
      emit(ch);
    }
    i += 1;
  }
  flushBytes();

  return (
    out
      .join("")
      // Пробелы перед знаками препинания и двойные пробелы — частая «грязь» из RTF
      .replace(/[ \t]+\n/g, "\n")
      .replace(/ +([,.!?;:…»])/g, "$1")
      .replace(/ {2,}/g, " ")
  );
}
