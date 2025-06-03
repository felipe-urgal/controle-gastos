"use client";

// Hooks
import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";

// Toast
import 'react-toastify/dist/ReactToastify.css';
import { toast } from "react-toastify";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

// Types
import { TransactionFormData } from '@/app/types/transaction'

// Services
import { transactionService } from "@/app/services/transactionService";

const EditarTransacao = () => {
  const { user }      = useAuth();
  const params        = useParams();
  const transactionId = params.id as string;

  const [isLoading, setIsLoading]     = useState<boolean>(true);
  const [transaction, setTransaction] = useState<TransactionFormData | undefined>(undefined);

  useEffect(() => {
    if (user?.id) {
      const carregarTransacao = async () => {
        setIsLoading(true);
        try {
          const response = await transactionService.getTransactionById(transactionId)

          setTransaction({
            ...response,
            amount: Number(response.amount),
            unitPrice: response.unitPrice !== null ? Number(response.unitPrice) : undefined,
            quantity: response.quantity !== null ? Number(response.quantity) : undefined,
          });
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      
      carregarTransacao();
    }
  }, [user, transactionId]);

  if (!isLoading && !transaction) {
    notFound();
  }

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