/**
 * Набор простых линейных иконок для всего сайта.
 * Цвет берётся от текста (currentColor), поэтому иконку красим классом text-*.
 */
const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  books: "M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h10",
  heart: "M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z",
  friends:
    "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 6.5M18 14a6 6 0 013.5 6",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.2l.4 2.6h4l.4-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4",
  bell: "M6 16v-5a6 6 0 0112 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 004 0",
  back: "M19 12H5M11 6l-6 6 6 6",
  chevron: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  skipBack: "M18 6l-8 6 8 6V6zM6 6v12",
  skipForward: "M6 6l8 6-8 6V6zM18 6v12",
  speed: "M12 21a9 9 0 110-18 9 9 0 010 18zM12 12l4-4M12 6v1M6 12h1M17 12h1",
  bookmark: "M7 4h10v16l-5-3.5L7 20V4z",
  device: "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2",
  quote: "M6 8h4v4c0 3-1.5 4.5-4 5.5M14 8h4v4c0 3-1.5 4.5-4 5.5",
  note: "M5 4h10l4 4v12H5V4zM14 4v5h5M9 13h6M9 17h4",
  pin: "M12 21s-6-5.5-6-11a6 6 0 0112 0c0 5.5-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  clock: "M12 21a9 9 0 110-18 9 9 0 010 18zM12 7v5l3 2",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  plus: "M12 5v14M5 12h14",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  fullscreen: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
  check: "M5 12l5 5 9-10",
  focus: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M12 12h.01",
  sort: "M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3",
  palette:
    "M12 21a9 9 0 110-18c5 0 9 3.6 9 8 0 2.8-2.2 4-4.5 4H15a2 2 0 00-1.5 3.3c.4.5.5 1 .3 1.5-.3.8-1 1.2-1.8 1.2zM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01",
} as const;

/** Иконки, которые рисуются заливкой, а не линией */
const FILLED = {
  play: "M8 5.5v13l10-6.5z",
  pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z",
} as const;

export type IconName = keyof typeof ICONS | keyof typeof FILLED;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  if (name in FILLED) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
        <path d={FILLED[name as keyof typeof FILLED]} fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name as keyof typeof ICONS]} />
    </svg>
  );
}
