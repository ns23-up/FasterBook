/**
 * Хранилище книг пользователя в IndexedDB браузера. Без React.
 *
 * IndexedDB — встроенная в браузер база данных: в ней можно хранить мегабайты текста,
 * в отличие от localStorage. Данные живут только в этом браузере на этом устройстве.
 *
 * Два «хранилища» (таблицы):
 * - books — короткие сведения о книге (название, сколько слов, где остановились);
 * - texts — сам текст. Он большой, поэтому лежит отдельно и читается только при открытии книги.
 *
 * Вызывать только в браузере (внутри useEffect или обработчиков событий).
 */

export interface StoredBook {
  id: string;
  title: string;
  author: string;
  /** Сколько слов в книге (считается один раз при загрузке) */
  wordCount: number;
  /** Номер слова, на котором остановились */
  position: number;
  addedAt: number;
  updatedAt: number;
}

const DB_NAME = "fasterbook";
const DB_VERSION = 1;
const BOOKS = "books";
const TEXTS = "texts";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Браузер не поддерживает хранение книг (IndexedDB)."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    // Срабатывает при первом открытии: создаём таблицы
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS)) {
        db.createObjectStore(BOOKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(TEXTS)) {
        db.createObjectStore(TEXTS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Не удалось открыть хранилище книг."));
    };
  });
  return dbPromise;
}

/** Превращает запрос IndexedDB (с колбэками) в обычный Promise */
function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Ждёт, пока транзакция целиком запишется на диск */
function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Запись отменена."));
  });
}

/** Все книги, сначала недавно открытые */
export async function listBooks(): Promise<StoredBook[]> {
  const db = await openDb();
  const books = await wrap(db.transaction(BOOKS).objectStore(BOOKS).getAll() as IDBRequest<StoredBook[]>);
  return books.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Книга вместе с текстом, или null, если такой нет */
export async function getBook(id: string): Promise<{ book: StoredBook; text: string } | null> {
  const db = await openDb();
  const transaction = db.transaction([BOOKS, TEXTS]);
  const [book, text] = await Promise.all([
    wrap(transaction.objectStore(BOOKS).get(id) as IDBRequest<StoredBook | undefined>),
    wrap(transaction.objectStore(TEXTS).get(id) as IDBRequest<string | undefined>),
  ]);
  if (!book || typeof text !== "string") {
    return null;
  }
  return { book, text };
}

export async function addBook(input: { title: string; author: string; text: string; wordCount: number }): Promise<StoredBook> {
  const db = await openDb();
  const now = Date.now();
  const book: StoredBook = {
    id: makeId(),
    title: input.title,
    author: input.author,
    wordCount: input.wordCount,
    position: 0,
    addedAt: now,
    updatedAt: now,
  };
  // Одна транзакция: сведения и текст запишутся вместе или не запишутся совсем
  const transaction = db.transaction([BOOKS, TEXTS], "readwrite");
  transaction.objectStore(BOOKS).put(book);
  transaction.objectStore(TEXTS).put(input.text, book.id);
  await done(transaction);
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([BOOKS, TEXTS], "readwrite");
  transaction.objectStore(BOOKS).delete(id);
  transaction.objectStore(TEXTS).delete(id);
  await done(transaction);
}

/** Запоминает, на каком слове остановились */
export async function savePosition(id: string, position: number): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(BOOKS, "readwrite");
  const store = transaction.objectStore(BOOKS);
  const book = await wrap(store.get(id) as IDBRequest<StoredBook | undefined>);
  if (book) {
    store.put({ ...book, position, updatedAt: Date.now() });
  }
  await done(transaction);
}

/** Прогресс в процентах: 0, пока не начали, 100 — на последнем слове */
export function bookProgress(book: Pick<StoredBook, "position" | "wordCount">): number {
  if (book.wordCount <= 1) {
    return book.position > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((book.position / (book.wordCount - 1)) * 100));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `book-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
