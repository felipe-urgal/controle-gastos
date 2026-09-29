import type { Metadata } from 'next';

import MonthlyClosingPage from '@/app/components/pages/monthly-closing/monthly-closing-page';

export const metadata: Metadata = {
  title: 'Fechamento mensal | Controle de Gastos',
  description: 'Revise receitas, despesas, planejamento e patrimônio de cada mês.',
};

export default function ClosingPage() {
  return <MonthlyClosingPage />;
}
