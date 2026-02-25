"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { accountService } from "@/app/services/accountService";
import { transactionService } from "@/app/services/transactionService";
import { AccountModel } from "@/app/types/account";
import { useAuth } from "@/app/context";

export function useAccounts({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [account, setAccount] = useState<AccountModel | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;

      try {
        const [accountRes, transactionsRes] = await Promise.all([
          accountService.getById(String(id)),
          transactionService.getTransactions(user.id, {
            account: String(id),
            status: "COMPLETED",
          }),
        ]);

        setAccount(accountRes.data);

        const items = transactionsRes.data.items;
        setTransactions(items);
        setSummary(transactionsRes.data.additionalData);

      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, user?.id]);

  async function handleDelete() {
    if (!account) return;
    try {
      setIsDeleting(true);
      await accountService.delete(account.id);
      router.push("/contas");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  const handleBack = () => {
    router.push('/contas');
  };

  const typeLabels = {
    CREDIT_DEBIT: "Conta Corrente",
    INVESTMENT: "Investimento"
  };

  return {
    account,
    transactions,
    summary,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
    typeLabels,
  };
};
