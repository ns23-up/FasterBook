"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DemoBadge } from "@/components/DemoBadge";
import { Icon } from "@/components/Icon";
import { WordView } from "@/components/WordView";
import { Chip, RangeSlider } from "@/components/ui";
import { MAX_WPM, MIN_WPM, WPM_STEP, clampWpm, wordDelayMs } from "@/lib/reader";
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
}

/**
 * Читалка: показывает одно слово по центру и переключает его таймером.
 * Таймер — цепочка setTimeout: задержка считается под каждое слово,
 * а пауза просто останавливает цепочку.
 */
export function ReaderClient({ title, author, words, startIndex, isDemo }: ReaderClientProps) {
  const [index, setIndex] = useState(() => clampIndex(startIndex, words.length));
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  /** Фокус, включённый кнопкой вручную */
  const [manualFocus, setManualFocus] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const lastIndex = Math.max(words.length - 1, 0);
  const word = words[index] ?? "";
  const wpm = settings.wpm;
  // Панели прячутся, если фокус включён вручную или если в настройках включён режим фокуса и идёт чтение
  const hideUi = manualFocus || (settings.focusMode && playing);

  // Читаем сохранённые настройки только в браузере
  useEffect(() => {
    setSettings(loadSettings());
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
          setManualFocus(false);
          setPlaying(false);
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
                <span>{wpm} слов/мин</span>
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
            <ControlButton label="Пред." onClick={() => seek(index - 1)} icon="skipBack" />
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Пауза" : "Читать"}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-ink transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Icon name={playing ? "pause" : "play"} className="h-7 w-7" />
            </button>
            <ControlButton label="След." onClick={() => seek(index + 1)} icon="skipForward" />
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
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-cream">Скорость чтения</span>
                  <span className="tabular-nums text-cream-muted">{wpm} слов/мин</span>
                </div>
                <RangeSlider
                  label="Скорость, слов в минуту"
                  min={MIN_WPM}
                  max={MAX_WPM}
                  step={WPM_STEP}
                  value={wpm}
                  onChange={changeSpeed}
                />
                <div className="mt-1 flex justify-between text-xs text-cream-muted">
                  <span>{MIN_WPM}</span>
                  <span>{MAX_WPM}</span>
                </div>
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
            Пробел — пауза · ← → — слово · ↑ ↓ — скорость
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
      aria-label={icon === "skipBack" ? "Слово назад" : "Слово вперёд"}
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
