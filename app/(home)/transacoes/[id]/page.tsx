"use client";

// Hooks
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

// Types
import { TransactionModel, TransactionFormData } from '@/app/types/transaction'

// Services
import { transactionService } from "@/app/services/transactionService";


const EditarTransacao = () => {
  const params = useParams();
  const transactionId = params.id as string;

  const transactionTransformData = (data: TransactionModel): TransactionFormData => ({
    ...data,
    amount: typeof data.amount === "object" && "toNumber" in data.amount ? data.amount.toNumber() : Number(data.amount),
    unitPrice: data.unitPrice && typeof data.unitPrice === "object" && "toNumber" in data.unitPrice ? data.unitPrice.toNumber() : data.unitPrice ? Number(data.unitPrice) : undefined,
    quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
    transactionDate: typeof data.transactionDate === "string" ? new Date(data.transactionDate) : data.transactionDate,
    categoryId: data.categoryId ?? null,
    accountId: data.accountId ?? null,
    investmentType: data.investmentType ?? undefined,
  });

  // Use the custom hook
  const { isLoading, data: transaction } = useEditData<TransactionModel, TransactionFormData>({
    fetchFunction: transactionService.getTransactionById,
    id: transactionId,
    transformData: transactionTransformData, // sempre a mesma referência!
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
                  unitPrice: transaction.unitPrice ?? null,
                  quantity: transaction.quantity ?? null,
                  categoryId: transaction.categoryId ?? null,
                  accountId: transaction.accountId ?? null,
                  transactionDate: transaction.transactionDate
                    ? (typeof transaction.transactionDate === "string"
                      ? new Date(transaction.transactionDate).toISOString()
                      : transaction.transactionDate.toISOString())
                    : "",
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

export default EditarTransacao;