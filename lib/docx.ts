import { unzipSync } from "fflate";

/**
 * Достаёт текст из файла Word (.docx). Без React, но использует DOMParser — только в браузере.
 *
 * Как устроен .docx: это zip-архив с папками и XML-файлами внутри.
 * Весь основной текст лежит в одном файле — word/document.xml. Упрощённо он выглядит так:
 *
 *   <w:body>
 *     <w:p>                                  ← абзац (paragraph)
 *       <w:r><w:t>Утро началось </w:t></w:r>  ← кусок текста (run → text)
 *       <w:r><w:t>с тумана.</w:t></w:r>
 *     </w:p>
 *   </w:body>
 *
 * Мы проходим по этому дереву, склеиваем куски <w:t> внутри каждого <w:p>
 * и разделяем абзацы пустой строкой — дальше текст идёт в тот же алгоритм, что и TXT.
 */

/** «Пространство имён» Word: все теги вида <w:...> относятся к нему */
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export class DocxError extends Error {}

export function extractDocxText(bytes: Uint8Array): string {
  let xml: Uint8Array | undefined;
  try {
    // Распаковываем только нужный файл, остальное (картинки, стили) пропускаем
    const files = unzipSync(bytes, { filter: (file) => file.name === "word/document.xml" });
    xml = files["word/document.xml"];
  } catch {
    throw new DocxError("Файл повреждён или это не документ Word.");
  }
  if (!xml) {
    throw new DocxError("В файле не найден текст документа Word.");
  }

  const doc = new DOMParser().parseFromString(new TextDecoder("utf-8").decode(xml), "application/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body || doc.getElementsByTagName("parsererror").length > 0) {
    throw new DocxError("Не удалось прочитать содержимое документа Word.");
  }

  const paragraphs: string[] = [];
  collect(body, [], paragraphs);
  return paragraphs
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "")
    .join("\n\n");
}

/**
 * Обходит XML-дерево и собирает текст.
 * out — куски текста текущего абзаца, paragraphs — готовые абзацы.
 */
function collect(node: Element, out: string[], paragraphs: string[]) {
  for (const child of Array.from(node.children)) {
    // Word иногда хранит один и тот же объект дважды: новый вариант и запасной (Fallback).
    // Запасной пропускаем, иначе текст надписей задвоится.
    if (child.localName === "Fallback") {
      continue;
    }
    if (child.namespaceURI !== W) {
      collect(child, out, paragraphs);
      continue;
    }
    switch (child.localName) {
      case "t": // обычный текст
        out.push(child.textContent ?? "");
        break;
      case "tab":
        out.push(" ");
        break;
      case "br": // перенос строки внутри абзаца (например, в стихах)
      case "cr":
        out.push("\n");
        break;
      case "p": {
        // Новый абзац. Абзац внутри абзаца (текст в рамке) становится отдельным абзацем.
        const inner: string[] = [];
        collect(child, inner, paragraphs);
        paragraphs.push(inner.join(""));
        break;
      }
      case "delText": // удалённый текст из режима правок
      case "instrText": // служебные коды полей (оглавление, ссылки)
        break;
      default:
        collect(child, out, paragraphs);
    }
  }
}
