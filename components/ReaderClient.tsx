"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon } from "@/components/Icon";
import { WordView } from "@/components/WordView";
import { Chip, RangeSlider } from "@/components/ui";
import {
  CHUNK_SIZES,
  MAX_WPM,
  MIN_WPM,
  WPM_STEP,
  buildChunks,
  chunkIndexAt,
  clampWpm,
  wordDelayMs,
} from "@/lib/reader";
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  backgroundClass,
  loadSettings,
  saveSettings,
  type ReaderSettings,
} from "@/lib/settings";

interface ReaderClientProps {
  title: string;
  author: string;
  words: string[];
  startIndex: number;
  isDemo: boolean;
  /** Вызывается, чтобы сохранить позицию (номер слова). Для демо-книг не передаётся. */
  onProgress?: (index: number) => void;
}

/**
 * Читалка: показывает по центру кадр из 1–3 слов и переключает его таймером.
 * Таймер — цепочка setTimeout: задержка считается под каждый кадр,
 * а пауза просто останавливает цепочку.
 *
 * Позиция (index) — это номер СЛОВА, а не кадра. Поэтому при смене «слов за раз»
 * место в книге не сбивается, а сохранённый прогресс одинаков для любого режима.
 */
export function ReaderClient({ title, author, words, startIndex, isDemo, onProgress }: ReaderClientProps) {
  const [index, setIndex] = useState(() => clampIndex(startIndex, words.length));
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  /** Фокус, включённый кнопкой вручную */
  const [manualFocus, setManualFocus] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const lastIndex = Math.max(words.length - 1, 0);
  const wpm = settings.wpm;

  // Кадры пересчитываются только при смене текста или режима «слов за раз»
  const chunks = useMemo(() => buildChunks(words, settings.chunkSize), [words, settings.chunkSize]);
  const chunkIdx = chunkIndexAt(chunks, index);
  const lastChunk = Math.max(chunks.length - 1, 0);
  const word = chunks[chunkIdx]?.text ?? "";
  // Панели прячутся, если фокус включён вручную или если в настройках включён режим фокуса и идёт чтение
  const hideUi = manualFocus || (settings.focusMode && playing);

  // Читаем сохранённые настройки только в браузере
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Таймер: показываем следующий кадр через задержку, рассчитанную под текущий кадр
  useEffect(() => {
    if (!playing || chunks.length === 0) {
      return;
    }
    if (chunkIdx >= lastChunk) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex(chunks[chunkIdx + 1].start);
    }, wordDelayMs(word, wpm));

    return () => window.clearTimeout(timer);
  }, [playing, chunkIdx, chunks, lastChunk, wpm, word]);

  // Сохранение позиции. Не на каждом слове (это десятки записей в секунду),
  // а раз в 2 секунды, при паузе, при переходе по тексту и при закрытии страницы.
  const indexRef = useRef(index);
  const savedIndexRef = useRef(index);
  indexRef.current = index;

  const flushProgress = useCallback(() => {
    if (onProgress && indexRef.current !== savedIndexRef.current) {
      savedIndexRef.current = indexRef.current;
      onProgress(indexRef.current);
    }
  }, [onProgress]);

  useEffect(() => {
    if (!onProgress) {
      return;
    }
    const timer = window.setInterval(flushProgress, 2000);
    window.addEventListener("pagehide", flushProgress);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", flushProgress);
      flushProgress();
    };
  }, [flushProgress, onProgress]);

  useEffect(() => {
    if (!playing) {
      flushProgress();
    }
  }, [playing, index, flushProgress]);

  /** Меняет настройку и сразу сохраняет её в браузере */
  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const changeSpeed = useCallback(
    (next: number) => updateSettings({ wpm: clampWpm(next) }),
    [updateSettings],
  );

  const seek = useCallback(
    (next: number) => {
      setIndex(clampIndex(next, words.length));
    },
    [words.length],
  );

  /** Перейти на кадр вперёд (+1) или назад (−1) */
  const step = useCallback(
    (delta: number) => {
      const target = Math.min(Math.max(chunkIdx + delta, 0), lastChunk);
      setIndex(chunks[target]?.start ?? 0);
    },
    [chunkIdx, chunks, lastChunk],
  );

  const togglePlay = useCallback(() => {
    if (words.length === 0) {
      return;
    }
    // Если дошли до конца, начинаем сначала
    if (!playing && chunkIdx >= lastChunk) {
      setIndex(0);
    }
    setPlaying((value) => !value);
  }, [chunkIdx, lastChunk, playing, words.length]);

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
          step(1);
          break;
        case "ArrowLeft":
          step(-1);
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
          setManualFocus(false);
          setPlaying(false);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeSpeed, step, togglePlay, wpm]);

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
    <div className={`flex min-h-dvh flex-col text-cream transition-colors ${backgroundClass(settings.background)}`}>
      {/* Верхняя панель */}
      {hideUi ? null : (
        <header className="flex items-center gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/books"
            aria-label="Назад к книгам"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-cream-muted transition-colors hover:bg-white/5 hover:text-cream"
          >
            <Icon name="back" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-cream">{title}</p>
              {isDemo ? <DemoBadge /> : null}
            </div>
            <p className="truncate text-xs text-cream-muted">{author}</p>
          </div>
          <HeaderButton label={fullscreen ? "Свернуть" : "Во весь экран"} onClick={toggleFullscreen} icon="fullscreen" />
          <HeaderButton
            label={panelOpen ? "Скрыть настройки" : "Настройки чтения"}
            onClick={() => setPanelOpen((value) => !value)}
            icon="sliders"
            active={panelOpen}
          />
        </header>
      )}

      {/* Центр: одно слово. В режиме фокуса нажатие ставит на паузу. */}
      <main
        className="flex flex-1 flex-col items-center justify-center gap-6 px-4"
        onClick={hideUi && playing ? togglePlay : undefined}
      >
        {hideUi ? null : <p className="text-xs text-cream-muted">Режим быстрого чтения</p>}
        <WordView word={word} settings={settings} />
        <span className="h-0.5 w-12 rounded-full bg-accent" aria-hidden="true" />
      </main>

      {hideUi ? (
        <div className="px-4 pb-6 text-center sm:px-8">
          {manualFocus ? (
            <button
              type="button"
              onClick={() => setManualFocus(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-cream-muted hover:text-cream"
            >
              Выйти из фокуса (Esc)
            </button>
          ) : (
            <p className="text-xs text-cream-muted/60">Пробел или нажатие — пауза</p>
          )}
        </div>
      ) : (
        <footer className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
          {settings.showProgress ? (
            <div>
              <div className="mb-2 flex justify-between text-xs tabular-nums text-cream-muted">
                <span>
                  {index + 1} / {words.length}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <RangeSlider
                label="Позиция в тексте"
                min={0}
                max={lastIndex}
                value={index}
                onChange={(value) => {
                  setPlaying(false);
                  seek(value);
                }}
              />
            </div>
          ) : null}

          {/* Управление */}
          <div className="flex items-center justify-center gap-5 sm:gap-8">
            <ControlButton label="Пред." onClick={() => step(-1)} icon="skipBack" />
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Пауза" : "Читать"}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ink transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Icon name={playing ? "pause" : "play"} className="h-7 w-7" />
            </button>
            <ControlButton label="След." onClick={() => step(1)} icon="skipForward" />
          </div>

          {/* Скорость: прямо под рукой, можно менять на ходу, не останавливая чтение */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
            <SpeedButton label="Медленнее" onClick={() => changeSpeed(wpm - WPM_STEP)} disabled={wpm <= MIN_WPM}>
              −
            </SpeedButton>
            <div className="flex-1">
              <RangeSlider
                label="Скорость, слов в минуту"
                min={MIN_WPM}
                max={MAX_WPM}
                step={WPM_STEP}
                value={wpm}
                onChange={changeSpeed}
              />
            </div>
            <SpeedButton label="Быстрее" onClick={() => changeSpeed(wpm + WPM_STEP)} disabled={wpm >= MAX_WPM}>
              +
            </SpeedButton>
            <p className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-cream">
              {wpm}
              <span className="block text-[10px] font-normal text-cream-muted">слов/мин</span>
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setManualFocus(true);
                setPanelOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-cream-muted transition-colors hover:bg-white/5 hover:text-cream"
            >
              <Icon name="focus" className="h-4 w-4" />
              Режим фокуса
            </button>
          </div>

          {/* Быстрые настройки прямо в читалке */}
          {panelOpen ? (
            <section aria-label="Настройки чтения" className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div>
                <p className="mb-2 text-sm text-cream">Слов за раз</p>
                <div role="radiogroup" aria-label="Слов за раз" className="grid grid-cols-3 gap-2">
                  {CHUNK_SIZES.map((size) => (
                    <Chip
                      key={size}
                      selected={settings.chunkSize === size}
                      onClick={() => updateSettings({ chunkSize: size })}
                    >
                      {size}
                    </Chip>
                  ))}
                </div>
                <p className="mt-2 text-xs text-cream-muted">Предлоги и союзы всегда показываются вместе со словом.</p>
              </div>
              <div>
                <p className="mb-2 text-sm text-cream">Шрифт</p>
                <div role="radiogroup" aria-label="Шрифт" className="grid grid-cols-3 gap-2">
                  {FONT_OPTIONS.map((option) => (
                    <Chip
                      key={option.value}
                      selected={settings.font === option.value}
                      onClick={() => updateSettings({ font: option.value })}
                      className={option.className}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <Link href="/settings" className="text-center text-xs text-cream-muted hover:text-cream">
                Все настройки: цвета, фон, прогресс →
              </Link>
            </section>
          ) : null}

          <p className="hidden text-center text-xs text-cream-muted/70 md:block">
            Пробел — пауза · ← → — назад / вперёд · ↑ ↓ — скорость
          </p>
        </footer>
      )}

      {/* Тонкая линия прогресса, когда панели скрыты */}
      {hideUi && settings.showProgress ? (
        <div className="fixed inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function HeaderButton({
  label,
  onClick,
  icon,
  active,
}: {
  label: string;
  onClick: () => void;
  icon: "fullscreen" | "sliders";
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-white/5 ${
        active ? "text-accent" : "text-cream-muted hover:text-cream"
      }`}
    >
      <Icon name={icon} />
    </button>
  );
}

function SpeedButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-lg leading-none text-cream transition-colors hover:bg-white/5 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ControlButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: "skipBack" | "skipForward";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={icon === "skipBack" ? "Назад" : "Вперёд"}
      className="flex flex-col items-center gap-1 text-cream-muted transition-colors hover:text-cream"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

function clampIndex(value: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, value), length - 1);
}
