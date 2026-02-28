"use client";

// importing components
import { NewPage } from "@/app/components/base-pages";
import { TransactionForm } from "@/app/components/pages/transactions";

export default function New() {
  return (
    <NewPage backUrl="/transacoes">
      <TransactionForm isEditing={false} />
    </NewPage>
  );
};
