"use client";

import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from "@/app/context/AuthContext";

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

export function useTransactionFormData(): UseTransactionFormDataResult {
  const { user } = useAuth();
  
  const [state, setState] = useState<Omit<UseTransactionFormDataResult, 'error'>>({
    categories: [],
    accounts: [],
    isLoading: true,
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
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
          fetch(`/api/category/all?userId=${user.id}`, { signal }),
          fetch(`/api/account/all?userId=${user.id}`, { signal })
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
  }, [user]);

  return { ...state, error };
}