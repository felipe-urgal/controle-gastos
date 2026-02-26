'use client';

// hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-edit";

// components
import EditPage from '@/app/components/ui/EditPage';
import TransactionForm from '@/app/components/transactions/form';

export default function Edit({ id }: { id: string }) {
  const { transaction, loading, error, handleBack } = useTransactions({ id });

  console.log(transaction)
  
  return (
    <EditPage
      loading={loading}
      error={error}
      onBack={handleBack}
      errorRedirectTo="/contas"
    >
      <TransactionForm isEditing transaction={transaction} />
    </EditPage>
  );
};
