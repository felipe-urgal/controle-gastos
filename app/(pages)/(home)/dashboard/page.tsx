import type { Metadata } from 'next';

import { Dashboard } from '@/app/components/pages/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard | Controle de Gastos',
  description: 'Acompanhe receitas, despesas, saldos e limites por período.',
  openGraph: {
    url: 'https://controle-gastos-pessoal.vercel.app/dashboard',
  },
  alternates: {
    canonical: 'https://controle-gastos-pessoal.vercel.app/dashboard',
  },
};

export default function DashboardPage() {
  return <Dashboard />;
}
