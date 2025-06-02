"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { transactionService } from "@/app/services/transactionService";
import { useAuth } from "@/app/context/AuthContext";

import { toast } from "react-toastify";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { Pagination } from "@/app/components/ui/Pagination";
import { TransactionFilters } from "@/app/components/transactions/TransactionFilters";
import { TransactionList } from "@/app/components/transactions/TransactionList";
import Modal from "@/app/components/Modal";
import { TransactionModel } from '@/app/types/transaction'
import { AccountModel } from '@/app/types/account'
import { accountService } from "@/app/services/accountService";

export interface Categoria {
  id: string;
  name: string;
}

import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsPage />
    </Suspense>
  );
}

function TransactionsPage() {
  const { user }         = useAuth();
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itensForPage     = 10;
  const DEBOUNCE_DELAY   = 500;

  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [transaction, setTransaction]   = useState<TransactionModel | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [openModal, setOpenModal]       = useState(false);
  const [searchTerm, setSearchTerm]     = useState(searchParams.get("search") || "");

  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
  });

  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page")) || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: itensForPage,
  });

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.type) query.set("type", params.type);
      if (params.page && params.page > 1) query.set("page", params.page.toString());

      router.replace(`/transacoes?${query.toString()}`);
    },
    [router]
  );

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, pagination: pagData } = await transactionService.getTransactions(user.id, {
        page: pagination.currentPage,
        limit: itensForPage,
        search: searchTerm,
        type: filters.type,
      });

      setTransactions(data.transactions || []);
      setPagination(prev => ({
        ...prev,
        currentPage: pagination.currentPage,
        totalPages: pagData.totalPages,
        totalItems: pagData.totalItems,
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user, pagination.currentPage, searchTerm, filters.type]);

  useEffect(() => {
    // Immediate fetch for page changes
    if (searchTerm) {
      const timeoutId = setTimeout(fetchTransactions, DEBOUNCE_DELAY);
      return () => clearTimeout(timeoutId);
    } else {
      fetchTransactions();
      return () => {};
    }
  }, [user, pagination.currentPage, itensForPage, searchTerm, fetchTransactions]);

  const handleDeleteClick = async (transaction: TransactionModel) => {
    setTransaction(transaction);
    setOpenModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!transaction) return;

    setOpenModal(false);
    setIsLoading(true);
    
    try {
      // Busca a conta associada à transação
      const account = await accountService.getAccountById(transaction.accountId as AccountModel);

      // Calcula o novo saldo com base no tipo da transação
      let newBalance;
      if (transaction.type === 'INCOME') {
        // Se era uma receita, subtrai o valor (pois ela aumentava o saldo)
        newBalance = Number(account.balance) - Number(transaction.amount);
      } else {
        // Se era uma despesa/investimento, soma o valor (pois ela diminuía o saldo)
        newBalance = Number(account.balance) + Number(transaction.amount);
      }

      // Deleta a transação
      const response = await transactionService.deleteTransaction(transaction.id);

      if (!response.success) {
        const errorData = response.message;
        throw new Error(errorData || 'Erro ao excluir transação');
      }

      // Atualiza o saldo da conta
      const payloadEdit = {
        id: account.id,
        balance: newBalance,
      };

      await accountService.updateAccount(payloadEdit);

      toast.success("Transação excluída com sucesso");
      setTransaction(null);
      fetchTransactions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir transação");
      setIsLoading(false);
      setTransaction(null);
    } finally {
      setOpenModal(false);
    }
  };
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      updateURLParams({ 
        search: value, 
        type: filters.type, 
        page: 1 
      });
    }, DEBOUNCE_DELAY);
  }, [filters.type, updateURLParams]);

  useEffect(() => {
    const currentTimeout = searchTimeoutRef.current;
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    updateURLParams({ search: searchTerm, type: filters.type, page });
  };

  const handleFilterChange = (name: "type", value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    updateURLParams({ search: searchTerm, type: newFilters.type, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({ type: "" });
    setSearchTerm("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    router.replace(`/transacoes`);
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading}/>
      
      <div className="">
        <TransactionFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          loading={isLoading}
        />

        <div className="">

          {isLoading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              onDelete={handleDeleteClick}
            />
          )}

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <Modal
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);
          setTransaction(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta transação?"
        confirmText="Excluir"
        isLoading={isLoading}
      />
    </ProtectedRoute>
  );
}
