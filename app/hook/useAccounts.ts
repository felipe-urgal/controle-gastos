"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context";
import { accountService } from "@/app/services";
import { AccountModel } from "@/app/types/account";

export function useAccounts() {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<AccountModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await accountService.getAccounts(user.id);
      setAccounts(response.data?.items || []);
    } catch (err) {
      setError("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const removeAccountFromState = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    removeAccountFromState
  };
}