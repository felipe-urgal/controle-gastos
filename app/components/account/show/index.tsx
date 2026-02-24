'use client';

// importing hooks
import { useAccounts } from "@/app/hooks/accounts/account-show";

// importing components
import ProtectedRoute from "@/app/components/ui/ProtectedRoute";
import Deleting from '@/app/components/account/show/deleting';
import Header from "@/app/components/account/show/header";
import Loading from '@/app/components/account/show/loading';
import Empty from '@/app/components/account/show/empty';
import AccountInfo from "@/app/components/account/show/account-info";
import ConfirmationModal from "@/app/components/ui/ConfirmationModal";

export default function Show({ id }: { id: string }) {
  const {
    account,
    transactions,
    summary,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
    typeLabels,
  } = useAccounts({ id });

  return (
    <ProtectedRoute>
      {isDeleting && ( <Deleting /> )}

      <Header 
        handleBack={handleBack}
        isDeleting={isDeleting}
        account={account}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        loading={loading}
      />

      {loading ? (
        <Loading /> 
      ) : (!account ? (
        <Empty />
        ) : (
          <>
            <AccountInfo 
              account={account}
              transactions={transactions}
              summary={summary}
              isDeleting={isDeleting}
              typeLabels={typeLabels}
            />

            <ConfirmationModal
              isOpen={isDeleteModalOpen}
              onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
              onConfirm={handleDelete}
              title="Excluir conta"
              message={`Tem certeza que deseja excluir a conta "${account.name}"? Esta ação não poderá ser desfeita e todas as transações associadas serão removidas.`}
              confirmText="Excluir"
              variant="danger"
              isLoading={isDeleting}
            />
          </>
        ))
      }
    </ProtectedRoute>
  );
};
