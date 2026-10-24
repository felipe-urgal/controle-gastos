import type { Metadata } from 'next';

import TransactionImportPage from '@/app/components/pages/transactions/import';

export const metadata: Metadata = {
  title: 'Importar transações | Controle de Gastos',
  description: 'Revise e importe transações de CSV, OFX, QFX, QIF ou XLSX com regras de categorização.',
};

export default function Page() {
  return (
    <TransactionImportPage />
  );
}
