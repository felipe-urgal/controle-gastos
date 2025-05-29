"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-toastify";
import Breadcrumb from "@/app/components/Breadcrumb";
import 'react-toastify/dist/ReactToastify.css';
import Modal from "@/app/components/Modal";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { TransactionPagination } from "@/app/components/transactions/TransactionPagination";
import { AccountFilters } from "@/app/components/accounts/AccountFilters";
import { AccountList } from "@/app/components/accounts/AccountList";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  userId: string;
}

import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountsPage />
    </Suspense>
  );
}

function AccountsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [idAccount, setIdAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const itensForPage = 5;
  const [openModal, setOpenModal] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
  });

  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page")) || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 5,
  });

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.type) query.set("type", params.type);
      if (params.page && params.page > 1) query.set("page", params.page.toString());

      router.replace(`/contas?${query.toString()}`);
    },
    [router]
  );

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Construir a query string com todos os parâmetros necessários
      const params = new URLSearchParams({
        userId: user?.id || '',
        page: pagination.currentPage.toString(),
        limit: itensForPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filters && { filters: JSON.stringify(filters) })
      });

      const response = await fetch(`/api/account?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar contas');
      }
      
      const { data, pagination: pagData } = await response.json();
      setAccounts(data.accounts || []);
      setPagination(prev => ({
        ...prev,
        currentPage: pagination.currentPage,
        totalPages: pagData.totalPages,
        totalItems: pagData.total
      }));
    } catch (error) {
      toast.error((error as Error).message);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, pagination.currentPage, itensForPage, searchTerm, filters]);
  
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);


  // Funções para CRUD de contas
  const handleDeleteClick = async (id: string) => {
    setIdAccount(id);
    setOpenModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!idAccount) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idAccount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.transacoesCount > 0) {
          throw new Error(`Esta conta possui ${errorData.transacoesCount} transações vinculadas e não pode ser excluída`);
        }
        throw new Error(errorData.error || 'Erro ao excluir conta');
      }

      const idAccountStr = idAccount.toString();
      setAccounts(accounts.filter(account => account.id.toString() !== idAccountStr));
      toast.success("Conta excluída com sucesso!");
      fetchAccounts();
      setIdAccount(null);
    } catch (error) {
      toast.error((error as Error).message);
      setIsLoading(false);
      setIdAccount(null);
    } finally {
      setOpenModal(false);
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
        page: 1 
      });
    }, 500);
  }, [filters.type, updateURLParams]);


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
    router.replace(`/contas`);
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading}/>
      
      <div className="max-w-7xl">
        <AccountFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          // showFilters={showFilters}
          // onToggleFilters={() => setShowFilters(prev => !prev)}
          onClearFilters={handleClearFilters}
        />

        <div className="">

          {isLoading ? (
            <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <AccountList
              accounts={accounts}
              onDelete={handleDeleteClick}
              deletingId={idAccount}
            />
          )}

          <TransactionPagination
            paginaAtual={pagination.currentPage}
            totalPaginas={pagination.totalPages}
            totalItens={pagination.totalItems}
            itensPorPagina={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <Modal
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);
          setIdAccount(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta conta?"
        confirmText="Excluir"
        isLoading={isLoading}
      />
    </ProtectedRoute>
  );
}
