import type { ReactNode } from 'react';

/** Título (`h1`) de página: única escala permitida (guardrail em scripts/__tests__). */
export const pageTitleClassName =
  'text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl';

/** Título (`h1`) de barra de app mobile (voltar + título); o chamador define o alinhamento. */
export const appBarTitleClassName =
  'min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-[var(--foreground)]';

export default function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className={pageTitleClassName}>
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
