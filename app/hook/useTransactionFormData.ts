"use client";

import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Category = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
};

type UseTransactionFormDataResult = {
  categories: Category[];
  accounts: Account[];
  isLoading: boolean;
  error: Error | null;
};

export function useTransactionFormData(userId: string | undefined): UseTransactionFormDataResult {
  const [state, setState] = useState<Omit<UseTransactionFormDataResult, 'error'>>({
    categories: [],
    accounts: [],
    isLoading: true,
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const loadData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        setError(null);

        const [categoriesRes, accountsRes] = await Promise.all([
          fetch(`/api/category/all?userId=${userId}`, { signal }),
          fetch(`/api/account/all?userId=${userId}`, { signal })
        ]);

        if (!categoriesRes.ok) throw new Error('Failed to load categories');
        if (!accountsRes.ok) throw new Error('Failed to load accounts');

        const [categoriesData, accountsData] = await Promise.all([
          categoriesRes.json(),
          accountsRes.json()
        ]);

        setState({
          categories: categoriesData.categorias || [],
          accounts: accountsData.accounts || [],
          isLoading: false,
        });
      } catch (err) {
        if (signal.aborted) return; // Ignore errors from abort
        
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        toast.error(error.message);
        
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadData();

    return () => controller.abort();
  }, [userId]);

  return { ...state, error };
}