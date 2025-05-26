"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from 'react-toastify';
import { useAuth } from "@/app/context/AuthContext";
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

interface Transacao {
  id: string;
  valor: number;
  valorUnitario: number | null;
  descricao: string;
  quantidade: number | null;
  categoriaId: string | null;
  data: string;
  tipo: string;
}

const EditarTransacao = () => {
  const { user } = useAuth();
  const params = useParams();

  const mesSelecionado = Number(params.mes);
  const anoSelecionado = Number(params.ano);
  const transacaoId = params.id as string;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialData, setInitialData] = useState<Transacao | null>(null);

  // Carrega a transação
  useEffect(() => {
    if (user?.id) {
      const carregarTransacao = async () => {
        try {
          setIsLoading(true);
          const transacaoResponse = await fetch(`/api/transacoes/${transacaoId}`);
          
          if (!transacaoResponse.ok) throw new Error('Transação não encontrada');
          
          const transacao: Transacao = await transacaoResponse.json();
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-6xl mx-auto p-4">
          <Breadcrumb 
            anoSelecionado={anoSelecionado}
            mesSelecionado={mesSelecionado}
            showMonthLink={true}
            showMonthLink2={true}
            newLink={true}
          />
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center">
            <p>Carregando transação...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        <Breadcrumb 
          anoSelecionado={anoSelecionado}
          mesSelecionado={mesSelecionado}
          showMonthLink={true}
          showMonthLink2={true}
          newLink={true}
        />
        {initialData && (
          <TransactionForm 
            initialData={initialData}
            mesSelecionado={mesSelecionado}
            anoSelecionado={anoSelecionado}
            isEdit={true}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default EditarTransacao;