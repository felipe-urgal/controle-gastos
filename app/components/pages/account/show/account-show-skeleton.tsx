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
        <div className={`${block} h-[23rem] lg:h-[18rem]`} />
        <div className={`${block} h-56`} />
      </div>
    </div>
  );
}
