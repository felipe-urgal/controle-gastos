'use client';

// hooks
import { useTransactions } from "@/app/hooks/transactions/transaction-edit";

// components
import { EditPage } from '@/app/components/pages';
import { TransactionForm } from '@/app/components/transactions';

export default function Edit({ id }: { id: string }) {
  const { transaction, loading, error, handleBack } = useTransactions({ id });
  
  return (
    <EditPage
      loading={loading}
      error={error}
      backUrl={handleBack}
      errorRedirectTo={handleBack}
    >
      <TransactionForm isEditing transaction={transaction} />
    </EditPage>
  );
};
