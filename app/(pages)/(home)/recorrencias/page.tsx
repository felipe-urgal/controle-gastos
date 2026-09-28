import type { Metadata } from 'next';

import RecurrencesCenter from '@/app/components/pages/recurrences';

export const metadata: Metadata = {
  title: 'Recorrências e assinaturas | Controle de Gastos',
  description: 'Acompanhe recorrências cadastradas e revise padrões financeiros detectados',
};

export default function Page() {
  return <RecurrencesCenter />;
}
