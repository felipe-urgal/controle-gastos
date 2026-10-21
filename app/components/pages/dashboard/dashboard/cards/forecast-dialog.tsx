'use client';

import ForecastPanel from '@/app/components/pages/dashboard/forecast';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { SupportedCurrency } from '@/app/types/financial-summary';
import { ForecastData } from '@/app/types/forecast';

export function ForecastDialog({
  currency,
  initialData,
  onClose,
}: {
  currency: SupportedCurrency;
  initialData: ForecastData;
  onClose: () => void;
}) {
  return (
    <ModalShell
      variant="fullscreen-sheet"
      eyebrow="Próximos movimentos"
      title="Saldo projetado"
      description="Leitura dos lançamentos pendentes já cadastrados. O realizado não muda e nenhuma ocorrência é criada por esta visualização."
      closeLabel="Fechar projeção"
      maxWidthClass="sm:max-w-[920px]"
      onClose={onClose}
    >
      <ForecastPanel embedded initialCurrency={currency} initialData={initialData} />
    </ModalShell>
  );
}
