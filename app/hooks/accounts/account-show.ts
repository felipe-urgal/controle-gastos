"use client";

import { accountService } from "@/app/services/account-service";
import { AccountModel } from "@/app/types/account";
import { useState } from "react";

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

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  /** Inativar guarda o histórico e tira a conta dos lançamentos novos; reativar desfaz. */
  async function setActive(isActive: boolean) {
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      await accountService.update(String(id), { isActive });
      const response = await accountService.getById(String(id));
      setAccount(response.data);
    } catch (error: any) {
      setStatusError(
        error?.response?.data?.error?.message ||
          error?.data?.error?.message ||
          error?.message ||
          "Não foi possível alterar o status da conta",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const typeLabels = {
    CREDIT_DEBIT: "Conta Corrente",
    INVESTMENT: "Investimento",
    CREDIT_CARD: "Cartão de crédito",
  };

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
    setActive,
    isUpdatingStatus,
    statusError,
  };
};
