"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ReaderSettings,
  type ReadingFont,
} from "@/lib/settings";
import { MAX_WPM, MIN_WPM, WPM_STEP } from "@/lib/reader";

export function SettingsClient() {
  // Значения по умолчанию на сервере, реальные читаем из браузера после монтирования
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

  function update(patch: Partial<ReaderSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Скорость чтения" description="Сколько слов в минуту показывает читалка.">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={MIN_WPM}
            max={MAX_WPM}
            step={WPM_STEP}
            value={settings.wpm}
            disabled={!loaded}
            onChange={(event) => update({ wpm: Number(event.target.value) })}
            aria-label="Скорость, слов в минуту"
            className="flex-1 accent-accent"
          />
          <span className="w-24 text-right text-sm font-semibold text-cream">
            {settings.wpm} сл/мин
          </span>
        </div>
      </Card>

      <Card title="Шрифт слова" description="Шрифт, которым показывается слово в центре экрана.">
        <div role="radiogroup" aria-label="Шрифт слова" className="grid grid-cols-2 gap-2">
          <FontOption
            value="sans"
            label="Без засечек"
            sample="Скорость"
            className="font-sans"
            selected={settings.font === "sans"}
            onSelect={(font) => update({ font })}
          />
          <FontOption
            value="serif"
            label="С засечками"
            sample="Скорость"
            className="font-serif"
            selected={settings.font === "serif"}
            onSelect={(font) => update({ font })}
          />
        </div>
      </Card>

      <Card title="Тема" description="Пока доступна только тёмная тема.">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-xl border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-cream">
            Тёмная
          </span>
          <span className="rounded-xl border border-white/10 px-4 py-2 text-sm text-cream-muted">
            Светлая — скоро
          </span>
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-ink-soft/50 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-cream">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-cream-muted">{description}</p>
      {children}
    </section>
  );
}

function FontOption({
  value,
  label,
  sample,
  className,
  selected,
  onSelect,
}: {
  value: ReadingFont;
  label: string;
  sample: string;
  className: string;
  selected: boolean;
  onSelect: (font: ReadingFont) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
        selected ? "border-accent bg-accent/10" : "border-white/10 hover:bg-white/5"
      }`}
    >
      <span className={`block text-xl text-cream ${className}`}>{sample}</span>
      <span className="mt-1 block text-xs text-cream-muted">{label}</span>
    </button>
  );
}
