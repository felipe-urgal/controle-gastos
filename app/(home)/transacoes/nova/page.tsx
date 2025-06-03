"use client";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import TransactionForm from "@/app/components/transactions/TransactionForm";

const NovaTransacao = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <TransactionForm />
    </ProtectedRoute>
  );
};

export default NovaTransacao;