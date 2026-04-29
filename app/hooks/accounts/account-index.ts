"use client";

import { accountService } from "@/app/services/account-service";
import { AccountModel } from "@/app/types/account";
import { useIndex } from "@/app/hooks/crud/index";

export function useAccounts() {
  const index = useIndex<AccountModel>({
    service: accountService,
    pagination: true,
  });

  return {
    ...index,
    accounts: index.items,
  };
};
  