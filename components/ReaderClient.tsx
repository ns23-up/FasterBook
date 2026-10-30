"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import {
  MAX_WPM,
  MIN_WPM,
  WPM_STEP,
  clampWpm,
  pivotIndex,
  wordDelayMs,
} from "@/lib/reader";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ReadingFont,
} from "@/lib/settings";

interface ReaderClientProps {
  title: string;
  words: string[];
  startIndex: number;
  isDemo: boolean;
}

/**
 * Читалка: показывает одно слово по центру и переключает его таймером.
 * Таймер — цепочка setTimeout: задержка считается под каждое слово,
 * а пауза просто останавливает цепочку.
 */
export function ReaderClient({ title, words, startIndex, isDemo }: ReaderClientProps) {
  const [index, setIndex] = useState(() => clampIndex(startIndex, words.length));
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(DEFAULT_SETTINGS.wpm);
  const [font, setFont] = useState<ReadingFont>(DEFAULT_SETTINGS.font);
  const [focusMode, setFocusMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const lastIndex = Math.max(words.length - 1, 0);
  const word = words[index] ?? "";

  // Читаем сохранённые настройки только в браузере
  useEffect(() => {
    const saved = loadSettings();
    setWpm(saved.wpm);
    setFont(saved.font);
  }, []);

  // Таймер: показываем следующее слово через задержку, рассчитанную под текущее слово
  useEffect(() => {
    if (!playing || words.length === 0) {
      return;
    }
    if (index >= lastIndex) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, lastIndex));
    }, wordDelayMs(word, wpm));

    return () => window.clearTimeout(timer);
  }, [playing, index, wpm, word, lastIndex, words.length]);

  const changeSpeed = useCallback(
    (next: number) => {
      const clamped = clampWpm(next);
      setWpm(clamped);
      saveSettings({ wpm: clamped, font });
    },
    [font],
  );

  const changeFont = useCallback(
    (next: ReadingFont) => {
      setFont(next);
      saveSettings({ wpm, font: next });
    },
    [wpm],
  );

  const seek = useCallback(
    (next: number) => {
      setIndex(clampIndex(next, words.length));
    },
    [words.length],
  );

  const togglePlay = useCallback(() => {
    if (words.length === 0) {
      return;
    }
    // Если дошли до конца, начинаем сначала
    if (!playing && index >= lastIndex) {
      setIndex(0);
    }
    setPlaying((value) => !value);
  }, [index, lastIndex, playing, words.length]);

  // Клавиатура: пробел — пауза, стрелки — переход и скорость, Esc — выход из фокуса
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          seek(index + 1);
          break;
        case "ArrowLeft":
          seek(index - 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          changeSpeed(wpm + WPM_STEP);
          break;
        case "ArrowDown":
          event.preventDefault();
          changeSpeed(wpm - WPM_STEP);
          break;
        case "Escape":
          setFocusMode(false);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeSpeed, index, seek, togglePlay, wpm]);

  // Следим за полноэкранным режимом, чтобы кнопка показывала правильное состояние
  useEffect(() => {
    function onChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Браузер может запретить полноэкранный режим (например, на iOS Safari). Тогда ничего не делаем.
    }
  }

  const progressPercent = words.length > 0 ? Math.round(((index + 1) / words.length) * 100) : 0;

  if (words.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-cream-muted">В этой книге нет текста для чтения.</p>
        <Link href="/books" className="text-sm font-medium text-accent">
          Вернуться к книгам
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-cream">
      {/* Верхняя панель: скрыта в режиме фокуса */}
      {focusMode ? null : (
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/books"
            className="rounded-lg px-2 py-1.5 text-sm text-cream-muted transition-colors hover:text-cream"
          >
            ← Назад
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-medium text-cream">{title}</p>
            {isDemo ? <DemoBadge /> : null}
          </div>
          <div className="w-16" aria-hidden="true" />
        </header>
      )}

      {/* Центр: одно слово */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <WordView word={word} font={font} />
        <p className="mt-10 text-xs tabular-nums text-cream-muted">
          {index + 1} из {words.length} · {progressPercent}%
        </p>
      </main>

      {/* Нижняя панель управления: скрыта в режиме фокуса */}
      {focusMode ? (
        <div className="px-4 pb-6 sm:px-8">
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="mx-auto block rounded-lg px-3 py-1.5 text-xs text-cream-muted hover:text-cream"
          >
            Выйти из фокуса (Esc)
          </button>
        </div>
      ) : (
        <footer className="flex flex-col gap-5 border-t border-white/5 bg-ink-deep/60 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-8">
          <div>
            <label htmlFor="seek" className="sr-only">
              Позиция в тексте
            </label>
            <input
              id="seek"
              type="range"
              min={0}
              max={lastIndex}
              value={index}
              onChange={(event) => {
                setPlaying(false);
                seek(Number(event.target.value));
              }}
              className="w-full accent-accent"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <IconButton label="Назад на слово" onClick={() => seek(index - 1)}>
                <IconPrev />
              </IconButton>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? "Пауза" : "Играть"}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-ink transition-transform hover:scale-[1.03] active:scale-95"
              >
                {playing ? <IconPause /> : <IconPlay />}
              </button>
              <IconButton label="Вперёд на слово" onClick={() => seek(index + 1)}>
                <IconNext />
              </IconButton>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeSpeed(wpm - WPM_STEP)}
                disabled={wpm <= MIN_WPM}
                aria-label="Медленнее"
                className="h-10 w-10 rounded-xl border border-white/10 text-lg text-cream transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-24 text-center text-sm font-semibold tabular-nums">
                {wpm} сл/мин
              </span>
              <button
                type="button"
                onClick={() => changeSpeed(wpm + WPM_STEP)}
                disabled={wpm >= MAX_WPM}
                aria-label="Быстрее"
                className="h-10 w-10 rounded-xl border border-white/10 text-lg text-cream transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeFont(font === "sans" ? "serif" : "sans")}
                className="h-10 rounded-xl border border-white/10 px-3 text-sm text-cream transition-colors hover:bg-white/5"
              >
                {font === "sans" ? "Aa засечки" : "Aa без засечек"}
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(true)}
                className="h-10 rounded-xl border border-white/10 px-3 text-sm text-cream transition-colors hover:bg-white/5"
              >
                Фокус
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-10 rounded-xl border border-white/10 px-3 text-sm text-cream transition-colors hover:bg-white/5"
              >
                {fullscreen ? "Свернуть" : "Во весь экран"}
              </button>
            </div>
          </div>

          <p className="hidden text-center text-xs text-cream-muted/70 md:block">
            Пробел — пауза · ← → — слово · ↑ ↓ — скорость
          </p>
        </footer>
      )}

      {/* Тонкая линия прогресса в режиме фокуса */}
      {focusMode ? (
        <div className="fixed inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** Слово с выделенной буквой в центре. Левая и правая части выровнены, чтобы буква не «прыгала». */
function WordView({ word, font }: { word: string; font: ReadingFont }) {
  const pivot = pivotIndex(word);
  const before = word.slice(0, pivot);
  const focus = word.charAt(pivot);
  const after = word.slice(pivot + 1);
  const fontClass = font === "serif" ? "font-serif" : "font-sans";

  return (
    <div
      className={`grid min-h-[7rem] w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center text-5xl font-medium leading-none sm:text-7xl md:text-8xl ${fontClass}`}
      aria-label={word}
    >
      <span className="truncate text-right text-cream" aria-hidden="true">
        {before}
      </span>
      <span className="text-accent" aria-hidden="true">
        {focus}
      </span>
      <span className="truncate text-left text-cream" aria-hidden="true">
        {after}
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-cream transition-colors hover:bg-white/5"
    >
      {children}
    </button>
  );
}

function clampIndex(value: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, value), length - 1);
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
