import type { Metadata } from 'next';

import MonthlyClosingPage from '@/app/components/pages/monthly-closing/monthly-closing-page';

export const metadata: Metadata = {
  title: 'Fechamento mensal | Controle de Gastos',
  description:
    'Revise o mês com receitas, despesas, patrimônio e sinais de pendências sem bloquear alterações retroativas.',
};

export default function ClosingPage() {
  return <MonthlyClosingPage />;
}
