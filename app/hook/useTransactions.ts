'use client';

import { useState, useEffect } from 'react';
import { transactionService } from '@/app/services';
import { TransactionModel } from '@/app/types/transaction';
import { useAuth } from '@/app/context';

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function loadTransactions() {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await transactionService.getTransactions(user.id);
        setTransactions(response.data.items);
      } catch (err) {
        setError('Erro ao carregar transações');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, [user?.id]);

  const refresh = async () => {
    if (!user?.id) return;

    try {
      const response = await transactionService.getTransactions(user.id);
      setTransactions(response.data.items);
    } catch (err) {
      console.error('Erro ao atualizar transações:', err);
    }
  };

  return {
    transactions,
    loading,
    error,
    refresh
  };
}