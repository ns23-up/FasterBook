/** Единый заголовок раздела: название, метка, короткое пояснение и кнопка справа. */
export function PageHeader({
  title,
  description,
  badge,
  action,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-cream sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cream-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
