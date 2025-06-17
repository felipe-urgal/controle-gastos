"use client";

// components
import { ProtectedRoute, Breadcrumb, InvestmentForm } from "@/app/components";

const NewInvestiment = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <InvestmentForm />
    </ProtectedRoute>
  );
};

export default NewInvestiment;