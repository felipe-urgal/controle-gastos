"use client";

// components
import { ProtectedRoute, Breadcrumb, TransactionForm } from "@/app/components";

const NovaTransacao = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <TransactionForm />
    </ProtectedRoute>
  );
};

export default NovaTransacao;