'use client';

import { MobileAppBar } from '@/app/components/layout';
import { ShowBelow } from '@/app/components/ui';

const block = 'rounded-[var(--radius-lg)] bg-[var(--skeleton)]';

/**
 * Esqueleto da tela da conta: mesma estrutura da tela carregada (barra superior no mobile, card de
 * resumo e lista), para o carregamento não "pular" quando os dados chegam.
 */
export default function AccountShowSkeleton({ backUrl }: { backUrl: string }) {
  return (
    <div className="w-full space-y-4 pb-5" role="status" aria-live="polite">
      <span className="sr-only">Carregando conta</span>
      <ShowBelow breakpoint="lg">
        <MobileAppBar title="Conta" backHref={backUrl} backLabel="Voltar para contas" />
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
          <div className="grid items-end gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className={`${block} h-9 w-3/4 sm:h-12`} />
              <div className={`${block} h-4 w-full`} />
            </div>
            <div className={`${block} h-[5.75rem]`} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`${block} h-[3.25rem] sm:h-16`} />
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-5">
            <div className={`${block} h-5 w-32`} />
            <div className={`${block} h-4 w-28`} />
          </div>
          <div className="flex gap-2 px-4 pb-3 sm:px-5">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className={`${block} h-9 w-16 rounded-full`} />
            ))}
          </div>
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--border)] px-4 py-2.5 sm:px-5">
              <div className={`${block} h-9 w-9`} />
              <div className="space-y-1.5">
                <div className={`${block} h-4 w-2/3`} />
                <div className={`${block} h-3 w-1/3`} />
              </div>
              <div className={`${block} h-4 w-16`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
