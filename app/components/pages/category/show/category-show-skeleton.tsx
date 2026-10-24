'use client';

import { MobileAppBar } from '@/app/components/layout';
import { ShowBelow } from '@/app/components/ui';

const block = 'rounded-[var(--radius-lg)] bg-[var(--skeleton)]';

/** Esqueleto da tela da categoria: resumo do mês, histórico e movimentações, como a tela carregada. */
export default function CategoryShowSkeleton({ backUrl }: { backUrl: string }) {
  return (
    <div className="w-full space-y-4 pb-5" role="status" aria-live="polite">
      <span className="sr-only">Carregando categoria</span>
      <ShowBelow breakpoint="lg">
        <MobileAppBar title="Categoria" backHref={backUrl} backLabel="Voltar para categorias" />
      </ShowBelow>
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
            <div className={`${block} h-12 w-12`} />
            <div className="space-y-2">
              <div className={`${block} h-6 w-2/3`} />
              <div className={`${block} h-4 w-1/2`} />
            </div>
          </div>
          <div className="space-y-3">
            <div className={`${block} h-9 w-3/4 sm:h-12`} />
            <div className={`${block} h-2 w-full`} />
            <div className={`${block} h-4 w-full`} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`${block} h-8 ${item === 2 ? 'col-span-2 sm:col-span-1' : ''}`} />
            ))}
          </div>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className={`${block} h-56 border border-[var(--border)]`} />
            <div className={`${block} h-48 border border-[var(--border)]`} />
          </div>
          <div className={`${block} h-48 border border-[var(--border)]`} />
        </div>
      </div>
    </div>
  );
}
