"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { accountService } from "@/app/services";
import { AccountModel } from "@/app/types/account";

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await accountService.getAccounts();
      setAccounts(response.data?.items || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const processedAccounts = useMemo(() => {
    let result = [...accounts];

    if (search) {
      result = result.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [accounts, search]);

  return {
    loading,
    processedAccounts,
    search,
    setSearch,
    viewMode,
    setViewMode,
  };
}
