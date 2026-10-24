'use client';

import { MobileAppBar } from '@/app/components/layout';
import { ShowBelow } from '@/app/components/ui';

const block = 'rounded-[var(--radius-lg)] bg-[var(--skeleton)]';

/** Esqueleto da tela da transação: barra mobile, cartão de resumo e detalhes, como a tela carregada. */
export default function TransactionShowSkeleton({ backUrl }: { backUrl: string }) {
  return (
    <div className="w-full space-y-4 pb-5" role="status" aria-live="polite">
      <span className="sr-only">Carregando transação</span>
      <ShowBelow breakpoint="lg">
        <MobileAppBar title="Transação" backHref={backUrl} backLabel="Voltar para transações" />
      </ShowBelow>
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className={`${block} h-[220px]`} />
        <div className={`${block} h-48 border border-[var(--border)]`} />
        <div className={`${block} h-32 border border-[var(--border)]`} />
      </div>
    </div>
  );
}
