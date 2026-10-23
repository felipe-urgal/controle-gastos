import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Dashboard } from '@/app/components/pages/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard | Controle de Gastos',
  description: 'Acompanhe receitas, despesas, saldos, limites e projeções por período.',
  openGraph: {
    url: 'https://controle-gastos-pessoal.vercel.app/dashboard',
  },
  alternates: {
    canonical: 'https://controle-gastos-pessoal.vercel.app/dashboard',
  },
};

export default function DashboardPage() {
  // `useSearchParams` (período e moeda na URL) exige um limite de Suspense.
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}
