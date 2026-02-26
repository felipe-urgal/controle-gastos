"use client";

import { accountService } from "@/app/services/accountService";
import { AccountModel } from "@/app/types/account";
import { useEdit } from "@/app/hooks/crud/edit";

export function useAccounts({ id }: { id: string }) {
  const { entity, ...rest } = useEdit<AccountModel>({
    id,
    service: accountService,
    backPath: (id) => `/contas/show/${id}`,
    errorMessage: "Não foi possível carregar os dados da conta",
  });

  return {
    account: entity,
    ...rest,
  };
};
