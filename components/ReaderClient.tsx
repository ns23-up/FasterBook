"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { PageReader } from "@/components/PageReader";
import { QuotePicker } from "@/components/QuotePicker";
import { WordView } from "@/components/WordView";
import { useReadingTracker } from "@/components/useReadingTracker";
import { Chip, RangeSlider } from "@/components/ui";
import {
  CHUNK_SIZES,
  MAX_WPM,
  MIN_WPM,
  WPM_STEP,
  analyzeText,
  buildChunks,
  chunkDelayMs,
  chunkIndexAt,
  clampWpm,
} from "@/lib/reader";
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  PAGE_FONT_MAX,
  PAGE_FONT_MIN,
  PAGE_FONT_STEP,
  backgroundClass,
  clampPageFontSize,
  fontClass,
  loadSettings,
  saveSettings,
  textColorClass,
  type ReadMode,
  type ReaderSettings,
} from "@/lib/settings";

/** Сколько слов можно засчитать за одну прокрутку. Больше — это прыжок по книге, а не чтение. */
const MAX_WORDS_PER_SCROLL = 1000;
/** В режиме «Читать целиком» время считается, если текст прокручивали за последние 90 секунд */
const PAGE_IDLE_MS = 90_000;

interface ReaderClientProps {
  title: string;
  author: string;
  /** Текст книги целиком: читалка сама разбирает его на слова и абзацы */
  text: string;
  /** Номер слова, с которого начать */
  startIndex: number;
  /** Идентификатор книги: нужен, чтобы отметить её завершённой в статистике */
  bookKey?: string;
  /** Сохраняет позицию (номер слова). Ошибка — повод повторить. */
  onProgress?: (index: number) => Promise<void>;
  /** Сохраняет цитату. Если не передано (гость), кнопки цитаты нет. Ошибка — текст для пользователя. */
  onSaveQuote?: (quote: { text: string; position: number }) => Promise<void>;
}

/**
 * Читалка: показывает по центру кадр из 1–3 слов и переключает его таймером.
 * Таймер — цепочка setTimeout: задержка считается под каждый кадр,
 * а пауза просто останавливает цепочку.
 *
 * Позиция (index) — это номер СЛОВА, а не кадра. Поэтому при смене «слов за раз»
 * место в книге не сбивается, а сохранённый прогресс одинаков для любого режима.
 */
export function ReaderClient({
  title,
  author,
  text,
  startIndex,
  bookKey,
  onProgress,
  onSaveQuote,
}: ReaderClientProps) {
  // Разбор текста — один раз на книгу
  const { words, paragraphEnds } = useMemo(() => analyzeText(text), [text]);
  const [index, setIndex] = useState(() => clampIndex(startIndex, words.length));
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  /** Настройки прочитаны из браузера: до этого не показываем ни один режим, чтобы не было мелькания */
  const [settingsReady, setSettingsReady] = useState(false);
  /** Фокус, включённый кнопкой вручную */
  const [manualFocus, setManualFocus] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const lastIndex = Math.max(words.length - 1, 0);
  const wpm = settings.wpm;

  // Кадры пересчитываются только при смене текста или режима «слов за раз»
  const chunks = useMemo(
    () => buildChunks(words, settings.chunkSize, paragraphEnds),
    [words, settings.chunkSize, paragraphEnds],
  );
  const chunkIdx = chunkIndexAt(chunks, index);
  const lastChunk = Math.max(chunks.length - 1, 0);
  const word = chunks[chunkIdx]?.text ?? "";
  /** «Читать целиком»: весь текст с прокруткой */
  const pageMode = settings.readMode === "page";
  const pageModeRef = useRef(pageMode);
  pageModeRef.current = pageMode;
  // Панели прячутся, если фокус включён вручную или если в настройках включён режим фокуса и идёт чтение.
  // В режиме «Читать целиком» панели всегда видны.
  const hideUi = !pageMode && (manualFocus || (settings.focusMode && playing));
  /** В режиме «Читать целиком»: пользователь недавно прокручивал текст, значит читает */
  const [pageActive, setPageActive] = useState(false);
  const lastActivityRef = useRef(0);
  /**
   * Караоке в режиме «Читать целиком»: слова подсвечиваются по очереди с выбранной скоростью.
   * Работает на том же таймере, что и скорочтение. Подсветка остаётся на паузе, пока текст не прокрутят.
   */
  const [karaoke, setKaraoke] = useState(false);
  // Статистика: считает время и слова, только пока идёт чтение (гостям не считается)
  const { addWords, markFinished } = useReadingTracker(playing || (pageMode && pageActive), bookKey);

  // Читаем сохранённые настройки только в браузере
  useEffect(() => {
    setSettings(loadSettings());
    setSettingsReady(true);
  }, []);

  // «Читать целиком»: если долго не прокручивали, перестаём считать время
  useEffect(() => {
    if (!pageMode || !pageActive) {
      return;
    }
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current > PAGE_IDLE_MS) {
        setPageActive(false);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pageMode, pageActive]);

  const handlePageActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setPageActive(true);
  }, []);

  // Таймер: показываем следующий кадр через задержку, рассчитанную под текущий кадр
  useEffect(() => {
    if (!playing || chunks.length === 0) {
      return;
    }
    if (chunkIdx >= lastChunk) {
      // Дочитали до конца
      setPlaying(false);
      markFinished();
      return;
    }
    const timer = window.setTimeout(() => {
      addWords(chunks[chunkIdx].count);
      setIndex(chunks[chunkIdx + 1].start);
    }, chunkDelayMs(chunks[chunkIdx], wpm));

    return () => window.clearTimeout(timer);
  }, [playing, chunkIdx, chunks, lastChunk, wpm, addWords, markFinished]);

  // Сохранение позиции. Не на каждом слове (это десятки записей в секунду),
  // а раз в 2 секунды, при паузе, при переходе по тексту и при закрытии страницы.
  // Позиция считается сохранённой только после успешного ответа: при ошибке следующая
  // попытка будет через 2 секунды или сразу, как вернётся интернет.
  const indexRef = useRef(index);
  const savedIndexRef = useRef(index);
  /** Идёт сохранение: второе не запускаем, иначе старая позиция может прийти позже новой */
  const savingRef = useRef(false);
  /** Читалку закрывают: после текущего сохранения сразу отправить последнюю позицию */
  const closingRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  indexRef.current = index;

  const flushProgress = useCallback(() => {
    if (!onProgress) {
      return;
    }
    const save = onProgress;
    const run = () => {
      const target = indexRef.current;
      if (savingRef.current || target === savedIndexRef.current) {
        return;
      }
      savingRef.current = true;
      save(target).then(
        () => {
          savingRef.current = false;
          savedIndexRef.current = target;
          setSaveFailed(false);
          // Пока читалка открыта, следующую отправку сделает таймер
          if (closingRef.current) {
            run();
          }
        },
        () => {
          savingRef.current = false;
          setSaveFailed(true);
        },
      );
    };
    run();
  }, [onProgress]);

  useEffect(() => {
    if (!onProgress) {
      return;
    }
    closingRef.current = false;
    const timer = window.setInterval(flushProgress, 2000);
    window.addEventListener("pagehide", flushProgress);
    window.addEventListener("online", flushProgress);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", flushProgress);
      window.removeEventListener("online", flushProgress);
      closingRef.current = true;
      flushProgress();
    };
  }, [flushProgress, onProgress]);

  // В скорочтении сохраняем сразу после паузы или перехода. В режиме «Читать целиком»
  // позиция меняется при каждой прокрутке — там хватает сохранения раз в 2 секунды.
  useEffect(() => {
    if (!playing && !pageMode) {
      flushProgress();
    }
  }, [playing, index, flushProgress, pageMode]);

  /** Последнее видимое слово в режиме «Читать целиком»: до него показываем текст в окне цитат */
  const visibleEndRef = useRef(index);

  const handlePagePosition = useCallback(
    (top: number, bottom: number) => {
      // Пользователь сам прокрутил текст — подсветка караоке больше не нужна
      setKaraoke(false);
      visibleEndRef.current = bottom;
      const delta = top - indexRef.current;
      if (delta > 0 && delta <= MAX_WORDS_PER_SCROLL) {
        addWords(delta);
      }
      setIndex(top);
      if (bottom >= words.length - 1) {
        markFinished();
      }
    },
    [addWords, markFinished, words.length],
  );

  const [quoteNotice, setQuoteNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  /** Открыто окно выбора цитаты: клавиши читалки (пробел, стрелки) не работают */
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerOpenRef = useRef(false);
  pickerOpenRef.current = pickerOpen;

  // Сообщение о цитате само исчезает через 3 секунды
  useEffect(() => {
    if (!quoteNotice) {
      return;
    }
    const timer = window.setTimeout(() => setQuoteNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [quoteNotice]);

  function openQuotePicker() {
    setPlaying(false);
    setPickerOpen(true);
  }

  /** Ошибку отдаём окну выбора: оно покажет её и останется открытым */
  async function handleQuoteSave(quote: { text: string; position: number }) {
    if (!onSaveQuote) {
      return;
    }
    await onSaveQuote(quote);
    setQuoteNotice({ kind: "ok", text: "Цитата сохранена в «Избранное»." });
  }

  // Последнее слово, которое уже показано на экране: до него и показываем текст в окне цитат
  const currentChunk = chunks[chunkIdx];
  const shownUntil = pageMode
    ? Math.max(visibleEndRef.current, index)
    : currentChunk
      ? currentChunk.start + currentChunk.count - 1
      : index;

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

  function switchMode(next: ReadMode) {
    if (next === settings.readMode) {
      return;
    }
    setPlaying(false);
    setManualFocus(false);
    setPageActive(false);
    setKaraoke(false);
    visibleEndRef.current = index;
    updateSettings({ readMode: next });
  }

  function changeFontSize(next: number) {
    updateSettings({ pageFontSize: clampPageFontSize(next) });
  }

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

  /** Караоке: старт с первого слова наверху экрана, повторное нажатие — пауза */
  const toggleKaraoke = useCallback(() => {
    setKaraoke(true);
    togglePlay();
  }, [togglePlay]);

  const pauseKaraoke = useCallback(() => setPlaying(false), []);

  // Подсветка караоке — текущий кадр (1–3 слова, как в скорочтении)
  const highlightStart = pageMode && karaoke && currentChunk ? currentChunk.start : -1;
  const highlightEnd = pageMode && karaoke && currentChunk ? currentChunk.start + currentChunk.count - 1 : -1;

  // Клавиатура: пробел — пауза, стрелки — переход и скорость, Esc — выход из фокуса
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // В режиме «Читать целиком» пробел и стрелки прокручивают текст, как в обычной книге
      if (event.target instanceof HTMLInputElement || pickerOpenRef.current || pageModeRef.current) {
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

  if (!settingsReady) {
    return <div className="min-h-dvh bg-ink" />;
  }

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
    <div
      className={`flex flex-col text-cream transition-colors ${pageMode ? "h-dvh" : "min-h-dvh"} ${backgroundClass(settings.background)}`}
    >
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
            <p className="truncate text-sm font-semibold text-cream">{title}</p>
            <p className="truncate text-xs text-cream-muted">{author}</p>
          </div>
          {onSaveQuote ? (
            <HeaderButton label="Выбрать цитату" onClick={openQuotePicker} icon="quote" />
          ) : null}
          <HeaderButton label={fullscreen ? "Свернуть" : "Во весь экран"} onClick={toggleFullscreen} icon="fullscreen" />
          <HeaderButton
            label={panelOpen ? "Скрыть настройки" : "Настройки чтения"}
            onClick={() => setPanelOpen((value) => !value)}
            icon="sliders"
            active={panelOpen}
          />
        </header>
      )}

      {hideUi ? null : (
        <div className="flex justify-center px-4 pb-2">
          <ModeSwitch mode={settings.readMode} onChange={switchMode} />
        </div>
      )}

      {saveFailed ? (
        <p
          role="status"
          className={`mx-auto w-fit max-w-[calc(100%-2rem)] rounded-lg border border-accent/40 bg-ink-deep/90 px-3 py-1.5 text-center text-xs text-cream ${
            hideUi ? "fixed inset-x-0 top-3 z-10" : ""
          }`}
        >
          Не удалось сохранить место в книге. Пробуем снова…
        </p>
      ) : null}

      {quoteNotice ? (
        <p
          role={quoteNotice.kind === "error" ? "alert" : "status"}
          className={`mx-auto mt-2 w-fit max-w-[calc(100%-2rem)] rounded-lg border px-3 py-1.5 text-center text-xs text-cream ${
            quoteNotice.kind === "error" ? "border-accent/40 bg-ink-deep/90" : "border-online/30 bg-ink-deep/90"
          }`}
        >
          {quoteNotice.text}
        </p>
      ) : null}

      {pageMode ? (
        <>
          <main className="min-h-0 flex-1">
            <PageReader
              words={words}
              paragraphEnds={paragraphEnds}
              index={index}
              fontSize={settings.pageFontSize}
              textClassName={`${fontClass(settings.font)} ${textColorClass(settings.textColor)}`}
              onPosition={handlePagePosition}
              onActivity={handlePageActivity}
              highlightStart={highlightStart}
              highlightEnd={highlightEnd}
              playing={playing}
              onUserScroll={pauseKaraoke}
            />
          </main>

          <footer className="border-t border-white/5 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
            <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
              <button
                type="button"
                onClick={toggleKaraoke}
                aria-label={playing ? "Пауза" : "Караоке: подсвечивать слова"}
                title={playing ? "Пауза" : `Караоке: подсветка ${wpm} слов/мин`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Icon name={playing ? "pause" : "play"} className="h-5 w-5" />
              </button>
              {settings.showProgress ? (
                <div className="min-w-0 flex-1">
                  <RangeSlider
                    label="Позиция в тексте"
                    min={0}
                    max={lastIndex}
                    value={index}
                    onChange={seek}
                  />
                  <p className="mt-1 text-[11px] tabular-nums text-cream-muted">{progressPercent}% прочитано</p>
                </div>
              ) : (
                <span className="flex-1" />
              )}
              <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Размер шрифта">
                <SpeedButton
                  label="Шрифт меньше"
                  onClick={() => changeFontSize(settings.pageFontSize - PAGE_FONT_STEP)}
                  disabled={settings.pageFontSize <= PAGE_FONT_MIN}
                >
                  <span className="text-xs">A−</span>
                </SpeedButton>
                <span className="w-8 text-center text-xs tabular-nums text-cream-muted" aria-live="polite">
                  {settings.pageFontSize}
                </span>
                <SpeedButton
                  label="Шрифт больше"
                  onClick={() => changeFontSize(settings.pageFontSize + PAGE_FONT_STEP)}
                  disabled={settings.pageFontSize >= PAGE_FONT_MAX}
                >
                  <span className="text-base">A+</span>
                </SpeedButton>
              </div>
            </div>

            {panelOpen ? (
              <section
                aria-label="Настройки чтения"
                className="mx-auto mt-3 flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <p className="mb-2 flex justify-between text-sm text-cream">
                    Скорость караоке
                    <span className="tabular-nums text-cream-muted">{wpm} слов/мин</span>
                  </p>
                  <RangeSlider
                    label="Скорость караоке, слов в минуту"
                    min={MIN_WPM}
                    max={MAX_WPM}
                    step={WPM_STEP}
                    value={wpm}
                    onChange={changeSpeed}
                  />
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
          </footer>
        </>
      ) : (
        /* Центр: одно слово. В режиме фокуса нажатие ставит на паузу. */
        <main
          className="flex flex-1 flex-col items-center justify-center gap-6 px-4"
          onClick={hideUi && playing ? togglePlay : undefined}
        >
          <WordView word={word} settings={settings} />
          <span className="h-0.5 w-12 rounded-full bg-accent" aria-hidden="true" />
        </main>
      )}

      {pageMode ? null : hideUi ? (
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

      {pickerOpen && onSaveQuote ? (
        <QuotePicker
          words={words}
          paragraphEnds={paragraphEnds}
          endIndex={shownUntil}
          backgroundClassName={backgroundClass(settings.background)}
          onSave={handleQuoteSave}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

      {/* Тонкая линия прогресса, когда панели скрыты */}
      {hideUi && settings.showProgress ? (
        <div className="fixed inset-x-0 bottom-0 h-0.5 bg-white/5">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** Переключатель «Скорочтение / Читать целиком» */
function ModeSwitch({ mode, onChange }: { mode: ReadMode; onChange: (mode: ReadMode) => void }) {
  const options: { value: ReadMode; label: string }[] = [
    { value: "speed", label: "Скорочтение" },
    { value: "page", label: "Читать целиком" },
  ];
  return (
    <div role="radiogroup" aria-label="Режим чтения" className="flex rounded-xl border border-white/10 bg-black/20 p-1">
      {options.map((option) => {
        const selected = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              selected ? "bg-accent text-ink" : "text-cream-muted hover:text-cream"
            }`}
          >
            {option.label}
          </button>
        );
      })}
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
  icon: "fullscreen" | "sliders" | "quote";
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
