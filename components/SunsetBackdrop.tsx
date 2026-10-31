/**
 * Фоновая картинка «Закат над песчаными дюнами» (public/sunset.jpg).
 * Поверх лежит полупрозрачный тёмный слой, чтобы текст оставался читаемым.
 * Родитель должен иметь `relative overflow-hidden`.
 */
export function SunsetBackdrop({ shade = "bg-ink-deep/40" }: { shade?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sunset.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${shade}`} />
    </>
  );
}
