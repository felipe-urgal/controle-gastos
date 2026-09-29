import type { Metadata } from 'next';
import FinancialCommitmentsPage from '@/app/components/pages/financial-commitments/financial-commitments-page';

export const metadata: Metadata = {
  title: 'Compromissos | Controle de Gastos',
  description: 'Acompanhe seus próximos compromissos financeiros em uma única linha do tempo.',
};

export default function CommitmentsPage() {
  return <FinancialCommitmentsPage />;
}
