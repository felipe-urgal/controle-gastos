"use client";

// importing components
import { NewPage } from "@/app/components/pages";
import { TransactionForm } from "@/app/components/transactions";

export default function New() {
  return (
    <NewPage backUrl="/transacoes">
      <TransactionForm isEditing={false} />
    </NewPage>
  );
};
