"use client";

// components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import InvestmentForm from "@/app/components/investments/InvestmentForm";

const NewInvestiment = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <InvestmentForm />
    </ProtectedRoute>
  );
};

export default NewInvestiment;