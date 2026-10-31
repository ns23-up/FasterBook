import { DemoBadge } from "@/components/DemoBadge";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Небольшие общие детали интерфейса: карточка-панель, заголовок блока,
 * полоса прогресса, ползунок, переключатель, аватар, плитка с иконкой.
 */

/** Стиль карточки из макета: тёмная поверхность с тонкой рамкой. */
export const panelClass = "rounded-2xl border border-white/5 bg-ink-deep/70";

export function SectionTitle({
  id,
  title,
  badge,
  action,
}: {
  id?: string;
  title: string;
  badge?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 id={id} className="text-lg font-semibold tracking-tight text-cream">
          {title}
        </h2>
        {badge ? <DemoBadge /> : null}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  className = "",
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Прочитано ${value}%`}
      className={`h-1 w-full overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

export function RangeSlider({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
      className="fb-range"
      style={{ "--fill": `${fill}%` } as React.CSSProperties}
    />
  );
}

export function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-white/15"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 h-4 w-4 rounded-full bg-cream transition-[left] ${checked ? "left-6" : "left-1"}`}
      />
    </button>
  );
}

/** Кнопка-«таблетка» для выбора одного варианта (шрифт, вкладка). */
export function Chip({
  selected,
  onClick,
  className = "",
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-accent bg-accent/10 text-cream"
          : "border-white/10 text-cream-muted hover:bg-white/5 hover:text-cream"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Avatar({
  name,
  online,
  size = "md",
}: {
  name: string;
  online?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <span aria-hidden="true" className={`relative inline-flex shrink-0 ${sizeClass}`}>
      <span className="flex h-full w-full items-center justify-center rounded-full bg-ink-soft font-semibold text-cream ring-1 ring-white/10">
        {name.charAt(0)}
      </span>
      {online ? (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-online ring-2 ring-ink-deep" />
      ) : null}
    </span>
  );
}

/** Квадратная плитка с иконкой акцентного цвета (как в карточках макета). */
export function IconTile({ name, size = "md" }: { name: IconName; size?: "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent ${sizeClass}`}
    >
      <Icon name={name} />
    </span>
  );
}
