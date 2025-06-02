"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

type TransactionFormData = {
  id?: string;
  amount: number;
  unitPrice: number | null;
  description: string;
  quantity: number | null;
  categoryId: string | null;
  accountId: string | null;
  transactionDate: string;
  type: string;
};

const EditarTransacao = () => {
  const { user } = useAuth();
  const params = useParams();

  const transacaoId = params.id as string;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialData, setInitialData] = useState<TransactionFormData | null>(null);

  // Carrega a transação
  useEffect(() => {
    if (user?.id) {
      const carregarTransacao = async () => {
        try {
          setIsLoading(true);
          const transacaoResponse = await fetch(`/api/transactions/${transacaoId}`);
          
          if (!transacaoResponse.ok) throw new Error('Transação não encontrada');
          
          const transacao: TransactionFormData = await transacaoResponse.json();
          setInitialData(transacao);
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      
      carregarTransacao();
    }
  }, [user, transacaoId]);

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
            {initialData && (
              <TransactionForm 
                initialData={initialData}
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