import { Suspense } from 'react';
import type { Metadata } from 'next';

import FinancialComparisonPage from '@/app/components/pages/financial-comparison/financial-comparison-page';

export const metadata: Metadata = {
  title: 'Comparar períodos | Controle de Gastos',
  description:
    'Compare receitas, despesas, categorias e patrimônio entre dois períodos.',
};

export default function ComparisonPage() {
  return (
    <Suspense fallback={null}>
      <FinancialComparisonPage />
    </Suspense>
  );
}
