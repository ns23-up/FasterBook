/**
 * Иллюстрация «горы на закате» для главной и экрана приветствия.
 * Нарисована плоскими слоями SVG в цветах бренда — без фотографий и градиентов.
 */
export function MountainArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 260"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Солнце */}
      <circle cx="430" cy="100" r="36" className="fill-accent" opacity="0.75" />
      {/* Дальний хребет */}
      <path
        d="M0 170 L70 125 L120 150 L190 78 L250 128 L310 96 L380 140 L450 66 L520 122 L600 88 L600 260 L0 260 Z"
        className="fill-ink-soft"
      />
      {/* Средний хребет */}
      <path
        d="M0 205 L90 152 L160 192 L240 138 L320 186 L400 142 L470 182 L540 150 L600 176 L600 260 L0 260 Z"
        className="fill-cover-ember"
      />
      {/* Передний план */}
      <path
        d="M0 236 L120 204 L210 226 L300 196 L380 232 L470 208 L600 228 L600 260 L0 260 Z"
        className="fill-ink-deep"
      />
    </svg>
  );
}
