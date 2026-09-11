"use client";

import { accountService } from "@/app/services/account-service";
import { AccountModel } from "@/app/types/account";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";

export function useAccounts({ id }: { id: string }) {
  const {
    entity: account,
    setEntity: setAccount,
    loading: loadingAccount,
  } = useShow<AccountModel>({
    id,
    service: accountService,
  });

  const handleBack = "/contas";

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: handleBack,
    deleteService: accountService.delete,
  });

  const typeLabels = {
    CREDIT_DEBIT: "Conta Corrente",
    INVESTMENT: "Investimento",
  };

  async function refreshAccount() {
    const response = await accountService.getById(String(id));
    setAccount(response.data);
  }

  return {
    account,
    loading: loadingAccount,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete: () =>
      account && handleDelete(account.id),
    handleBack,
    typeLabels,
    refreshAccount,
  };
};
