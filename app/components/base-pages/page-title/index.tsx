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
  sidebarAligned = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Faixa do título encostada na sidebar, com a linha de baixo na altura da linha do logo (só telas com sidebar). */
  sidebarAligned?: boolean;
}) {
  return (
    <header className={`flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between ${sidebarAligned ? 'lg:-mx-[var(--orbit-page-padding-inline)] lg:-mt-[var(--orbit-page-padding-block)] lg:min-h-[var(--app-sidebar-header-height)] lg:px-[var(--orbit-page-padding-inline)] lg:py-2' : ''}`}>
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
