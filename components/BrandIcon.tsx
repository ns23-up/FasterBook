/**
 * Логотип Fasterbook: открытая книга с линиями движения.
 * Картинка лежит в public/logo.png (та же, что app/icon.png).
 */
export function BrandIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="" aria-hidden="true" className={className} />
  );
}
