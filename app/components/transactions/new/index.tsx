"use client";

import NewPage from "@/app/components/ui/NewPage";
import TransactionForm from "@/app/components/transactions/form";

export default function New() {
  return (
    <NewPage backTo="/transacoes">
      <TransactionForm isEditing={false} />
    </NewPage>
  );
};
