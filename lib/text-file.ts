/**
 * Чтение TXT-файла в строку. Без React.
 *
 * Русские TXT часто сохранены не в UTF-8, а в старой кодировке windows-1251.
 * Поэтому сначала пробуем UTF-8 в «строгом» режиме: если в файле есть байты,
 * которые не бывают в UTF-8, декодер выдаст ошибку, и мы перечитаем файл как windows-1251.
 */

/** Максимальный размер файла: 10 МБ — это примерно 5–8 толстых романов. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class TextFileError extends Error {}

export async function readTextFile(file: File): Promise<string> {
  if (!/\.txt$/i.test(file.name) && file.type !== "text/plain") {
    throw new TextFileError(`«${file.name}» — не TXT-файл.`);
  }
  if (file.size === 0) {
    throw new TextFileError(`Файл «${file.name}» пустой.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new TextFileError(`Файл «${file.name}» больше 10 МБ.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return decode(bytes).replace(/^﻿/, "");
}

function decode(bytes: Uint8Array): string {
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

/** Название книги из имени файла: «Мастер_и_Маргарита.txt» → «Мастер и Маргарита». */
export function titleFromFileName(name: string): string {
  const title = name
    .replace(/\.txt$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return title || "Без названия";
}
