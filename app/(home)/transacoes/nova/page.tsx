"use client";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

const NovaTransacao = () => {
  return (
    <ProtectedRoute>
      <div className="max-w-7xl">
        <Breadcrumb />
        <TransactionForm />
      </div>
    </ProtectedRoute>
  );
};

export default NovaTransacao;