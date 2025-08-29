"use client";

// Hooks
import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// Components
import { ProtectedRoute, Breadcrumb, TransactionForm, Loading } from "@/app/components";

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
        <div className="">
          <Breadcrumb />
          
          <div className="">
            <div className="">
              {isLoading ? (
                <Loading />
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
          </div>

          {/* Help Section */}
          {!isLoading && transaction && (
            <div className="mt-4 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-300">
                    Certifique-se de que todas as informações estão corretas antes de salvar. 
                    Transações editadas serão atualizadas imediatamente em seus relatórios.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UpdateTransition;