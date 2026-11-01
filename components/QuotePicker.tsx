"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sentenceAt } from "@/lib/reader";

/** Сколько слов показывать сразу и сколько добавлять кнопкой «Показать раньше» */
const STEP = 500;
/** Дальше назад не листаем: столько слов браузер рисует без задержек */
const MAX_WORDS_BACK = 2000;
/** Столько символов принимает база (см. таблицу quotes) */
const MAX_QUOTE_CHARS = 2000;

interface QuotePickerProps {
  words: string[];
  paragraphEnds: number[];
  /** Последнее слово, которое уже было на экране: текст показывается до него включительно */
  endIndex: number;
  /** Фон из настроек читалки, чтобы окно не выбивалось из оформления */
  backgroundClassName?: string;
  /** Сохранить цитату. Ошибка — текст для пользователя. */
  onSave: (quote: { text: string; position: number }) => Promise<void>;
  onClose: () => void;
}

/**
 * Окно выбора цитаты: прочитанный текст до текущего места.
 * Нажатие на слово — начало цитаты, второе нажатие — конец. Третье начинает выбор заново.
 */
export function QuotePicker({
  words,
  paragraphEnds,
  endIndex,
  backgroundClassName = "bg-ink",
  onSave,
  onClose,
}: QuotePickerProps) {
  const [back, setBack] = useState(STEP);
  const from = Math.max(0, endIndex - back + 1);
  /** Первое нажатое слово, ждём второе */
  const [anchor, setAnchor] = useState<number | null>(null);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Высота текста до «Показать раньше»: чтобы текст не прыгал, когда сверху добавляются слова */
  const heightBefore = useRef(0);

  const ends = useMemo(() => new Set(paragraphEnds), [paragraphEnds]);
  const paragraphs = useMemo(() => {
    const result: number[][] = [];
    let current: number[] = [];
    for (let i = from; i <= endIndex; i += 1) {
      current.push(i);
      if (ends.has(i)) {
        result.push(current);
        current = [];
      }
    }
    if (current.length > 0) {
      result.push(current);
    }
    return result;
  }, [from, endIndex, ends]);

  // Открываем внизу — там, где остановились
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // После «Показать раньше» оставляем на экране тот же кусок текста
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && heightBefore.current > 0) {
      el.scrollTop += el.scrollHeight - heightBefore.current;
      heightBefore.current = 0;
    }
  }, [from]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function showEarlier() {
    heightBefore.current = scrollRef.current?.scrollHeight ?? 0;
    setBack((value) => Math.min(value + STEP, MAX_WORDS_BACK));
  }

  /** Одно событие на весь текст: слово узнаём по data-i */
  function handleTextClick(event: React.MouseEvent) {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-i]");
    if (!target) {
      return;
    }
    const i = Number(target.dataset.i);
    setError("");
    if (anchor === null) {
      setAnchor(i);
      setRange({ start: i, end: i });
    } else {
      setRange({ start: Math.min(anchor, i), end: Math.max(anchor, i) });
      setAnchor(null);
    }
  }

  function pickCurrentSentence() {
    const sentence = sentenceAt(words, paragraphEnds, endIndex);
    setError("");
    setAnchor(null);
    setRange({ start: Math.max(sentence.start, from), end: sentence.end });
  }

  const selectedText = range ? words.slice(range.start, range.end + 1).join(" ") : "";
  const tooLong = selectedText.length > MAX_QUOTE_CHARS;

  async function save() {
    if (!range || tooLong || saving) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ text: selectedText, position: range.start });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить цитату.");
      setSaving(false);
    }
  }

  const hint =
    anchor !== null
      ? "Теперь нажмите на последнее слово цитаты."
      : range
        ? "Готово. Нажмите на любое слово, чтобы выбрать заново."
        : "Нажмите на первое слово цитаты, затем на последнее.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-picker-title"
      className={`fixed inset-0 z-40 flex flex-col text-cream ${backgroundClassName}`}
    >
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3 sm:px-8">
        <div className="min-w-0 flex-1">
          <h2 id="quote-picker-title" className="text-sm font-semibold text-cream">
            Выберите цитату
          </h2>
          <p className="text-xs text-cream-muted" aria-live="polite">
            {hint}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl px-3 py-2 text-sm text-cream-muted hover:bg-white/5 hover:text-cream"
        >
          Закрыть
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          {from > 0 && back < MAX_WORDS_BACK ? (
            <div className="mb-6 flex justify-center">
              <button
                type="button"
                onClick={showEarlier}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-cream-muted hover:bg-white/5 hover:text-cream"
              >
                Показать раньше
              </button>
            </div>
          ) : null}

          {/* Текст выбирается нажатиями, а не обычным выделением: так удобнее на телефоне */}
          <div onClick={handleTextClick} className="select-none">
            {paragraphs.map((paragraph) => (
              <p key={paragraph[0]} className="mb-4 text-base leading-relaxed text-cream/85">
                {paragraph.map((i) => {
                  const selected = range !== null && i >= range.start && i <= range.end;
                  return (
                    <span key={i}>
                      <span
                        data-i={i}
                        className={`cursor-pointer rounded px-0.5 transition-colors ${
                          selected ? "bg-accent/30 text-cream" : "hover:bg-white/10"
                        } ${i === anchor ? "ring-1 ring-accent" : ""}`}
                      >
                        {words[i]}
                      </span>{" "}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>

          <p className="mt-2 text-center text-xs text-cream-muted">Здесь вы остановились</p>
        </div>
      </div>

      <footer className="border-t border-white/5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {error || tooLong ? (
            <p role="alert" className="text-xs text-accent">
              {tooLong ? "Цитата слишком длинная: не больше 2000 символов. Выберите кусок покороче." : error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={pickCurrentSentence}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-cream-muted hover:bg-white/5 hover:text-cream"
            >
              Текущее предложение
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!range || tooLong || saving}
              className="ml-auto rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Сохраняем…" : "Сохранить цитату"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
