"use client";

import { useRouter } from "next/navigation";
import { accountService } from "@/app/services/accountService";
import { AccountModel } from "@/app/types/account";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";

export function useAccounts({ id }: { id: string }) {
  const router = useRouter();

  const { entity: account, loading: loadingAccount } =
    useShow<AccountModel>({
      id,
      service: accountService,
    });

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: "/contas",
    deleteService: accountService.delete,
  });

  const handleBack = () => {
    router.push("/contas");
  };

  const typeLabels = {
    CREDIT_DEBIT: "Conta Corrente",
    INVESTMENT: "Investimento",
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
  };
};
