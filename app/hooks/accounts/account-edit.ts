"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { accountService } from "@/app/services/accountService";
import { AccountModel } from "@/app/types/account";

export function useAccounts({ id }: { id: string }) {
  const router = useRouter();

  const [account, setAccount] = useState<AccountModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await accountService.getById(String(id));
        setAccount(response.data);
      } catch (err) {
        setError('Não foi possível carregar os dados da conta');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleBack = () => {
    router.push(`/contas/show/${id}`);
  };

  return {
    account,
    loading,
    error,
    handleBack
  };
};
