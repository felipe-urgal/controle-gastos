"use client";

// Hooks
import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// Components
import { ProtectedRoute, Breadcrumb, TransactionForm } from "@/app/components";

// Types
import { TransactionModel, TransactionFormData } from '@/app/types/transaction'

// Services
import { transactionService } from "@/app/services/transactionService";

const UpdateTransition = () => {
  const params = useParams();
  const transactionId = params.id as string;

  const transactionTransformData = useCallback((data: TransactionModel): TransactionFormData => ({
    ...data,
    amount: typeof data.amount === "object" && "toNumber" in data.amount
      ? data.amount.toNumber()
      : Number(data.amount),
    categoryId: data.categoryId ?? null,
    accountId: data.accountId ?? null,
  }), []);

  const { isLoading, data: transaction } = useEditData<TransactionModel, TransactionFormData>({
    fetchFunction: transactionService.getTransactionById,
    id: transactionId,
    transformData: transactionTransformData,
  });

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {transaction && (
              <TransactionForm
                transaction={{
                  ...transaction,
                  categoryId: transaction.categoryId ?? null,
                  accountId: transaction.accountId ?? null,
                }}
                isEdit={true}
              />
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateTransition;