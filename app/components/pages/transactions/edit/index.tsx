'use client';

import { EditPage } from '@/app/components/base-pages';
import { TransactionForm } from '@/app/components/pages/transactions';
import { useTransactions } from '@/app/hooks/transactions/transaction-edit';

export default function Edit({ id }: { id: string }) {
  const { transaction, loading, error, handleBack } = useTransactions({ id });

  return (
    <EditPage
      title="Editar transação"
      description="Altere somente este lançamento. Se ele fizer parte de uma recorrência, as outras ocorrências permanecem independentes."
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <TransactionForm isEditing transaction={transaction} />
    </EditPage>
  );
}
