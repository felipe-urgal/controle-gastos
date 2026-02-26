"use client";

import { accountService } from "@/app/services/accountService";
import { AccountModel } from "@/app/types/account";
import { useIndex } from "@/app/hooks/crud/index";

export function useAccounts() {
  const { items, ...rest } = useIndex<AccountModel>({
    service: accountService,
  });

  return {
    accounts: items,
    ...rest,
  };
};
