import type { ReactNode } from 'react';

import PageBar from '@/app/components/base-pages/page-bar';
import { pageTitleClassName } from '@/app/components/base-pages/page-title-classes';

export { pageTitleClassName, appBarTitleClassName } from '@/app/components/base-pages/page-title-classes';

export default function PageTitle({
  title,
  description,
  actions,
  sidebarAligned = false,
  animated = false,
  loading = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Faixa fixa encostada na sidebar (`PageBar`); ignora a descrição. */
  sidebarAligned?: boolean;
  /** Só com `sidebarAligned`: liga o movimento da faixa (ver `PageBar`). */
  animated?: boolean | 'letters' | 'focus' | 'flip' | 'stamp' | 'collide' | 'conveyor' | 'deal' | 'spin' | 'climb';
  /** Só com `sidebarAligned` e `animated`: indicador de carregamento da faixa (linha ou pontos, conforme o preset). */
  loading?: boolean;
}) {
  if (sidebarAligned) return <PageBar crumbs={[{ label: title }]} actions={actions} animated={animated} loading={loading} />;

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
