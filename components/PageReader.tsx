"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

interface PageReaderProps {
  words: string[];
  paragraphEnds: number[];
  /** Текущая позиция — номер слова. Если меняется снаружи (ползунок), текст прокручивается к нему. */
  index: number;
  fontSize: number;
  /** Классы шрифта и цвета из настроек */
  textClassName: string;
  /** Сообщает первое видимое слово (позиция) и последнее видимое (для окна цитат) */
  onPosition: (top: number, bottom: number) => void;
  /** Пользователь прокручивает текст: нужно для учёта времени чтения */
  onActivity: () => void;
  /** Караоке: подсвеченные слова (номера первого и последнего), −1 — подсветки нет */
  highlightStart: number;
  highlightEnd: number;
  /** Караоке идёт: текст сам прокручивается за подсветкой */
  playing: boolean;
  /** Пользователь сам крутит текст во время караоке — ставим на паузу */
  onUserScroll: () => void;
}

interface Paragraph {
  start: number;
  end: number;
  heading: boolean;
}

/** Как часто во время прокрутки пересчитываем позицию */
const REPORT_MS = 200;
/** Абзац из нескольких слов без знака в конце — скорее всего заголовок («Глава 1») */
const HEADING_MAX_WORDS = 6;
const ENDS_WITH_PUNCTUATION = /[.!?…,;:—–-]["»”)]*$/;

/**
 * Режим «Читать целиком»: весь текст книги с абзацами, обычная прокрутка.
 * Позиция — номер первого слова наверху экрана. Внутри абзаца она оценивается
 * пропорционально высоте, поэтому при переходе в скорочтение место почти не сдвигается.
 */
export function PageReader({
  words,
  paragraphEnds,
  index,
  fontSize,
  textClassName,
  onPosition,
  onActivity,
  highlightStart,
  highlightEnd,
  playing,
  onUserScroll,
}: PageReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  /** Последняя позиция, которую мы сами сообщили или к которой сами прокрутили */
  const positionRef = useRef(index);
  /** До этого момента прокрутку делаем мы, а не пользователь: позицию не пересчитываем */
  const programmaticUntil = useRef(0);
  const reportTimer = useRef<number | null>(null);
  /** Для отложенного пересчёта позиции: он мог быть запланирован ещё до начала караоке */
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const paragraphs = useMemo(() => splitParagraphs(words, paragraphEnds), [words, paragraphEnds]);

  /** Номер абзаца, в котором находится слово (двоичный поиск) */
  const paragraphOf = useCallback(
    (wordIndex: number) => {
      let low = 0;
      let high = paragraphs.length - 1;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (paragraphs[mid].end < wordIndex) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      return low;
    },
    [paragraphs],
  );

  /** Прокрутить так, чтобы слово оказалось у верхнего края */
  const scrollToWord = useCallback(
    (wordIndex: number) => {
      const scroller = scrollRef.current;
      const text = textRef.current;
      if (!scroller || !text || paragraphs.length === 0) {
        return;
      }
      const k = paragraphOf(wordIndex);
      const place = () => {
        const element = text.children[k] as HTMLElement | undefined;
        if (!element) {
          return;
        }
        const p = paragraphs[k];
        const fraction = (wordIndex - p.start) / (p.end - p.start + 1);
        const rect = element.getBoundingClientRect();
        const top = scroller.getBoundingClientRect().top;
        scroller.scrollTop += rect.top - top + fraction * rect.height;
      };
      programmaticUntil.current = Date.now() + 1000;
      place();
      // Второй проход: далёкие абзацы браузер рисует только когда они на экране,
      // их точная высота известна лишь после первой прокрутки
      requestAnimationFrame(() => {
        place();
        programmaticUntil.current = Date.now() + 150;
      });
      positionRef.current = wordIndex;
    },
    [paragraphOf, paragraphs],
  );

  /** Какое слово находится на высоте y (координата экрана) */
  const wordAt = useCallback(
    (y: number) => {
      const text = textRef.current;
      if (!text || paragraphs.length === 0) {
        return 0;
      }
      let low = 0;
      let high = paragraphs.length - 1;
      while (low < high) {
        const mid = (low + high) >> 1;
        if ((text.children[mid] as HTMLElement).getBoundingClientRect().bottom <= y) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      const p = paragraphs[low];
      const rect = (text.children[low] as HTMLElement).getBoundingClientRect();
      const fraction = rect.height > 0 ? Math.min(Math.max((y - rect.top) / rect.height, 0), 0.999) : 0;
      return p.start + Math.floor(fraction * (p.end - p.start + 1));
    },
    [paragraphs],
  );

  const report = useCallback(() => {
    reportTimer.current = null;
    const scroller = scrollRef.current;
    if (!scroller || playingRef.current || Date.now() < programmaticUntil.current) {
      return;
    }
    const box = scroller.getBoundingClientRect();
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
    const last = words.length - 1;
    // Долистали до конца — книга прочитана: позиция на последнем слове
    const top = atEnd ? last : wordAt(box.top + 1);
    const bottom = atEnd ? last : wordAt(box.bottom - 1);
    positionRef.current = top;
    onPosition(top, bottom);
  }, [onPosition, wordAt, words.length]);

  function handleScroll() {
    // Во время караоке позицию ведёт подсветка, а не прокрутка
    if (playing || Date.now() < programmaticUntil.current) {
      return;
    }
    onActivity();
    if (reportTimer.current === null) {
      reportTimer.current = window.setTimeout(report, REPORT_MS);
    }
  }

  useEffect(
    () => () => {
      if (reportTimer.current !== null) {
        window.clearTimeout(reportTimer.current);
      }
    },
    [],
  );

  // Открываем на сохранённом месте, фокус — на тексте, чтобы работали стрелки, пробел и PageDown
  useLayoutEffect(() => {
    scrollToWord(positionRef.current);
    scrollRef.current?.focus({ preventScroll: true });
    // Только при открытии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Позицию поменяли снаружи (ползунок) — прокручиваем к ней. Во время караоке — не прыгаем,
  // а плавно держим подсветку на экране (см. ниже).
  useEffect(() => {
    if (playing) {
      positionRef.current = index;
      return;
    }
    if (index !== positionRef.current) {
      scrollToWord(index);
    }
  }, [index, playing, scrollToWord]);

  // Караоке: если подсветка ушла к низу экрана (или выше него), плавно поднимаем её на треть высоты
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!playing || highlightStart < 0 || !scroller) {
      return;
    }
    const mark = scroller.querySelector<HTMLElement>("[data-hl]");
    if (!mark) {
      return;
    }
    const rect = mark.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    if (rect.bottom > box.top + box.height * 0.75 || rect.top < box.top) {
      programmaticUntil.current = Date.now() + 700;
      scroller.scrollBy({ top: rect.top - (box.top + box.height * 0.3), behavior: "smooth" });
    }
  }, [playing, highlightStart]);

  /** Колёсико или палец во время караоке — пауза: пользователь хочет сам посмотреть текст */
  function handleUserScroll() {
    if (playing) {
      onUserScroll();
    }
  }

  // После смены размера или шрифта текст перестраивается — возвращаемся к тому же слову
  const firstLayout = useRef(true);
  useLayoutEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false;
      return;
    }
    scrollToWord(positionRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize, textClassName]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onWheel={handleUserScroll}
      onTouchMove={handleUserScroll}
      tabIndex={0}
      aria-label="Текст книги"
      className="h-full overflow-y-auto overscroll-contain px-5 py-6 focus:outline-none sm:px-8"
    >
      <PageText
        innerRef={textRef}
        words={words}
        paragraphs={paragraphs}
        fontSize={fontSize}
        className={textClassName}
        highlightStart={highlightStart}
        highlightEnd={highlightEnd}
      />
      <p className="mx-auto mt-10 max-w-[36rem] pb-10 text-center text-xs text-cream-muted">Конец книги</p>
    </div>
  );
}

/**
 * Сам текст. Вынесен в memo: при прокрутке меняется позиция, но тысячи абзацев не перерисовываются.
 * content-visibility: auto — браузер не рисует абзацы далеко за экраном, большая книга не тормозит.
 */
const PageText = memo(function PageText({
  innerRef,
  words,
  paragraphs,
  fontSize,
  className,
  highlightStart,
  highlightEnd,
}: {
  innerRef: React.Ref<HTMLDivElement>;
  words: string[];
  paragraphs: Paragraph[];
  fontSize: number;
  className: string;
  highlightStart: number;
  highlightEnd: number;
}) {
  const hasHighlight = highlightStart >= 0;
  return (
    <div ref={innerRef} style={{ fontSize }} className={`mx-auto max-w-[36em] leading-[1.7] ${className}`}>
      {paragraphs.map((p) => {
        // Подсветку получает только абзац, в котором она сейчас: остальные абзацы не перерисовываются
        const active = hasHighlight && highlightStart <= p.end && highlightEnd >= p.start;
        return (
          <ParagraphView
            key={p.start}
            paragraph={p}
            words={words}
            highlightStart={active ? highlightStart : -1}
            highlightEnd={active ? highlightEnd : -1}
          />
        );
      })}
    </div>
  );
});

const ParagraphView = memo(function ParagraphView({
  paragraph: p,
  words,
  highlightStart,
  highlightEnd,
}: {
  paragraph: Paragraph;
  words: string[];
  highlightStart: number;
  highlightEnd: number;
}) {
  let content: React.ReactNode;
  if (highlightStart < 0) {
    content = words.slice(p.start, p.end + 1).join(" ");
  } else {
    const from = Math.max(highlightStart, p.start);
    const to = Math.min(highlightEnd, p.end);
    const before = words.slice(p.start, from).join(" ");
    const after = words.slice(to + 1, p.end + 1).join(" ");
    content = (
      <>
        {before ? `${before} ` : null}
        <mark data-hl="" className="rounded bg-accent/30 px-0.5 text-inherit [box-decoration-break:clone]">
          {words.slice(from, to + 1).join(" ")}
        </mark>
        {after ? ` ${after}` : null}
      </>
    );
  }
  return p.heading ? (
    <h3 className="mb-[0.8em] mt-[1.6em] text-[1.15em] font-semibold leading-snug [contain-intrinsic-size:auto_2em] [content-visibility:auto] first:mt-0">
      {content}
    </h3>
  ) : (
    <p className="mb-[0.9em] [contain-intrinsic-size:auto_6em] [content-visibility:auto]">{content}</p>
  );
});

/** Абзацы из номеров слов, которыми они заканчиваются (их находит analyzeText) */
function splitParagraphs(words: string[], paragraphEnds: number[]): Paragraph[] {
  const result: Paragraph[] = [];
  let start = 0;
  const push = (end: number) => {
    if (end < start) {
      return;
    }
    const count = end - start + 1;
    const lastWord = words[end] ?? "";
    const heading =
      count <= HEADING_MAX_WORDS && !ENDS_WITH_PUNCTUATION.test(lastWord) && !/^[—–-]/.test(words[start] ?? "");
    result.push({ start, end, heading });
    start = end + 1;
  };
  for (const end of paragraphEnds) {
    push(end);
  }
  push(words.length - 1);
  return result;
}
