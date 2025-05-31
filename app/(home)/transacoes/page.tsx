"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchTransacao, Transacao } from "@/app/services/transacoesService";
import { useAuth } from "@/app/context/AuthContext";

import { toast } from "react-toastify";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { Pagination } from "@/app/components/ui/Pagination";
import { TransactionFilters } from "@/app/components/transactions/TransactionFilters";
import { TransactionList } from "@/app/components/transactions/TransactionList";
import Modal from "@/app/components/Modal";

export interface Categoria {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 5;

import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsPage />
    </Suspense>
  );
}

function TransactionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<Transacao[]>([]);
  // const [allTransactions, setAllTransactions] = useState<Transacao[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [accounts, setAccounts] = useState<Categoria[]>([]);

  const [loading, setLoading] = useState(true);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
    category: searchParams.get("category") || "",
    account: searchParams.get("account") || "",
    month: searchParams.get("month") || "",
    year: searchParams.get("year") || "",
  });

  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page")) || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; category?: string; page?: number, account?: string, month?: string; year?: string }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.type) query.set("type", params.type);
      if (params.category) query.set("category", params.category);
      if (params.account) query.set("account", params.account);
      if (params.month) query.set("month", params.month);
      if (params.year) query.set("year", params.year);
      if (params.page && params.page > 1) query.set("page", params.page.toString());

      router.replace(`/transacoes?${query.toString()}`);
    },
    [router]
  );

  const fetchDados = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // const { data, pagination: pagData, allTransactions } = await fetchTransacao(
      const { data, pagination: pagData } = await fetchTransacao(
        user.id,
        pagination.currentPage,
        ITEMS_PER_PAGE,
        filters.type,
        filters.category,
        filters.account,
        searchTerm,
        filters.month,
        filters.year
      );

      // const categorias = data
      //   .filter((i) => i.categoryId && typeof i.category === 'string') // garante os campos
      //   .map((i) => ({
      //     id: i.categoryId!, // o ! é seguro agora porque filtramos antes
      //     name: i.category as string,
      //   }));

      // const accounts = data
      //   .filter((i) => i.accountId && typeof i.account === 'string') // garante os campos
      //   .map((i) => ({
      //     id: i.accountId!, // o ! é seguro agora porque filtramos antes
      //     name: i.account as string,
      //   }));
      // const accounts = [...new Set(data.map((i: Transacao) => ({ id: i.accountId, name: i.account.name })))].filter(Boolean);

      setCategories([]);
      setAccounts([]);
      setTransactions(data);
      // setAllTransactions(allTransactions);
      setPagination(prev => ({
        ...prev,
        currentPage: pagination.currentPage, // Garantir que a página atual seja atualizada
        totalPages: pagData.totalPages,
        totalItems: pagData.total
      }));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [user, filters, pagination.currentPage, searchTerm]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  // const calcularSaldo = useCallback(
  //   (type: "INVESTMENT" | "INCOME" | "EXPENSE" | "TRANSFER") => {
  //     return allTransactions.reduce(
  //       (total, transaction) => total + (transaction.type === type ? Number(transaction.amount) : 0),
  //       0
  //     );
  //   },
  //   [allTransactions]
  // );

  const handleDeleteClick = async (id: number) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    setDeletingId(transactionToDelete);
    setIsDeleteModalOpen(false);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/transactions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transactionToDelete }),
      });

      if (!response.ok) throw new Error("Falha ao excluir transação");

      toast.success("Transação excluída com sucesso");
      fetchDados();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir transação");
    } finally {
      setDeletingId(null);
      setTransactionToDelete(null);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Cancela o timeout anterior se existir
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Configura um novo timeout para disparar após 500ms sem digitação
    searchTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      updateURLParams({ 
        search: value, 
        type: filters.type, 
        category: filters.category,
        account: filters.account,
        month: filters.month,
        year: filters.year,
        page: 1 
      });
    }, 500);
  }, [filters.type, filters.category, filters.account, filters.month, filters.year, updateURLParams]);

  // Limpa o timeout quando o componente desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    updateURLParams({ search: searchTerm, type: filters.type, category: filters.category, account: filters.account, month: filters.month, year: filters.year, page });
  };

  const handleFilterChange = (name: "type" | "category" | "month" | "year" | "account", value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    updateURLParams({ search: searchTerm, type: newFilters.type, category: newFilters.category, account: newFilters.account, month: newFilters.month, year: newFilters.year, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({ type: "", category: "", account: "", month: "", year: "" });
    setSearchTerm("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    router.replace(`/transacoes`);
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={loading}/>
      
      <div className="max-w-7xl">
        <TransactionFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={categories}
          accounts={accounts}
          // showFilters={showFilters}
          // onToggleFilters={() => setShowFilters(prev => !prev)}
          onClearFilters={handleClearFilters}
          loading={loading}
        />

        <div className="">

          {loading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <TransactionList
              transactions={transactions}
              onDelete={handleDeleteClick}
              deletingId={deletingId}
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
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta transação?"
        confirmText="Excluir"
        isLoading={deletingId !== null}
      />
    </ProtectedRoute>
  );
}
