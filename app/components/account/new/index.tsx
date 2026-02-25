"use client";

import NewPage from "@/app/components/ui/NewPage";
import AccountForm from "@/app/components/account/form";

export default function New() {
  return (
    <NewPage
      title="Nova Conta"
      description="Configure os detalhes da sua conta financeira"
      backTo="/contas"
    >
      <AccountForm isEditing={false} />
    </NewPage>
  );
};
