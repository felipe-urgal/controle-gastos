"use client";

import { useParams } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

const NovaTransacao = () => {
  const params = useParams();

  const mesSelecionado = Number(params.mes);
  const anoSelecionado = Number(params.ano);

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
        <TransactionForm 
          mesSelecionado={mesSelecionado}
          anoSelecionado={anoSelecionado}
        />
      </div>
    </ProtectedRoute>
  );
};

export default NovaTransacao;