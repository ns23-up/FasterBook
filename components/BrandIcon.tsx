/**
 * Логотип Fasterbook: открытая книга с линиями движения.
 * Тот же рисунок, что и app/icon.svg, но встроен в интерфейс.
 */
export function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#311E16" />
      <path
        d="M32 21 C 26.5 17.5, 18.5 17, 12.5 19 L 12.5 45 C 18.5 43, 26.5 43.5, 32 47 C 37.5 43.5, 45.5 43, 51.5 45 L 51.5 19 C 45.5 17, 37.5 17.5, 32 21 Z"
        fill="none"
        stroke="#E97571"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <line x1="19" y1="28" x2="28" y2="28" stroke="#E97571" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="19" y1="34" x2="26" y2="34" stroke="#E97571" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      <line x1="36" y1="28" x2="45" y2="28" stroke="#E97571" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="38" y1="34" x2="45" y2="34" stroke="#E97571" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
