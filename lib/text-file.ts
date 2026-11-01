import { DocxError, extractDocxText } from "@/lib/docx";
import { extractRtfText, isRtf } from "@/lib/rtf";

/**
 * Чтение файла книги в строку. Без React.
 *
 * Поддерживаются:
 * - .txt — русские TXT часто сохранены не в UTF-8, а в старой кодировке windows-1251.
 *   Поэтому сначала пробуем UTF-8 в «строгом» режиме: если в файле есть байты,
 *   которых в UTF-8 не бывает, декодер выдаст ошибку, и мы перечитаем файл как windows-1251;
 * - .docx — файлы Word (см. lib/docx.ts);
 * - .rtf и .doc, которые на самом деле RTF (см. lib/rtf.ts). Формат определяем по содержимому:
 *   многие файлы с расширением .doc из интернета — это RTF.
 *
 * Настоящий двоичный .doc (Word 97–2003) не поддерживается.
 */

/** Максимальный размер файла: 10 МБ — это примерно 5–8 толстых романов. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Что можно выбрать в окне загрузки файла */
export const ACCEPTED_FILES =
  ".txt,.docx,.rtf,.doc,text/plain,application/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Настоящий двоичный .doc начинается с этих байтов (контейнер OLE) */
const LEGACY_DOC_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

export class TextFileError extends Error {}

type BookFormat = "txt" | "docx";

export async function readBookFile(file: File): Promise<string> {
  if (file.size === 0) {
    throw new TextFileError(`Файл «${file.name}» пустой.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new TextFileError(`Файл «${file.name}» больше 10 МБ.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Сначала смотрим на содержимое: расширение может врать
  if (isRtf(bytes)) {
    return extractRtfText(bytes);
  }
  if (LEGACY_DOC_MAGIC.every((byte, index) => bytes[index] === byte)) {
    throw new TextFileError(
      `«${file.name}» — старый двоичный формат Word (.doc). Откройте его в Word и сохраните как .docx («Файл → Сохранить как»).`,
    );
  }

  const format = detectFormat(file);
  if (format === "docx") {
    try {
      return extractDocxText(bytes);
    } catch (error) {
      throw new TextFileError(
        error instanceof DocxError ? `«${file.name}»: ${error.message}` : `Не удалось прочитать «${file.name}».`,
      );
    }
  }
  return decodeText(bytes).replace(/^﻿/, "");
}

function detectFormat(file: File): BookFormat {
  if (/\.docx$/i.test(file.name)) {
    return "docx";
  }
  if (/\.txt$/i.test(file.name) || file.type === "text/plain") {
    return "txt";
  }
  throw new TextFileError(`«${file.name}»: поддерживаются файлы TXT, DOCX и RTF.`);
}

function decodeText(bytes: Uint8Array): string {
  // Метка порядка байтов (BOM) прямо говорит, что файл в UTF-16
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1251").decode(bytes);
  }
}

/** Название книги из имени файла: «Мастер_и_Маргарита.docx» → «Мастер и Маргарита». */
export function titleFromFileName(name: string): string {
  const title = name
    .replace(/\.(txt|docx|rtf|doc)$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return title || "Без названия";
}
