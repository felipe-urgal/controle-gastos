import type { Metadata } from 'next';
import { Suspense } from 'react';

import SharePage from '@/app/components/pages/share/share-page';

export const metadata: Metadata = {
  title: 'Lançar do compartilhado | Controle de Gastos',
  description: 'Confirme um lançamento a partir de um texto ou recibo compartilhado com o app.',
};

export default function Page() {
  // `useSearchParams` (o texto compartilhado) exige um limite de Suspense.
  return (
    <Suspense fallback={null}>
      <SharePage />
    </Suspense>
  );
}
