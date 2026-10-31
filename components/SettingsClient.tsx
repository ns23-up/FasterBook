"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { WordView } from "@/components/WordView";
import { Chip, RangeSlider, Toggle, panelClass } from "@/components/ui";
import { CHUNK_SIZES, MAX_WPM, MIN_WPM, WPM_STEP } from "@/lib/reader";
import {
  BACKGROUND_OPTIONS,
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  TEXT_COLOR_OPTIONS,
  backgroundClass,
  loadSettings,
  saveSettings,
  type ReaderSettings,
} from "@/lib/settings";

/**
 * Экран «Настройки чтения».
 * Изменения сначала видны в предпросмотре, а в браузер сохраняются по кнопке «Сохранить».
 */
export function SettingsClient() {
  // Значения по умолчанию на сервере, реальные читаем из браузера после монтирования
  const [saved, setSaved] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const fromStorage = loadSettings();
    setSaved(fromStorage);
    setDraft(fromStorage);
    setLoaded(true);
  }, []);

  const changed = JSON.stringify(saved) !== JSON.stringify(draft);

  function update(patch: Partial<ReaderSettings>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setJustSaved(false);
  }

  function save() {
    saveSettings(draft);
    setSaved(draft);
    setJustSaved(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="reading-settings" className={`flex flex-col gap-7 p-5 sm:p-6 ${panelClass}`}>
        <h2 id="reading-settings" className="text-lg font-semibold text-cream">
          Настройки чтения
        </h2>

        <Field label="Скорость чтения" value={`${draft.wpm} слов/мин`}>
          <RangeSlider
            label="Скорость, слов в минуту"
            min={MIN_WPM}
            max={MAX_WPM}
            step={WPM_STEP}
            value={draft.wpm}
            disabled={!loaded}
            onChange={(wpm) => update({ wpm })}
          />
          <div className="mt-1 flex justify-between text-xs text-cream-muted">
            <span>{MIN_WPM}</span>
            <span>{MAX_WPM}</span>
          </div>
        </Field>

        <Field label="Слов за раз">
          <div role="radiogroup" aria-label="Слов за раз" className="grid grid-cols-3 gap-2">
            {CHUNK_SIZES.map((size) => (
              <Chip key={size} selected={draft.chunkSize === size} onClick={() => update({ chunkSize: size })}>
                {size}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-cream-muted">
            Предлоги и союзы всегда показываются вместе со словом: «и пришёл», «в доме».
          </p>
        </Field>

        <Field label="Шрифт">
          <div role="radiogroup" aria-label="Шрифт" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FONT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={draft.font === option.value}
                onClick={() => update({ font: option.value })}
                className={option.className}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Цвет текста">
          <div role="radiogroup" aria-label="Цвет текста" className="flex flex-wrap gap-3">
            {TEXT_COLOR_OPTIONS.map((option) => (
              <Swatch
                key={option.value}
                label={option.label}
                className={option.swatchClass}
                selected={draft.textColor === option.value}
                onSelect={() => update({ textColor: option.value })}
                round
              />
            ))}
          </div>
        </Field>

        <Field label="Фон">
          <div role="radiogroup" aria-label="Фон" className="flex flex-wrap gap-3">
            {BACKGROUND_OPTIONS.map((option) => (
              <Swatch
                key={option.value}
                label={option.label}
                className={option.className}
                selected={draft.background === option.value}
                onSelect={() => update({ background: option.value })}
              />
            ))}
          </div>
        </Field>

        <div className="flex flex-col divide-y divide-white/5 rounded-xl border border-white/5">
          <ToggleRow
            title="Показывать прогресс"
            hint="Счётчик слов и полоса под словом"
            checked={draft.showProgress}
            onChange={(showProgress) => update({ showProgress })}
          />
          <ToggleRow
            title="Режим фокуса"
            hint="Во время чтения панели прячутся, остаётся только слово"
            checked={draft.focusMode}
            onChange={(focusMode) => update({ focusMode })}
          />
          <ToggleRow title="Тёмная тема" hint="Светлая тема появится позже" checked disabled />
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!loaded || !changed}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:hover:bg-accent"
          >
            Сохранить
          </button>
          <p role="status" className="flex h-4 items-center gap-1 text-xs text-cream-muted">
            {justSaved ? (
              <>
                <Icon name="check" className="h-3.5 w-3.5 text-online" /> Сохранено в этом браузере
              </>
            ) : changed ? (
              "Есть несохранённые изменения"
            ) : null}
          </p>
        </div>
      </section>

      {/* Предпросмотр: как будет выглядеть слово в читалке */}
      <aside aria-label="Предпросмотр" className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm font-semibold text-cream-muted">Предпросмотр</p>
        <div
          className={`flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 p-6 ${backgroundClass(draft.background)}`}
        >
          <p className="text-xs text-cream-muted">Режим быстрого чтения</p>
          <WordView word="свобода" settings={draft} size="md" />
          <span className="h-0.5 w-10 rounded-full bg-accent" aria-hidden="true" />
          {draft.showProgress ? (
            <div className="mt-6 w-full">
              <div className="mb-2 flex justify-between text-xs tabular-nums text-cream-muted">
                <span>128 / 742</span>
                <span>{draft.wpm} слов/мин</span>
              </div>
              <div className="h-1 w-full rounded-full bg-white/10">
                <div className="h-full w-[17%] rounded-full bg-accent" />
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-cream-muted">
          Настройки хранятся только в этом браузере. Синхронизация появится вместе с аккаунтами.
        </p>
      </aside>
    </div>
  );
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-cream">{label}</p>
        {value ? <p className="text-sm tabular-nums text-cream-muted">{value}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Swatch({
  label,
  className,
  selected,
  onSelect,
  round,
}: {
  label: string;
  className: string;
  selected: boolean;
  onSelect: () => void;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onSelect}
      className={`h-10 w-10 border-2 transition-transform hover:scale-105 ${round ? "rounded-full" : "rounded-lg"} ${
        selected ? "border-accent ring-2 ring-accent/30" : "border-white/15"
      } ${className}`}
    />
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm text-cream">{title}</p>
        <p className="text-xs text-cream-muted">{hint}</p>
      </div>
      <Toggle label={title} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}
