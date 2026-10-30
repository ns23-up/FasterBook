/** Единый заголовок раздела: название и короткое пояснение. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cream sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cream-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
